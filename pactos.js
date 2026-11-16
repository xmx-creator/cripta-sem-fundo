// OS PACTOS: todo pacto da uma vantagem e cobra um preco. Aparecem ao subir de nivel e nos altares.
// Cada um so altera numeros de "s" (os stats do mago). "h" e o heroi (h.vida = coracoes atuais).
//
// Stats em "s" (valor inicial):
//   s.dano (1)  s.cadencia (1)  s.velBala (1)  s.quiques (0)  s.perfurar (0)  s.espalha (1)
//   s.explosao (1)  s.queimar (0)  s.critico (0)  s.alcance (1, corpo a corpo)
//   s.vidaMax (5)  s.velHeroi (1)  s.recargaDash (0.8)  s.hitbox (2)
//   s.velBalaInimiga (1)  s.xp (1)  s.luz (0, pixels extras de visao no escuro)

const PACTOS = [
  { nome: 'Gatilho Febril',    bom: 'ataca 40% mais rapido',     ruim: '20% menos dano',            raridade: 'comum',
    aplicar: s => { s.cadencia *= 1.4; s.dano *= 0.8; } },
  { nome: 'Polvora Instavel',  bom: '50% mais dano',             ruim: 'mira 60% mais torta',       raridade: 'comum',
    aplicar: s => { s.dano *= 1.5; s.espalha *= 1.6; } },
  { nome: 'Balas de Borracha', bom: '+2 ricochetes',             ruim: '15% menos dano',            raridade: 'comum',
    aplicar: s => { s.quiques += 2; s.dano *= 0.85; } },
  { nome: 'Armadura Pesada',   bom: '+2 coracoes',               ruim: 'anda 20% mais devagar',     raridade: 'comum',
    aplicar: s => { s.vidaMax += 2; s.velHeroi *= 0.8; } },
  { nome: 'Botas de Vento',    bom: 'anda 25% mais rapido',      ruim: '-1 coracao maximo',         raridade: 'comum',
    aplicar: s => { s.velHeroi *= 1.25; s.vidaMax -= 1; } },
  { nome: 'Braco Longo',       bom: 'corpo a corpo 35% + longe', ruim: 'ataca 15% mais devagar',    raridade: 'comum',
    aplicar: s => { s.alcance *= 1.35; s.cadencia *= 0.85; } },
  { nome: 'Ponta de Aco',      bom: 'tiro atravessa +2',         ruim: 'ataca 20% mais devagar',    raridade: 'magico',
    aplicar: s => { s.perfurar += 2; s.cadencia *= 0.8; } },
  { nome: 'Passo Sombrio',     bom: 'dash recarrega 40% antes',  ruim: 'nucleo de dano maior',      raridade: 'magico',
    aplicar: s => { s.recargaDash *= 0.6; s.hitbox += 1; } },
  { nome: 'Brasa Infernal',    bom: 'ataques queimam: 3 dano/s', ruim: 'balas inimigas +15% vel',   raridade: 'magico',
    aplicar: s => { s.queimar += 3; s.velBalaInimiga *= 1.15; } },
  { nome: 'Olhos de Coruja',   bom: 'enxerga bem mais no escuro', ruim: '15% menos dano',           raridade: 'magico',
    aplicar: s => { s.luz += 30; s.dano *= 0.85; } },
  { nome: 'Carga Dupla',       bom: 'explosao 60% maior',        ruim: 'tiros 20% mais lentos',     raridade: 'magico',
    aplicar: s => { s.explosao *= 1.6; s.velBala *= 0.8; } },
  { nome: 'Olho do Abismo',    bom: '50% mais XP',               ruim: 'balas inimigas +25% vel',   raridade: 'raro',
    aplicar: s => { s.xp *= 1.5; s.velBalaInimiga *= 1.25; } },
  { nome: 'Pacto de Sangue',   bom: '+35% chance de critico',    ruim: 'perde 1 coracao agora',     raridade: 'raro',
    aplicar: (s, h) => { s.critico += 0.35; h.vida -= 1; } },
  { nome: 'Canhao de Vidro',   bom: 'dano em dobro',             ruim: '-2 coracoes maximos',       raridade: 'raro',
    aplicar: s => { s.dano *= 2; s.vidaMax -= 2; } },

  // --- segunda leva: pactos que empurram para um estilo de jogo ---
  // stats novos: s.danoCorpo (1)  s.danoTiro (1)  s.balasExtra (0)  s.explosaoBase (0)  s.dashDist (1)
  //              s.focoGanho (1)  s.furiaGanho (1)  s.sorte (0)  s.vidaInimiga (1)
  { nome: 'Mao Pesada',        bom: 'corpo a corpo 60% + forte', ruim: 'tiros 25% mais fracos',     raridade: 'comum',
    aplicar: s => { s.danoCorpo *= 1.6; s.danoTiro *= 0.75; } },
  { nome: 'Olho de Aguia',     bom: 'tiros 40% mais fortes',     ruim: 'corpo a corpo 30% + fraco', raridade: 'comum',
    aplicar: s => { s.danoTiro *= 1.4; s.danoCorpo *= 0.7; } },
  { nome: 'Carne Viva',        bom: 'cura 2 coracoes agora',     ruim: 'balas inimigas +15% vel',   raridade: 'comum',
    aplicar: (s, h) => { h.vida += 2; s.velBalaInimiga *= 1.15; } },
  { nome: 'Salto Longo',       bom: 'dash 50% mais longo',       ruim: 'dash recarrega 30% depois', raridade: 'comum',
    aplicar: s => { s.dashDist *= 1.5; s.recargaDash *= 1.3; } },
  { nome: 'Furia Cega',        bom: 'a furia sobe em dobro',     ruim: 'mira 40% mais torta',       raridade: 'magico',
    aplicar: s => { s.furiaGanho *= 2; s.espalha *= 1.4; } },
  { nome: 'Tempo Roubado',     bom: 'camera lenta enche 2x',     ruim: '-1 coracao maximo',         raridade: 'magico',
    aplicar: s => { s.focoGanho *= 2; s.vidaMax -= 1; } },
  { nome: 'Ganancia',          bom: 'armas bem melhores caem',   ruim: 'inimigos com +20% vida',    raridade: 'magico',
    aplicar: s => { s.sorte += 1.5; s.vidaInimiga *= 1.2; } },
  { nome: 'Chuva de Chumbo',   bom: '+1 projetil por disparo',   ruim: '30% menos dano',            raridade: 'raro',
    aplicar: s => { s.balasExtra += 1; s.dano *= 0.7; } },
  { nome: 'Pavio Curto',       bom: 'todo tiro explode',         ruim: 'ataca 25% mais devagar',    raridade: 'raro',
    aplicar: s => { s.explosaoBase += 12; s.cadencia *= 0.75; } },
];
