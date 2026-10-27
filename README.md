# TikTok Slide Generator

Gera carrosséis **1080×1920 (9:16)** para TikTok/Instagram a partir de arquivos JSON: fundo branco, Inter, títulos condensados (Anton), uma cor de destaque e uma figura anatômica faceless com os músculos destacados. Stack: **Node + TypeScript + Tailwind CSS (JIT) + Playwright**.

A figura tem três estilos (`illustration`, `lineart` e `flat`). O padrão é a ilustração de contorno preto com os músculos pintados por cima, no estilo dos infográficos de academia.

## Uso

```bash
npm install
npm run setup                          # baixa o Chromium do Playwright (1x)

npm run render                         # renderiza todos os data/*.json
npm run render -- data/peito-top5.json # um arquivo específico
npm run render:html                    # também salva o .html de cada slide (debug)
npm run render:guides                  # sobrepõe as áreas cobertas pela UI do TikTok
npm run typecheck                      # confere os tipos (tsc --noEmit)
npm run figures                        # SVGs avulsos + mapa de músculos em out/figures
npm run prep:bases                     # gera máscara e figura transparente a partir de assets/base-*.png
npm run grid -- front 130 230 510 400 overlay   # recorte com grade para traçar músculos
```

Saída: `out/<id>/01-cover.png`, `02-anatomy.png`, … Os arquivos antigos da mesma pasta são apagados a cada render.

Exemplos prontos em `data/`: `peito-top5.json` (todos os tipos de slide), `costas-guia.json` (vista de costas e grupos coloridos) e `rosca-martelo.json` (tema dourado, no estilo da referência).

## Estrutura do JSON

```json
{
  "id": "peito-top5",
  "theme": { "accent": "#22c55e", "handle": "@seuperfil", "titleFont": "anton", "cta": "SALVE ISSO {PARA DEPOIS!}" },
  "hook": { "title": "Os 5 melhores\npara {peito}", "muscles": { "primary": ["chest"] }, "view": "front" },
  "slides": [ { "type": "exercise", ... } ]
}
```

Em qualquer título, `{palavra}` fica na cor de destaque e `\n` quebra a linha.

### Layout, títulos, CTA e capa

- **Layout lateral**: capa, `exercise` e `anatomy` (com uma vista) usam texto na coluna esquerda (~45%) e figura na direita (~55%). Com frente e costas juntas, o `anatomy` empilha (`layout: "stacked"` força isso, `"side"` força o lateral). O `exercise` aceita `layout: "stacked"` para a figura embaixo com barras de `stats`.
- **Título**: fonte condensada em duas linhas, preto + cor de destaque. Com `{ }`, só as palavras marcadas ficam coloridas. Sem `{ }`, a última linha é o destaque. Sem `\n`, o título é dividido em duas linhas equilibradas. Cada linha se ajusta sozinha à largura da coluna, então linhas curtas rendem letras maiores. Escolha a fonte em `theme.titleFont` (`anton` ou `league-gothic`). A Inter fica só no texto de apoio.
- **CTA no rodapé**: todo slide, exceto o slide `cta`, ganha uma barra de CTA. O padrão fica em `theme.cta` (texto, lista que alterna entre os slides, ou `false`). Cada slide pode ter o próprio `cta` (ou `false`).
- **Capa com gancho**: o campo `hook` do deck vira o primeiro slide (mesmos campos de `cover`, mais `swipe` para o texto "Deslize" ou `false`). Aparece um aviso se o primeiro slide não for uma capa.
- **O que treina, séries e reps**: no `exercise`, use `target`, `sets`, `reps`, `rest` e `benefits` (até 3). Se `target` for omitido, usa os músculos do primeiro grupo de destaque.

