import { z } from "zod";
import { COLORS, colorValue, resolveMuscleRef, type Highlight, type MuscleRef } from "./anatomy";

// Aceita ID ("lats"), grupo ("shoulders") ou alias em PT ("dorsal", "ombros").
const MuscleName = z.string().transform((value, ctx) => {
  try {
    return resolveMuscleRef(value);
  } catch (e) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: (e as Error).message });
    return z.NEVER;
  }
});

// Formato simples: primário = verde sólido, secundário = verde translúcido.
const Muscles = z.object({
  primary: z.array(MuscleName).default([]),
  secondary: z.array(MuscleName).default([]),
});

const Color = z.union([
  z.enum(Object.keys(COLORS) as [keyof typeof COLORS, ...(keyof typeof COLORS)[]]),
  z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "use um nome de cor da legenda ou hex (#22c55e)"),
]);

// Formato completo: grupos com cor e legenda próprias.
const HighlightGroup = z.object({
  muscles: z.array(MuscleName).min(1),
  color: Color.default("accent"),
  label: z.string().optional(),
  note: z.string().optional(),
});

const View = z.enum(["auto", "front", "back", "both"]).default("auto");

const figure = {
  muscles: Muscles.optional(),
  highlight: z.array(HighlightGroup).optional(),
};

/** Converte `highlight` + `muscles` de um slide numa lista única de grupos coloridos. */
export function highlightsOf(s: {
  muscles?: z.infer<typeof Muscles>;
  highlight?: z.infer<typeof HighlightGroup>[];
}): Highlight[] {
  const out: Highlight[] = [];
  const add = (refs: MuscleRef[], color: string, label?: string, note?: string) => {
    if (refs.length === 0) return;
    out.push({
      ids: [...new Set(refs.flatMap((r) => r.ids))],
      names: refs.map((r) => r.name),
      color: colorValue(color),
      label,
      note,
    });
  };
  for (const g of s.highlight ?? []) add(g.muscles, g.color, g.label, g.note);
  if (s.muscles) {
    add(s.muscles.primary, "accent", undefined, "Primário");
    add(s.muscles.secondary, "accent-soft", undefined, "Secundário");
  }
  return out;
}

export const TAG_COLORS = ["accent", "soft", "gray", "dark", "red", "amber", "blue"] as const;

// Tag aceita "Halter" ou { "label": "Halter", "color": "gray" }.
const Tag = z.union([
  z.string().transform((label) => ({ label, color: "soft" as const })),
  z.object({ label: z.string(), color: z.enum(TAG_COLORS).default("soft") }),
]);

const text = z.string().optional();
// Números viram texto: "sets": 3 e "sets": "3–4" são equivalentes.
const Amount = z.union([z.string(), z.number()]).transform(String).optional();

// CTA no rodapé do slide: texto próprio, ou false para esconder. `{trecho}` fica na cor de destaque.
const common = {
  cta: z.union([z.string(), z.literal(false)]).optional(),
};

// Campos da capa; o `hook` do deck usa os mesmos.
const coverFields = {
  kicker: text,
  title: z.string(),
  subtitle: text,
  swipe: z.union([z.string(), z.literal(false)]).optional(),
  ...figure,
  view: View,
  ...common,
};

const Cover = z.object({ type: z.literal("cover"), ...coverFields });
const Hook = z.object(coverFields);

const Anatomy = z.object({
  type: z.literal("anatomy"),
  kicker: text,
  title: z.string(),
  subtitle: text,
  ...figure,
  view: View,
  // auto: lateral quando há uma vista só, empilhado quando há frente e costas.
  layout: z.enum(["auto", "side", "stacked"]).default("auto"),
  labels: z
    .array(z.object({ muscle: MuscleName, text: text, note: text }))
    .optional(),
  ...common,
});

