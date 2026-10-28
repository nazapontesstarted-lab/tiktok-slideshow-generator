import {
  POSES,
  anatomySvg,
  hiddenMuscles,
  resolveViews,
  type FigureOptions,
  type Highlight,
  type PoseName,
  type ViewOption,
} from "./anatomy";
import type { Tag, Theme } from "./schema";

export interface Ctx {
  index: number;
  total: number;
  theme: Theme;
}

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]!);

/** Texto com destaque: `{palavra}` vira cor de destaque, `\n` vira quebra de linha. */
export const rich = (s: string) =>
  esc(s)
    .replace(/\{([^}]+)\}/g, '<span class="text-accent">$1</span>')
    .replace(/\n/g, "<br>");

export const tag = (t: Tag) => `<span class="tag tag-${t.color}">${esc(t.label)}</span>`;

export const kicker = (k?: string) => (k ? `<div class="kicker">${esc(k)}</div>` : "");

interface Word {
  w: string;
  accent: boolean;
}

/** Palavras de uma linha, marcando as que estão entre `{ }`. */
function wordsOf(line: string): Word[] {
  const out: Word[] = [];
  let accent = false;
  for (const part of line.split(/(\{|\})/)) {
    if (part === "{") accent = true;
    else if (part === "}") accent = false;
    else for (const w of part.split(/\s+/).filter(Boolean)) out.push({ w, accent });
  }
  return out;
}

/** Divide as palavras em duas linhas de tamanho parecido. */
function splitBalanced(words: Word[]): Word[][] {
  if (words.length < 2) return [words];
  const total = words.reduce((n, x) => n + x.w.length, 0) + words.length - 1;
  let best = 1;
  let bestDiff = Infinity;
  let before = 0;
  for (let i = 1; i < words.length; i++) {
    before += words[i - 1]!.w.length + 1;
    const diff = Math.abs(before - 1 - (total - before));
    if (diff < bestDiff) (bestDiff = diff), (best = i);
  }
  return [words.slice(0, best), words.slice(best)];
}

/**
 * Título em fonte condensada, uma linha por bloco, cada linha ajustada à largura da coluna
 * (data-fit = tamanho máximo em px; o script de ajuste cresce a fonte até preencher a largura).
 * Cores: com `{ }` só as palavras marcadas ficam no destaque; sem, a última linha é o destaque
 * e as anteriores ficam pretas. Sem `\n`, o título é dividido em duas linhas equilibradas.
 */
export function displayTitle(title: string, o: { max?: number; min?: number; className?: string } = {}): string {
  const hasBraces = /\{[^}]+\}/.test(title);
  const raw = title.split("\n").map((l) => l.trim()).filter(Boolean);
  const lines = raw.length > 1 ? raw.map(wordsOf) : splitBalanced(wordsOf(raw[0] ?? ""));
  const lastIdx = lines.length - 1;

  const html = lines
    .map((words, i) => {
      const text = words
        .map((x) => {
          const accent = hasBraces ? x.accent : lines.length > 1 && i === lastIdx;
          return accent ? `<span class="text-accent">${esc(x.w)}</span>` : esc(x.w);
        })
        .join(" ");
      // O espaçamento entre linhas do título é bem apertado: acento em maiúscula sobe acima das
      // letras (respiro em cima) e o Ç desce (respiro embaixo, no tamanho da própria linha).
      const plain = words.map((x) => x.w).join("");
      const gap =
        (i > 0 && /[áéíóúâêôãõà]/i.test(plain) ? " pt-[0.24em]" : "") + (i < lastIdx && /ç/i.test(plain) ? " pb-[0.18em]" : "");
      return `<span class="block whitespace-nowrap${gap}" data-fit="${o.max ?? 120}" data-min="${o.min ?? 40}">${text}</span>`;
    })
    .join("");
  return `<h2 class="h-title ${o.className ?? ""}" aria-label="${esc(title.replace(/[{}]/g, "").replace(/\n/g, " "))}">${html}</h2>`;
}

