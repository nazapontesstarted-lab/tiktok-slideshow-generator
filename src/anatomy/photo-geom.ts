import type { MuscleId } from "./registry";

export type Pt = readonly [number, number];

/** Curva fechada suave passando pelos pontos (quadráticas entre pontos médios). */
export function smooth(points: Pt[]): string {
  const n = points.length;
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const f = (p: Pt) => `${+p[0].toFixed(1)} ${+p[1].toFixed(1)}`;
  const start = mid(points[n - 1]!, points[0]!);
  let d = `M${f(start)}`;
  for (let i = 0; i < n; i++) d += `Q${f(points[i]!)} ${f(mid(points[i]!, points[(i + 1) % n]!))}`;
  return d + "Z";
}

/** Polígono com cantos retos (para regiões delimitadas por linhas do desenho). */
export function polygon(points: Pt[]): string {
  return "M" + points.map((p) => p.join(" ")).join("L") + "Z";
}

export interface PhotoPart {
  d: string;
  /** Região central, sem espelhar (ex.: coluna do meio). */
  center?: boolean;
  /** Pinta por cima do shorts (blend normal), para músculos que ele cobre. */
  overShorts?: boolean;
}

export type PhotoSet = Partial<Record<MuscleId, PhotoPart[]>>;
