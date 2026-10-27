/**
 * Gera, a partir de assets/base-{front,back}.png:
 *   mask-*.png    branco = corpo (pele, contorno e shorts), preto = fundo
 *   figure-*.png  a ilustração com o fundo transparente (é esta que vai para os slides)
 * O fundo é definido assim: O fundo é o branco conectado às bordas da
 * imagem, então o interior do corpo nunca é confundido com ele. A máscara impede que
 * a cor dos músculos vaze para fora do contorno.
 */
import { readFile, writeFile } from "node:fs/promises";
import { PNG } from "pngjs";

const LIGHT = 200; // luminância acima disso conta como "branco"

async function maskFor(view: "front" | "back") {
  const src = PNG.sync.read(await readFile(`assets/base-${view}.png`));
  const { width: w, height: h, data } = src;
  const light = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const lum = 0.299 * data[i * 4]! + 0.587 * data[i * 4 + 1]! + 0.114 * data[i * 4 + 2]!;
    light[i] = lum > LIGHT ? 1 : 0;
  }

  // Flood fill (4 vizinhos) a partir de todas as bordas.
  const bg = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    const i = y * w + x;
    if (light[i] && !bg[i]) {
      bg[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) (push(x, 0), push(x, h - 1));
  for (let y = 0; y < h; y++) (push(0, y), push(w - 1, y));
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    const y = (i / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }

  const out = new PNG({ width: w, height: h });
  // A figura final tem o fundo transparente: o off-white da imagem gerada não aparece nos slides.
  const figure = new PNG({ width: w, height: h });
  let body = 0;
  for (let i = 0; i < w * h; i++) {
    const v = bg[i] ? 0 : 255;
    body += v ? 1 : 0;
    out.data[i * 4] = out.data[i * 4 + 1] = out.data[i * 4 + 2] = v;
    out.data[i * 4 + 3] = 255;
    if (bg[i]) continue;
    for (let c = 0; c < 3; c++) figure.data[i * 4 + c] = data[i * 4 + c]!;
    figure.data[i * 4 + 3] = 255;
  }
  await writeFile(`assets/mask-${view}.png`, PNG.sync.write(out, { colorType: 0 }));
  await writeFile(`assets/figure-${view}.png`, PNG.sync.write(figure));
  console.log(`✓ mask-${view}.png  ${w}x${h}  corpo=${((body / (w * h)) * 100).toFixed(1)}%`);
}

await maskFor("front");
await maskFor("back");
