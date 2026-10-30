# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é

Gerador de carrosséis 1080×1920 para TikTok/Instagram a partir de JSON (`data/*.json`). Usa Node, TypeScript (rodado com `tsx`, sem build), Tailwind JIT e Playwright para o screenshot. O projeto inteiro é em português: código comentado em PT, textos de slide, nomes de músculos e mensagens de erro. Mantenha esse padrão.

## Comandos

```bash
npm run typecheck                         # tsc --noEmit (só cobre src/, os scripts/ não entram)
npm run render                            # todos os data/*.json → out/<id>/ (teste)
npm run render -- data/x.json             # um deck só
npm run render:html | render:guides       # teste com .html de debug | sobreposição da UI do TikTok
npm run render:final -- data/x.json       # versão para POSTAR → output/<id>/ (recusa --html/--guides)
npm run prep:poses [pose...]              # regenera assets/poses/<pose>/ a partir das imagens da pose
npm run grid -- <pose|front|back> x y w h [overlay]   # recorte com grade e as máscaras pintadas → out/grid/
npm run figures                           # SVGs avulsos e mapa de músculos → out/figures/
```

Não há testes automatizados nem lint. A validação é o `typecheck` mais a conferência visual dos PNGs: leia os PNGs gerados para revisar o resultado.

**Pastas de saída:** `out/` é só para testes. Slideshow para postar vai em `output/`, sempre via `render:final`, depois de conferido em `out/`. Para cada postagem deve ser criado uma pasta com o número da postagem e nome do assunto na pasta `output/`, por exemplo, `P1_Peito_5_Melhores/`. 

## Arquitetura

Fluxo do render (`src/index.ts`):
1. O JSON é validado pelo `Deck` (zod, em `src/schema.ts`). O `hook` do deck vira o primeiro slide `cover`.
2. `renderSlide()` (`src/templates/index.ts`) despacha para um template por `type`. O resultado vai dentro de `frame()` (`src/ui.ts`), que monta o cabeçalho, a área segura e a barra de CTA do rodapé.
3. O Tailwind é compilado usando o HTML gerado como *content* (`src/css.ts`). As fontes Inter e Anton/League Gothic são embutidas em base64. A cor de destaque entra como as variáveis CSS `--accent-rgb`, `--accent-ink-rgb` e `--accent-deep-rgb`. Nas classes, use `accent` (`bg-accent`, `text-accent`), nunca um hex fixo.
4. Antes do screenshot roda o `FIT_SCRIPT` (`ui.ts`): cada elemento com `[data-fit]` cresce a fonte até preencher a largura. É assim que os títulos condensados se ajustam. Só a largura se ajusta, a altura não.

Pontos que exigem ler mais de um arquivo:
- **Destaque de músculos.** Os slides aceitam `muscles` (primary/secondary) e/ou `highlight` (grupos com cor e legenda). `highlightsOf()` (`schema.ts`) normaliza os dois para `Highlight[]`. `resolveMuscleRef()` (`anatomy/registry.ts`) aceita ID, grupo (`chest` → upper+mid) ou alias em PT, ignorando acento e maiúscula. São 21 IDs em `MUSCLE_IDS`.
- **Títulos.** `displayTitle()` (`ui.ts`) divide o texto em linhas: `\n` é explícito; sem ele, o texto é dividido em 2 linhas equilibradas. `{palavra}` vira destaque com degradê (regra `.h-title .text-accent` em `styles/base.css`). Linhas com acento em maiúscula ou Ç ganham um respiro, porque o `leading` é 0.94.
- **Figura `illustration` (padrão), baseada em poses.**
  - Cada pose tem duas imagens em `assets/poses/`: `<pose>.png` (ilustração em cinza) e `<pose>.map.png` (cada músculo numa cor chapada, alinhado ao pixel).
  - `scripts/prep-poses.ts` converte o mapa em máscaras, com a paleta e os ajustes de cada pose no `CONFIG`. Exemplos de ajuste: dividir o peitoral superior × médio pela forma, cortar o pescoço do trapézio, glúteo = shorts.
  - A saída vai para `assets/poses/<pose>/`: `figure.png`, `<musculo>.png` e `meta.json` com os bboxes. Esses arquivos são gerados e versionados.
  - Na renderização (`anatomy/figure.ts` → `illustrationSvg`), cada músculo destacado vira um `<rect>` com `mask` da sua máscara, pintado em `mix-blend-mode: multiply`. O glúteo é a exceção (`OVER_SHORTS`): usa blend normal, porque fica sobre o shorts preto.
  - O registro das poses e a pose padrão de cada vista ficam em `anatomy/poses.ts`. `cover` e `exercise` aceitam `"pose"`.
- **Nova pose.** Adicionar em `POSES` (`poses.ts`) e em `CONFIG` (`prep-poses.ts`), rodar `prep:poses` e conferir com `grid ... overlay`. O passo a passo está no README, em "Como adicionar uma pose".
- **`lineart`/`flat`** são vetoriais (`anatomy/paths.ts`). Desenham só a metade esquerda, e `mirror()` espelha para a direita.
- **Vista.** `resolveViews("auto")` escolhe frente, costas ou ambas pelo campo `best` de cada músculo no registry. `hiddenMuscles()` avisa quando um músculo destacado não existe na vista escolhida.

## Convenções do repositório

- `LOG.md` (ignorado pelo git) guarda o histórico das sessões e as pendências. Leia no início e acrescente uma entrada ao fim de cada sessão.
- O `.gitignore` ignora `out/`, `output/`, `brand/` e `LOG.md`. Os decks de `data/` são todos versionados.
- `brand/brand.json` (handle, cor e CTA) é lido por `loadDeck` em `src/index.ts` e vale como padrão para todos os decks; o `theme` do deck sobrescreve. Não repita handle/cor nos JSONs.
- `content/posts.csv` controla os posts lançados; `docs/prompts/Poses-50.md` guarda os prompts das poses.
- Ambiente Windows: para scripts rápidos, use `node -e`/`tsx`. O `python` é o atalho da Microsoft Store e trava esperando entrada.
- Commits em português.
