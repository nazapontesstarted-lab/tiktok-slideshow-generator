/**
 * Processa as poses de assets/poses/<pose>.png (+ <pose>.map.png) e gera em assets/poses/<pose>/:
 *   figure.png     a ilustração com o fundo transparente (é esta que vai para os slides)
 *   <musculo>.png  máscara de cada músculo (cinza: branco = músculo), recortada no bbox
 *   meta.json      tamanho da imagem, bbox do corpo e bbox de cada máscara
 *
 * As regiões saem do mapa de cores (<pose>.map.png): mesma pose, cada músculo numa cor chapada.
 * 1. Cada pixel do mapa recebe o músculo da cor mais próxima da paleta da pose (se for perto o bastante).
 * 2. Manchas pequenas (antisserrilhado entre duas cores) são descartadas.
 * 3. As regiões crescem alguns px para cobrir as linhas pretas, sem invadir a pele branca.
 * 4. Ajustes por pose corrigem o que o mapa não separa (ex.: peitoral superior × médio).
 * 5. Tudo é recortado pela silhueta da base e as bordas são suavizadas.
 *
 * Uso: npm run prep:poses [pose...]
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { PNG } from "pngjs";
import type { MuscleId } from "../src/anatomy/registry";
import { POSES, type PoseName } from "../src/anatomy/poses";

type RGB = readonly [number, number, number];
type Label = MuscleId | "chest" | "thigh" | "lower-leg";

interface Img {
  w: number;
  h: number;
  data: Buffer;
}

/** Máscaras de trabalho: um Uint8Array (0/1) por rótulo. */
type Regions = Map<Label, Uint8Array>;

interface PoseConfig {
  palette: [RGB, Label][];
  /** Pixels claros fechados pelo desenho que são fundo (ex.: vão entre braço e tronco). */
  holes?: [number, number][];
  adjust?: (r: Regions, ctx: Ctx) => void;
}

interface Ctx {
  base: Img;
  body: Uint8Array;
  w: number;
  h: number;
  axis: number;
}

const LIGHT = 200; // luminância acima disso conta como "branco" na base
const MATCH = 45; // distância RGB máxima até a cor da paleta (o antisserrilhado fica de fora e é coberto pelo crescimento)
const MIN_BLOB = 400; // manchas menores que isso são ruído de antisserrilhado
const GROW = 6; // px que as regiões crescem sobre linhas e bordas

const lum = (d: Buffer, i: number) => 0.299 * d[i * 4]! + 0.587 * d[i * 4 + 1]! + 0.114 * d[i * 4 + 2]!;

const CONFIG: Record<PoseName, PoseConfig> = {
  "neutral-front": {
    palette: [
      [[255, 255, 0], "traps"],
      [[255, 128, 0], "front-delts"],
      [[139, 69, 19], "side-delts"],
      [[255, 0, 0], "chest"],
      [[128, 0, 0], "chest"],
      [[0, 0, 255], "biceps"],
      [[0, 255, 255], "forearms"],
      [[0, 255, 0], "abs"],
      [[0, 100, 0], "obliques"],
      [[154, 205, 50], "serratus"],
      [[255, 0, 255], "thigh"],
      [[128, 0, 128], "thigh"],
      [[255, 105, 180], "lower-leg"],
      [[0, 128, 128], "lower-leg"],
    ],
    adjust(r, ctx) {
      neckCut(r.get("traps")!, ctx, 50);
      splitChest(r, ctx);
      splitThigh(r, ctx);
      splitLowerLeg(r, ctx);
    },
  },
  "neutral-back": {
    palette: [
      [[255, 255, 0], "traps"],
      [[255, 128, 0], "rear-delts"],
      [[128, 0, 128], "teres"],
      [[0, 255, 0], "lats"],
      [[139, 69, 19], "lower-back"],
      [[0, 0, 128], "triceps"],
      [[0, 255, 255], "forearms"],
      [[255, 0, 0], "hamstrings"],
      [[255, 105, 180], "calves"],
    ],
    adjust(r, ctx) {
      cutHands(r.get("forearms")!, ctx);
      r.set("glutes", shortsMask(ctx));
    },
  },
};

