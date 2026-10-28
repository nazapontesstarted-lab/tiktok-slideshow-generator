import { BACK, DETAILS, EAR, FRONT, HEAD, SHORTS, SHORTS_LINES, SILHOUETTE, mirror } from "./paths";
import { DEFAULT_POSE, POSES, poseHas, poseMeta, poseUri, type PoseName } from "./poses";
import { MUSCLES, type BodyView, type MuscleId } from "./registry";

export type Focus = "full" | "upper" | "lower";
export type ViewOption = "auto" | "front" | "back" | "both";

/** Um grupo de destaque: todos os IDs recebem a mesma cor e entram juntos na legenda. */
export interface Highlight {
  ids: MuscleId[];
  names: string[];
  color: string; // valor CSS já resolvido
  label?: string;
  note?: string;
}

// Cores da legenda. "accent" segue o tema (--accent-rgb), com fallback para o vermelho padrão.
export const COLORS = {
  accent: "rgb(var(--accent-rgb, 225 29 46))",
  "accent-soft": "rgb(var(--accent-rgb, 225 29 46) / 0.38)",
  blue: "#3b82f6",
  cyan: "#06b6d4",
  purple: "#a855f7",
  pink: "#ec4899",
  red: "#ef4444",
  amber: "#f59e0b",
  gold: "#e0a526",
  gray: "#9ca3af",
  dark: "#0a0a0a",
} as const;

export type ColorName = keyof typeof COLORS;
export const colorValue = (c: string) => COLORS[c as ColorName] ?? c;

/**
 * lineart: ilustração estilo "gym infographic" — pele branca, contorno preto,
 *          linhas de definição, músculo-alvo preenchido com sombreado, shorts pretos.
 * flat:    silhueta cinza com músculos chapados (estilo app Arrow).
 */
export type FigureStyle = "illustration" | "lineart" | "flat";

export interface FigureOptions {
  /** illustration: ilustração raster da pose (assets/poses) + máscaras dos músculos por cima (padrão). */
  style?: FigureStyle;
  /** "auto": shorts no line art, exceto quando um músculo coberto por eles está destacado. Só vale para lineart. */
  shorts?: boolean | "auto";
}

const INK = "#161616";

export const ANATOMY_CSS =
  // illustration: a cor multiplica o desenho (traço e pontilhado continuam visíveis)
  ".anatomy--illustration .muscles{mix-blend-mode:multiply}" +
  ".anatomy--illustration .muscles--over{mix-blend-mode:normal}" +
  ".anatomy--illustration .muscle rect{fill:var(--hl)}" +
  ".anatomy--illustration .muscles--over rect{opacity:.85}" +
  // flat
  ".anatomy .skin path,.anatomy .head{fill:#eef0f3;stroke:#eef0f3;stroke-width:1.2;stroke-linejoin:round}" +
  ".anatomy .muscle path{fill:var(--hl,#dcdfe5);stroke:#fff;stroke-width:1.5;stroke-linejoin:round}" +
  ".anatomy .muscle path.shade{fill:url(#mu-shade);stroke:none}" +
  ".anatomy .muscle.is-active path.shade{fill:url(#hl-shade)}" +
  `.anatomy .shorts path{fill:${INK};stroke:${INK};stroke-width:1;stroke-linejoin:round}` +
  ".anatomy .shorts-lines path{fill:none;stroke:#3f3f3f;stroke-width:0.9;stroke-linecap:round}" +
  // line art
  ".anatomy--lineart .skin path{fill:#fff;stroke:#fff}" +
  `.anatomy--lineart .head,.anatomy--lineart .ear{fill:#fff;stroke:${INK};stroke-width:2}` +
  `.anatomy--lineart .muscle path{fill:var(--hl,#fff);stroke:${INK};stroke-width:0.95;stroke-linejoin:round}` +
  `.anatomy--lineart .contour path{fill:none;stroke:${INK};stroke-width:2.2;stroke-linejoin:round;stroke-linecap:round}` +
  `.anatomy--lineart .details path{fill:none;stroke:${INK};stroke-width:0.8;stroke-linecap:round}`;

// Escurece as bordas de cada músculo (objectBoundingBox → um gradiente por path):
// forte nos destacados, sutil nos demais para dar volume.
const shadeGradient = (id: string, opacity: number) =>
  `<radialGradient id="${id}" cx="50%" cy="42%" r="62%">` +
  `<stop offset="45%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="${opacity}"/>` +
  `</radialGradient>`;
