/**
 * Ferramenta de conferência: renderiza um recorte de uma pose com grade de coordenadas.
 *   npm run grid -- neutral-front 150 250 470 500 [overlay]
 *                   pose          x   y   w   h
 * Aceita também "front"/"back" (pose neutra). Saída: out/grid/<pose>-<x>-<y>.png.
 * Com "overlay", pinta as máscaras de todos os músculos (cada um com uma cor e o ID escrito no centro).
 */
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { DEFAULT_POSE, isPose, poseMeta, poseUri } from "../src/anatomy/poses";

const [arg = "front", x = "0", y = "0", w = "768", h = "1376", mode] = process.argv.slice(2);
const pose = isPose(arg) ? arg : DEFAULT_POSE[arg as "front" | "back"];
if (!pose) throw new Error(`Pose desconhecida: ${arg}`);
const [X, Y, W, H] = [x, y, w, h].map(Number) as [number, number, number, number];
const SCALE = Math.max(1, Math.min(3, Math.floor(1500 / Math.max(W, H))));
const meta = poseMeta(pose);

const img = (await readFile(`assets/poses/${pose}.png`)).toString("base64");
const step = W > 400 || H > 400 ? 50 : 25;
const lines: string[] = [];
for (let gx = Math.ceil(X / step) * step; gx <= X + W; gx += step)
  lines.push(`<line x1="${gx}" y1="${Y}" x2="${gx}" y2="${Y + H}"/><text x="${gx + 2}" y="${Y + 11}">${gx}</text>`);
for (let gy = Math.ceil(Y / step) * step; gy <= Y + H; gy += step)
  lines.push(`<line x1="${X}" y1="${gy}" x2="${X + W}" y2="${gy}"/><text x="${X + 2}" y="${gy - 2}">${gy}</text>`);

let overlay = "";
if (mode === "overlay") {
  const palette = ["#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"];
  overlay = Object.entries(meta.muscles)
    .map(([id, b], i) => {
      const c = palette[i % palette.length];
      return (
        `<mask id="m${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="${meta.size.w}" height="${meta.size.h}">` +
        `<image href="${poseUri(pose, `${id}.png`)}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/></mask>` +
        `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${c}" fill-opacity="0.55" mask="url(#m${i})"/>` +
        `<text class="id" x="${b.x + b.w / 2}" y="${b.y + b.h / 2}">${id}</text>`
      );
    })
    .join("");
}

const html = `<body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="${W * SCALE}" height="${H * SCALE}" viewBox="${X} ${Y} ${W} ${H}">
<image href="data:image/png;base64,${img}" width="${meta.size.w}" height="${meta.size.h}"/>${overlay}
<g stroke="#e11" stroke-opacity=".35" stroke-width=".5">${lines.join("")}</g>
<style>text{font:9px sans-serif;fill:#c00}text.id{font:bold 11px sans-serif;fill:#000;text-anchor:middle;paint-order:stroke;stroke:#fff;stroke-width:3px}</style></svg></body>`;

await mkdir("out/grid", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W * SCALE, height: H * SCALE } });
await page.setContent(html);
const file = `out/grid/${pose}-${X}-${Y}${mode ? "-" + mode : ""}.png`;
await page.screenshot({ path: file });
await browser.close();
console.log(file);
