import { anatomySvg, autoFocus, resolveViews } from "../anatomy";
import { highlightsOf, type SlideOf, type Theme } from "../schema";
import { esc, heading, tag } from "../ui";

export function ranking(s: SlideOf<"ranking">, theme: Theme): string {
  const rows = s.items
    .map((item, i) => {
      const highlights = highlightsOf(item);
      const thumb =
        s.thumbnails && highlights.length
          ? `<div class="relative h-[128px] w-[100px] shrink-0 rounded-[28px] bg-neutral-50">` +
            anatomySvg({
              view: resolveViews("auto", highlights, false)[0]!,
              highlights,
              ...theme.figure,
              focus: autoFocus(highlights),
              className: "absolute inset-3 h-[calc(100%-24px)] w-[calc(100%-24px)]",
            }) +
            `</div>`
          : "";
      const score =
        item.score !== undefined
          ? `<div class="w-[150px] shrink-0 text-right">` +
            `<div class="text-[52px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">${item.score.toFixed(1)}</div>` +
            `<div class="mt-4 h-[10px] rounded-full bg-neutral-100"><div class="h-full rounded-full bg-accent" style="width:${item.score * 10}%"></div></div>` +
            `</div>`
          : "";

      return (
        `<div class="flex items-center gap-7 py-3 ${i < s.items.length - 1 ? "border-b border-neutral-100" : ""}">` +
        `<div class="w-[78px] shrink-0 text-[76px] font-black leading-none tracking-[-0.05em] tabular-nums ${i === 0 ? "text-accent" : "text-neutral-300"}">${i + 1}</div>` +
        thumb +
        `<div class="min-w-0 flex-1">` +
        `<div class="text-[42px] font-bold leading-[1.1] tracking-[-0.025em]">${esc(item.name)}</div>` +
        (item.description ? `<div class="mt-2 text-[28px] font-medium leading-snug text-neutral-500">${esc(item.description)}</div>` : "") +
        (item.tags.length ? `<div class="mt-3 flex flex-wrap gap-2">${item.tags.map(tag).join("")}</div>` : "") +
        `</div>` +
        score +
        `</div>`
      );
    })
    .join("");

  return heading({ kicker: s.kicker, title: s.title, subtitle: s.subtitle, max: 88 }) + `<div class="mt-5 flex flex-col">${rows}</div>`;
}