/** Cabeçalho dos slides empilhados: kicker, título em duas linhas e subtítulo de apoio (Inter). */
export function heading(o: { kicker?: string; title: string; subtitle?: string; max?: number }): string {
  return (
    kicker(o.kicker) +
    displayTitle(o.title, { max: o.max ?? 112, className: o.kicker ? "mt-7" : "" }) +
    (o.subtitle ? `<p class="subtitle mt-5">${rich(o.subtitle)}</p>` : "")
  );
}

/**
 * Figura(s) anatômica(s) ocupando o espaço flexível restante.
 * `single`: no layout lateral, "auto" mostra só a melhor vista (frente ou costas), nunca as duas.
 */
export function figure(
  highlights: Highlight[],
  view: ViewOption,
  fig: FigureOptions,
  className = "",
  single = false,
  pose?: PoseName,
): string {
  // Com pose, a vista é a da pose (e só no estilo illustration, que é o único com poses).
  const usePose = pose && (fig.style ?? "illustration") === "illustration" ? pose : undefined;
  const views = usePose ? [POSES[usePose].view] : resolveViews(view, highlights, !single);
  const hidden = hiddenMuscles(highlights, views, fig.style, usePose);
  if (hidden.length) console.warn(`  ⚠ não aparecem na vista "${views.join("+")}": ${hidden.join(", ")} — use view "auto" ou "both"`);
  const captions = views.length > 1;
  return (
    `<div class="flex-1 min-h-0 flex gap-2 ${className}">` +
    views
      .map(
        (v) =>
          `<div class="flex-1 flex flex-col">` +
          `<div class="relative flex-1 min-h-0">${anatomySvg({ view: v, pose: usePose, highlights, ...fig, className: "absolute inset-0 w-full h-full" })}</div>` +
          (captions
            ? `<div class="mt-5 text-center text-[22px] font-bold tracking-[0.18em] text-neutral-400">${v === "front" ? "FRENTE" : "COSTAS"}</div>`
            : "") +
          `</div>`,
      )
      .join("") +
    `</div>`
  );
}

/** Layout lateral: texto na coluna esquerda (~45%) e figura na direita (~55%). */
export const side = (left: string, right: string) =>
  `<div class="flex h-full w-full items-stretch gap-4">` +
  `<div class="flex w-[45%] min-w-0 flex-col">${left}</div>` +
  `<div class="flex w-[55%] min-w-0 flex-col">${right}</div>` +
  `</div>`;

