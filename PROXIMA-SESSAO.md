# Próxima sessão: imagens de exercícios + grid por músculo

## Objetivo

O usuário vai criar imagens de exercícios (poses novas) usando o **mesmo avatar** das bases atuais. Depois, para cada imagem, é preciso traçar as regiões de cada músculo (o "grid") para que o JSON consiga destacá-los, como já funciona na pose neutra.

## Estado atual (fim da sessão anterior)

- Projeto funcionando: `npm run typecheck` e `npm run render` passam. Exemplos em `data/` (`peito-top5`, `costas-guia`, `rosca-martelo`).
- Layout lateral (texto 45% / figura 55%), título Anton em duas linhas, CTA no rodapé, capa via `hook` e campos `target/sets/reps/rest/benefits` no `exercise` estão prontos. Detalhes no `README.md`.
- A figura `illustration` usa **uma pose só** (neutra, frente e costas): `assets/base-front.png` e `assets/base-back.png` (768x1376, mesma pose e enquadramento). As regiões dos músculos estão em `src/anatomy/photo-data.ts` (coordenadas da imagem, só o lado esquerdo, espelhado em x=384).
- Pipeline atual: `npm run prep:bases` gera `assets/mask-*.png` (silhueta) e `assets/figure-*.png` (fundo transparente). `npm run grid -- <front|back> <x> <y> <w> <h> [overlay]` gera um recorte com grade de coordenadas para traçar à mão.

## Limitação a resolver

O código assume **um único par de imagens** (`IMG`, `AXIS` em `src/anatomy/photo.ts`; regiões fixas em `photo-data.ts`; espelhamento esquerda→direita). Poses de exercício são assimétricas e têm outros enquadramentos, então isso precisa virar um **conjunto de poses**.

## O que o usuário precisa trazer

- Uma imagem por pose/exercício (ex.: rosca martelo, supino, remada), mesmo avatar, fundo branco, sem cor, de preferência mesma escala. Colocar em `assets/poses/<nome>.png`.
- Dizer, para cada pose, quais músculos aparecem e se a pose é simétrica ou não.

## Plano proposto

1. **Registrar poses**: mudar `photo.ts`/`photo-data.ts` para um mapa `poses[nome] = { imagem, tamanho, eixo, regiões, simétrica }`. A pose atual vira `neutral-front` / `neutral-back`.
2. **Estender o `prep-bases.ts`** para processar todas as imagens de `assets/poses/` (máscara do corpo + figura transparente).
3. **Grid por pose**: estender `scripts/grid.ts` para aceitar o nome da pose. Para cada pose, traçar as regiões dos músculos visíveis (21 IDs em `registry.ts`), já com o lado direito explícito quando a pose não for simétrica.
4. **Schema**: campo opcional `pose` no slide `exercise` (e na capa/figura). Sem `pose`, usa a neutra como hoje.
5. **Teste**: um exercício por pose no `data/`, render e conferência visual (`npm run grid -- <pose> ... overlay`).
6. **README**: documentar como adicionar uma pose nova.

## Decisões em aberto

- Tamanho/enquadramento das novas imagens: manter 768x1376 ou aceitar qualquer proporção (o `viewBox` passaria a vir de cada pose).
- Traçar as regiões à mão com o grid (como antes) ou testar uma segmentação semiautomática (ex.: pedir ao usuário uma segunda versão da imagem com os músculos pintados em cores chapadas, que dá para virar máscara direto).
- Músculos cobertos por equipamentos (barra, halteres) nas novas poses: ignorar a oclusão ou recortar com a silhueta do equipamento.

## Dica para as imagens

Se possível, gerar cada pose também em uma versão "mapa de músculos" (mesma pose, cada músculo numa cor chapada distinta). Com isso, as regiões saem por detecção de cor em vez de tracejar pontos, o que economiza a maior parte do trabalho manual.
