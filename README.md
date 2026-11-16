# Cripta Sem Fundo

Dois jogos originais de ação, sombrios e violentos (+18), feitos em HTML + JavaScript puro. Sem instalar nada, sem build: é abrir e jogar.

- **Cripta Sem Fundo** (`index.html`): roguelite visto de cima. Salas sorteadas, armas com raridade, pactos com custo, chefão a cada 3 andares.
- **Cripta: A Queda** (`queda.html`): a mesma cripta vista de lado. Plataforma, pulo duplo, dash em 8 direções, alçapões.

Os dois dividem armas, pactos, relíquias e a **patente**: cada abate vira uma caveira que não se perde na morte.

## O que tem de diferente

- **Raiva e Surto**: apanhar enche a barra vermelha. Encheu, são 6 segundos em que nada te fere e encostar no inimigo é que machuca ele.
- **Execução**: inimigo piscando em vermelho morre na hora com um dash, e o dash volta.
- **Vingança**: mate quem te feriu em 7 segundos e o coração volta.

## Controles

| | Cripta Sem Fundo | A Queda |
|---|---|---|
| Mover | WASD | A / D |
| Pular | - | W ou Espaço (2x), S desce da plataforma |
| Mirar e atacar | mouse | mouse |
| Dash | Espaço ou botão direito | Shift ou botão direito |
| Câmera lenta | Shift | F ou C |
| Pegar / usar | E ou F | E |
| Trocar de arma | Q ou roda do mouse | Q ou roda do mouse |
| Som | M | M |

Controle (layout Xbox) funciona nos dois: analógico esquerdo anda, direito mira e ataca, RT ataca sozinho no mais próximo.

## Jogar agora

Direto no navegador, sem baixar nada:

- Cripta Sem Fundo: https://xmx-creator.github.io/cripta-sem-fundo/
- Cripta: A Queda: https://xmx-creator.github.io/cripta-sem-fundo/queda.html

## Jogar no seu PC

Baixe o repositório (botão **Code > Download ZIP**), extraia e abra `index.html` ou `queda.html` no navegador.

## Mexer no jogo

Tudo é texto. Os melhores lugares para começar:

- `armas.js`: bases de armas e afixos.
- `pactos.js`: as escolhas de subida de nível, cada uma com um ganho e um preço.
- `reliquias.js`: itens passivos que reagem a eventos (`aoMatar`, `aoDash`, `aoFerido`, `aoDescer`).
- `game.js` e `queda.js`: o motor de cada jogo.

## Licença

MIT. Pode usar, copiar, modificar e redistribuir. Veja `LICENSE`.