// ---------------------------------------------------------------- ajustes

/** Tira a parte central (pescoço) do trapézio na vista de frente. */
function neckCut(m: Uint8Array, { w, axis }: Ctx, half: number) {
  for (let i = 0; i < m.length; i++) if (m[i] && Math.abs((i % w) - axis) < half) m[i] = 0;
}

/** Peitoral: o terço de cima de cada coluna vira peitoral superior, o resto peitoral médio. */
function splitChest(r: Regions, { w, h }: Ctx) {
  const chest = r.get("chest")!;
  const upper = new Uint8Array(w * h);
  const mid = new Uint8Array(w * h);
  // Linha de corte por coluna, depois suavizada (média móvel) para não virar uma escada.
  const cut = new Float64Array(w).fill(NaN);
  for (let x = 0; x < w; x++) {
    let top = -1;
    let bot = -1;
    for (let y = 0; y < h; y++) if (chest[y * w + x]) (top < 0 && (top = y), (bot = y));
    if (top >= 0) cut[x] = top + (bot - top) * 0.4;
  }
  const R = 18;
  const smoothCut = cut.map((_, x) => {
    let s = 0;
    let n = 0;
    for (let k = x - R; k <= x + R; k++) if (k >= 0 && k < w && !Number.isNaN(cut[k]!)) (s += cut[k]!), n++;
    return n ? s / n : NaN;
  });
  for (let i = 0; i < chest.length; i++) if (chest[i]) ((i / w) | 0) < smoothCut[i % w]! ? (upper[i] = 1) : (mid[i] = 1);
  r.delete("chest");
  r.set("upper-chest", upper);
  r.set("mid-chest", mid);
}

/** Percorre cada linha de uma região, separando as duas pernas pelo eixo. */
function perLegRows(m: Uint8Array, { w, h, axis }: Ctx, fn: (y: number, x0: number, x1: number, inner: 1 | -1) => void) {
  for (let y = 0; y < h; y++)
    for (const [from, to, inner] of [[0, axis, 1], [axis, w, -1]] as const) {
      let x0 = -1;
      let x1 = -1;
      for (let x = from; x < to; x++) if (m[y * w + x]) (x0 < 0 && (x0 = x), (x1 = x));
      if (x0 >= 0) fn(y, x0, x1, inner);
    }
}

/** Coxa: a faixa interna do alto da coxa vira adutor (afinando para baixo); o resto é quadríceps. */
function splitThigh(r: Regions, ctx: Ctx) {
  const thigh = r.get("thigh")!;
  const { w, h } = ctx;
  const quads = thigh.slice();
  const add = new Uint8Array(w * h);
  let top = h;
  for (let i = 0; i < thigh.length; i++) if (thigh[i]) top = Math.min(top, (i / w) | 0);
  const LEN = 150;
  perLegRows(thigh, ctx, (y, x0, x1, inner) => {
    const t = (y - top) / LEN;
    if (t >= 1) return;
    const band = (x1 - x0) * 0.3 * (1 - t);
    for (let x = x0; x <= x1; x++) {
      const fromInner = inner === 1 ? x1 - x : x - x0;
      if (fromInner < band && thigh[y * w + x]) (add[y * w + x] = 1), (quads[y * w + x] = 0);
    }
  });
  r.delete("thigh");
  r.set("quads", quads);
  r.set("adductors", add);
}

/** Perna (frente): a parte interna é a panturrilha (gastrocnêmio medial), a externa é o tibial. */
function splitLowerLeg(r: Regions, ctx: Ctx) {
  const leg = r.get("lower-leg")!;
  const { w, h } = ctx;
  const calves = new Uint8Array(w * h);
  const tib = new Uint8Array(w * h);
  perLegRows(leg, ctx, (y, x0, x1, inner) => {
    const width = x1 - x0;
    for (let x = x0; x <= x1; x++) {
      if (!leg[y * w + x]) continue;
      const fromInner = inner === 1 ? x1 - x : x - x0;
      const fromOuter = width - fromInner;
      (fromInner < width * 0.38 || fromOuter < width * 0.1 ? calves : tib)[y * w + x] = 1;
    }
  });
  r.delete("lower-leg");
  r.set("calves", calves);
  r.set("tibialis", tib);
}

