import { resolveViews } from "../anatomy";
import { highlightsOf, type SlideOf, type Theme } from "../schema";
import { brush, displayTitle, esc, figure, icon, rich, side, tag, type ICONS } from "../ui";

const BENEFIT_ICONS: (keyof typeof ICONS)[] = ["bolt", "plus", "bars"];

export function exercise(s: SlideOf<"exercise">, theme: Theme): string {
  const highlights = highlightsOf(s);
  // Rank: número grande sobre uma pincelada na cor de destaque.
  const badges =
    (s.rank !== undefined
      ? `<span class="relative inline-flex items-center px-14 py-3">${brush("text-accent")}` +
        `<span class="relative font-display text-[76px] leading-none text-white">${s.rank}</span></span>`
      : "") + s.tags.map(tag).join("");
  const badgeRow = badges ? `<div class="mb-7 flex flex-wrap items-center gap-3">${badges}</div>` : "";

  // O que treina: texto próprio ou os nomes do primeiro grupo de destaque.
  const target = s.target ?? highlights[0]?.names.join(" + ");

  const targetBox = target
    ? `<div class="mt-8 flex items-center gap-5 rounded-[24px] bg-ink px-6 py-5">` +
      icon("target", "h-[52px] w-[52px] shrink-0 text-accent", 2.2) +
      `<div class="min-w-0 font-display text-[38px] uppercase leading-[1.08] tracking-[0.01em]">` +
      `<span class="text-white">Treina: </span><span class="text-accent">${esc(target)}</span></div></div>`
    : "";

  const metric = (label: string, value: string | undefined) =>
    value
      ? `<div class="flex-1 rounded-[24px] border-[3px] border-accent bg-white px-3 py-4 text-center">` +
        `<div class="flex h-[72px] items-center justify-center font-display leading-none"><span class="block whitespace-nowrap" data-fit="72" data-min="30">${esc(value)}</span></div>` +
        `<div class="mt-2 font-display text-[26px] uppercase leading-none tracking-[0.04em] text-ink">${label}</div></div>`
      : "";
  const metrics = [metric("Séries", s.sets), metric("Reps", s.reps), metric("Descanso", s.rest)].join("");
  const metricRow = metrics ? `<div class="mt-5 flex gap-3">${metrics}</div>` : "";

  // Benefícios: ícone num círculo preto e linha divisória entre os itens; `{trecho}` fica no destaque.
  const benefits = s.benefits.length
    ? `<ul class="mt-5 flex flex-col divide-y-2 divide-accent/30">` +
      s.benefits
        .map(
          (b, i) =>
            `<li class="flex items-center gap-4 py-4 text-[30px] font-bold leading-snug tracking-[-0.01em] text-ink">` +
            `<span class="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full bg-ink text-white">` +
            icon(BENEFIT_ICONS[i % BENEFIT_ICONS.length]!, "h-[30px] w-[30px]", 2.6) +
            `</span><span>${rich(b)}</span></li>`,
        )
        .join("") +
      `</ul>`
    : "";

  if (s.layout === "side") {
    const text =
      `<div class="flex h-full flex-col justify-center">` +
      badgeRow +
      displayTitle(s.name, { max: 150 }) +
      (s.description ? `<p class="subtitle mt-6 !text-[32px]">${rich(s.description)}</p>` : "") +
      targetBox +
      metricRow +
      benefits +
      `</div>`;
    return side(text, figure(highlights, s.view, theme.figure, "", true, s.pose));
  }

  // stacked: figura embaixo; com uma vista, as barras de `stats` ficam ao lado dela.
  const stats = s.stats
    .map(
      (st) =>
        `<div>` +
        `<div class="flex items-baseline justify-between"><span class="text-[28px] font-semibold text-neutral-500">${esc(st.label)}</span>` +
        `<span class="text-[30px] font-bold tabular-nums">${st.value}<span class="text-neutral-300">/10</span></span></div>` +
        `<div class="mt-3 flex gap-[6px]">${Array.from({ length: 10 }, (_, i) => `<span class="h-[16px] flex-1 rounded-[5px] ${i < Math.round(st.value) ? "bg-accent" : "bg-neutral-100"}"></span>`).join("")}</div>` +
        `</div>`,
    )
    .join("");
  const twoViews = resolveViews(s.view, highlights).length > 1;
  return (
    badgeRow +
    displayTitle(s.name, { max: 130 }) +
    (s.description ? `<p class="subtitle mt-5">${rich(s.description)}</p>` : "") +
    metricRow +
    (twoViews
      ? figure(highlights, s.view, theme.figure, "mt-8", false, s.pose) + (stats ? `<div class="mt-10 grid grid-cols-2 gap-x-12 gap-y-8">${stats}</div>` : "")
      : `<div class="mt-8 flex min-h-0 flex-1 gap-8">` +
        figure(highlights, s.view, theme.figure, "", false, s.pose) +
        (stats ? `<div class="flex w-[360px] shrink-0 flex-col justify-center gap-9">${stats}</div>` : "") +
        `</div>`)
  );
}
