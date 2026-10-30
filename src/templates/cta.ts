import type { SlideOf, Theme } from "../schema";
import { displayTitle, esc, icon, rich } from "../ui";

// Resumo + CTA: título, recap numerado dos itens do deck e o botão de fechamento.
function summarySlide(s: SlideOf<"cta"> & { summary: NonNullable<SlideOf<"cta">["summary"]> }, theme: Theme): string {
  const rows = s.summary
    .map(
      (item, i) =>
        `<div class="flex items-center gap-6 py-5">` +
        `<span class="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-ink font-display text-[40px] leading-none text-white">${i + 1}</span>` +
        `<div class="min-w-0 flex-1">` +
        `<div class="font-display text-[48px] uppercase leading-[1.05] tracking-[0.01em]">${rich(item.title)}</div>` +
        (item.text ? `<div class="mt-1 text-[28px] font-medium leading-[1.3] text-neutral-500">${esc(item.text)}</div>` : "") +
        `</div>${icon("check", "h-[40px] w-[40px] shrink-0 text-accent", 3)}</div>`,
    )
    .join("");
  return (
    `<div class="flex h-full flex-col justify-center">` +
    displayTitle(s.title, { max: 130 }) +
    (s.subtitle ? `<p class="subtitle mt-5">${rich(s.subtitle)}</p>` : "") +
    `<div class="mt-8 flex flex-col divide-y-2 divide-accent/30">${rows}</div>` +
    `<div class="mt-10 flex flex-col items-center">` +
    `<div class="inline-flex items-center gap-4 rounded-full bg-ink px-12 py-7 text-[36px] font-bold tracking-[-0.015em] text-white">` +
    `${icon(s.icon, "h-[38px] w-[38px] text-accent", 2.6)}${esc(s.button)}</div>` +
    (theme.handle ? `<div class="mt-6 text-[32px] font-semibold text-neutral-400">${esc(theme.handle)}</div>` : "") +
    `</div></div>`
  );
}

export function cta(s: SlideOf<"cta">, theme: Theme): string {
  if (s.summary?.length) return summarySlide({ ...s, summary: s.summary }, theme);
  return (
    `<div class="flex h-full flex-col items-center justify-center text-center">` +
    `<div class="flex h-[200px] w-[200px] items-center justify-center rounded-full bg-accent/15 text-accent-ink">${icon(s.icon, "h-[92px] w-[92px]", 2.2)}</div>` +
    `<div class="mt-14 w-full">${displayTitle(s.title, { max: 170 })}</div>` +
    (s.subtitle ? `<p class="subtitle mt-8 max-w-[820px]">${rich(s.subtitle)}</p>` : "") +
    `<div class="mt-16 inline-flex items-center gap-4 rounded-full bg-ink px-12 py-7 text-[36px] font-bold tracking-[-0.015em] text-white">` +
    `${icon(s.icon, "h-[38px] w-[38px] text-accent", 2.6)}${esc(s.button)}</div>` +
    (theme.handle ? `<div class="mt-10 text-[32px] font-semibold text-neutral-400">${esc(theme.handle)}</div>` : "") +
    `</div>`
  );
}