const SHADE_DEFS = `<defs>${shadeGradient("hl-shade", 0.28)}${shadeGradient("mu-shade", 0.07)}</defs>`;

const SHORTS_COVER: MuscleId[] = ["glutes", "adductors", "hamstrings", "quads"];

const VIEWBOX: Record<Focus, string> = {
  full: "8 2 184 452",
  upper: "14 60 172 196",
  lower: "36 216 128 236",
};

/** Mapa músculo → cor. Se um músculo aparece em dois grupos, vale o primeiro. */
export function colorMap(highlights: Highlight[]): Map<MuscleId, string> {
  const map = new Map<MuscleId, string>();
  for (const h of highlights) for (const id of h.ids) if (!map.has(id)) map.set(id, h.color);
  return map;
}

const allIds = (highlights: Highlight[]) => [...new Set(highlights.flatMap((h) => h.ids))];

/** IDs destacados que não existem em nenhuma das vistas renderizadas (ex.: biceps só com "back"). */
export function hiddenMuscles(highlights: Highlight[], views: BodyView[], style: FigureStyle = "illustration", pose?: PoseName): MuscleId[] {
  const has = (v: BodyView, id: MuscleId) =>
    style === "illustration" ? poseHas(pose ?? DEFAULT_POSE[v], id) : !!(v === "front" ? FRONT : BACK)[id];
  return allIds(highlights).filter((id) => !views.some((v) => has(v, id)));
}

/** "auto": frente, costas ou ambas, conforme a melhor vista de cada músculo destacado. */
export function resolveViews(view: ViewOption, highlights: Highlight[], allowBoth = true): BodyView[] {
  if (view === "both") return ["front", "back"];
  if (view !== "auto") return [view];
  const ids = allIds(highlights);
  const front = ids.filter((id) => MUSCLES[id].best === "front").length;
  const back = ids.length - front;
  if (allowBoth && front > 0 && back > 0) return ["front", "back"];
  return back > front ? ["back"] : ["front"];
}

export function autoFocus(highlights: Highlight[]): Focus {
  const ids = allIds(highlights);
  if (ids.length === 0) return "full";
  if (ids.every((id) => MUSCLES[id].region === "upper")) return "upper";
  if (ids.every((id) => MUSCLES[id].region === "lower")) return "lower";
  return "full";
}

export interface AnatomyOptions extends FigureOptions {
  view: BodyView;
  /** Pose da ilustração (só no estilo illustration). Sem pose, usa a neutra da vista. */
  pose?: PoseName;
  highlights?: Highlight[];
  focus?: Focus;
  className?: string;
  /** Inclui <style> e xmlns para salvar como .svg independente. */
  standalone?: boolean;
}

const pair = (d: string) => `<path d="${d}"/><path d="${mirror(d)}"/>`;
const ellipse = (cls: string, e: { cx: number; cy: number; rx: number; ry: number }) =>
  `<ellipse class="${cls}" cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}"/>`;

/**
 * Figura anatômica faceless. Estrutura:
 *   <svg class="anatomy anatomy--lineart" data-view="back">
 *     <g class="skin">…</g>
 *     <g class="muscles">
 *       <g id="lats" class="muscle is-active" data-muscle="lats" style="--hl:#22c55e">
 *         <path data-side="left" …/><path data-side="right" …/>
 *       </g>
 *     </g>
 *     <g class="details|contour|shorts">…</g>  (line art)
 *   Evite nomes de classe que coincidam com utilitários do Tailwind (ex.: "outline").
 */
// Músculos que ficam debaixo do shorts: a região é o próprio shorts, tingido com blend normal
// (multiplicar sobre o preto não mostraria a cor).
const OVER_SHORTS: MuscleId[] = ["glutes"];

/** viewBox a partir do bbox do corpo: corpo inteiro, metade de cima ou metade de baixo. */
function poseViewBox(pose: PoseName, focus: Focus): string {
  const { x, y, w, h } = poseMeta(pose).body;
  const pad = 10;
  const [top, bottom] =
    focus === "upper" ? [y - pad, y + h * 0.6] : focus === "lower" ? [y + h * 0.42, y + h + pad] : [y - pad, y + h + pad];
  return [x - pad, Math.round(top), w + 2 * pad, Math.round(bottom - top)].join(" ");
}

/**
 * Estilo "illustration": <image> da pose + um <rect> por músculo destacado, recortado pela máscara
 * dele (assets/poses/<pose>/<musculo>.png) e pintado com mix-blend-mode multiply, então o
 * sombreamento da ilustração continua visível por baixo da cor.
 * Só os músculos destacados viram elementos; o resto já está desenhado na imagem.
 */
