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
npm run render:final -- data/x.json    # versão para postar, em output/
npm run typecheck                      # confere os tipos (tsc --noEmit)
npm run figures                        # SVGs avulsos + mapa de músculos em out/figures
npm run prep:poses                     # gera figura e máscaras dos músculos a partir de assets/poses
npm run grid -- neutral-front 130 230 510 400 overlay   # recorte com grade e as máscaras pintadas
```

Saída: `out/<id>/01-cover.png`, `02-anatomy.png`, …

- **`out/`**: testes e conferência. É onde `render`, `render:html` e `render:guides` salvam.
- **`output/`**: só os slideshows que vão ser postados. É onde `render:final` salva. Ele não aceita `--guides` nem `--html`, para não ir guia ou HTML de debug para a pasta de postagem.

Os arquivos antigos da mesma pasta são apagados a cada render.

Exemplos prontos em `data/` (todos versionados):
- `peito-5-melhores.json`: o post P1 (capa, anatomia, ranking, exercício e CTA).
- `biceps-4-melhores.json`: o modelo **capa → exercícios → resumo + CTA**.
- `peito-top5.json` (todos os tipos de slide), `costas-guia.json` (vista de costas e grupos coloridos) e `rosca-martelo.json` (no estilo da referência).

### Marca (`brand/brand.json`)

`handle`, `accent` e `cta` valem para todos os decks. O `theme` do deck sobrescreve o que mudar. Sem o arquivo, o gerador usa os padrões do schema.

```json
{ "handle": "@treinaforte", "accent": "#e11d2e", "cta": "SALVE ISSO {PARA DEPOIS!}" }
```

O `brand/brand.md` é só o texto de referência da marca. A pasta `brand/` está no `.gitignore`, então não vai para o repositório.

### Sequência recomendada do slideshow

1. **Capa**: o `hook` do deck.
2. **2 a n**: um slide `exercise` por exercício, com `rank` de 1 a n.
3. **Último**: slide `cta` com `summary` (resumo dos exercícios) e o botão de fechamento.

```json
{ "type": "cta", "title": "Resumo do\n{treino de bíceps}", "summary": [{ "title": "Rosca {direta}", "text": "3×8–10 · 90s" }], "button": "Salve e siga para mais treinos" }
```

Sem `summary`, o `cta` continua o fechamento simples (ícone grande e botão).

### Controle de posts

`content/posts.csv` (separador `;`, UTF-8 com BOM) registra cada post: pasta em `output/`, data, link, legenda, métricas e status.

## Estrutura do JSON

```json
{
  "id": "peito-top5",
  "theme": { "titleFont": "anton", "cta": "SALVE ISSO {PARA DEPOIS!}" },
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
| `cover`    | `kicker`, `title`, `subtitle`, `swipe`, figura (`muscles` ou `highlight`), `view`, `pose` (normalmente via `hook`) |
| `anatomy`  | `kicker`, `title`, `subtitle`, figura, `view`, `layout`, `labels?: [{ muscle, text, note }]` (se omitido, a legenda é gerada a partir dos grupos de destaque) |
| `tierlist` | `title`, `tiers: [{ tier: "S", style?, items: ["Nome" \| { name, tag }] }]` |
| `ranking`  | `title`, `thumbnails`, `items: [{ name, description, score (0-10), tags, muscles ou highlight }]` (máx. 6; a miniatura usa a vista em que o músculo aparece melhor) |
| `exercise` | `rank`, `name`, `description`, `tags`, figura, `view`, `pose`, `target`, `sets`, `reps`, `rest`, `benefits`, `layout`, `stats?: [{ label, value (0-10) }]` (só no layout `stacked`) |
| `list`     | `title`, `style: number \| check \| cross`, `items: ["texto" \| { title, text }]` |
| `cta`      | `title`, `subtitle`, `button`, `icon: bookmark \| share \| follow` |

## Figura anatômica

### Estilo (`theme.figure`)

```json
"theme": { "accent": "#e11d2e", "figure": { "style": "illustration" } }
```

| style | Visual |
|-------|--------|
| `illustration` (padrão) | Ilustração raster de uma pose (`assets/poses/`) com os músculos destacados pintados por cima. A cor é multiplicada sobre o desenho, então o traço e o sombreamento continuam visíveis. |
| `lineart` | Ilustração vetorial gerada por código, no estilo de infográfico de academia. Não depende de imagens. |
| `flat` | Silhueta cinza com músculos chapados (estilo app Arrow). |

`shorts` (`"auto"`, `true`, `false`) só vale para o `lineart`.

### Como o estilo `illustration` funciona

- **Poses**: cada pose tem duas imagens em `assets/poses/` (768×1376, fundo branco):
  - `<pose>.png`: a ilustração em tons de cinza.
  - `<pose>.map.png`: a mesma pose, alinhada ao pixel, com cada músculo numa cor chapada.

  Hoje existem `neutral-front` e `neutral-back`, registradas em `src/anatomy/poses.ts`.
- **Processamento**: `npm run prep:poses` lê o mapa de cores e gera em `assets/poses/<pose>/` a figura com fundo transparente, uma máscara por músculo e o `meta.json` com os recortes.
  - A tabela cor → músculo e os ajustes de cada pose ficam em `scripts/prep-poses.ts`. Um exemplo de ajuste é dividir o peitoral em superior e médio.
  - Rode esse comando sempre que trocar uma imagem.
- **Conferir as regiões**: `npm run grid -- neutral-front 0 0 768 1376 overlay` gera em `out/grid/` um recorte com grade de coordenadas e cada máscara pintada numa cor. `front` e `back` também funcionam como atalho da pose neutra.
- **Pose no slide**: `cover` e `exercise` aceitam `"pose": "<nome>"`. Com `pose`, a vista é a da pose. Sem `pose`, o slide usa a pose neutra da vista escolhida.
- **Glúteo**: fica todo debaixo do shorts. A região dele é o próprio shorts, tingido com a cor do músculo e sem multiplicar, porque a cor multiplicada sobre o preto não apareceria.

#### Como adicionar uma pose
1. Gere a ilustração e o mapa de cores com o mesmo personagem e o mesmo enquadramento. Salve como `assets/poses/<pose>.png` e `assets/poses/<pose>.map.png`.
2. Registre a pose em `POSES` (`src/anatomy/poses.ts`), com a vista dela.
3. Em `scripts/prep-poses.ts`, adicione a paleta (cor → músculo) e, se precisar, os ajustes e os `holes`. `holes` são pontos brancos fechados pelo desenho que são fundo, como o vão entre o braço e o tronco.
4. Rode `npm run prep:poses <pose>` e confira com `npm run grid -- <pose> 0 0 768 1376 overlay`.

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
<!-- illustration (padrão): viewBox em coordenadas da imagem (768x1376), a partir do bbox do corpo -->
<svg class="anatomy anatomy--illustration" data-view="back" data-pose="neutral-back" viewBox="116 36 538 1304">
  <defs><mask id="mm-neutral-back-lats">…assets/poses/neutral-back/lats.png…</mask></defs>
  <image href="data:image/png;base64,…"/>            <!-- assets/poses/neutral-back/figure.png -->
  <g class="muscles">                                 <!-- mix-blend-mode: multiply -->
    <g id="lats" class="muscle is-active" data-muscle="lats" style="--hl:#e11d2e">
      <title>Dorsal</title>
      <rect x="…" y="…" width="…" height="…" mask="url(#mm-neutral-back-lats)"/>
    </g>
  </g>
  <g class="muscles muscles--over">…shorts tingido…</g>   <!-- só com glúteo destacado -->
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
- **Uso direto em código**: `anatomySvg({ view, pose, highlights, focus, style, standalone })` em `src/anatomy/figure.ts`.
- **SVGs avulsos**: `npm run figures` gera `anatomy-{front,back}-{illustration,lineart,flat}.svg`, sem destaque e com o CSS embutido.

**Tags**: `"Halter"` (estilo `soft`) ou `{ "label": "Pouco peito", "color": "red" }`. As cores disponíveis são `accent, soft, gray, dark, red, amber, blue`.

**Tiers**: por padrão S=`accent`, A=`soft`, B=`dark`, C=`gray`, D/F=`muted`. Dá para trocar com `style`.

O JSON é validado com zod, e os erros indicam o caminho exato (ex.: `slides.3.items.0.score`).

## Arquitetura

```
src/
  index.ts            CLI: lê JSON (+ brand/brand.json) → HTML → Tailwind → Playwright screenshot
  figures.ts          exporta SVGs avulsos e o mapa de músculos
  schema.ts           validação (zod); highlightsOf() normaliza muscles/highlight
  anatomy/
    registry.ts       IDs, nomes em PT, melhor vista, grupos e aliases
    figure.ts         anatomySvg(), cores, view "auto", foco; renderiza os 3 estilos
    poses.ts          estilo illustration: registro das poses, meta.json e imagens em base64
    paths.ts          estilos lineart/flat: silhueta e músculos vetoriais; mirror() espelha paths
  css.ts              compila o Tailwind usando o HTML gerado como content; embute a Inter e a fonte dos títulos em base64
  ui.ts               moldura 1080x1920, header, helpers (tag, heading, figure)
  templates/          um arquivo por tipo de slide
  styles/base.css     componentes Tailwind (@apply)
scripts/
  prep-poses.ts       mapa de cores → máscaras dos músculos; paleta e ajustes de cada pose
  grid.ts             recorte com grade de coordenadas, com ou sem overlay das máscaras
assets/poses/
  <pose>.png          ilustração original (tons de cinza, fundo branco)
  <pose>.map.png      mesma pose com cada músculo numa cor chapada
  <pose>/             gerado: figure.png (fundo transparente), <musculo>.png e meta.json
data/                 carrosséis em JSON (versionados)
brand/                brand.json (handle, cor e CTA, lido pelo código) e brand.md; ignorado pelo git
content/              posts.csv: controle dos posts no TikTok
docs/prompts/         Poses-50.md: prompts das 50 poses de exercícios para gerar as imagens
out/                  PNGs de teste (não versionado)
output/               P<n>_<Assunto>/ com os slideshows para postar (não versionado)
```

### Como alterar a figura

- **Trocar ou adicionar uma pose** (`illustration`): veja "Como adicionar uma pose" acima.
- **Ajustar uma região** (`illustration`): o mais simples é corrigir as cores no `<pose>.map.png`. Se o mapa não separa dois músculos, como o peitoral superior e o médio, crie um ajuste da pose em `scripts/prep-poses.ts`. Depois rode `npm run prep:poses` e confira com o `grid`.
- **Novo músculo**: adicione o ID em `registry.ts`. Depois inclua a cor dele na paleta da pose (`illustration`). Para os outros estilos, desenhe os paths em `FRONT` e/ou `BACK` no `paths.ts`, com coordenadas absolutas e x ≤ 100. Confira com `npm run figures`.

### Outras notas

- **SF Pro Display**: está na pilha de fontes como fallback. A Inter fica embutida para garantir o mesmo render em qualquer máquina, já que a SF Pro não pode ser redistribuída.
- **Área segura**: o conteúdo fica entre y=290 e y=1436, acima do CTA (que vai até y=1580). Use `npm run render:guides` para ver o que a UI do TikTok cobre. A coluna direita de botões pode encostar em scores e números alinhados à direita.
- **Peso do HTML**: no estilo `illustration`, cada figura embute a imagem em base64, então os `.html` de debug ficam grandes (principalmente com várias miniaturas no ranking). Os PNGs finais não são afetados.

## Limitações conhecidas

- **Glúteo**: fica debaixo do shorts. O shorts é tingido com a cor do músculo, o que indica a região mas não desenha anatomia.
- **Divisões geométricas**: algumas divisões são calculadas pela forma da região, sem vir de uma cor própria do mapa. Por isso são aproximadas:
  - peitoral superior × médio: terço de cima de cada coluna;
  - adutor: faixa interna do alto da coxa;
  - panturrilha × tibial na vista de frente: lado interno × externo da perna.
- **Poses com equipamento**: `assets/poses/hammer-curl.png` ainda não tem mapa de cores, então não está registrada.
- **Texto longo**: os títulos se ajustam à largura, mas a altura não. Muitos itens ou descrições longas podem passar da área segura, então confira o PNG.