/** Antebraço (costas): o mapa pinta também as mãos. Corta abaixo do punho, que é onde a base afina. */
function cutHands(m: Uint8Array, ctx: Ctx) {
  // O punho é a linha mais estreita do antebraço na metade de baixo dele.
  perSide(m, ctx, (rows) => {
    const ys = [...rows.keys()].sort((a, b) => a - b);
    // Entre 45% e 80% da altura: abaixo disso os dedos separados também ficam estreitos.
    const lower = ys.slice(Math.floor(ys.length * 0.45), Math.floor(ys.length * 0.8));
    let wrist = lower[0]!;
    for (const y of lower) if (rows.get(y)! < rows.get(wrist)!) wrist = y;
    return (_x, y) => y > wrist + 4;
  });
}

/** Aplica um corte calculado separadamente para cada lado (rows = largura de cada linha). */
function perSide(m: Uint8Array, { w, h, axis }: Ctx, plan: (rows: Map<number, number>) => (x: number, y: number) => boolean) {
  for (const [from, to] of [[0, axis], [axis, w]] as const) {
    const rows = new Map<number, number>();
    for (let y = 0; y < h; y++) {
      let n = 0;
      for (let x = from; x < to; x++) n += m[y * w + x]!;
      if (n) rows.set(y, n);
    }
    if (!rows.size) continue;
    const drop = plan(rows);
    for (let y = 0; y < h; y++) for (let x = from; x < to; x++) if (m[y * w + x] && drop(x, y)) m[y * w + x] = 0;
  }
}

/** Glúteo (costas): fica todo debaixo do shorts, então a região é o próprio shorts (sem o cós). */
function shortsMask({ base, body, w, h, axis }: Ctx): Uint8Array {
  // O shorts é o bloco escuro na altura do quadril. A erosão separa ele do contorno preto,
  // que senão levaria o preenchimento para o corpo todo.
  const dark = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) dark[i] = body[i] && lum(base.data, i) < 110 ? 1 : 0;
  const core = morph(dark, w, h, 5, "erode");
  const seedY = Math.round(h * 0.52);
  let seed = -1;
  for (let y = seedY; y < h && seed < 0; y++) if (core[y * w + axis - 40]) seed = y * w + axis - 40;
  const blob = flood(core, w, h, seed);
  const grown = morph(blob, w, h, 5, "dilate");
  const out = grown.map((v, i) => v & dark[i]!);
  // Preenche as dobras claras: em cada linha, do primeiro ao último pixel escuro dentro do corpo.
  let top = h;
  let bot = 0;
  for (let i = 0; i < out.length; i++) if (out[i]) (top = Math.min(top, (i / w) | 0)), (bot = Math.max(bot, (i / w) | 0));
  const filled = new Uint8Array(w * h);
  for (let y = top + 30; y <= bot; y++)
    for (const [from, to] of [[0, axis], [axis, w]] as const) {
      let x0 = -1;
      let x1 = -1;
      for (let x = from; x < to; x++) if (out[y * w + x]) (x0 < 0 && (x0 = x), (x1 = x));
      for (let x = x0; x >= 0 && x <= x1; x++) if (body[y * w + x]) filled[y * w + x] = 1;
    }
  return filled;
}

// ---------------------------------------------------------------- utilitários

/** Erosão/dilatação com quadrado (2r+1)², feita em duas passadas (linhas e colunas). */
function morph(m: Uint8Array, w: number, h: number, r: number, op: "erode" | "dilate"): Uint8Array {
  const pick = op === "erode" ? (a: number, b: number) => a & b : (a: number, b: number) => a | b;
  const start = op === "erode" ? 1 : 0;
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = start;
      for (let d = -r; d <= r; d++) v = pick(v, m[y * w + Math.min(w - 1, Math.max(0, x + d))]!);
      tmp[y * w + x] = v;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = start;
      for (let d = -r; d <= r; d++) v = pick(v, tmp[Math.min(h - 1, Math.max(0, y + d)) * w + x]!);
      out[y * w + x] = v;
    }
  return out;
}