export const ICONS = {
  bookmark: `<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>`,
  share: `<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>`,
  follow: `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>`,
  check: `<polyline points="20 6 9 17 4 12"/>`,
  cross: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
  arrow: `<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>`,
  target: `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
  plus: `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`,
  bars: `<line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="9"/><line x1="18" y1="20" x2="18" y2="4"/>`,
  bolt: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
};

/** Fundo em pincelada (bordas irregulares), esticado para cobrir o pai (que precisa ser posicionado). */
export const brush = (cls: string) =>
  `<svg class="absolute inset-0 h-full w-full ${cls}" viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true">` +
  `<path fill="currentColor" d="M8 13 L22 6 L60 10 L95 4 L140 9 L185 3 L230 8 L275 4 L320 9 L360 5 L392 10 L386 24 L398 38 L390 52 L397 68 L388 82 L395 94 L350 90 L310 96 L262 91 L215 97 L170 92 L125 97 L80 92 L40 96 L6 91 L12 76 L2 60 L10 46 L3 30 Z"/>` +
  `<path fill="currentColor" d="M300 0 L340 2 L330 5 Z M60 98 L100 100 L90 97 Z"/>` +
  `</svg>`;

export const icon = (name: keyof typeof ICONS, cls: string, stroke = 2.4) =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

/** Barra de CTA no rodapé da área segura. `{trecho}` fica na cor de destaque. */
export const ctaBar = (text: string) =>
  `<footer class="absolute inset-x-[64px] bottom-[340px] flex h-[108px] items-center gap-5 px-9 text-white">` +
  brush("text-ink") +
  icon("bookmark", "relative h-[46px] w-[46px] shrink-0 text-accent", 2.4) +
  `<div class="relative min-w-0 flex-1 text-center"><span class="block whitespace-nowrap font-display uppercase leading-none tracking-[0.03em]" data-fit="54" data-min="28">${rich(text)}</span></div>` +
  `</footer>`;

const CTA_BAR_SPACE = 108 + 36; // altura da barra + respiro

/** Moldura 1080x1920 com header (handle, contador, progresso), área segura e CTA no rodapé. */
export function frame(inner: string, { index, total, theme }: Ctx, cta?: string): string {
  const handle = theme.handle
    ? `<div class="flex items-center gap-4"><span class="h-[14px] w-[14px] rounded-full bg-accent"></span><span class="text-[30px] font-semibold tracking-[-0.01em] text-ink">${esc(theme.handle)}</span></div>`
    : `<div></div>`;
  const counter = theme.counter
    ? `<span class="text-[28px] font-semibold tabular-nums text-neutral-400">${index + 1}<span class="text-neutral-300">/${total}</span></span>`
    : "";
  const progress = theme.progress
    ? `<div class="mt-6 flex gap-2">${Array.from({ length: total }, (_, i) => `<span class="h-[6px] flex-1 rounded-full ${i <= index ? "bg-accent" : "bg-neutral-100"}"></span>`).join("")}</div>`
    : "";

  return (
    `<section class="relative h-[1920px] w-[1080px] overflow-hidden bg-white font-sans text-ink">` +
    `<header class="absolute inset-x-[64px] top-[150px]"><div class="flex h-[48px] items-center justify-between">${handle}${counter}</div>${progress}</header>` +
    `<main class="absolute inset-x-[64px] top-[290px] flex flex-col justify-center" style="bottom:${340 + (cta ? CTA_BAR_SPACE : 0)}px">${inner}</main>` +
    (cta ? ctaBar(cta) : "") +
    `</section>`
  );
}

/**
 * Ajusta o tamanho da fonte dos elementos [data-fit] para preencher a largura do contêiner,
 * até o máximo (data-fit) e sem passar do mínimo (data-min). Roda depois das fontes carregarem.
 * Fica numa string porque é executado no navegador (também funciona nos .html de debug).
 */
export const FIT_SCRIPT = `
window.__fit = function () {
  document.querySelectorAll('[data-fit]').forEach(function (el) {
    var max = parseFloat(el.getAttribute('data-fit')) || 100;
    var min = parseFloat(el.getAttribute('data-min')) || 24;
    var box = el.parentElement;
    var cs = getComputedStyle(box);
    var target = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    el.style.fontSize = '100px';
    var oldWidth = el.style.width;
    el.style.width = 'max-content';
    var w = el.getBoundingClientRect().width;
    el.style.width = oldWidth;
    var size = w > 0 ? (target / w) * 100 : max;
    el.style.fontSize = Math.max(min, Math.min(max, size)) + 'px';
  });
};
document.fonts.ready.then(window.__fit);
`;

/** Overlay das áreas cobertas pela UI do TikTok (flag --guides). */
export const GUIDES =
  `<div style="position:fixed;inset:0;pointer-events:none">` +
  `<div style="position:absolute;left:0;right:0;top:0;height:140px;background:rgba(255,0,80,.18)"></div>` +
  `<div style="position:absolute;left:0;right:0;bottom:0;height:380px;background:rgba(255,0,80,.18)"></div>` +
  `<div style="position:absolute;right:0;top:760px;width:140px;height:780px;background:rgba(255,0,80,.18)"></div>` +
  `</div>`;
