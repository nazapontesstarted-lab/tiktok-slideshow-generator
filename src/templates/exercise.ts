import { resolveViews } from "../anatomy";
import { highlightsOf, type SlideOf, type Theme } from "../schema";
import { displayTitle, esc, figure, icon, rich, side, tag } from "../ui";

export function exercise(s: SlideOf<"exercise">, theme: Theme): string {
  const highlights = highlightsOf(s);
  const badges =
    (s.rank !== undefined
      ? `<span class="rounded-full bg-accent px-6 py-3 text-[32px] font-extrabold leading-none tracking-[-0.02em] text-white">#${s.rank}</span>`
      : "") + s.tags.map(tag).join("");
  const badgeRow = badges ? `<div class="mb-7 flex flex-wrap items-center gap-3">${badges}</div>` : "";

  // O que treina: texto próprio ou os nomes do primeiro grupo de destaque.
  const target = s.target ?? highlights[0]?.names.join(" + ");

  const targetBox = target
    ? `<div class="mt-8 flex items-center gap-4 rounded-[28px] bg-accent/10 px-6 py-5">` +
      icon("target", "h-[44px] w-[44px] shrink-0 text-accent", 2.2) +
      `<div class="min-w-0"><div class="text-[22px] font-bold uppercase tracking-[0.14em] text-accent-ink">Treina</div>` +
      `<div class="text-[34px] font-bold leading-tight tracking-[-0.02em]">${esc(target)}</div></div></div>`
    : "";

  const metric = (label: string, value: string | undefined) =>
    value
      ? `<div class="flex-1 rounded-[24px] bg-neutral-50 px-3 py-4 text-center">` +
        `<div class="flex h-[72px] items-center justify-center font-display leading-none"><span class="block whitespace-nowrap" data-fit="72" data-min="30">${esc(value)}</span></div>` +
        `<div class="mt-2 text-[21px] font-bold uppercase tracking-[0.12em] text-neutral-400">${label}</div></div>`
      : "";
  const metrics = [metric("Séries", s.sets), metric("Reps", s.reps), metric("Descanso", s.rest)].join("");
  const metricRow = metrics ? `<div class="mt-5 flex gap-3">${metrics}</div>` : "";

  const benefits = s.benefits.length
    ? `<ul class="mt-7 flex flex-col gap-3">` +
      s.benefits
        .map(
          (b) =>
            `<li class="flex items-start gap-3 text-[29px] font-medium leading-snug text-neutral-600">` +
            icon("check", "mt-[5px] h-[30px] w-[30px] shrink-0 text-accent", 3.2) +
            `<span>${rich(b)}</span></li>`,
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
    return side(text, figure(highlights, s.view, theme.figure, "", true));
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
      ? figure(highlights, s.view, theme.figure, "mt-8") + (stats ? `<div class="mt-10 grid grid-cols-2 gap-x-12 gap-y-8">${stats}</div>` : "")
      : `<div class="mt-8 flex min-h-0 flex-1 gap-8">` +
        figure(highlights, s.view, theme.figure) +
        (stats ? `<div class="flex w-[360px] shrink-0 flex-col justify-center gap-9">${stats}</div>` : "") +
        `</div>`)
  );
}
