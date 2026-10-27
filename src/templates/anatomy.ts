import { colorMap, resolveViews } from "../anatomy";
import { highlightsOf, type SlideOf, type Theme } from "../schema";
import { displayTitle, esc, figure, heading, kicker, rich, side } from "../ui";

interface LegendEntry {
  color: string;
  title: string;
  note?: string;
}

export function anatomy(s: SlideOf<"anatomy">, theme: Theme): string {
  const highlights = highlightsOf(s);
  const colors = colorMap(highlights);

  // `labels` personaliza a legenda por músculo; senão, uma entrada por grupo de destaque.
  const entries: LegendEntry[] = s.labels
    ? s.labels.map((l) => ({
        color: colors.get(l.muscle.ids[0]!) ?? "#dcdfe5",
        title: l.text ?? l.muscle.name,
        note: l.note,
      }))
    : highlights.map((h) => ({
        color: h.color,
        title: h.label ?? h.names.join(", "),
        note: h.note ?? (h.label ? h.names.join(", ") : undefined),
      }));

  const legend = (cols: string, box: string) =>
    entries.length
      ? `<div class="grid ${cols} ${box}">` +
        entries
          .map(
            (e) =>
              `<div class="flex items-start gap-4">` +
              `<span class="mt-[12px] h-[24px] w-[24px] shrink-0 rounded-full" style="background:${e.color}"></span>` +
              `<div class="min-w-0"><div class="text-[36px] font-bold leading-tight tracking-[-0.02em]">${esc(e.title)}</div>` +
              (e.note ? `<div class="mt-1 text-[27px] font-medium leading-snug text-neutral-500">${esc(e.note)}</div>` : "") +
              `</div></div>`,
          )
          .join("") +
        `</div>`
      : "";

  const views = resolveViews(s.view, highlights, s.layout !== "side");
  const stacked = s.layout === "stacked" || (s.layout === "auto" && views.length > 1);

  if (stacked) {
    return (
      heading({ kicker: s.kicker, title: s.title, subtitle: s.subtitle, max: 130 }) +
      figure(highlights, s.view, theme.figure, "mt-8") +
      legend("grid-cols-2 gap-x-10 gap-y-7", "mt-10 rounded-[40px] bg-neutral-50 p-9")
    );
  }

  const text =
    `<div class="flex h-full flex-col justify-center">` +
    kicker(s.kicker) +
    displayTitle(s.title, { max: 170, className: s.kicker ? "mt-8" : "" }) +
    (s.subtitle ? `<p class="subtitle mt-6 !text-[34px]">${rich(s.subtitle)}</p>` : "") +
    legend("grid-cols-1 gap-y-6", "mt-10") +
    `</div>`;
  return side(text, figure(highlights, s.view, theme.figure, "", true));
}
