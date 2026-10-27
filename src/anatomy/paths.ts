import type { MuscleId } from "./registry";

/**
 * Geometria da figura num viewBox 200x460, eixo de simetria em x=100.
 * Tudo é desenhado só na metade esquerda da imagem (x <= 100) com comandos
 * absolutos; `mirror()` gera o lado direito.
 */

export const AXIS = 100;

// Retângulo arredondado (gomos do abdômen).
const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}` +
  `H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;

/** Espelha um path (só comandos absolutos M L C Q S T H V Z) no eixo x=axis. */
export function mirror(d: string, axis = AXIS): string {
  return d.replace(/([A-Za-z])([^A-Za-z]*)/g, (_, cmd: string, args: string) => {
    if (cmd !== cmd.toUpperCase()) throw new Error(`mirror(): comando relativo "${cmd}" não suportado`);
    const nums = args.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
    const flipped = nums.map((n, i) => (cmd === "H" || (cmd !== "V" && i % 2 === 0) ? 2 * axis - n : n));
    return cmd + flipped.map((n) => +n.toFixed(2)).join(" ");
  });
}

export const HEAD = { cx: 100, cy: 31, rx: 20, ry: 25 };
export const EAR = { cx: 80.6, cy: 34, rx: 3.2, ry: 6.5 };

// Shorts (iguais na frente e nas costas): cintura → perna externa → barra → virilha.
export const SHORTS = "M100 217L65 215C61 236 57 262 54.5 292C67 297 84 297 97.5 291C98.5 281 99.3 272 100 266Z";
export const SHORTS_LINES = [
  "M65.2 222C77 224.5 89 225 100 225", // cós
  "M55.3 286C68 290.5 84 290.5 97.8 285", // barra
];

/** Traços finos de definição (só no estilo line art). Paths abertos, espelhados. */
export const DETAILS: Record<"front" | "back", string[]> = {
  front: [
    "M91 62C92.5 68 94.5 73 97 77", // pescoço
    "M37.5 178C39.5 180.5 42 180.5 44 178.5", // dobra do cotovelo
    "M26 238C29 239.5 32 239.5 35 238.5", // punho
    "M24 258C24.5 262 25.5 266 27 269", // dedos
    "M70 340C74 335.5 83 335 88 340", // patela
    "M72.5 347C76 350.5 83 350.5 86.5 347",
    "M75 418C79 416.5 85 416.5 89 419", // tornozelo
  ],
  back: [
    "M39 176C41 178.5 43.5 178.5 45 176", // cotovelo
    "M26 238C29 239.5 32 239.5 35 238.5",
    "M24 258C24.5 262 25.5 266 27 269",
    "M69 345C76 348.5 85 348.5 92.5 344.5", // dobra do joelho
    "M84 404C84.5 412 85 418 86 424", // tendão de Aquiles
  ],
};

// Contorno: queixo → pescoço → trapézio → deltoide → braço externo → mão →
// braço interno → axila → cintura → quadril → perna externa → pé → perna interna → virilha.
export const SILHOUETTE =
  "M100 56L90 58C90 66 89 72 87 76C78 80 66 82 56 86C44 90 37 100 36 114C35 130 33 150 31 170" +
  "C29 190 25 214 23 236C20 246 19 258 22 268C25 274 31 274 33 266C35 258 35 248 35 240" +
  "C38 220 42 198 44 178C46 162 50 146 54 132C56 124 58 120 60 118C62 140 66 170 68 196" +
  "C68 206 66 214 64 224C60 250 58 290 62 330C63 340 63 350 62 360C60 385 64 410 70 428" +
  "C70 436 66 442 68 446L94 448C96 440 94 432 92 426C94 405 96 380 94 360C95 350 96 342 96 334" +
  "C98 300 99 270 100 252Z";

const ARM_FRONT = "M41 144C45 138 49 135 52 136C51 150 48 163 44.5 175C41 179 36 177 35 170C35 161 37 152 41 144Z";
const FOREARM = "M35 182C39 180 42 181 42.5 185C40 200 37.5 218 34.5 234L27 234C25 216 29 196 35 182Z";

