// AS RELIQUIAS: itens passivos que voce pega andando por cima. Ficam ate voce morrer.
// Caem de chefoes, salas secretas, elites e do altar de sangue (custa 1 coracao maximo).
//
// Cada reliquia pode ter:
//   pegar(s, h)   roda uma vez na hora de pegar. "s" sao os stats (ver pactos.js), "h" e o mago.
//   aoMatar(e)    roda toda vez que um inimigo "e" morre (e.x, e.y = onde ele estava)
//   aoDash()      roda quando voce da um dash
//   aoFerido()    roda quando voce perde um coracao
//   aoDescer()    roda quando voce desce um andar
//
// Dentro delas voce pode usar: jogo.heroi (x, y, vida), jogo.stats, jogo.andar, jogo.abates,
//   explodir(x, y, raio, dano)   curar(quantos)   jogo.balas (as balas inimigas na tela)

const RELIQUIAS = [
  { nome: 'Coracao de Pedra',   desc: '+1 coracao maximo',            cor: '#d8423a', pegar: (s, h) => { s.vidaMax += 1; h.vida += 1; } },
  { nome: 'Pedra de Amolar',    desc: '20% mais dano',                cor: '#c8c4b8', pegar: s => { s.dano *= 1.2; } },
  { nome: 'Olho de Vidro',      desc: '+15% chance de critico',       cor: '#f2c744', pegar: s => { s.critico += 0.15; } },
  { nome: 'Pena de Corvo',      desc: 'anda 15% mais rapido',         cor: '#6a6478', pegar: s => { s.velHeroi *= 1.15; } },
  { nome: 'Lanterna',           desc: 'enxerga mais longe no escuro', cor: '#ffe9a0', pegar: s => { s.luz += 28; } },
  { nome: 'Ampulheta',          desc: 'camera lenta dura o dobro',    cor: '#7fd6ff', pegar: s => { s.focoGasto *= 0.5; } },
  { nome: 'Trevo de Ferro',     desc: 'armas melhores caem',          cor: '#58c04a', pegar: s => { s.sorte += 1; } },
  { nome: 'Chifre de Guerra',   desc: 'a furia demora mais a cair',   cor: '#f08a2c', pegar: s => { s.furiaDura *= 1.6; } },
  { nome: 'Luva de Duelista',   desc: 'trocou de arma: golpe forte',  cor: '#e8e4d8', pegar: s => { s.trocaBonus += 1.5; } },
  { nome: 'Orbe Guardiao',      desc: 'uma esfera que apaga balas',   cor: '#9fe8ff', pegar: s => { s.orbes += 1; } },
  { nome: 'Segundo Folego',     desc: 'revive uma vez',               cor: '#ffffff', pegar: s => { s.reviver += 1; } },
  { nome: 'Polvora Negra',      desc: 'inimigos mortos explodem',     cor: '#ff7a3c', aoMatar: e => explodir(e.x, e.y, 20, 3 + jogo.andar) },
  { nome: 'Dente de Vampiro',   desc: 'cura 1 a cada 30 abates',      cor: '#a0283c', aoMatar: () => { if (jogo.abates % 30 === 0) curar(1); } },
  { nome: 'Capa de Sombras',    desc: 'o dash explode',               cor: '#7b4bd6', aoDash: () => explodir(jogo.heroi.x, jogo.heroi.y, 24, 4 + jogo.andar * 1.5) },
  { nome: 'Espelho Rachado',    desc: 'ferido: apaga todas as balas', cor: '#c05ad8',
    aoFerido: () => { for (const b of jogo.balas) b.fora = true; explodir(jogo.heroi.x, jogo.heroi.y, 44, 6 + jogo.andar * 2); } },
  { nome: 'Moeda do Barqueiro', desc: 'descer cura +1 coracao',       cor: '#d8a83c', aoDescer: () => curar(1) },

  // TODO(human): invente aqui a SUA reliquia, copiando o formato de uma linha acima.
];