function flood(m: Uint8Array, w: number, h: number, seed: number): Uint8Array {
  const out = new Uint8Array(w * h);
  if (seed < 0 || !m[seed]) return out;
  const st = [seed];
  out[seed] = 1;
  while (st.length) {
    const i = st.pop()!;
    const x = i % w;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w])
      if (j >= 0 && j < w * h && m[j] && !out[j]) (out[j] = 1), st.push(j);
  }
  return out;
}

/** Silhueta: tudo que não é o branco conectado às bordas (nem os buracos indicados). */
function bodyMask(img: Img, holes: [number, number][] = []): Uint8Array {
  const { w, h, data } = img;
  const light = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) light[i] = lum(data, i) > LIGHT ? 1 : 0;
  const bg = new Uint8Array(w * h);
  const seeds = [...holes.map(([x, y]) => y * w + x)];
  for (let x = 0; x < w; x++) seeds.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) seeds.push(y * w, y * w + w - 1);
  const st: number[] = [];
  for (const s of seeds) if (light[s] && !bg[s]) (bg[s] = 1), st.push(s);
  while (st.length) {
    const i = st.pop()!;
    const x = i % w;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w])
      if (j >= 0 && j < w * h && light[j] && !bg[j]) (bg[j] = 1), st.push(j);
  }
  return bg.map((v) => 1 - v);
}

/** Remove componentes conexos menores que `min` px. */
function dropSmall(m: Uint8Array, w: number, h: number, min: number) {
  const seen = new Uint8Array(w * h);
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || seen[s]) continue;
    const comp = [s];
    seen[s] = 1;
    for (let k = 0; k < comp.length; k++) {
      const i = comp[k]!;
      const x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w])
        if (j >= 0 && j < w * h && m[j] && !seen[j]) (seen[j] = 1), comp.push(j);
    }
    if (comp.length < min) for (const i of comp) m[i] = 0;
  }
}

/** Busca em largura a partir de todas as regiões ao mesmo tempo: cada pixel livre vai para a região mais próxima. */
function grow(labels: Int16Array, blocked: Uint8Array, w: number, h: number, steps: number) {
  let frontier: number[] = [];
  for (let i = 0; i < labels.length; i++) if (labels[i]! > 0) frontier.push(i);
  for (let s = 0; s < steps && frontier.length; s++) {
    const next: number[] = [];
    for (const i of frontier) {
      const x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w])
        if (j >= 0 && j < w * h && labels[j] === 0 && !blocked[j]) (labels[j] = labels[i]!), next.push(j);
    }
    frontier = next;
  }
}

/** Máscara 0/1 → cinza 0..255 com a borda suavizada (média 3x3), recortada no bbox. */
function toPng(m: Uint8Array, w: number, h: number) {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let i = 0; i < m.length; i++)
    if (m[i]) {
      const x = i % w;
      const y = (i / w) | 0;
      x0 = Math.min(x0, x), x1 = Math.max(x1, x), y0 = Math.min(y0, y), y1 = Math.max(y1, y);
    }
  if (x1 < 0) return null;
  (x0 = Math.max(0, x0 - 1)), (y0 = Math.max(0, y0 - 1)), (x1 = Math.min(w - 1, x1 + 1)), (y1 = Math.min(h - 1, y1 + 1));
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const png = new PNG({ width: bw, height: bh, colorType: 0 });
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const X = x0 + x + dx;
          const Y = y0 + y + dy;
          if (X >= 0 && Y >= 0 && X < w && Y < h) s += m[Y * w + X]!;
        }
      const v = Math.round((s / 9) * 255);
      const o = (y * bw + x) * 4;
      png.data[o] = png.data[o + 1] = png.data[o + 2] = v;
      png.data[o + 3] = 255;
    }
  return { png: PNG.sync.write(png, { colorType: 0 }), box: { x: x0, y: y0, w: bw, h: bh } };
}

