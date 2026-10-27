import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import type { Config } from "tailwindcss";

const BASE_CSS = fileURLToPath(new URL("./styles/base.css", import.meta.url));
const INTER = fileURLToPath(
  new URL("../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", import.meta.url),
);

const DISPLAY_FONTS = {
  anton: fileURLToPath(new URL("../node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2", import.meta.url)),
  "league-gothic": fileURLToPath(
    new URL("../node_modules/@fontsource/league-gothic/files/league-gothic-latin-400-normal.woff2", import.meta.url),
  ),
};
export type TitleFont = keyof typeof DISPLAY_FONTS;

export const FONT_STACK = ['"Inter Variable"', "Inter", '"SF Pro Display"', "-apple-system", "system-ui", "sans-serif"];
// "Display" é o @font-face da fonte condensada escolhida no tema (Anton ou League Gothic).
export const DISPLAY_STACK = ["Display", "Anton", "Impact", "sans-serif"];

/** Compila o Tailwind (JIT) usando o HTML gerado como content. */
export async function buildCss(html: string): Promise<string> {
  const config: Config = {
    content: [{ raw: html, extension: "html" }],
    theme: {
      extend: {
        colors: {
          ink: "#0a0a0a",
          accent: {
            DEFAULT: "rgb(var(--accent-rgb) / <alpha-value>)",
            ink: "rgb(var(--accent-ink-rgb) / <alpha-value>)",
          },
        },
        fontFamily: { sans: FONT_STACK, display: DISPLAY_STACK },
      },
    },
  };
  const source = await readFile(BASE_CSS, "utf8");
  const result = await postcss([tailwindcss(config)]).process(source, { from: BASE_CSS });
  return result.css;
}

/** Inter (texto de apoio) e a fonte condensada dos títulos, embutidas em base64: sem rede, render determinístico. */
export async function fontFaceCss(display: TitleFont = "anton"): Promise<string> {
  const face = (family: string, weight: string, data: Buffer) =>
    `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${data.toString("base64")}) format("woff2");}`;
  return (
    face("Inter Variable", "100 900", await readFile(INTER)) + face("Display", "400", await readFile(DISPLAY_FONTS[display]))
  );
}

export function themeVars(accent: string): string {
  const n = parseInt(accent.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  // Versão escurecida do accent para texto sobre fundos claros (contraste).
  const ink = rgb.map((c) => Math.round(c * 0.62));
  return `:root{--accent-rgb:${rgb.join(" ")};--accent-ink-rgb:${ink.join(" ")};}`;
}