| type       | Campos principais |
|------------|-------------------|
| `cover`    | `kicker`, `title`, `subtitle`, `swipe`, figura (`muscles` ou `highlight`), `view` (normalmente via `hook`) |
| `anatomy`  | `kicker`, `title`, `subtitle`, figura, `view`, `layout`, `labels?: [{ muscle, text, note }]` (se omitido, a legenda é gerada a partir dos grupos de destaque) |
| `tierlist` | `title`, `tiers: [{ tier: "S", style?, items: ["Nome" \| { name, tag }] }]` |
| `ranking`  | `title`, `thumbnails`, `items: [{ name, description, score (0-10), tags, muscles ou highlight }]` (máx. 6; a miniatura usa a vista em que o músculo aparece melhor) |
| `exercise` | `rank`, `name`, `description`, `tags`, figura, `view`, `target`, `sets`, `reps`, `rest`, `benefits`, `layout`, `stats?: [{ label, value (0-10) }]` (só no layout `stacked`) |
| `list`     | `title`, `style: number \| check \| cross`, `items: ["texto" \| { title, text }]` |
| `cta`      | `title`, `subtitle`, `button`, `icon: bookmark \| share \| follow` |

## Figura anatômica

### Estilo (`theme.figure`)

```json
"theme": { "accent": "#e0a526", "figure": { "style": "illustration" } }
```

| style | Visual |
|-------|--------|
| `illustration` (padrão) | Ilustração raster (`assets/base-front.png` e `base-back.png`) com os músculos destacados pintados por cima. A cor é multiplicada sobre o desenho, então o traço, o pontilhado e as linhas de definição continuam visíveis. |
| `lineart` | Ilustração vetorial gerada por código, no estilo de infográfico de academia. Não depende de imagens. |
| `flat` | Silhueta cinza com músculos chapados (estilo app Arrow). |

`shorts` (`"auto"`, `true`, `false`) só vale para o `lineart`.

### Como o estilo `illustration` funciona

- **Imagens base**: `assets/base-front.png` e `assets/base-back.png` (768×1376), geradas fora do projeto. As duas precisam ter a mesma pose e o mesmo enquadramento.
- **Regiões dos músculos**: ficam em `src/anatomy/photo-data.ts`, em coordenadas da imagem. Cada região descreve só o lado esquerdo, e o direito é espelhado em x=384.
- **Máscara do corpo**: `npm run prep:bases` gera `assets/mask-*.png` (silhueta) e `assets/figure-*.png` (ilustração com fundo transparente). A máscara recorta a cor no contorno, então a cor nunca vaza para fora do corpo. Rode esse comando sempre que trocar as imagens base.
- **Ajustar ou criar regiões**: `npm run grid -- front 130 230 510 400` gera um recorte com grade de coordenadas em `out/grid/`. Acrescentando `overlay`, mostra as regiões já traçadas, cada uma numa cor. Funciona para `front` e `back`.
- **Músculos cobertos pelo shorts** (`quads`, `adductors`, `glutes`, `hamstrings`): a parte debaixo do shorts é indicada tingindo o shorts com a cor do músculo, porque a ilustração não mostra a anatomia ali. A parte visível, abaixo da barra, é pintada normalmente.

Os slides `cover`, `anatomy`, `exercise` e os itens de `ranking` aceitam dois formatos de destaque, que podem ser combinados:

```jsonc
// Simples: primário = accent sólido, secundário = accent translúcido
"muscles": { "primary": ["lats"], "secondary": ["rear-delts", "biceps"] }

// Completo: grupos com cor e entrada própria na legenda
"highlight": [
  { "muscles": ["lats", "teres"],       "color": "accent", "label": "Largura",     "note": "Dorsal e redondo" },
  { "muscles": ["traps", "rear-delts"], "color": "blue",   "label": "Espessura" },
  { "muscles": ["lower-back"],          "color": "#f59e0b" }
]
```

**IDs (21)**: `traps, front-delts, side-delts, rear-delts, upper-chest, mid-chest, biceps, triceps, forearms, abs, obliques, serratus, lats, teres, lower-back, glutes, quads, adductors, hamstrings, calves, tibialis`. Rode `npm run figures` para gerar `out/figures/muscle-map.png`, com cada ID destacado.

