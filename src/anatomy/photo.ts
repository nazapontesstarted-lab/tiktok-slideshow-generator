import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { mirror } from "./paths";
import type { MuscleId } from "./registry";

/**
 * Estilo "illustration": a figura é uma ilustração raster (assets/base-*.png) e cada
 * músculo é um polígono vetorial desenhado por cima, em coordenadas da imagem (768x1376),
 * pintado com mix-blend-mode: multiply para o traço e o pontilhado continuarem visíveis.
 * Os polígonos descrevem só o lado esquerdo da imagem; o direito é espelhado em x=AXIS.
 */

export const IMG = { w: 768, h: 1376 } as const;
export const AXIS = 384;

import type { PhotoSet } from "./photo-geom";
import { PHOTO_BACK, PHOTO_FRONT } from "./photo-data";

export const PHOTO: Record<"front" | "back", PhotoSet> = { front: PHOTO_FRONT, back: PHOTO_BACK };
export const PHOTO_MUSCLES = [...new Set([...Object.keys(PHOTO_FRONT), ...Object.keys(PHOTO_BACK)])] as MuscleId[];

/** Paths (esquerdo + direito espelhado) de um músculo, para a ferramenta `npm run grid`. */
export function photoMusclePaths(view: "front" | "back", id: string): string[] {
  return (PHOTO[view][id as MuscleId] ?? []).flatMap((p) => (p.center ? [p.d] : [p.d, mirror(p.d, AXIS)]));
}

const asset = (name: string) => readFileSync(fileURLToPath(new URL(`../../assets/${name}`, import.meta.url))).toString("base64");
const cache = new Map<string, string>();
export const dataUri = (name: string) => {
  let v = cache.get(name);
  if (!v) cache.set(name, (v = `data:image/png;base64,${asset(name)}`));
  return v;
};
