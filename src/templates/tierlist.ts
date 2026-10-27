import type { SlideOf } from "../schema";
import { esc, heading, tag } from "../ui";

const DEFAULT_STYLE: Record<string, string> = { S: "accent", A: "soft", B: "dark", C: "gray", D: "muted", F: "muted" };

export function tierlist(s: SlideOf<"tierlist">): string {
  const rows = s.tiers
    .map((t) => {
      const style = t.style ?? DEFAULT_STYLE[t.tier.toUpperCase()] ?? "gray";
      const items = t.items
        .map(
          (i) =>
            `<span class="inline-flex items-center gap-3 rounded-full border border-neutral-200 bg-white py-3 pl-6 ${i.tag ? "pr-3" : "pr-6"} text-[30px] font-semibold tracking-[-0.015em]">` +
            `${esc(i.name)}${i.tag ? tag(i.tag) : ""}</span>`,
        )
        .join("");
      return (
        `<div class="flex min-h-[148px] items-stretch gap-5">` +
        `<div class="tier-${style} flex w-[148px] shrink-0 items-center justify-center rounded-[36px] text-[76px] font-black tracking-[-0.04em]">${esc(t.tier)}</div>` +
        `<div class="flex flex-1 flex-wrap content-center gap-3 rounded-[36px] bg-neutral-50 p-5">${items}</div>` +
        `</div>`
      );
    })
    .join("");

  return heading({ kicker: s.kicker, title: s.title, subtitle: s.subtitle, max: 110 }) + `<div class="mt-12 flex flex-col gap-4">${rows}</div>`;
}
