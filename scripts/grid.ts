/**
 * Ferramenta de traçado: renderiza um recorte da imagem base com grade de coordenadas.
 *   npm run grid -- front 150 250 470 500 [overlay]
 *                   vista x   y   w   h
 * Saída: out/grid/<vista>-<x>-<y>.png. Com "overlay", pinta os músculos já definidos
 * (cada um com uma cor diferente) para conferir o alinhamento.
 */
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { PHOTO_MUSCLES, photoMusclePaths } from "../src/anatomy/photo";

const [view = "front", x = "0", y = "0", w = "768", h = "1376", mode] = process.argv.slice(2);
const [X, Y, W, H] = [x, y, w, h].map(Number) as [number, number, number, number];
const SCALE = Math.max(1, Math.min(3, Math.floor(1500 / Math.max(W, H))));

const img = (await readFile(`assets/base-${view}.png`)).toString("base64");
const step = W > 400 || H > 400 ? 50 : 25;
const lines: string[] = [];
for (let gx = Math.ceil(X / step) * step; gx <= X + W; gx += step)
  lines.push(`<line x1="${gx}" y1="${Y}" x2="${gx}" y2="${Y + H}"/><text x="${gx + 2}" y="${Y + 11}">${gx}</text>`);
for (let gy = Math.ceil(Y / step) * step; gy <= Y + H; gy += step)
  lines.push(`<line x1="${X}" y1="${gy}" x2="${X + W}" y2="${gy}"/><text x="${X + 2}" y="${gy - 2}">${gy}</text>`);

let overlay = "";
if (mode === "overlay") {
  const palette = ["#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#06b6d4", "#ec4899", "#84cc16"];
  overlay = PHOTO_MUSCLES.map((id, i) =>
    photoMusclePaths(view as "front" | "back", id)
      .map((d) => `<path d="${d}" fill="${palette[i % palette.length]}" fill-opacity="0.45" stroke="${palette[i % palette.length]}" stroke-width="1"/>`)
      .join(""),
  ).join("");
}

const html = `<body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="${W * SCALE}" height="${H * SCALE}" viewBox="${X} ${Y} ${W} ${H}">
<image href="data:image/png;base64,${img}" width="768" height="1376"/>${overlay}
<g stroke="#e11" stroke-opacity=".35" stroke-width=".5">${lines.join("")}</g>
<style>text{font:9px sans-serif;fill:#c00}</style></svg></body>`;

await mkdir("out/grid", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W * SCALE, height: H * SCALE } });
await page.setContent(html);
const file = `out/grid/${view}-${X}-${Y}${mode ? "-" + mode : ""}.png`;
await page.screenshot({ path: file });
await browser.close();
console.log(file);