**Grupos**: `chest`, `shoulders`, `back`, `arms`, `core` e `legs` expandem para vários IDs.

**Aliases em PT**: `peito`, `ombros`, `deltoide-posterior`, `dorsal`, `lombar`, `gluteos`, `posterior`, `panturrilha`… Acentos, maiúsculas e `_` são ignorados.

**Cores**: `accent` (segue o `theme.accent`), `accent-soft`, `blue`, `cyan`, `purple`, `pink`, `red`, `amber`, `gold`, `gray`, `dark` ou qualquer hex. Se um músculo estiver em dois grupos, vale o primeiro. A bolinha da legenda usa a mesma cor.

**view**: `auto` escolhe frente, costas ou ambas conforme a melhor vista de cada músculo destacado. Também aceita `front`, `back` ou `both`. Se um músculo destacado não existir na vista escolhida (por exemplo, `biceps` com `back`), o render mostra um aviso no terminal.

### Estrutura do SVG

Em todos os estilos, cada músculo destacado é um grupo com `id` e `data-muscle`, e a cor vem da variável `--hl`:

```html
<!-- illustration (padrão): viewBox em coordenadas da imagem (768x1376) -->
<svg class="anatomy anatomy--illustration" data-view="back" viewBox="120 60 528 1275">
  <defs><mask id="mk-back">…máscara do corpo…</mask></defs>
  <image href="data:image/png;base64,…"/>            <!-- assets/figure-back.png -->
  <g class="muscles" mask="url(#mk-back)">           <!-- mix-blend-mode: multiply -->
    <g id="lats" class="muscle is-active" data-muscle="lats" style="--hl:#22c55e">
      <title>Dorsal</title>
      <path data-side="left" d="…"/><path data-side="right" d="…"/>
    </g>
  </g>
  <g class="muscles muscles--over">…shorts tingido…</g>   <!-- só se houver músculo coberto pelo shorts -->
</svg>

<!-- lineart e flat: viewBox 200x460, só a metade esquerda é desenhada e a direita é espelhada -->
<svg class="anatomy anatomy--lineart" data-view="back" viewBox="8 2 184 452">
  <g class="skin">…</g>
  <g class="muscles">
    <g id="lats" class="muscle is-active" data-muscle="lats" style="--hl:#22c55e">…</g>
    <g id="traps" class="muscle" data-muscle="traps">…</g>   <!-- não destacado: cinza -->
  </g>
</svg>
```

- **illustration**: só os músculos destacados viram elementos, porque o resto já está desenhado na imagem.
- **lineart e flat**: todos os músculos aparecem, e os não destacados ficam cinza (`#dcdfe5`) ou brancos.
- **IDs repetidos**: quando a frente e as costas aparecem na mesma página, os IDs se repetem (ex.: `traps`). Para estilizar via CSS ou JS, use `[data-muscle="…"]`.
- **Uso direto em código**: `anatomySvg({ view, highlights, focus, style, standalone })` em `src/anatomy/figure.ts`.
- **SVGs avulsos**: `npm run figures` gera `anatomy-{front,back}-{illustration,lineart,flat}.svg`, sem destaque e com o CSS embutido.

**Tags**: `"Halter"` (estilo `soft`) ou `{ "label": "Pouco peito", "color": "red" }`. As cores disponíveis são `accent, soft, gray, dark, red, amber, blue`.

**Tiers**: por padrão S=`accent`, A=`soft`, B=`dark`, C=`gray`, D/F=`muted`. Dá para trocar com `style`.

O JSON é validado com zod, e os erros indicam o caminho exato (ex.: `slides.3.items.0.score`).

## Arquitetura

