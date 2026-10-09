# Arte de produção

## Trono e vitória

`throne.png`: atlas transparente de 1774 × 887 com o trono vazio e Bob Roll sentado, criado com a ferramenta integrada imagegen a partir da identidade de `../vitoria.png`. As duas poses do trono usam recortes alinhados em `art.js`.

`victory.png`: cópia transparente de produção das duas poses de `../vitoria.png`, preparada com imagegen para remover o fundo preto opaco. O original permanece intacto. A dança alterna as poses e acrescenta balanço e pequenos saltos durante cinco segundos. Ambos os arquivos foram inspecionados; a transparência foi verificada no PNG. Os prompts completos estão em `ending-generation-prompts.txt`.

A derrota do Boss 3 combina seu sprite com chamas e partículas, reduzindo a opacidade até o trono aparecer.

## Chicote do Bob Roll

`player-attack.png`: pose de ataque sem sacola embutida, criada com a ferramenta integrada imagegen a partir do atlas `characters.png`. Prompt em `player-attack-generation-prompt.txt`. O renderizador usa essa pose apenas ao atacar e encaixa o chicote na mão por coordenadas de ancoragem em `art.js`, evitando a sobreposição da antiga sacola. As demais poses continuam no atlas original.

O ataque usa diretamente `../chicote.png` (503 × 172), preservando o arquivo original. `art.js` recorta sua silhueta com uma máscara no Canvas para ocultar o fundo e o título da prancha. O cabo permanece ancorado à mão; a faixa é desenhada em segmentos com deslocamento suave, sincronizado ao progresso do golpe, e espelhada para a esquerda. O tamanho acompanha `playerAttack.reach` em `game-config.js` (88 pixels). As tentativas de gerar uma folha transparente não foram integradas porque mantiveram fundo indesejado.

## Fase 3

`phase3.png`: atlas transparente criado com a ferramenta integrada imagegen a partir de `skeleton_3.png`, `bat_3.png` e `boss_3.png`. Inclui o maçarico esqueleto, a serpente de lâminas, a picotadeira vampira e projéteis de fogo, serra, foice e faca. Prompt completo em `phase3-generation-prompt.txt`. Os recortes foram inspecionados e centralizados em `art.js`; os originais foram preservados.

`../tileset_background_3.png`: cenário original do Grande Salão. O fundo usa `[260, 0, 1276, 300]`, excluindo os títulos da referência. Plataformas e piso usam recortes específicos da mesma prancha.

## Fase 2

`phase2.png`: atlas transparente gerado com a ferramenta integrada imagegen, baseado nas referências `skeleton_2.png`, `boss_2.png` e `super_potion.png`. Contém o monstro de tesouras, o chefe químico, um morcego de brasa original, super poção e projéteis. O prompt está em `phase2-generation-prompt.txt`. Os recortes foram inspecionados e estão centralizados em `art.js`.

Os nomes de duas referências não correspondem ao conteúdo: `tileset_background_2.png` contém a ficha de moedas, enquanto `bat_2.png` contém o cenário da fase 2. O renderizador utiliza este último como `environment2`, sem modificar os originais. O morcego de brasa foi criado no novo atlas.

## Arquivos

- `characters.png`: PNG RGBA, 1254 × 1254, com transparência real. Gerado com a ferramenta integrada imagegen a partir das cinco pranchas de personagens fornecidas pelo usuário. Os originais não foram modificados.
- `../../art.js`: retângulos de origem em pixels, carregamento e desenho. Os recortes são explícitos porque a folha gerada não segue uma grade matematicamente exata.
- `../tileset_background.png`: fonte dos recortes de cenário. Usada diretamente pelo Canvas, sem exibir títulos, logotipos ou legendas da prancha.

## Atlas

| Linha | Conteúdo |
| --- | --- |
| 1 | Hiper Roll: parado, dois passos, ataque com plástico |
| 2 | Isqueirão: quatro poses de movimento |
| 3 | Tesourcego: quatro poses de voo |
| 4 | Extrusora parada, Extrusora disparando, pelet de cura, bola de fogo |

Os sprites são ancorados pelos pés e espelhados conforme a direção. A animação de salto usa uma pose de movimento; o dano aplica brilho e invulnerabilidade intermitente. O chicote recebe uma extensão desenhada em Canvas para representar todo o alcance do golpe. O Boss 3 possui uma sequência de derrota em chamas.

## Cenário

O panorama usa o retângulo `[425, 0, 915, 311]`, sem as legendas laterais. Colunas, blocos, topo das plataformas e portão usam recortes próprios, definidos no renderizador em `game.js`. A câmera aplica movimento mais lento ao castelo e movimento intermediário às colunas.

## Geração

Ferramenta: imagegen integrada, sem CLI/API adicional. O prompt completo está em `generation-prompt.txt`. O arquivo gerado foi copiado para este diretório e inspecionado antes da integração.

## Velas e moedas

`loot.png`: PNG RGBA, 1254 × 1254, transparente, gerado com imagegen integrada a partir das pranchas `../vela.png` e `../coin.png`. Contém quatro poses de chama da vela HR na primeira linha e quatro poses de rotação da Hipercoin na segunda. Recortes individuais em `art.js`, com a mesma altura de desenho para cada animação. Originais preservados. Prompt completo: `loot-generation-prompt.txt`.
