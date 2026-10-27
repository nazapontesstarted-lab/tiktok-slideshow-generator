export type BodyView = "front" | "back";

export const MUSCLE_IDS = [
  "traps",
  "front-delts",
  "side-delts",
  "rear-delts",
  "upper-chest",
  "mid-chest",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "obliques",
  "serratus",
  "lats",
  "teres",
  "lower-back",
  "glutes",
  "quads",
  "adductors",
  "hamstrings",
  "calves",
  "tibialis",
] as const;

export type MuscleId = (typeof MUSCLE_IDS)[number];

interface MuscleInfo {
  label: string;
  /** Vista em que o músculo aparece melhor (usada pelo view "auto"). */
  best: BodyView;
  region: "upper" | "lower";
}

export const MUSCLES: Record<MuscleId, MuscleInfo> = {
  traps: { label: "Trapézio", best: "back", region: "upper" },
  "front-delts": { label: "Deltoide anterior", best: "front", region: "upper" },
  "side-delts": { label: "Deltoide lateral", best: "front", region: "upper" },
  "rear-delts": { label: "Deltoide posterior", best: "back", region: "upper" },
  "upper-chest": { label: "Peitoral superior", best: "front", region: "upper" },
  "mid-chest": { label: "Peitoral maior", best: "front", region: "upper" },
  biceps: { label: "Bíceps", best: "front", region: "upper" },
  triceps: { label: "Tríceps", best: "back", region: "upper" },
  forearms: { label: "Antebraço", best: "front", region: "upper" },
  abs: { label: "Abdômen", best: "front", region: "upper" },
  obliques: { label: "Oblíquos", best: "front", region: "upper" },
  serratus: { label: "Serrátil", best: "front", region: "upper" },
  lats: { label: "Dorsal", best: "back", region: "upper" },
  teres: { label: "Redondo maior", best: "back", region: "upper" },
  "lower-back": { label: "Lombar", best: "back", region: "upper" },
  glutes: { label: "Glúteos", best: "back", region: "lower" },
  quads: { label: "Quadríceps", best: "front", region: "lower" },
  adductors: { label: "Adutores", best: "front", region: "lower" },
  hamstrings: { label: "Posterior de coxa", best: "back", region: "lower" },
  calves: { label: "Panturrilha", best: "back", region: "lower" },
  tibialis: { label: "Tibial anterior", best: "front", region: "lower" },
};

/** Grupos expandem para vários IDs (ex.: "shoulders" → 3 deltoides). */
export const GROUPS: Record<string, { label: string; ids: MuscleId[] }> = {
  chest: { label: "Peitoral", ids: ["upper-chest", "mid-chest"] },
  shoulders: { label: "Deltoides", ids: ["front-delts", "side-delts", "rear-delts"] },
  back: { label: "Costas", ids: ["traps", "lats", "teres", "lower-back"] },
  arms: { label: "Braços", ids: ["biceps", "triceps", "forearms"] },
  core: { label: "Core", ids: ["abs", "obliques", "serratus"] },
  legs: { label: "Pernas", ids: ["glutes", "quads", "adductors", "hamstrings", "calves", "tibialis"] },
};

// Aliases já normalizados (minúsculo, sem acento, separador "-").
const ALIASES: Record<string, string> = {
  peito: "chest",
  peitoral: "chest",
  pecs: "chest",
  "peito-superior": "upper-chest",
  "peitoral-superior": "upper-chest",
  "peitoral-maior": "mid-chest",
  delts: "shoulders",
  ombro: "shoulders",
  ombros: "shoulders",
  deltoide: "shoulders",
  deltoides: "shoulders",
  "deltoide-anterior": "front-delts",
  "ombro-frontal": "front-delts",
  "deltoide-lateral": "side-delts",
  "ombro-lateral": "side-delts",
  "deltoide-posterior": "rear-delts",
  "ombro-posterior": "rear-delts",
  trapezio: "traps",
  dorsal: "lats",
  dorsais: "lats",
  latissimo: "lats",
  redondo: "teres",
  "redondo-maior": "teres",
  infraespinal: "teres",
  lombar: "lower-back",
  eretores: "lower-back",
  costas: "back",
  braco: "arms",
  bracos: "arms",
  antebraco: "forearms",
  antebracos: "forearms",
  abdomen: "abs",
  abdominal: "abs",
  abdominais: "abs",
  obliquos: "obliques",
  serratil: "serratus",
  gluteo: "glutes",
  gluteos: "glutes",
  quadriceps: "quads",
  adutores: "adductors",
  posterior: "hamstrings",
  "posterior-de-coxa": "hamstrings",
  isquiotibiais: "hamstrings",
  panturrilha: "calves",
  panturrilhas: "calves",
  tibial: "tibialis",
  "tibial-anterior": "tibialis",
  canela: "tibialis",
  pernas: "legs",
};

export interface MuscleRef {
  ids: MuscleId[];
  /** Nome legível para legendas ("Deltoides" para o grupo, "Dorsal" para o músculo). */
  name: string;
}

export function resolveMuscleRef(input: string): MuscleRef {
  const key = input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
  const target = ALIASES[key] ?? key;
  if (target in GROUPS) return { ids: GROUPS[target]!.ids, name: GROUPS[target]!.label };
  if ((MUSCLE_IDS as readonly string[]).includes(target)) {
    const id = target as MuscleId;
    return { ids: [id], name: MUSCLES[id].label };
  }
  throw new Error(
    `Músculo desconhecido "${input}". IDs: ${MUSCLE_IDS.join(", ")}. Grupos: ${Object.keys(GROUPS).join(", ")}.`,
  );
}