```
src/
  index.ts            CLI: lê JSON → HTML → Tailwind → Playwright screenshot
  figures.ts          exporta SVGs avulsos e o mapa de músculos
  schema.ts           validação (zod); highlightsOf() normaliza muscles/highlight
  anatomy/
    registry.ts       IDs, nomes em PT, melhor vista, grupos e aliases
    figure.ts         anatomySvg(), cores, view "auto", foco; renderiza os 3 estilos
    photo.ts          estilo illustration: imagens em base64, espelhamento, lookup dos músculos
    photo-geom.ts     smooth(), tipos PhotoPart/PhotoSet
    photo-data.ts     regiões dos músculos sobre as imagens base (coordenadas da imagem)
    paths.ts          estilos lineart/flat: silhueta e músculos vetoriais; mirror() espelha paths
  css.ts              compila o Tailwind usando o HTML gerado como content; embute a Inter e a fonte dos títulos em base64
  ui.ts               moldura 1080x1920, header, helpers (tag, heading, figure)
  templates/          um arquivo por tipo de slide
  styles/base.css     componentes Tailwind (@apply)
scripts/
  prep-bases.ts       gera máscara e figura transparente a partir de assets/base-*.png
  grid.ts             recorte com grade de coordenadas, com ou sem overlay dos músculos
assets/
  base-*.png          imagens originais (frente e costas), mesma pose e enquadramento
  mask-*.png          silhueta do corpo (gerada)
  figure-*.png        ilustração com fundo transparente (gerada)
data/                 carrosséis em JSON
out/                  PNGs gerados (não versionado)
```

### Como alterar a figura

- **Trocar as imagens base** (`illustration`): substitua `assets/base-front.png` e `assets/base-back.png` por imagens de **mesma proporção, pose e enquadramento** (a frente e as costas precisam se sobrepor), com fundo branco e sem cor. Rode `npm run prep:bases` e depois confira as regiões com `npm run grid -- front 0 0 768 1376 overlay`. Se o tamanho mudar, ajuste `IMG` e `AXIS` em `src/anatomy/photo.ts`.
- **Ajustar ou criar uma região** (`illustration`): edite `src/anatomy/photo-data.ts` com pontos em coordenadas da imagem, só do lado esquerdo. Use `S([...])` para curvas suaves e `OVER("M… Z")` para áreas sobre o shorts. Leia as coordenadas em `npm run grid -- <front|back> <x> <y> <largura> <altura>`.
- **Novo músculo**: adicione o ID em `registry.ts`. Depois trace a região em `photo-data.ts` (`illustration`) e, se quiser os outros estilos, os paths em `FRONT` e/ou `BACK` no `paths.ts`, com coordenadas absolutas e x ≤ 100. Confira com `npm run figures`.

### Outras notas

- **SF Pro Display**: está na pilha de fontes como fallback. A Inter fica embutida para garantir o mesmo render em qualquer máquina, já que a SF Pro não pode ser redistribuída.
- **Área segura**: o conteúdo fica entre y=290 e y=1436, acima do CTA (que vai até y=1580). Use `npm run render:guides` para ver o que a UI do TikTok cobre. A coluna direita de botões pode encostar em scores e números alinhados à direita.
- **Peso do HTML**: no estilo `illustration`, cada figura embute a imagem em base64, então os `.html` de debug ficam grandes (principalmente com várias miniaturas no ranking). Os PNGs finais não são afetados.

## Limitações conhecidas

- **Shorts**: `quads`, `adductors`, `glutes` e `hamstrings` ficam em grande parte debaixo do shorts. Nesses casos o shorts é tingido com a cor do músculo, o que indica a região mas não desenha anatomia. Para um resultado melhor, gere outro par de imagens base com shorts curtos ou sunga.
- **Uma pose só**: a base é a pose neutra, sem equipamentos. Halteres, barras e outras poses precisam de camadas ou imagens novas, e cada pose nova exige refazer as regiões.
- **Regiões traçadas à mão**: algumas são aproximadas, principalmente os limites entre peitoral superior e médio, entre os deltoides e entre oblíquos e serrátil.
- **Texto longo**: os títulos se ajustam à largura, mas a altura não. Muitos itens ou descrições longas podem passar da área segura, então confira o PNG.
#   t i k t o k - s l i d e s h o w - g e n e r a t o r  
 