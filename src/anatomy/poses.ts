import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { BodyView, MuscleId } from "./registry";

/**
 * Estilo "illustration": cada pose é uma ilustração raster (assets/poses/<pose>.png) com um
 * mapa de cores (<pose>.map.png). `npm run prep:poses` gera em assets/poses/<pose>/ a figura
 * com fundo transparente, uma máscara por músculo e o meta.json com os bboxes.
 */
export const POSES = {
  "neutral-front": { view: "front", label: "Neutra (frente)" },
  "neutral-back": { view: "back", label: "Neutra (costas)" },
} as const satisfies Record<string, { view: BodyView; label: string }>;

export type PoseName = keyof typeof POSES;
export const POSE_NAMES = Object.keys(POSES) as PoseName[];

/** Pose usada quando o slide não define `pose`. */
export const DEFAULT_POSE: Record<BodyView, PoseName> = { front: "neutral-front", back: "neutral-back" };

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PoseMeta {
  size: { w: number; h: number };
  body: Box;
  muscles: Partial<Record<MuscleId, Box>>;
}

const dirUrl = (pose: PoseName) => new URL(`../../assets/poses/${pose}/`, import.meta.url);

const metas = new Map<PoseName, PoseMeta>();
export function poseMeta(pose: PoseName): PoseMeta {
  let m = metas.get(pose);
  if (!m) {
    const file = fileURLToPath(new URL("meta.json", dirUrl(pose)));
    if (!existsSync(file)) throw new Error(`Pose "${pose}" não processada: rode npm run prep:poses`);
    metas.set(pose, (m = JSON.parse(readFileSync(file, "utf8")) as PoseMeta));
  }
  return m;
}

export const poseHas = (pose: PoseName, id: MuscleId) => !!poseMeta(pose).muscles[id];

const uris = new Map<string, string>();
/** Arquivo da pose (figure.png ou <musculo>.png) como data URI, com cache. */
export function poseUri(pose: PoseName, file: string): string {
  const key = `${pose}/${file}`;
  let v = uris.get(key);
  if (!v) {
    const data = readFileSync(fileURLToPath(new URL(file, dirUrl(pose)))).toString("base64");
    uris.set(key, (v = `data:image/png;base64,${data}`));
  }
  return v;
}

export const isPose = (s: string): s is PoseName => s in POSES;
