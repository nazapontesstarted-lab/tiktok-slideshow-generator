/**
 * Exporta o componente anatômico isolado:
 *   out/figures/anatomy-{front,back}-{illustration,lineart,flat}.svg → SVGs independentes (sem destaque)
 *   out/figures/muscle-map.png                          → referência visual de todos os IDs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { ANATOMY_CSS, MUSCLE_IDS, MUSCLES, anatomySvg, colorValue, type Highlight } from "./anatomy";
import { fontFaceCss } from "./css";

const OUT = join("out", "figures");

async function main() {
  await mkdir(OUT, { recursive: true });
  for (const view of ["front", "back"] as const) {
    for (const style of ["illustration", "lineart", "flat"] as const) {
      const svg = anatomySvg({ view, style, standalone: true });
      await writeFile(join(OUT, `anatomy-${view}-${style}.svg`), `<?xml version="1.0" encoding="UTF-8"?>\n${svg}\n`);
    }
  }

  // Uma célula por músculo, destacado na vista em que aparece melhor.
  const cells = MUSCLE_IDS.map((id) => {
    const h: Highlight[] = [{ ids: [id], names: [MUSCLES[id].label], color: colorValue("gold") }];
    return (
      `<div class="cell">${anatomySvg({ view: MUSCLES[id].best, highlights: h, shorts: false })}` +
      `<code>#${id}</code><span>${MUSCLES[id].label} · ${MUSCLES[id].best === "front" ? "frente" : "costas"}</span></div>`
    );
  }).join("");

  const html =
    `<!doctype html><html><head><meta charset="utf-8"><style>${await fontFaceCss()}${ANATOMY_CSS}` +
    `body{margin:0;padding:48px;background:#fff;font-family:"Inter Variable",sans-serif;color:#0a0a0a}` +
    `h1{margin:0 0 32px;font-size:44px;letter-spacing:-.03em}` +
    `.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:20px}` +
    `.cell{background:#f8f9fa;border-radius:24px;padding:16px;display:flex;flex-direction:column;align-items:center}` +
    `.cell svg{width:100%;height:300px}code{margin-top:10px;font:600 20px/1.2 ui-monospace,monospace}` +
    `span{margin-top:4px;font-size:16px;color:#737373}</style></head>` +
    `<body><h1>Mapa de músculos (${MUSCLE_IDS.length} IDs)</h1><div class="grid">${cells}</div></body></html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(OUT, "muscle-map.png"), fullPage: true });
  await browser.close();
  console.log(`✓ figuras → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
