import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { chromium } from "playwright";
import { ANATOMY_CSS } from "./anatomy";
import { buildCss, fontFaceCss, themeVars } from "./css";
import { Deck } from "./schema";
import { renderSlide } from "./templates";
import { FIT_SCRIPT, GUIDES } from "./ui";

const WIDTH = 1080;
const HEIGHT = 1920;

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const writeHtml = flags.has("--html");
const guides = flags.has("--guides");

async function loadDeck(file: string): Promise<Deck> {
  const json = JSON.parse(await readFile(file, "utf8"));
  const parsed = Deck.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  • ${i.path.join(".") || "(raiz)"}: ${i.message}`).join("\n");
    throw new Error(`JSON inválido em ${file}:\n${issues}`);
  }
  return parsed.data;
}

async function main() {
  const inputs = args.filter((a) => !a.startsWith("--"));
  const files = inputs.length
    ? inputs
    : (await readdir("data")).filter((f) => f.endsWith(".json")).map((f) => join("data", f));
  if (files.length === 0) throw new Error("Nenhum arquivo JSON encontrado em data/");

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });

  try {
    for (const file of files) {
      const deck = await loadDeck(file);
      const slug = deck.id ?? basename(file, ".json");
      const outDir = join("out", slug);
      await mkdir(outDir, { recursive: true });
      // Remove PNGs antigos para não sobrar slide de um render anterior maior.
      for (const f of await readdir(outDir)) if (/\.(png|html)$/.test(f)) await unlink(join(outDir, f));

      const fonts = await fontFaceCss(deck.theme.titleFont);
      if (deck.slides[0]?.type !== "cover") console.warn(`  ⚠ ${slug}: o primeiro slide não é uma capa — adicione "hook" no deck`);
      const bodies = deck.slides.map((s, index) => renderSlide(s, { index, total: deck.slides.length, theme: deck.theme }));
      // Os data URIs das imagens base não têm classes; tirá-los acelera o scan do Tailwind.
      const css = await buildCss(bodies.join("\n").replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/g, ""));
      const head = `<meta charset="utf-8"><style>${fonts}</style><style>${themeVars(deck.theme.accent)}</style><style>${css}${ANATOMY_CSS}</style>`;

      for (const [i, body] of bodies.entries()) {
        const name = `${String(i + 1).padStart(2, "0")}-${deck.slides[i]!.type}`;
        const html = `<!doctype html><html lang="pt-BR"><head>${head}</head><body>${body}${guides ? GUIDES : ""}<script>${FIT_SCRIPT}</script></body></html>`;
        if (writeHtml) await writeFile(join(outDir, `${name}.html`), html);

        await page.setContent(html, { waitUntil: "load" });
        await page.evaluate("document.fonts.ready.then(() => window.__fit())");
        const fontOk = await page.evaluate(() => document.fonts.check('800 40px "Inter Variable"'));
        if (!fontOk) console.warn(`  ⚠ fonte Inter não carregou em ${name}`);

        await page.screenshot({ path: join(outDir, `${name}.png`), type: "png", clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
      }
      console.log(`✓ ${slug}: ${bodies.length} slides → ${outDir}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