export const FRONT: Partial<Record<MuscleId, string[]>> = {
  traps: ["M89 68C86 76 76 81 64 85L78 86C84 84 88 82 91 80Z"],
  "side-delts": ["M57 87C46 90 38 100 37.5 116C37 126 39 134 42 140C43 126 45 110 50 99C52 94 54 90 57 87Z"],
  "front-delts": ["M61 87C55 92 50 102 47 116C45.5 126 44.5 134 44 140C51 132 58 122 64 112C66 104 66 94 63 88Z"],
  "upper-chest": ["M69 88C78 86 90 86 98.5 88L98.5 104C88 106.5 77 106.5 68 104C67 98 67 92 69 88Z"],
  "mid-chest": ["M68 107C77 109.5 88 109.5 98.5 107L98.5 138C90 146 77 146 69 140C64 134 63 120 66 110Z"],
  serratus: ["M64.5 143L71 146L72 152L66.5 155L72 159L72 165L67 167C66 159 65 151 64.5 143Z"],
  obliques: ["M74 163C78 165 82 167 85 167L85 224C80 228 74 227 70 221C70.5 203 70 187 69 172Z"],
  abs: [rr(87, 147, 11.5, 18, 4), rr(87, 168, 11.5, 18, 4), rr(87, 189, 11.5, 18, 4), rr(87.5, 210, 11, 26, 5)],
  biceps: [ARM_FRONT],
  forearms: [FOREARM],
  quads: [
    "M65 236C72 230 82 232 88 240C90 268 88 296 84 322C79 330 71 330 67 324C61 300 60 266 65 236Z",
    "M90 292C94 302 96 314 95 328C92 336 87 336 86 330C88 318 89 304 90 292Z",
  ],
  adductors: ["M90.5 244C94 248 97.5 252 99 256L99 290C95.5 282 92 268 90.5 244Z"],
  tibialis: ["M67.5 352C71 348 75.5 350 76.5 356C76.5 376 74.5 398 72.5 418L69.5 418C66 396 65 372 67.5 352Z"],
  calves: ["M86 354C91.5 352 94.5 360 94.5 372C94 388 90 400 86.5 406C84.5 390 83.5 370 86 354Z"],
};

export const BACK: Partial<Record<MuscleId, string[]>> = {
  traps: ["M100 62L91 64C90 71 88.5 75 86.5 78C78 82 68 84 60 87C70 92 82 104 90 122C94 136 97 150 100 172Z"],
  "side-delts": ["M51 88C43 92 38 101 37.5 116C37 126 38.5 134 40.5 140C39.5 128 39.5 113 43 103C45 97 48 92 51 88Z"],
  "rear-delts": ["M58.5 88.5C51 92 46 101 44 113C43 123 43 132 43.5 140C49 130 56 118 62.5 108C65 100 63.5 93 58.5 88.5Z"],
  teres: ["M66 105C72 103 77 105 82.5 111C84 117 82 122 78 126C73 128 68 126 65 121C64 115 64 109 66 105Z"],
  lats: ["M64 129C72 131 80 131 86 128C90 136 94 150 97 168L98 184C92 196 82 206 72 212C70 190 68 162 63 132Z"],
  "lower-back": ["M93.5 182L99 179L99 221C94 223 89 221 85 217C89 206 92 194 93.5 182Z"],
  triceps: [ARM_FRONT],
  forearms: [FOREARM],
  glutes: ["M66 228C74 220 90 220 99 225L99 262C92 270 76 270 68 262C64 250 63.5 238 66 228Z"],
  hamstrings: [
    "M65 274C72 276 78.5 277 82 277C82 300 80 320 78 336C74.5 338 71 336 69 332C63 312 62 292 65 274Z",
    "M85 277C90 277 94 275 97.5 272C96.5 296 93 318 89.5 334C86.5 338 82.5 338 81.5 334C83 316 85 298 85 277Z",
  ],
  calves: [
    "M66 356C70 348 78 348 82 354C83 372 81 388 77 400C72 402 67 396 66 386C64 376 64 366 66 356Z",
    "M85 354C89.5 348 93.5 352 93.8 362C94 376 92 390 88 402C85 404 83 400 83 392C83 380 83 366 85 354Z",
  ],
};
