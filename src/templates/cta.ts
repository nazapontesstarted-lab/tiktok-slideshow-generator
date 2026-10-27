import type { SlideOf, Theme } from "../schema";
import { displayTitle, esc, icon, rich } from "../ui";

export function cta(s: SlideOf<"cta">, theme: Theme): string {
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
