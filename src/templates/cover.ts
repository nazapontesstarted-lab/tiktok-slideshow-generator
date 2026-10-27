import { highlightsOf, type SlideOf, type Theme } from "../schema";
import { displayTitle, esc, figure, icon, kicker, rich, side } from "../ui";

export function cover(s: SlideOf<"cover">, theme: Theme): string {
  const highlights = highlightsOf(s);
  const swipe =
    s.swipe === false
      ? ""
      : `<div class="mt-10 inline-flex items-center gap-3 self-start text-[30px] font-bold uppercase tracking-[0.12em] text-neutral-400">` +
        `${esc(s.swipe ?? "Deslize")}${icon("arrow", "h-[34px] w-[34px] text-accent", 3)}</div>`;
  const subtitle = s.subtitle ? `<p class="subtitle mt-8">${rich(s.subtitle)}</p>` : "";

  // Sem figura: o gancho ocupa a largura toda.
  if (highlights.length === 0) {
    return `<div class="flex h-full flex-col justify-center">${kicker(s.kicker)}${displayTitle(s.title, { max: 230, className: s.kicker ? "mt-9" : "" })}${subtitle}${swipe}</div>`;
  }

  const text =
    `<div class="flex h-full flex-col justify-center">` +
    kicker(s.kicker) +
    displayTitle(s.title, { max: 190, className: s.kicker ? "mt-9" : "" }) +
    subtitle +
    swipe +
    `</div>`;
  return side(text, figure(highlights, s.view, theme.figure, "", true));
}