const TierList = z.object({
  type: z.literal("tierlist"),
  kicker: text,
  title: z.string(),
  subtitle: text,
  tiers: z
    .array(
      z.object({
        tier: z.string(),
        style: z.enum(["accent", "soft", "dark", "gray", "muted"]).optional(),
        items: z.array(
          z.union([
            z.string().transform((name) => ({ name, tag: undefined })),
            z.object({ name: z.string(), tag: Tag.optional() }),
          ]),
        ),
      }),
    )
    .min(1),
  ...common,
});

const Ranking = z.object({
  type: z.literal("ranking"),
  kicker: text,
  title: z.string(),
  subtitle: text,
  thumbnails: z.boolean().default(true),
  items: z
    .array(
      z.object({
        name: z.string(),
        description: text,
        score: z.number().min(0).max(10).optional(),
        tags: z.array(Tag).default([]),
        ...figure,
      }),
    )
    .min(1)
    .max(6),
  ...common,
});

const Exercise = z.object({
  type: z.literal("exercise"),
  rank: z.number().int().optional(),
  name: z.string(),
  description: text,
  tags: z.array(Tag).default([]),
  ...figure,
  view: View,
  // O que treina (se omitido, usa os nomes do primeiro grupo de destaque), séries, repetições e descanso.
  target: text,
  sets: Amount,
  reps: Amount,
  rest: Amount,
  benefits: z.array(z.string()).max(3).default([]),
  // side: texto à esquerda (45%) e figura à direita (55%). stacked: figura embaixo, com barras de `stats`.
  layout: z.enum(["side", "stacked"]).default("side"),
  stats: z.array(z.object({ label: z.string(), value: z.number().min(0).max(10) })).max(5).default([]),
  ...common,
});

const List = z.object({
  type: z.literal("list"),
  kicker: text,
  title: z.string(),
  subtitle: text,
  style: z.enum(["number", "check", "cross"]).default("number"),
  items: z
    .array(
      z.union([
        z.string().transform((title) => ({ title, text: undefined })),
        z.object({ title: z.string(), text: text }),
      ]),
    )
    .min(1)
    .max(6),
  ...common,
});

// O slide de CTA já é o fechamento: não ganha o rodapé de CTA.
const Cta = z.object({
  type: z.literal("cta"),
  title: z.string(),
  subtitle: text,
  button: z.string().default("Salve para o próximo treino"),
  icon: z.enum(["bookmark", "share", "follow"]).default("bookmark"),
  ...common,
});

export const Slide = z.discriminatedUnion("type", [Cover, Anatomy, TierList, Ranking, Exercise, List, Cta]);

export const Theme = z
  .object({
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, "use hex de 6 dígitos, ex: #22c55e").default("#22c55e"),
    handle: z.string().optional(),
    counter: z.boolean().default(true),
    progress: z.boolean().default(true),
    // Fonte condensada dos títulos. O texto de apoio é sempre Inter.
    titleFont: z.enum(["anton", "league-gothic"]).default("anton"),
    // CTA do rodapé de cada slide: um texto, uma lista (alterna entre os slides) ou false.
    cta: z.union([z.string(), z.array(z.string()).min(1), z.literal(false)]).default("SALVE ISSO {PARA DEPOIS!}"),
    // Estilo da figura anatômica: illustration (padrão), lineart ou flat.
    figure: z
      .object({
        style: z.enum(["illustration", "lineart", "flat"]).default("illustration"),
        shorts: z.union([z.literal("auto"), z.boolean()]).default("auto"),
      })
      .default({}),
  })
  .default({});

export const Deck = z
  .object({
    id: z.string().optional(),
    theme: Theme,
    // Capa com gancho: vira o primeiro slide do carrossel.
    hook: Hook.optional(),
    slides: z.array(Slide).min(1),
  })
  .transform(({ hook, slides, ...rest }) => {
    const all: Slide[] = hook ? [{ type: "cover", ...hook }, ...slides] : slides;
    return { ...rest, slides: all };
  });

export type Deck = z.infer<typeof Deck>;
export type Slide = z.infer<typeof Slide>;
export type Theme = z.infer<typeof Theme>;
export type Tag = z.infer<typeof Tag>;
export type SlideOf<T extends Slide["type"]> = Extract<Slide, { type: T }>;