function illustrationSvg(o: AnatomyOptions): string {
  const colors = colorMap(o.highlights ?? []);
  const pose = o.pose ?? DEFAULT_POSE[o.view];
  const meta = poseMeta(pose);
  const view = POSES[pose].view;
  const { w, h } = meta.size;

  let defs = "";
  const layer = (over: boolean) =>
    [...colors]
      .filter(([id]) => meta.muscles[id] && OVER_SHORTS.includes(id) === over)
      .map(([id, color]) => {
        const b = meta.muscles[id]!;
        const mask = `mm-${pose}-${id}`;
        defs +=
          `<mask id="${mask}" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">` +
          `<image href="${poseUri(pose, `${id}.png`)}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/></mask>`;
        return (
          `<g id="${over ? "" : id}" class="muscle is-active" data-muscle="${id}" style="--hl:${color}"><title>${MUSCLES[id].label}</title>` +
          `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" mask="url(#${mask})"/></g>`
        );
      })
      .join("");

  const under = layer(false);
  const over = layer(true);
  const ns = o.standalone ? ` xmlns="http://www.w3.org/2000/svg"` : "";
  const style = o.standalone ? `<style>${ANATOMY_CSS}</style>` : "";
  return (
    `<svg${ns} class="anatomy anatomy--illustration ${o.className ?? ""}" data-view="${view}" data-pose="${pose}" viewBox="${poseViewBox(pose, o.focus ?? "full")}" preserveAspectRatio="xMidYMid meet">` +
    style +
    (defs ? `<defs>${defs}</defs>` : "") +
    `<image href="${poseUri(pose, "figure.png")}" width="${w}" height="${h}"/>` +
    (under ? `<g class="muscles">${under}</g>` : "") +
    (over ? `<g class="muscles muscles--over">${over}</g>` : "") +
    `</svg>`
  );
}

export function anatomySvg(o: AnatomyOptions): string {
  if ((o.style ?? "illustration") === "illustration") return illustrationSvg(o);
  const highlights = o.highlights ?? [];
  const colors = colorMap(highlights);
  const paths = o.view === "front" ? FRONT : BACK;
  const lineart = o.style === "lineart";
  const shorts =
    o.shorts === true ||
    ((o.shorts ?? "auto") === "auto" && lineart && !allIds(highlights).some((id) => SHORTS_COVER.includes(id)));

  const muscles = Object.entries(paths)
    .map(([key, ds]) => {
      const id = key as MuscleId;
      const color = colors.get(id);
      const attrs = color ? ` class="muscle is-active" style="--hl:${color}"` : ` class="muscle"`;
      const sides = ds!
        .map((d) => {
          const shade = lineart ? `<path class="shade" d="${d}"/><path class="shade" d="${mirror(d)}"/>` : "";
          return `<path data-side="left" d="${d}"/><path data-side="right" d="${mirror(d)}"/>${shade}`;
        })
        .join("");
      return `<g id="${id}"${attrs} data-muscle="${id}"><title>${MUSCLES[id].label}</title>${sides}</g>`;
    })
    .join("");

  // O contorno usa os paths abertos (sem o Z), para não traçar uma linha no eixo central.
  const outline = lineart
    ? `<g class="details">${DETAILS[o.view].map(pair).join("")}</g>` +
      `<g class="contour">${pair(SILHOUETTE.replace(/Z$/, ""))}</g>`
    : "";
  const shortsSvg = shorts
    ? `<g class="shorts">${pair(SHORTS)}</g><g class="shorts-lines">${SHORTS_LINES.map(pair).join("")}</g>`
    : "";
  const head =
    (lineart ? ellipse("ear", EAR) + ellipse("ear", { ...EAR, cx: 2 * 100 - EAR.cx }) : "") + ellipse("head", HEAD);

  const ns = o.standalone ? ` xmlns="http://www.w3.org/2000/svg"` : "";
  const style = o.standalone ? `<style>${ANATOMY_CSS}</style>` : "";
  return (
    `<svg${ns} class="anatomy anatomy--${lineart ? "lineart" : "flat"} ${o.className ?? ""}" data-view="${o.view}" viewBox="${VIEWBOX[o.focus ?? "full"]}" preserveAspectRatio="xMidYMid meet">` +
    style +
    (lineart ? SHADE_DEFS : "") +
    `<g class="skin">${pair(SILHOUETTE)}</g>` +
    `<g class="muscles">${muscles}</g>` +
    outline +
    shortsSvg +
    head +
    `</svg>`
  );
}
