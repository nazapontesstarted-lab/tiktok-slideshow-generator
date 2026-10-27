import type { Slide } from "../schema";
import { frame, type Ctx } from "../ui";
import { anatomy } from "./anatomy";
import { cover } from "./cover";
import { cta } from "./cta";
import { exercise } from "./exercise";
import { list } from "./list";
import { ranking } from "./ranking";
import { tierlist } from "./tierlist";

/** CTA do rodapé: o do slide, senão o do tema (uma lista alterna entre os slides). O slide de CTA não ganha rodapé. */
function ctaFor(s: Slide, { index, theme }: Ctx): string | undefined {
  if (s.type === "cta" || s.cta === false) return undefined;
  if (s.cta) return s.cta;
  if (theme.cta === false) return undefined;
  return Array.isArray(theme.cta) ? theme.cta[index % theme.cta.length] : theme.cta;
}

export function renderSlide(s: Slide, ctx: Ctx): string {
  const inner = (() => {
    switch (s.type) {
      case "cover":
        return cover(s, ctx.theme);
      case "anatomy":
        return anatomy(s, ctx.theme);
      case "tierlist":
        return tierlist(s);
      case "ranking":
        return ranking(s, ctx.theme);
      case "exercise":
        return exercise(s, ctx.theme);
      case "list":
        return list(s);
      case "cta":
        return cta(s, ctx.theme);
    }
  })();
  return frame(inner, ctx, ctaFor(s, ctx));
}
