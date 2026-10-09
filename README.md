# Castle Roll

Uma aventura de Bob Roll em um castelo assombrado. Castle Roll é um jogo de plataforma 2D para navegador, com exploração, combate com chicote e uma campanha de três fases.

## Capa

<!-- Substitua CAMINHO_DA_IMAGEM_DE_CAPA pelo caminho relativo da imagem ou por uma URL. -->
![Capa do Castle Roll](CAMINHO_DA_IMAGEM_DE_CAPA)

## Como é o jogo

Guie Bob Roll pelas plataformas do castelo, supere abismos, enfrente inimigos e derrote o chefe de cada fase para avançar. Quebre velas para encontrar moedas e poções, acumule pontos e tente melhorar seu resultado no ranking.

- **Portões da Noite:** a entrada do castelo e o confronto com a Extrusora Cuspidora de Fogo.
- **Interior do Castelo:** novas plataformas e inimigos, com o Monstro Solvente como chefe.
- **Grande Salão:** galerias, escadas e a batalha final contra a Picotadeira do Mal.
- Pontuação por moedas, inimigos e chefes, com bônus por tempo de conclusão e objetivos.
- Poções de cura e superpoções com efeito temporário.
- Música e efeitos sintetizados, animações de sprites e cenário com paralaxe.
- Controles de toque para dispositivos móveis, pausa e opção de tela cheia quando disponível.
- Ranking com modos local, online via servidor e global via Firebase.

## Imagens do gameplay

Troque os três caminhos abaixo por imagens do jogo. Você pode usar arquivos do repositório, como `docs/images/gameplay-1.png`, ou URLs completas.

### Imagem 1 — Portões da Noite

![Gameplay: Portões da Noite](CAMINHO_DA_IMAGEM_1)

### Imagem 2 — Interior do Castelo

![Gameplay: Interior do Castelo](CAMINHO_DA_IMAGEM_2)

### Imagem 3 — Grande Salão

![Gameplay: Grande Salão](CAMINHO_DA_IMAGEM_3)

## Tecnologias usadas

| Tecnologia | Uso no projeto |
| --- | --- |
| HTML5 | Estrutura da página, interface e elemento Canvas. |
| CSS3 | Estilização, layout responsivo e controles na tela. |
| JavaScript | Lógica do jogo, física, combate, animações e interface, sem framework de frontend. |
| Canvas 2D | Renderização dos cenários, sprites, partículas e câmera. |
| Web Audio API | Música e efeitos sonoros sintetizados no navegador. |
| localStorage | Ranking local e fila de sincronização de resultados. |
| Firebase Authentication e Cloud Firestore | Autenticação e armazenamento do ranking global. |
| Node.js | Servidor HTTP, API de ranking e geração da versão estática, sem dependências npm externas. |
| Docker | Empacotamento e execução do servidor em contêiner. |

## Executar localmente

Requisitos: **Node.js 24.x** e um navegador moderno com JavaScript habilitado.

Na pasta do projeto, execute:

```sh
npm start
```

Abra **http://localhost:8787**. Não é necessário executar `npm install`: o projeto utiliza os módulos nativos do Node.js.

O servidor inicia com ranking online pela API e salva os dados em `server/data/ranking.json`. Para usar somente o ranking local, execute no PowerShell:

```powershell
$env:RANKING_MODE = "local"
npm start
```

O arquivo `runtime-config.js` configura o modo Firestore para a versão estática. Ao executar pelo servidor Node.js, essa configuração é fornecida pelo próprio servidor. O ranking global depende da configuração do Firebase, da autenticação e das regras de acesso do Firestore.

## Controles

| Ação | Tecla |
| --- | --- |
| Mover | `A` / `D` ou setas esquerda / direita |
| Pular | `W` ou seta para cima |
| Descer de uma plataforma | Seta para baixo |
| Atacar com o chicote | `Espaço` |
| Pausar / retomar | `P` ou `Esc` |
| Abrir o fluxo de reinício | `R` |

Em celulares e tablets, use os botões na tela. A orientação horizontal oferece mais espaço para jogar. Ative o áudio pelo botão **SOM**.

## Estrutura do projeto

```text
assets/              Imagens, sprites e documentação da arte
scripts/             Build e verificadores do ranking
server/              Servidor HTTP e API de ranking
art.js               Carregamento e recorte dos sprites
audio.js             Música e efeitos sonoros
game.js              Lógica principal e renderização do jogo
game-config.js       Balanceamento, pontuação e configurações
levels.js            Mapas e elementos das três fases
ranking-client.js    Integração dos modos de ranking
ranking-sync.js      Fila de sincronização de resultados
firebase-*.js        Configuração e integração com Firebase
touch-controls.js    Controles por toque
index.html           Página do jogo
style.css            Estilos da interface
```

## Build e configuração

```sh
npm run build
```

A versão estática é gerada em `dist/`. O build exige que essa pasta ainda não exista; se houver uma versão anterior, renomeie-a antes de executar novamente.

O arquivo `.env.example` apresenta as variáveis de configuração do servidor. Ele **não é carregado automaticamente**: configure as variáveis no terminal ou na plataforma de hospedagem. Em produção, configure `APP_ORIGIN` com a URL HTTPS pública e, para o ranking online, `DATA_FILE` em um volume persistente.

A política de segurança atual do servidor e do build estático limita conexões e scripts à própria origem. Uma publicação que use o ranking Firestore precisa adequar essa política aos serviços Firebase utilizados.

## Verificação

Os verificadores disponíveis podem ser executados com:

```sh
node scripts/verify-ranking-sync.cjs
node scripts/verify-firestore-ranking.cjs
```

O comando `npm test` referencia arquivos em `tests/` que não estão presentes nesta versão do projeto.

## Git

O `.gitignore` exclui dependências, a pasta gerada `dist/`, dados locais do ranking, arquivos `.env` e logs. O `.env.example` permanece versionável como referência de configuração.

Para revisar e criar o primeiro commit:

```sh
git status
git add .
git commit -m "Adiciona Castle Roll e documentação"
```

## Autor

Desenvolvido por **Denilsom Lobo de Souza**.

[Portfólio](https://portifolio-denilsom-lobo.web.app/)