async function readPng(file: string, w?: number, h?: number): Promise<Img> {
  const p = PNG.sync.read(await readFile(file));
  // Imagens geradas às vezes saem com 1 px a mais: corta para o tamanho da base.
  if (w && h && (p.width !== w || p.height !== h)) {
    if (Math.abs(p.width - w) > 2 || Math.abs(p.height - h) > 2) throw new Error(`${file}: ${p.width}x${p.height}, esperado ${w}x${h}`);
    const data = Buffer.alloc(w * h * 4, 255);
    for (let y = 0; y < Math.min(h, p.height); y++) p.data.copy(data, y * w * 4, y * p.width * 4, y * p.width * 4 + Math.min(w, p.width) * 4);
    return { w, h, data };
  }
  return { w: p.width, h: p.height, data: p.data };
}

// ---------------------------------------------------------------- pose

async function prepPose(name: PoseName) {
  const cfg = CONFIG[name];
  const dir = `assets/poses/${name}`;
  const base = await readPng(`assets/poses/${name}.png`, 768, 1376);
  const { w, h } = base;
  const body = bodyMask(base, cfg.holes);
  const ctx: Ctx = { base, body, w, h, axis: w / 2 };

  // Figura com o fundo transparente.
  const fig = new PNG({ width: w, height: h });
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let i = 0; i < w * h; i++) {
    if (!body[i]) continue;
    base.data.copy(fig.data, i * 4, i * 4, i * 4 + 3);
    fig.data[i * 4 + 3] = 255;
    const x = i % w;
    const y = (i / w) | 0;
    x0 = Math.min(x0, x), x1 = Math.max(x1, x), y0 = Math.min(y0, y), y1 = Math.max(y1, y);
  }

  // 1. Cor mais próxima da paleta.
  const map = await readPng(`assets/poses/${name}.map.png`, w, h);
  const labels = [...new Set(cfg.palette.map(([, l]) => l))];
  const lab = new Int16Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = map.data[i * 4]!, g = map.data[i * 4 + 1]!, b = map.data[i * 4 + 2]!;
    let best = 0;
    let bestD = MATCH;
    for (const [[pr, pg, pb], l] of cfg.palette) {
      const d = Math.hypot(r - pr, g - pg, b - pb);
      if (d < bestD) (bestD = d), (best = labels.indexOf(l) + 1);
    }
    lab[i] = best;
  }
  // 2. Ruído de antisserrilhado.
  for (let k = 1; k <= labels.length; k++) {
    const m = new Uint8Array(w * h);
    for (let i = 0; i < m.length; i++) m[i] = lab[i] === k ? 1 : 0;
    dropSmall(m, w, h, MIN_BLOB);
    for (let i = 0; i < m.length; i++) if (lab[i] === k && !m[i]) lab[i] = 0;
  }
  // 3. Cresce sobre linhas e bordas, sem entrar na pele branca do mapa (mãos, pescoço, meias).
  const blocked = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = map.data[i * 4]!, g = map.data[i * 4 + 1]!, b = map.data[i * 4 + 2]!;
    blocked[i] = !body[i] || (Math.min(r, g, b) > 215 && Math.max(r, g, b) - Math.min(r, g, b) < 30) ? 1 : 0;
  }
  grow(lab, blocked, w, h, GROW);

  const regions: Regions = new Map();
  labels.forEach((l, k) => {
    const m = new Uint8Array(w * h);
    for (let i = 0; i < m.length; i++) m[i] = lab[i] === k + 1 && body[i] ? 1 : 0;
    regions.set(l, m);
  });
  // 4. Ajustes da pose.
  cfg.adjust?.(regions, ctx);

  // 5. Saída.
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/figure.png`, PNG.sync.write(fig));
  const muscles: Record<string, { x: number; y: number; w: number; h: number }> = {};
  for (const [id, m] of regions) {
    for (let i = 0; i < m.length; i++) m[i] = m[i]! & body[i]!;
    const out = toPng(m, w, h);
    if (!out) continue;
    await writeFile(`${dir}/${id}.png`, out.png);
    muscles[id] = out.box;
  }
  const meta = { size: { w, h }, body: { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }, muscles };
  await writeFile(`${dir}/meta.json`, JSON.stringify(meta, null, 2) + "\n");
  console.log(`✓ ${name}: ${Object.keys(muscles).length} músculos (${Object.keys(muscles).join(", ")})`);
}

const only = process.argv.slice(2);
for (const name of Object.keys(CONFIG) as PoseName[]) if (!only.length || only.includes(name)) await prepPose(name);
