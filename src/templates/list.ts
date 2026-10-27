import type { SlideOf } from "../schema";
import { esc, heading, icon, rich } from "../ui";

const MARKER = {
  number: "bg-accent/15 text-accent-ink",
  check: "bg-accent/15 text-accent-ink",
  cross: "bg-red-50 text-red-500",
};

export function list(s: SlideOf<"list">): string {
  const items = s.items
    .map((item, i) => {
      const marker =
        s.style === "number"
          ? `<span class="text-[36px] font-extrabold tabular-nums">${i + 1}</span>`
          : icon(s.style, "h-[38px] w-[38px]", 3);
      return (
        `<div class="flex items-start gap-7">` +
        `<div class="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-[24px] ${MARKER[s.style]}">${marker}</div>` +
        `<div class="min-w-0 flex-1 pt-2">` +
        `<div class="text-[42px] font-bold leading-[1.15] tracking-[-0.025em]">${rich(item.title)}</div>` +
        (item.text ? `<div class="mt-3 text-[31px] font-medium leading-[1.35] text-neutral-500">${esc(item.text)}</div>` : "") +
        `</div></div>`
      );
    })
    .join("");

  return heading({ kicker: s.kicker, title: s.title, subtitle: s.subtitle, max: 110 }) + `<div class="mt-14 flex flex-col gap-11">${items}</div>`;
}
