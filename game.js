// CRIPTA SEM FUNDO - roguelite de salas sorteadas
// Motor do jogo. As armas ficam em armas.js e os pactos em pactos.js.

const TL = 12, COLS = 20, ROWS = 15;       // cada sala = 20 x 15 blocos de 12 pixels = uma tela
const TOPO = 12;                           // barra de status
const W = COLS * TL, AS = ROWS * TL, H = TOPO + AS;
const cv = document.getElementById('game');
const g = cv.getContext('2d');
const rand = n => Math.random() * n | 0;

function ajustarTela() {
  const k = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)));
  cv.style.width = W * k + 'px'; cv.style.height = H * k + 'px';
}
addEventListener('resize', ajustarTela);
ajustarTela();

// ---------- sons sintetizados ----------
const SONS = {
  tiro:     { onda: 'square',   f0: 520,  f1: 260,  d: 0.05, vol: 0.03, min: 0.05 },
  flecha:   { onda: 'triangle', f0: 900,  f1: 500,  d: 0.08, vol: 0.06 },
  pesado:   { onda: 'sawtooth', f0: 300,  f1: 60,   d: 0.16, vol: 0.08 },
  corte:    { onda: 'sawtooth', f0: 700,  f1: 180,  d: 0.07, vol: 0.05, min: 0.04 },
  chama:    { onda: 'sawtooth', f0: 110,  f1: 90,   d: 0.08, vol: 0.02, min: 0.07 },
  explosao: { onda: 'sawtooth', f0: 140,  f1: 30,   d: 0.35, vol: 0.14, min: 0.05 },
  acerto:   { onda: 'ruido',    f0: 3000, f1: 700,  d: 0.04, vol: 0.05, min: 0.04 },
  morte:    { onda: 'ruido',    f0: 1500, f1: 110,  d: 0.18, vol: 0.16, min: 0.03 },
  dano:     { onda: 'sawtooth', f0: 180,  f1: 40,   d: 0.40, vol: 0.16 },
  nivel:    { onda: 'square',   f0: 440,  f1: 1320, d: 0.30, vol: 0.07 },
  dash:     { onda: 'triangle', f0: 700,  f1: 200,  d: 0.10, vol: 0.06 },
  tripa:    { onda: 'ruido',    f0: 900,  f1: 70,   d: 0.32, vol: 0.20, min: 0.05 },
  raspao:   { onda: 'sine',     f0: 1400, f1: 1800, d: 0.04, vol: 0.03, min: 0.05 },
  pegar:    { onda: 'sine',     f0: 660,  f1: 1320, d: 0.20, vol: 0.08 },
  porta:    { onda: 'square',   f0: 120,  f1: 240,  d: 0.25, vol: 0.08 },
  segredo:  { onda: 'sine',     f0: 500,  f1: 1500, d: 0.60, vol: 0.10 },
  chefe:    { onda: 'sawtooth', f0: 60,   f1: 200,  d: 0.80, vol: 0.12 },
  descer:   { onda: 'triangle', f0: 400,  f1: 80,   d: 0.70, vol: 0.10 },
  reliquia: { onda: 'sine',     f0: 400,  f1: 1600, d: 0.50, vol: 0.10 },
  laser:    { onda: 'square',   f0: 1300, f1: 300,  d: 0.12, vol: 0.05 },
  investe:  { onda: 'sawtooth', f0: 90,   f1: 240,  d: 0.18, vol: 0.05, min: 0.1 },
};
let audio = null, mudo = false, droneGanho = null, bufRuido = null;
function ruidoBuf() {
  if (!bufRuido) { bufRuido = audio.createBuffer(1, audio.sampleRate * 0.5, audio.sampleRate); const d = bufRuido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  return bufRuido;
}
// zumbido de fundo: duas ondas graves quase iguais, que "batem" uma na outra bem devagar
function iniciarDrone() {
  if (droneGanho) return;
  droneGanho = audio.createGain(); droneGanho.gain.value = mudo ? 0 : 0.03;
  const filtro = audio.createBiquadFilter(); filtro.type = 'lowpass'; filtro.frequency.value = 170;
  for (const f of [49, 49.6, 73.4]) { const o = audio.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(filtro); o.start(); }
  filtro.connect(droneGanho); droneGanho.connect(audio.destination);
}
function som(nome) {
  const S = SONS[nome];
  if (mudo || !S) return;
  try { if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  if (audio.state !== 'running') { audio.resume(); return; }
  const agora = audio.currentTime;
  if (agora - (S.ultimo || -1) < (S.min || 0)) return;
  S.ultimo = agora;
  iniciarDrone();
  if (S.onda === 'ruido') {                                // chiado abafado: o filtro fecha rapido, soa como um baque molhado
    const fonte = audio.createBufferSource(), filtro = audio.createBiquadFilter(), gn = audio.createGain();
    fonte.buffer = ruidoBuf(); filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(S.f0, agora); filtro.frequency.exponentialRampToValueAtTime(S.f1, agora + S.d);
    gn.gain.setValueAtTime(S.vol, agora); gn.gain.exponentialRampToValueAtTime(0.001, agora + S.d);
    fonte.connect(filtro); filtro.connect(gn); gn.connect(audio.destination);
    fonte.start(agora); fonte.stop(agora + S.d);
    return;
  }
  const osc = audio.createOscillator(), ganho = audio.createGain();
  osc.type = S.onda;
  osc.frequency.setValueAtTime(S.f0, agora);
  osc.frequency.exponentialRampToValueAtTime(S.f1, agora + S.d);
  ganho.gain.setValueAtTime(S.vol, agora);
  ganho.gain.exponentialRampToValueAtTime(0.001, agora + S.d);
  osc.connect(ganho); ganho.connect(audio.destination);
  osc.start(agora); osc.stop(agora + S.d);
}

// ---------- entrada ----------
const tecla = {};
const mouse = { x: W / 2, y: 40, baixo: false, clicou: false, dash: false };
let fonteMira = 'mouse', pedidoUsar = false;
addEventListener('keydown', e => {
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  tecla[e.code] = true;
  if (e.code === 'KeyM') { mudo = !mudo; if (droneGanho) droneGanho.gain.value = mudo ? 0 : 0.03; }
  const n = e.code.startsWith('Digit') ? +e.code.slice(5) : 0;
  if (jogo.modo === 'pacto') { if (n >= 1 && n <= 3) escolher(n - 1); }
  else if (jogo.modo === 'jogando') {
    if (e.code === 'KeyQ') trocarArma();
    if (e.code === 'KeyE' || e.code === 'KeyF') pedidoUsar = true;
  }
});
addEventListener('keyup', e => { tecla[e.code] = false; });
addEventListener('mousemove', e => {
  const r = cv.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * W / r.width;
  mouse.y = (e.clientY - r.top) * H / r.height - TOPO;      // coordenadas da sala
  fonteMira = 'mouse';
});
addEventListener('mousedown', e => {
  if (e.button === 0) { mouse.baixo = true; mouse.clicou = true; }
  if (e.button === 2) mouse.dash = true;
});
addEventListener('mouseup', e => { if (e.button === 0) mouse.baixo = false; if (e.button === 2) mouse.dash = false; });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('wheel', () => { if (jogo.modo === 'jogando') trocarArma(); });

// Controle (layout Xbox): 0=A 1=B 2=X 3=Y 4=LB 5=RB 6=LT 7=RT 9=Start 12..15=direcional
const pad = { ligado: false, mx: 0, my: 0, ax: 0, ay: 0, mirando: false, atirar: false, dash: false, foco: false, cima: false, baixo: false, ok: false };
const padAntes = {};
let sel = 0, pactoDesde = 0;
function lerControle() {
  const c = [...navigator.getGamepads()].find(p => p && p.connected);
  pad.ligado = !!c;
  pad.mx = pad.my = 0; pad.mirando = pad.atirar = pad.dash = pad.foco = pad.cima = pad.baixo = pad.ok = false;
  if (!c) return;
  const b = i => !!(c.buttons[i] && c.buttons[i].pressed);
  const eixo = i => Math.abs(c.axes[i] || 0) > 0.22 ? c.axes[i] : 0;
  const apertou = (nome, agora) => { const novo = agora && !padAntes[nome]; padAntes[nome] = agora; return novo; };
  pad.mx = eixo(0) || (b(15) ? 1 : 0) - (b(14) ? 1 : 0);
  pad.my = eixo(1) || (b(13) ? 1 : 0) - (b(12) ? 1 : 0);
  pad.ax = c.axes[2] || 0; pad.ay = c.axes[3] || 0;
  pad.mirando = Math.hypot(pad.ax, pad.ay) > 0.35;
  pad.atirar = pad.mirando || b(7);
  pad.dash = b(0); pad.foco = b(6);
  if (pad.mirando || pad.atirar) fonteMira = 'pad';
  const jogando = jogo.modo === 'jogando';
  if ((apertou('rb', b(5)) | apertou('y', b(3))) && jogando) trocarArma();
  if (apertou('x', b(2)) && jogando) pedidoUsar = true;
  pad.cima = apertou('cima', b(12) || eixo(1) < -0.5);
  pad.baixo = apertou('baixo', b(13) || eixo(1) > 0.5);
  pad.ok = apertou('ok', b(0) || b(9));
}

// ---------- sprites ----------
const CORES = {
  p: '#5b2a8c', P: '#2c1548', f: '#c9b89a', k: '#0a0810', w: '#cfc8b4', m: '#8a3a7a',
  g: '#7d8c4e', G: '#3a4428', r: '#b81a1a', y: '#d8a830', o: '#d86820',
  c: '#8a2a1c', b: '#55525f', t: '#3f8f88', v: '#7a5aa8', e: '#ff3020',
};
const SPR = {
  heroi: ['....pppp....', '...pppppp...', '..ppPPPPpp..', '..pPkkkkPp..', '..pPwkkwPp..', '..pPkkkkPp..', '..PppppppP..', '.PPppppppPP.', '.PPpPppPpPP.', '..PP....PP..'],
  gosma: ['....gggg....', '...gggggg...', '...gekkeg...', '...ggkkgg...', '.g.gwkwkg.g.', '.gggGggGggg.', '..g.GggG.g..', '....gGGg....', '....g..g....', '...gg..gg...'],
  morcego: ['............', 'm..........m', 'mm..mmmm..mm', 'mmmmmmmmmmmm', '.mmmemmemmm.', '..mmmmmmmm..', '...mm..mm...', '............', '............', '............'],
  esqueleto: ['...wwwwww...', '..wwwwwwww..', '..wkkwwkkw..', '..wkkwwkkw..', '..wwwkkwww..', '...wkwkww...', '....wwww....', '.ww.wwww.ww.', '....wwww....', '...ww..ww...'],
  rato: ['............', '............', '............', '...bb..bb...', '..bbbbbbbb..', '.bbebbbbebb.', '.bbbbbbbbbb.', '..bbbbbbbb..', '.b.b....b.b.', '............'],
  olho: ['...rrrrrr...', '..rrrrrrrr..', '.rrwwwwwwrr.', 'rrwwwkkwwwrr', 'rrwwkkkkwwrr', 'rrwwkkkkwwrr', 'rrwwwkkwwwrr', '.rrwwwwwwrr.', '..rrrrrrrr..', '...rrrrrr...'],
  caveira: ['..o..oo..o..', '.oo.oooo.oo.', '.oyoyyyyoyo.', '..yyyyyyyy..', '..ykkyykky..', '..ykkyykky..', '..yyykkyyy..', '...yyyyyy...', '...ykykyk...', '............'],
  chefe: ['r.............r', 'rr...........rr', 'rrr.rrrrrrr.rrr', '.rrrrrrrrrrrrr.', '.rrrrrrrrrrrrr.', '.rryyrrrrryyrr.', '.rrykrrrrrkyrr.', '.rrrrrrrrrrrrr.', '..rrrwkwkwrrr..', '..rrrkwkwkrrr..', '...rrrrrrrrr...', '....rrrrrrr....'],
  cao: ['.cc......cc.', '.ccc....ccc.', '..cccccccc..', '.cccccccccc.', '.cykccccykc.', '.cccccccccc.', '..ccwwwwcc..', '..cwkwwkwc..', '...cccccc...', '..cc....cc..'],
  bomba: ['......yo....', '.....o......', '....bbbb....', '..bbbbbbbb..', '.bbwbbbbbbb.', '.bwbbrbbrbb.', '.bbbbbbbbbb.', '.bbbbbbbbbb.', '..bbbbbbbb..', '....bbbb....'],
  totem: ['....tttt....', '...tttttt...', '...tkttkt...', '...tttttt...', '....tkkt....', '..tttttttt..', '....tttt....', '...tttttt...', '...tkttkt...', '..tttttttt..'],
  vigia: ['....vvvv....', '...vvvvvv...', '..vvkkkkvv..', '..vkrkkrkv..', '..vvkkkkvv..', '...vvvvvv...', '..vvvvvvvv..', '.vvvvvvvvvv.', '.vv.vvvv.vv.', '....v..v....'],
};
function sprite(linhas, x, y, corUnica, esc, troca) {      // "troca" repinta letras: { r: '#outra cor' }
  esc = esc || 1; x = Math.round(x); y = Math.round(y);
  for (let j = 0; j < linhas.length; j++)
    for (let i = 0; i < linhas[j].length; i++) {
      const c = linhas[j][i];
      if (c === '.') continue;
      g.fillStyle = corUnica || (troca && troca[c]) || CORES[c];
      g.fillRect(x + i * esc, y + j * esc, esc, esc);
    }
}

// ---------- temas: a cripta muda de cara conforme voce desce ----------
const TEMAS = [
  { nome: 'CRIPTA',     chao: '#1c1826', chao2: '#241f31', parede: '#3d3654', topo: '#5a5078' },
  { nome: 'CATACUMBA',  chao: '#17201a', chao2: '#1e2a21', parede: '#33442f', topo: '#4f6a45' },
  { nome: 'FORNALHA',   chao: '#241512', chao2: '#301b16', parede: '#55281f', topo: '#8a3c2a' },
  { nome: 'ABISMO',     chao: '#0e0f1c', chao2: '#141628', parede: '#22264a', topo: '#353c78' },
  { nome: 'INFERNO',    chao: '#1c0808', chao2: '#280c0a', parede: '#4a0f12', topo: '#a01c1c' },
  { nome: 'VAZIO',      chao: '#060608', chao2: '#0b0b10', parede: '#1a1a22', topo: '#8a8a9a' },
];
const temaDoAndar = n => TEMAS[Math.min(TEMAS.length - 1, Math.floor((n - 1) / 3))];

// ---------- geracao do andar ----------
const DIRS = { n: [0, -1, 's'], s: [0, 1, 'n'], o: [-1, 0, 'l'], l: [1, 0, 'o'] };
const CENTRO_PORTA = { n: [W / 2, 6], s: [W / 2, AS - 6], o: [6, AS / 2], l: [W - 6, AS / 2] };
const BLOCOS_PORTA = { n: [[9, 0], [10, 0]], s: [[9, ROWS - 1], [10, ROWS - 1]], o: [[0, 6], [0, 7], [0, 8]], l: [[COLS - 1, 6], [COLS - 1, 7], [COLS - 1, 8]] };

function gerarAndar(n) {
  const mapa = {}, salas = [];
  const em = (gx, gy) => mapa[gx + ',' + gy];
  const criar = (gx, gy, tipo) => {
    const s = { gx, gy, tipo, mod: null, portas: {}, limpa: false, visitada: false, pronta: false, itens: [], objetos: [], temChave: false, ondas: 0, manchas: [] };
    mapa[gx + ',' + gy] = s; salas.push(s); return s;
  };
  // uma ligacao e compartilhada pelas duas salas: abrir de um lado abre do outro
  const ligar = (a, dir, b, estado) => { const lig = { estado, vida: 18 }; a.portas[dir] = { para: b, lig }; b.portas[DIRS[dir][2]] = { para: a, lig }; };

  // 1. caminhada aleatoria: cada sala nova nasce grudada numa sala que ja existe
  const inicio = criar(0, 0, 'inicio');
  const alvo = Math.min(12, 6 + n);
  for (let guarda = 0; salas.length < alvo && guarda < 600; guarda++) {
    const a = salas[rand(salas.length)], d = 'nsol'[rand(4)];
    const gx = a.gx + DIRS[d][0], gy = a.gy + DIRS[d][1];
    if (em(gx, gy) || Math.abs(gx) > 3 || Math.abs(gy) > 3) continue;
    ligar(a, d, criar(gx, gy, 'normal'), 'aberta');
  }
  // 2. alguns atalhos entre salas vizinhas, para o mapa nao ser so uma arvore
  for (const a of salas) for (const d of ['s', 'l']) {
    const b = em(a.gx + DIRS[d][0], a.gy + DIRS[d][1]);
    if (b && !a.portas[d] && Math.random() < 0.2) ligar(a, d, b, 'aberta');
  }
  // 3. distancia de cada sala ate o inicio; a mais distante guarda a escada (ou o chefao)
  inicio.dist = 0;
  for (let fila = [inicio]; fila.length;) {
    const s = fila.shift();
    for (const p of Object.values(s.portas)) if (p.para.dist === undefined) { p.para.dist = s.dist + 1; fila.push(p.para); }
  }
  const fim = salas.reduce((m, s) => s.dist > m.dist ? s : m, inicio);
  fim.tipo = n % 3 === 0 ? 'chefe' : 'escada';
  // 4. tesouro: um beco sem saida, trancado. A chave cai em outra sala do andar.
  const becos = salas.filter(s => s.tipo === 'normal' && Object.keys(s.portas).length === 1).sort((a, b) => b.dist - a.dist);
  if (becos[0]) {
    becos[0].tipo = 'tesouro';
    Object.values(becos[0].portas)[0].lig.estado = 'trancada';
    const comuns = salas.filter(s => s.tipo === 'normal');
    if (comuns.length) comuns[rand(comuns.length)].temChave = true;
    else inicio.itens.push({ tipo: 'chave', x: W / 2 + 30, y: AS / 2 });
  }
  // 5. altar de pacto em algum lugar
  const comuns = salas.filter(s => s.tipo === 'normal' && !s.temChave);
  if (comuns.length > 2 && Math.random() < 0.6) comuns[rand(comuns.length)].tipo = 'santuario';
  // 5b. altar de sangue: troca 1 coracao maximo por uma reliquia
  const comuns2 = salas.filter(s => s.tipo === 'normal' && !s.temChave);
  if (n >= 2 && comuns2.length > 2 && Math.random() < 0.5) comuns2[rand(comuns2.length)].tipo = 'sangue';
  // 6. sala secreta: fica num vazio do mapa, atras de paredes rachadas
  const vagos = [];
  for (const a of salas) for (const d in DIRS) {
    const gx = a.gx + DIRS[d][0], gy = a.gy + DIRS[d][1];
    if (!em(gx, gy) && a.tipo !== 'chefe' && !a.portas[d]) vagos.push([gx, gy]);
  }
  if (vagos.length) {
    const [gx, gy] = vagos[rand(vagos.length)], sec = criar(gx, gy, 'secreta');
    for (const d in DIRS) { const b = em(gx + DIRS[d][0], gy + DIRS[d][1]); if (b && b !== sec && b.tipo !== 'chefe') ligar(sec, d, b, 'rachada'); }
  }
  // 7. modificadores: a mesma sala comum pode vir "reinventada"
  for (const s of salas) if (s.tipo === 'normal') {
    const r = Math.random();
    s.mod = r < 0.15 ? 'horda' : r < 0.27 ? 'elite' : r < 0.27 + Math.min(0.3, n * 0.04) ? 'escura' : null;
  }
  // 8. do andar 4 para baixo, algumas salas trazem uma segunda onda (e bem fundo, uma terceira)
  for (const s of salas) if ((s.tipo === 'normal' || s.tipo === 'escada') && n >= 4 && Math.random() < Math.min(0.6, (n - 3) * 0.1))
    s.ondas = n >= 12 && Math.random() < 0.3 ? 2 : 1;
  for (const s of salas) gerarBlocos(s);
  return { n, salas, mapa, inicio };
}

// blocos da sala: 0 = chao, 1 = parede, 3 = vao de porta
function gerarBlocos(s) {
  const t = [];
  for (let y = 0; y < ROWS; y++) { t.push([]); for (let x = 0; x < COLS; x++) t[y].push(x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 ? 1 : 0); }
  for (const d in s.portas) for (const [x, y] of BLOCOS_PORTA[d]) t[y][x] = 3;
  if ((s.tipo === 'normal' || s.tipo === 'escada') && Math.random() > 0.12) {
    // obstaculos sorteados num canto e espelhados nos outros tres: sempre diferente, sempre simetrico
    for (let k = 2 + rand(4); k > 0; k--) {
      const bx = 2 + rand(6), by = 2 + rand(4), horizontal = Math.random() < 0.5, tam = 1 + rand(3);
      for (let i = 0; i < tam; i++) {
        const x = Math.min(7, bx + (horizontal ? i : 0)), y = Math.min(5, by + (horizontal ? 0 : i));
        t[y][x] = t[y][COLS - 1 - x] = t[ROWS - 1 - y][x] = t[ROWS - 1 - y][COLS - 1 - x] = 1;
      }
    }
  }
  s.blocos = t;
  // quais blocos de chao sao alcancaveis a partir do centro (inimigo nao pode nascer num bolso fechado)
  s.livres = [];
  const visto = new Set(), fila = [[9, 7]];
  while (fila.length) {
    const [x, y] = fila.pop(), k = x + ',' + y;
    if (visto.has(k) || x < 1 || y < 1 || x > COLS - 2 || y > ROWS - 2 || t[y][x] !== 0) continue;
    visto.add(k); s.livres.push([x, y]);
    fila.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

// ---------- estado ----------
let jogo, sala;
let recorde = 0;
try { recorde = +localStorage.getItem('cripta-recorde') || 0; } catch (e) {}

// PATENTE: cada abate vira uma caveira, e caveiras nunca se perdem. Juntou o bastante, sobe de patente,
// e cada patente da um premio fixo no comeco de toda descida (os premios se repetem em ciclo).
let caveiras = 0;
try { caveiras = +localStorage.getItem('cripta-caveiras') || 0; } catch (e) {}
const PATENTES = ['VERME', 'CARNICEIRO', 'ACOUGUEIRO', 'CARRASCO', 'CEIFADOR', 'FLAGELO', 'DEVORADOR', 'ANIQUILADOR', 'O PROPRIO INFERNO'];
const metaPatente = p => 60 * p * (p + 1);                 // 120, 360, 720, 1200, 1800...
const patente = () => { let p = 0; while (caveiras >= metaPatente(p + 1)) p++; return p; };
const nomePatente = () => PATENTES[Math.min(PATENTES.length - 1, patente())];
const PREMIOS = [s => { s.dano *= 1.1; }, s => { s.vidaMax += 1; }, s => { s.cadencia *= 1.08; }, s => { s.velHeroi *= 1.06; }, s => { s.sorte += 0.5; }];
function aplicarPatente() {
  const s = jogo.stats, p = patente();
  for (let i = 0; i < p; i++) PREMIOS[i % PREMIOS.length](s);
  jogo.heroi.vida = s.vidaMax;
  if (p >= 2) jogo.armas[1] = gerarArma(1, Math.min(4, p * 0.5));      // da patente 2 em diante, a segunda arma ja vem sorteada (e melhor)
}
// RAIVA: enche matando e, principalmente, apanhando. Encheu = SURTO.
const metaRaiva = () => 26 + jogo.andar * 2;
function ganharRaiva(q) {
  if (jogo.surto > 0) return;
  jogo.raiva += q;
  if (jogo.raiva < metaRaiva()) return;
  jogo.raiva = 0; jogo.surto = 6; jogo.pausa = 0.25; jogo.tremor = 0.6; jogo.flashT = 0.3;
  for (const b of jogo.balas) b.fora = true;
  som('chefe'); avisar('SURTO!', 'atropele tudo');
}
let atirador = null;                                       // quem esta agindo agora: toda bala guarda o dono, para a vinganca

function novoJogo(modo) {
  jogo = {
    modo,                        // 'titulo' | 'jogando' | 'pacto' | 'morto'
    andar: 1, mapa: null, tempo: 0, tremor: 0, abates: 0,
    stats: { dano: 1, cadencia: 1, velBala: 1, quiques: 0, perfurar: 0, espalha: 1, explosao: 1, queimar: 0, critico: 0, alcance: 1,
             vidaMax: 5, velHeroi: 1, recargaDash: 0.6, hitbox: 2, velBalaInimiga: 1, xp: 1, luz: 0,
             danoCorpo: 1, danoTiro: 1, balasExtra: 0, explosaoBase: 0, dashDist: 1, focoGanho: 1, focoGasto: 1,
             furiaGanho: 1, furiaDura: 1, sorte: 0, vidaInimiga: 1, reviver: 0, trocaBonus: 0, orbes: 0 },
    heroi: { x: W / 2, y: AS / 2, vida: 5, dx: 0, dy: -1, dashT: 0, dashRecarga: 0, invencivel: 0 },
    armas: [gerarArma(1, 0, 'pistola'), gerarArma(1, 0, 'espada')], armaAtual: 0,
    mira: -Math.PI / 2, tiroT: 0, chaves: 0, nivel: 1, xp: 0, foco: 0.5, lento: false,
    tiros: [], balas: [], inimigos: [], particulas: [], efeitos: [], combate: false, chefe: null,
    escolhas: [], aviso: '', aviso2: '', avisoT: 0, novoRecorde: false,
    reliquias: [], raiva: 0, surto: 0, vinganca: null, combo: 0, comboT: 0, comboMax: 0, golpeTroca: false,
  };
  aplicarPatente();
  descer(1);
}
const xpNecessario = () => 6 + jogo.nivel * 5;
const arma = () => jogo.armas[jogo.armaAtual];
function trocarArma() {
  if (!jogo.armas[1 - jogo.armaAtual]) return;
  jogo.armaAtual = 1 - jogo.armaAtual; jogo.tiroT = Math.max(jogo.tiroT, 0.12);
  if (jogo.stats.trocaBonus > 0) jogo.golpeTroca = true;       // Luva de Duelista
}
function avisar(txt, txt2) { jogo.aviso = txt; jogo.aviso2 = txt2 || ''; jogo.avisoT = txt2 ? 3 : 2.2; }
// FURIA: cada abate em sequencia acelera o mago. Parou de matar ou apanhou, ela some.
const tetoFuria = () => 20 + jogo.andar * 3;              // quanto mais fundo, mais a furia pode subir
const furia = () => Math.min(jogo.combo, tetoFuria()) * 0.016;
// LOUCURA: comeca em 1 no andar 1 e sobe 8% por andar. Quase tudo que acelera no jogo consulta este numero.
const loucura = () => 1 + (jogo.andar - 1) * 0.08;
function curar(n) { const h = jogo.heroi; if (h.vida < jogo.stats.vidaMax) { h.vida = Math.min(jogo.stats.vidaMax, h.vida + n); som('pegar'); } }
// avisa todas as reliquias que algo aconteceu ('aoMatar', 'aoDash', 'aoFerido', 'aoDescer')
function gatilho(nome, x) { for (const r of jogo.reliquias) if (r[nome]) r[nome](x); }
function soltarReliquia(x, y) {
  const tenho = new Set(jogo.reliquias.map(r => r.nome));
  for (const s of jogo.mapa.salas) for (const it of s.itens) if (it.tipo === 'reliquia') tenho.add(it.rel.nome);
  const livres = RELIQUIAS.filter(r => !tenho.has(r.nome));
  sala.itens.push(livres.length ? { tipo: 'reliquia', x, y, rel: livres[rand(livres.length)] } : { tipo: 'coracao', x, y });
}
function pegarReliquia(rel) {
  const s = jogo.stats, h = jogo.heroi;
  jogo.reliquias.push(rel);
  if (rel.pegar) rel.pegar(s, h);
  s.vidaMax = Math.max(1, Math.round(s.vidaMax)); h.vida = Math.max(1, Math.min(s.vidaMax, h.vida));
  som('reliquia'); avisar(rel.nome.toUpperCase(), rel.desc); faisca(h.x, h.y, rel.cor || '#ffffff', 20, 120);
}
function lerTumulo() {
  try { const t = JSON.parse(localStorage.getItem('cripta-tumulo')); return t && t.arma && t.arma.intervalo > 0 && t.arma.modo ? t : null; } catch (e) { return null; }
}

function descer(n) {
  jogo.andar = n;
  jogo.mapa = gerarAndar(n);
  if (n > 1) { curar(1); som('descer'); gatilho('aoDescer'); }
  entrarSala(jogo.mapa.inicio, null);
  avisar('ANDAR ' + n + ' - ' + temaDoAndar(n).nome);
  // o tumulo da sua ultima morte guarda a arma que voce segurava: volte ate la para buscar
  const t = jogo.modo === 'jogando' ? lerTumulo() : null;
  if (t && t.andar === n) {
    sala.objetos.push({ tipo: 'tumulo', x: W / 2 + 36, y: AS / 2 - 24 });
    sala.itens.push({ tipo: 'arma', x: W / 2 + 36, y: AS / 2 - 8, arma: t.arma });
    try { localStorage.removeItem('cripta-tumulo'); } catch (e) {}
    avisar('ANDAR ' + n + ' - ' + temaDoAndar(n).nome, 'o seu tumulo esta aqui');
  }
}

// ---------- salas ----------
const chaoCv = document.createElement('canvas'); chaoCv.width = W; chaoCv.height = AS;
function pintarSala() {
  const c = chaoCv.getContext('2d'), T = temaDoAndar(jogo.andar);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const px = x * TL, py = y * TL;
    if (sala.blocos[y][x] === 1) {
      c.fillStyle = T.parede; c.fillRect(px, py, TL, TL);
      c.fillStyle = T.topo; c.fillRect(px, py, TL, 3);
      c.fillStyle = '#00000050'; c.fillRect(px, py + TL - 2, TL, 2); c.fillRect(px + TL - 1, py, 1, TL);
    } else {
      c.fillStyle = (x * 7 + y * 13 + sala.gx * 3 + sala.gy * 5) % 5 === 0 ? T.chao2 : T.chao; c.fillRect(px, py, TL, TL);
      c.fillStyle = '#00000030'; c.fillRect(px, py, TL, 1); c.fillRect(px, py, 1, TL);
      const sorte = Math.abs(x * 31 + y * 17 + sala.gx * 7 + sala.gy * 11 + jogo.andar * 5) % 23;
      if (sorte === 0) { c.fillStyle = '#cfc8b438'; c.fillRect(px + 3, py + 6, 5, 1); c.fillRect(px + 2, py + 5, 1, 3); c.fillRect(px + 8, py + 5, 1, 3); }      // osso velho
      else if (sorte === 1) { c.fillStyle = '#3a080870'; c.fillRect(px + 2, py + 3, 7, 5); c.fillRect(px + 4, py + 2, 4, 8); }                              // sangue seco
    }
  }
  for (const m of sala.manchas) pintarMancha(c, m);
}
const escurecer = (hex, f) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('');
function pintarMancha(c, m) {
  if (m.k === 'corpo') {                                   // o sprite do inimigo, achatado e escurecido, numa poca
    const L = SPR[m.tipo];
    if (!L) return;
    if (!m.seco) { c.fillStyle = '#3a0808c0'; c.beginPath(); c.ellipse(m.x, m.y + 2, 8, 5, 0, 0, 7); c.fill(); }
    for (let j = 0; j < L.length; j += 2) for (let i = 0; i < L[j].length; i++) {
      if (L[j][i] === '.') continue;
      c.fillStyle = L[j][i] === 'k' ? '#0a0810' : m.cor; c.fillRect(Math.round(m.x) - 6 + i, Math.round(m.y) - 1 + j / 2, 1, 1);
    }
  } else { c.fillStyle = m.cor; c.fillRect(Math.round(m.x), Math.round(m.y), m.t, m.h || m.t); }
}
function manchar(m) {
  sala.manchas.push(m); if (sala.manchas.length > 900) sala.manchas.shift();
  pintarMancha(chaoCv.getContext('2d'), m);
}
// jato de gotas na direcao do golpe; cada gota vira uma mancha onde cair
function sangrar(x, y, ang, n, cor) {
  for (let i = 0; i < n; i++) {
    const a = ang + (Math.random() - 0.5) * 1.6, v = 40 + Math.random() * 150;
    jogo.particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.1 + Math.random() * 0.25, cor: cor || CORES.r, mancha: true });
  }
}
const GRITOS = [[10, 'CARNIFICINA'], [25, 'MASSACRE'], [50, 'ABATEDOURO'], [100, 'EXTERMINIO'], [200, 'A CRIPTA TEM MEDO DE VOCE']];

function entrarSala(s, lado) {
  sala = s; s.visitada = true;
  const h = jogo.heroi;
  jogo.tiros = []; jogo.balas = []; jogo.inimigos = []; jogo.particulas = []; jogo.efeitos = []; jogo.chefe = null;
  if (lado === 'n') { h.x = W / 2; h.y = TL + 7; } else if (lado === 's') { h.x = W / 2; h.y = AS - TL - 7; }
  else if (lado === 'o') { h.x = TL + 7; h.y = AS / 2; } else if (lado === 'l') { h.x = W - TL - 7; h.y = AS / 2; }
  else { h.x = W / 2; h.y = AS / 2; }
  pintarSala();
  if (!s.pronta) {
    s.pronta = true;
    if (s.tipo === 'tesouro') { s.objetos.push({ tipo: 'bau', x: W / 2, y: AS / 2, sorte: 1 }); s.limpa = true; }
    if (s.tipo === 'secreta') { s.objetos.push({ tipo: 'bau', x: W / 2, y: AS / 2, sorte: 2.5 }); s.itens.push({ tipo: 'coracao', x: W / 2 - 24, y: AS / 2 }); soltarReliquia(W / 2 + 24, AS / 2); s.limpa = true; }
    if (s.tipo === 'sangue') { s.objetos.push({ tipo: 'sangue', x: W / 2, y: AS / 2 }); s.limpa = true; }
    if (s.tipo === 'santuario') { s.objetos.push({ tipo: 'altar', x: W / 2, y: AS / 2 }); s.limpa = true; }
    if (s.tipo === 'inicio') s.limpa = true;
    if (s.tipo === 'normal' || s.tipo === 'escada') for (let i = 2 + rand(4); i > 0; i--) {     // urnas e barris de polvora
      const [x, y] = s.livres[rand(s.livres.length)] || [9, 7];
      s.objetos.push({ tipo: Math.random() < 0.4 ? 'barril' : 'urna', x: x * TL + 6, y: y * TL + 6 });
    }
  }
  jogo.combate = !s.limpa; jogo.semDano = 0; jogo.vinganca = null;
  if (jogo.combate) { povoar(s); if (s.mod) avisar({ horda: 'HORDA!', elite: 'ELITE!', escura: 'ESCURIDAO...' }[s.mod]); }
}

// ---------- inimigos ----------
const TIPOS = {
  gosma:     { vida: 4,  xp: 1, vel: 26, r: 6, cor: CORES.g },                              // persegue
  morcego:   { vida: 2,  xp: 1, vel: 60, r: 5, cor: CORES.m, voa: true },                   // rapido, voa por cima dos blocos
  cao:       { vida: 6,  xp: 2, vel: 30, r: 6, cor: CORES.c, investe: true },               // para, avisa e dispara em linha reta
  bomba:     { vida: 3,  xp: 2, vel: 50, r: 5, cor: CORES.b, estoura: 8 },                  // corre ate voce; morreu, solta um anel de balas
  rato:      { vida: 1,  xp: 0.4, vel: 62, r: 4, cor: CORES.b, praga: true },              // praga: vem aos montes e morre com um tapa
  esqueleto: { vida: 5,  xp: 2, vel: 18, r: 6, cor: CORES.w, atira: 'mira',  ritmo: 1.6, seco: true },
  olho:      { vida: 7,  xp: 3, vel: 12, r: 6, cor: CORES.r, atira: 'leque', ritmo: 2.3 },
  caveira:   { vida: 10, xp: 4, vel: 14, r: 6, cor: CORES.y, atira: 'anel',  ritmo: 2.8, seco: true },
  vigia:     { vida: 6,  xp: 3, vel: 10, r: 6, cor: CORES.v, atira: 'laser', ritmo: 3.0 },  // trava a mira (linha vermelha) e solta uma bala muito rapida
  totem:     { vida: 12, xp: 4, vel: 0,  r: 6, cor: CORES.t, atira: 'espiral', ritmo: 0.24, seco: true }, // parado, cospe uma espiral sem parar
};
function criarInimigo(tipo, x, y, elite) {
  const T = TIPOS[tipo], a = jogo.andar, vida = T.praga ? Math.ceil(a / 4) : Math.ceil(T.vida * (1 + (a - 1) * 0.22) * (elite ? 3.5 : 1) * jogo.stats.vidaInimiga);
  const e = { tipo, x, y, r: T.r, vida, vidaMax: vida, xp: T.xp * (elite ? 4 : 1), elite: !!elite, cor: elite ? CORES.y : T.cor,
    nasce: Math.max(0.3, 0.75 - loucura() * 0.15), tiroT: 0.5 + Math.random() * 1.2, lado: Math.random() < 0.5 ? 1 : -1, fase: Math.random() * 6, fogo: 0, fogoDps: 0, piscar: 0,
    invT: 0.6 + Math.random(), carga: 0, corre: 0, angInv: 0, giro: Math.random() * 6, travado: false };
  jogo.inimigos.push(e); return e;
}
const CHEFES = [{ nome: 'O GUARDIAO', cor: CORES.r }, { nome: 'A CEIFADORA', cor: '#a45ae8' }, { nome: 'O OLHO SEM FUNDO', cor: '#2ab8a8' }];
function povoar(s) {
  const a = jogo.andar, h = jogo.heroi;
  const vagas = s.livres.filter(([x, y]) => Math.hypot(x * TL + 6 - h.x, y * TL + 6 - h.y) > 62);
  const vaga = () => { const [x, y] = vagas[rand(vagas.length)] || [9, 7]; return [x * TL + 6, y * TL + 6]; };
  if (s.tipo === 'chefe') {
    const v = (Math.floor(a / 3) + 2) % 3, C = CHEFES[v];      // andar 3 = Guardiao, 6 = Ceifadora, 9 = Olho, 12 = Guardiao de novo...
    const vida = Math.round(240 * (1 + (a - 3) * 0.3) * jogo.stats.vidaInimiga);
    jogo.chefe = { tipo: 'chefe', chefe: true, variante: v, x: W / 2, y: v === 2 ? AS / 2 - 10 : 44, r: 14, vida, vidaMax: vida, xp: 0, cor: C.cor, troca: { r: C.cor },
      nasce: 1.2, t: 0, tiroT: 1, tiro2: 2.5, giro: 0, carga: 0, corre: 0, rastro: 0, golpes: 0, angInv: 0, fogo: 0, fogoDps: 0, piscar: 0 };
    jogo.inimigos.push(jogo.chefe); som('chefe'); avisar(C.nome + ' DESPERTA');
    s.reserva = a; s.reforcoCada = 4; s.reforcoT = 5; s.sortear = () => Math.random() < 0.5 ? 'morcego' : 'bomba';     // o chefao chama ajuda
    return;
  }
  const pesos = { gosma: 5, morcego: 2 + a * 0.5, esqueleto: 1 + a, olho: Math.max(0, a - 1), caveira: Math.max(0, a - 3),
    cao: a >= 2 ? 1 + a * 0.4 : 0, bomba: a >= 3 ? a * 0.4 : 0, vigia: a >= 4 ? a * 0.35 : 0, totem: a >= 5 ? a * 0.2 : 0 };
  if (s.mod === 'horda') { pesos.esqueleto = pesos.olho = pesos.caveira = pesos.vigia = pesos.totem = 0; }
  const total = Object.values(pesos).reduce((x, y) => x + y, 0);
  const sortear = () => { let r = Math.random() * total; for (const k in pesos) if ((r -= pesos[k]) <= 0) return k; return 'gosma'; };
  let n = Math.min(18, 4 + Math.floor(a * 0.9) + rand(2));
  if (s.mod === 'horda') n = Math.round(n * 1.8);
  // reforcos: alem dos que ja estao na sala, mais inimigos vao chegando um a um durante a luta
  s.reserva = Math.floor(a * (s.mod === 'horda' ? 1.3 : 0.8)); s.sortear = sortear;
  s.reforcoCada = Math.max(0.45, 2.4 - loucura()); s.reforcoT = s.reforcoCada;
  for (let i = 0; i < n; i++) { const [x, y] = vaga(); criarInimigo(sortear(), x, y, false); }
  for (let i = 3 + Math.floor(a * 0.8) + rand(3); i > 0; i--) { const [x, y] = vaga(); criarInimigo('rato', x, y, false); }      // carne para moer
  if ((s.mod === 'elite' || s.tipo === 'escada') && !s.ondas) { const [x, y] = vaga(); criarInimigo(sortear(), x, y, true); }   // o elite vem na ultima onda
}
function bala(x, y, ang, vel, cor) {
  vel *= jogo.stats.velBalaInimiga * Math.min(2.2, 1.05 + jogo.andar * 0.04);
  jogo.balas.push({ x, y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, cor: cor || '#ff5ea8', dono: atirador });
}

// ---------- colisao com o cenario ----------
function portaEm(tx, ty) { return ty === 0 ? sala.portas.n : ty === ROWS - 1 ? sala.portas.s : tx === 0 ? sala.portas.o : sala.portas.l; }
function solido(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  const b = sala.blocos[ty][tx];
  if (b === 1) return true;
  if (b === 3) { const p = portaEm(tx, ty); return !p || jogo.combate || p.lig.estado !== 'aberta'; }   // porta fecha durante a luta
  return false;
}
const solidoPx = (x, y) => solido(Math.floor(x / TL), Math.floor(y / TL));
const cabe = (x, y, r) => !solidoPx(x - r, y - r) && !solidoPx(x + r, y - r) && !solidoPx(x - r, y + r) && !solidoPx(x + r, y + r);
function mover(o, dx, dy, r) {       // um eixo de cada vez: assim o corpo desliza na parede em vez de travar
  if (cabe(o.x + dx, o.y, r)) o.x += dx;
  if (cabe(o.x, o.y + dy, r)) o.y += dy;
}
function ferirPorta(lig, dano) {
  if (lig.estado !== 'rachada') return;
  lig.vida -= dano;
  if (lig.vida <= 0) { lig.estado = 'aberta'; som('segredo'); avisar('PASSAGEM SECRETA!'); jogo.tremor = 0.3; }
}
function portaRachadaEm(x, y) {
  const tx = Math.floor(x / TL), ty = Math.floor(y / TL);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS || sala.blocos[ty][tx] !== 3) return null;
  const p = portaEm(tx, ty);
  return p && p.lig.estado === 'rachada' ? p.lig : null;
}

// ---------- pactos e XP ----------
const PESO = { comum: 6, magico: 3, raro: 1 };
const COR_PACTO = { comum: '#c8c4b8', magico: '#5a8cf0', raro: '#f2c744' };
function abrirEscolha() {
  const resto = PACTOS.slice(), saida = [];
  while (saida.length < 3 && resto.length) {
    let r = Math.random() * resto.reduce((a, u) => a + (PESO[u.raridade] || 1), 0), i = 0;
    while ((r -= PESO[resto[i].raridade] || 1) > 0) i++;
    saida.push(resto.splice(i, 1)[0]);
  }
  jogo.escolhas = saida;
  if (saida.length) { som('nivel'); jogo.modo = 'pacto'; sel = 0; pactoDesde = performance.now(); }
}
function escolher(i) {
  const u = jogo.escolhas[i], s = jogo.stats, h = jogo.heroi;
  if (!u) return;
  const antes = s.vidaMax;
  u.aplicar(s, h);
  s.vidaMax = Math.max(1, Math.round(s.vidaMax));
  s.dano = Math.max(0.2, s.dano); s.cadencia = Math.max(0.3, s.cadencia); s.velHeroi = Math.max(0.5, s.velHeroi);
  s.recargaDash = Math.max(0.2, s.recargaDash); s.critico = Math.min(1, s.critico);
  h.vida = Math.max(1, Math.min(s.vidaMax, h.vida + Math.max(0, s.vidaMax - antes)));
  jogo.modo = 'jogando'; mouse.clicou = false;
}
function ganharXp(q) {
  jogo.xp += q * jogo.stats.xp;
  if (jogo.xp >= xpNecessario()) { jogo.xp -= xpNecessario(); jogo.nivel++; abrirEscolha(); }
}

// ---------- dano e efeitos ----------
function faisca(x, y, cor, n, forca) {
  for (let i = 0; i < n; i++)
    jogo.particulas.push({ x, y, vx: (Math.random() - 0.5) * (forca || 90), vy: (Math.random() - 0.5) * (forca || 90), t: 0.2 + Math.random() * 0.3, cor });
}
function fimDeJogo() {
  jogo.modo = 'morto';
  const antes = patente();
  try { caveiras = Math.max(caveiras, +localStorage.getItem('cripta-caveiras') || 0); } catch (e) {}      // A Queda soma na mesma conta
  caveiras += jogo.abates; jogo.subiu = patente() > antes;
  try { localStorage.setItem('cripta-caveiras', caveiras); } catch (e) {}
  try { localStorage.setItem('cripta-tumulo', JSON.stringify({ andar: jogo.andar, arma: arma() })); } catch (e) {}
  if (jogo.andar > recorde) { recorde = jogo.andar; jogo.novoRecorde = true; try { localStorage.setItem('cripta-recorde', recorde); } catch (e) {} }
}
function ferirHeroi(quem) {
  const h = jogo.heroi, s = jogo.stats;
  if (h.invencivel > 0 || jogo.surto > 0) return;
  h.vida--; h.invencivel = 0.9; jogo.tremor = 0.3; som('dano');
  jogo.combo = 0;                                        // apanhou: a furia acaba
  faisca(h.x, h.y, CORES.r, 14);
  sangrar(h.x, h.y, Math.random() * 6.28, 12); jogo.pausa = 0.08; jogo.flashT = 0.15;
  for (const b of jogo.balas) if (Math.hypot(b.x - h.x, b.y - h.y) < 46) b.fora = true;
  gatilho('aoFerido');
  if (quem && !quem.morto && !quem.chefe) jogo.vinganca = { e: quem, t: 7 };      // VINGANCA: mate quem te feriu em 7 segundos e o coracao volta
  if (h.vida > 0) { ganharRaiva(metaRaiva() * 0.25); return; }
  if (s.reviver > 0) { s.reviver--; h.vida = Math.min(2, s.vidaMax); h.invencivel = 3; for (const b of jogo.balas) b.fora = true; avisar('SEGUNDO FOLEGO!'); som('reliquia'); }
  else fimDeJogo();
}
function soltarArma(x, y, sorte) { sala.itens.push({ tipo: 'arma', x, y, arma: gerarArma(jogo.andar, sorte + jogo.stats.sorte * 0.7) }); }
function matar(e, a) {
  if (e.morto) return;
  e.morto = true; jogo.abates++;
  if (jogo.vinganca && jogo.vinganca.e === e) { jogo.vinganca = null; curar(1); avisar('VINGANCA', '+1 coracao'); faisca(e.x, e.y, CORES.r, 24, 160); }
  ganharRaiva(e.elite ? 5 : TIPOS[e.tipo] && TIPOS[e.tipo].praga ? 0.5 : 1);
  if (jogo.surto > 0) jogo.surto = Math.min(6, jogo.surto + 0.15);       // matar durante o surto estica o surto
  const s = jogo.stats, h = jogo.heroi, T = TIPOS[e.tipo];
  const marco = Math.floor(jogo.combo / 25), antesC = jogo.combo;
  jogo.combo += s.furiaGanho * (T && T.praga ? 0.5 : 1); jogo.comboT = 2.6 * s.furiaDura;
  if (Math.floor(jogo.combo / 25) > marco) { sala.itens.push({ tipo: 'coracao', x: e.x, y: e.y }); som('nivel'); }
  for (const [n, grito] of GRITOS) if (antesC < n && jogo.combo >= n) avisar(grito, 'furia x' + n);
  if (jogo.combo >= 10) jogo.tremor = Math.max(jogo.tremor, 0.06);
  if (e.chefe) sala.reserva = 0; jogo.comboMax = Math.max(jogo.comboMax, Math.floor(jogo.combo));
  jogo.foco = Math.min(1, jogo.foco + 0.02 * s.focoGanho);
  faisca(e.x, e.y, e.cor, e.chefe ? 80 : 10, e.chefe ? 220 : 90);
  const seco = !!(T && T.seco);
  const angM = Math.atan2(e.y - h.y, e.x - h.x);
  // morte brutal: lamina, explosao, dash, surto ou golpe muito maior que a vida = vira pedacos em vez de cair inteiro
  const brutal = !!(e.chefe || e.excesso || e.estourado || jogo.surto > 0 || (a && (a.modo === 'corte' || a.explosao)));
  sangrar(e.x, e.y, angM, e.chefe ? 90 : brutal ? 30 : 14, seco ? CORES.w : CORES.r);
  estracalhar(e.x, e.y, seco ? CORES.w : T ? T.cor : e.cor, e.chefe ? 26 : brutal ? 7 : 2, seco, angM);
  if (brutal && !seco) { som('tripa'); manchar({ x: e.x - 5, y: e.y - 3, t: 10, h: 7, cor: '#3a0808c0' }); }
  if (T && !brutal) manchar({ k: 'corpo', tipo: e.tipo, x: e.x, y: e.y, seco, cor: escurecer(T.cor, 0.5) });
  jogo.pausa = Math.max(jogo.pausa || 0, e.chefe ? 0.3 : brutal ? 0.05 : 0.03);
  som(e.chefe ? 'explosao' : 'morte');
  if (T && T.estoura) for (let i = 0; i < T.estoura; i++) bala(e.x, e.y, i * Math.PI * 2 / T.estoura, 42, CORES.o);
  if (T && T.atira && jogo.andar >= 7) bala(e.x, e.y, Math.atan2(h.y - e.y, h.x - e.x), 72);        // la embaixo, atirador morre atirando
  if (a && a.vampiro && Math.random() < a.vampiro) curar(1);
  if (e.elite) {
    soltarArma(e.x, e.y, 1);
    if (Math.random() < 0.5) sala.itens.push({ tipo: 'coracao', x: e.x + 12, y: e.y });
    if (Math.random() < 0.25) soltarReliquia(e.x - 12, e.y);
  }
  if (e.chefe) { jogo.chefe = null; jogo.balas = []; jogo.tremor = 0.6; soltarArma(W / 2 - 26, 60, 3); sala.itens.push({ tipo: 'coracao', x: W / 2 + 26, y: 60 }); soltarReliquia(W / 2, 46); }
  gatilho('aoMatar', e);
  ganharXp(e.xp * (1 + Math.min(jogo.combo, 25) * 0.02));
}
function ferirInimigo(e, dano, x, y, a) {
  if (e.morto) return;
  const s = jogo.stats, critico = Math.random() < s.critico + ((a && a.critico) || 0);
  e.vida -= dano * (critico ? 2 : 1);
  e.piscar = 0.07; jogo.semDano = 0;
  const hh = jogo.heroi, angG = Math.atan2(e.y - hh.y, e.x - hh.x), TT = TIPOS[e.tipo];
  sangrar(x, y, angG, critico ? 6 : 2, TT && TT.seco ? CORES.w : CORES.r);
  if (TT && TT.vel && !(e.corre > 0)) {                    // empurrao: golpe forte joga o inimigo para tras
    const k = Math.min(4, dano * 0.35);
    if (TT.voa) { e.x += Math.cos(angG) * k; e.y += Math.sin(angG) * k; } else mover(e, Math.cos(angG) * k, Math.sin(angG) * k, 5);
  }
  const fogo = s.queimar + ((a && a.queima) || 0);
  if (fogo > 0) { e.fogo = 2; e.fogoDps = Math.max(e.fogoDps, fogo); }
  faisca(x, y, critico ? CORES.y : '#ffffff', critico ? 6 : 2);
  som('acerto');
  if (e.vida <= 0) { e.excesso = dano >= e.vidaMax * 0.6; matar(e, a); }
}
function explodir(x, y, raio, dano, a) {
  jogo.efeitos.push({ tipo: 'explosao', x, y, r: raio, t: 0.22 });
  jogo.tremor = Math.max(jogo.tremor, 0.15); som('explosao');
  faisca(x, y, CORES.o, 16, 160);
  for (const e of jogo.inimigos) if (Math.hypot(e.x - x, e.y - y) < raio + e.r) { e.estourado = true; ferirInimigo(e, dano, e.x, e.y, a); e.estourado = false; }
  for (const o of sala.objetos) if (quebravel(o) && Math.hypot(o.x - x, o.y - y) < raio + 5) quebrar(o);      // barril estoura barril: reacao em cadeia
  for (const b of jogo.balas) if (Math.hypot(b.x - x, b.y - y) < raio) b.fora = true;
  for (const d in sala.portas) { const [px, py] = CENTRO_PORTA[d]; if (Math.hypot(px - x, py - y) < raio + 10) ferirPorta(sala.portas[d].lig, 99); }   // explosivo abre segredo na hora
}
// pedacos: voam, deslizam no chao e ficam la
function estracalhar(x, y, cor, n, seco, ang) {
  for (let i = 0; i < n; i++) {
    const a = (ang === undefined ? Math.random() * 6.28 : ang) + (Math.random() - 0.5) * 2.4, v = 70 + Math.random() * 170;
    jogo.particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.4 + Math.random() * 0.5, pedaco: 2 + rand(2), seco,
      cor: seco ? cor : Math.random() < 0.5 ? escurecer(cor, 0.7) : '#7a1010' });
  }
}
const quebravel = o => !o.fora && (o.tipo === 'barril' || o.tipo === 'urna');
function quebrar(o) {
  if (o.fora) return;
  o.fora = true;
  manchar({ x: o.x - 4, y: o.y - 2, t: 8, h: 5, cor: o.tipo === 'barril' ? '#0a0810a0' : '#8a6a4c50' });
  if (o.tipo === 'barril') { explodir(o.x, o.y, 34, 8 + jogo.andar * 3); return; }
  som('acerto'); estracalhar(o.x, o.y, '#8a6a4c', 5, true); ganharRaiva(0.5);
  if (Math.random() < 0.12) sala.itens.push({ tipo: 'coracao', x: o.x, y: o.y });
}
// o dash e um golpe: fere quem voce atravessa, e EXECUTA na hora quem esta com pouca vida (o que pisca em vermelho)
function golpeDash() {
  const h = jogo.heroi, s = jogo.stats;
  for (const o of sala.objetos) if (quebravel(o) && Math.hypot(o.x - h.x, o.y - h.y) < 10) quebrar(o);
  for (const e of jogo.inimigos) {
    if (e.morto || e.nasce > 0 || e.dashT > jogo.tempo || Math.hypot(e.x - h.x, e.y - h.y) > e.r + 9) continue;
    e.dashT = jogo.tempo + 0.3;
    const fraco = !e.chefe && e.vida <= e.vidaMax * 0.35;
    e.estourado = true; ferirInimigo(e, fraco ? e.vida + 1 : (3 + jogo.andar) * s.dano, e.x, e.y, null); e.estourado = false;
    if (!e.morto) continue;
    h.dashRecarga = 0; h.invencivel = Math.max(h.invencivel, 0.4);       // matou no dash: o dash volta na hora. Emende um no outro.
    jogo.pausa = 0.07; jogo.tremor = Math.max(jogo.tremor, 0.15);
    if (fraco) { if (jogo.avisoT <= 0) avisar('EXECUCAO'); if (Math.random() < 0.12) sala.itens.push({ tipo: 'coracao', x: e.x, y: e.y }); }
  }
}
const difAng = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
function distSegmento(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - x1 - dx * t, py - y1 - dy * t);
}

// ---------- ataque do mago ----------
function atacar() {
  const a = arma(), s = jogo.stats, h = jogo.heroi, m = jogo.mira;
  jogo.tiroT = a.intervalo / (s.cadencia * 1.15 * (1 + furia()) * (jogo.surto > 0 ? 1.4 : 1));
  const corpo = a.modo === 'corte' || a.modo === 'estocada';
  const dano = a.dano * s.dano * (corpo ? s.danoCorpo : s.danoTiro) * (jogo.golpeTroca ? 1 + s.trocaBonus : 1) * (jogo.surto > 0 ? 2.5 : 1);
  jogo.golpeTroca = false;
  if (!corpo) {
    const chama = a.modo === 'chama', n = (a.balas || 1) + (chama ? 0 : s.balasExtra);
    for (let i = 0; i < n; i++) {
      const leque = n > 1 && (a.espalha || 0) < 0.3 ? (i - (n - 1) / 2) * 0.09 : 0;       // tiros extras abrem em leque
      const ang = m + leque + (Math.random() - 0.5) * (a.espalha || 0) * s.espalha;
      const vel = chama ? 190 : a.vel * s.velBala * (n > 3 ? 0.8 + Math.random() * 0.4 : 1);
      jogo.tiros.push({ x: h.x + Math.cos(ang) * 5, y: h.y + Math.sin(ang) * 5, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, ang,
        dano, quiques: chama ? 0 : (a.quiques || 0) + s.quiques, perfura: chama ? 99 : (a.perfura || 0) + s.perfurar,
        explosao: chama ? 0 : ((a.explosao || 0) + s.explosaoBase) * s.explosao, vida: chama ? a.alcance * s.alcance / 190 : (a.vida || 2.5),
        chama, flecha: a.flecha, tam: a.tam || 1, arma: a, feridos: new Set() });
    }
    som(chama ? 'chama' : a.flecha ? 'flecha' : a.intervalo > 0.5 ? 'pesado' : 'tiro');
    return;
  }
  // corpo a corpo: acerta na hora tudo que esta na area, e apaga as balas inimigas que pegar
  const alc = a.alcance * s.alcance, x2 = h.x + Math.cos(m) * alc, y2 = h.y + Math.sin(m) * alc;
  const pega = a.modo === 'corte'
    ? (x, y, r) => Math.hypot(x - h.x, y - h.y) < alc + r && (Math.hypot(x - h.x, y - h.y) < r + 4 || difAng(Math.atan2(y - h.y, x - h.x), m) < a.arco / 2)
    : (x, y, r) => distSegmento(x, y, h.x, h.y, x2, y2) < (a.largura || 5) + r;
  for (const e of jogo.inimigos) if (pega(e.x, e.y, e.r)) ferirInimigo(e, dano, e.x, e.y, a);
  for (const b of jogo.balas) if (pega(b.x, b.y, 2)) { b.fora = true; faisca(b.x, b.y, '#7fd6ff', 2, 40); }
  for (const o of sala.objetos) if (quebravel(o) && pega(o.x, o.y, 5)) quebrar(o);
  for (const d in sala.portas) { const [px, py] = CENTRO_PORTA[d]; if (pega(px, py, 8)) ferirPorta(sala.portas[d].lig, dano); }
  jogo.efeitos.push({ tipo: a.modo, x: h.x, y: h.y, ang: m, alc, arco: a.arco, t: 0.12 });
  som(a.intervalo > 0.6 ? 'pesado' : 'corte');
}
function fimDoTiro(t) {
  t.fim = true;
  if (t.explosao) explodir(t.x, t.y, t.explosao, t.dano, t.arma);
}
function moverTiro(t, eixo, dt) {
  if (t.fim) return;
  const v = eixo === 'x' ? 'vx' : 'vy', antes = t[eixo];
  t[eixo] += t[v] * dt;
  if (solidoPx(t.x, t.y)) {
    const lig = portaRachadaEm(t.x, t.y);
    if (lig) ferirPorta(lig, t.dano);
    if (t.quiques > 0 && !t.explosao) { t.quiques--; t[eixo] = antes; t[v] = -t[v]; t.ang = Math.atan2(t.vy, t.vx); }
    else fimDoTiro(t);
    return;
  }
  for (const o of sala.objetos) if (quebravel(o) && Math.hypot(o.x - t.x, o.y - t.y) < 7) {
    quebrar(o);
    if (t.explosao) { fimDoTiro(t); return; }
    if (t.perfura > 0) t.perfura--; else { t.fim = true; return; }
  }
  for (const e of jogo.inimigos) {
    if (e.morto || t.feridos.has(e) || Math.hypot(e.x - t.x, e.y - t.y) > e.r + 2) continue;
    if (t.explosao) { fimDoTiro(t); return; }
    t.feridos.add(e);
    ferirInimigo(e, t.dano, t.x, t.y, t.arma);
    if (t.perfura > 0) t.perfura--; else { t.fim = true; return; }
  }
}

// ---------- atualizacao ----------
function atualizarChefe(c, dt, h) {
  c.t += dt;
  const grau = jogo.andar / 3;
  if (c.variante === 1) return chefeCeifadora(c, dt, h, grau);
  if (c.variante === 2) return chefeOlho(c, dt, h, grau);
  // O GUARDIAO: paira no alto e alterna espiral, leque e anel
  c.x = W / 2 + Math.sin(c.t * 0.6) * 60; c.y = 46 + Math.sin(c.t * 0.9) * 14;
  c.tiroT -= dt;
  if (c.tiroT > 0) return;
  const padrao = Math.floor(c.t / 6) % 3;
  if (padrao === 0) { c.giro += 0.33; c.tiroT = Math.max(0.05, 0.1 - grau * 0.01); bala(c.x, c.y, c.giro, 50); bala(c.x, c.y, c.giro + Math.PI, 50); }
  else if (padrao === 1) { c.tiroT = Math.max(0.4, 0.85 - grau * 0.1); const alvo = Math.atan2(h.y - c.y, h.x - c.x); for (let i = -3; i <= 3; i++) bala(c.x, c.y, alvo + i * 0.2, 66, CORES.y); }
  else { c.giro += 0.22; c.tiroT = Math.max(0.5, 1.05 - grau * 0.12); const n = Math.min(24, 12 + Math.round(grau * 2)); for (let i = 0; i < n; i++) bala(c.x, c.y, c.giro + i * Math.PI * 2 / n, 46, CORES.o); }
}
// A CEIFADORA: te persegue pela sala; a cada quatro golpes avisa e atravessa a sala deixando um rastro de balas
function chefeCeifadora(c, dt, h, grau) {
  const ang = Math.atan2(h.y - c.y, h.x - c.x);
  const prender = () => { c.x = Math.max(TL + 16, Math.min(W - TL - 16, c.x)); c.y = Math.max(TL + 14, Math.min(AS - TL - 14, c.y)); };
  if (c.corre > 0) {
    c.corre -= dt; c.x += Math.cos(c.angInv) * 240 * dt; c.y += Math.sin(c.angInv) * 240 * dt; prender();
    c.rastro -= dt;
    if (c.rastro <= 0) { c.rastro = 0.05; bala(c.x, c.y, c.angInv + Math.PI / 2, 30, CORES.m); bala(c.x, c.y, c.angInv - Math.PI / 2, 30, CORES.m); }
    return;
  }
  if (c.carga > 0) { c.carga -= dt; if (c.carga <= 0) { c.corre = 0.55; som('investe'); } return; }
  c.x += Math.cos(ang) * 24 * dt; c.y += Math.sin(ang) * 24 * dt; prender();
  c.tiroT -= dt;
  if (c.tiroT > 0) return;
  c.golpes++;
  if (c.golpes % 4 === 0) { c.carga = 0.6; c.angInv = ang; c.tiroT = 0.7; return; }
  c.tiroT = Math.max(0.5, 1.0 - grau * 0.08); c.giro += 0.4;
  for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) bala(c.x, c.y, c.giro + i * Math.PI / 2, 38 + k * 14, CORES.m);
}
// O OLHO SEM FUNDO: fica no meio da sala. Espiral tripla que inverte de sentido + aneis com uma brecha para passar
function chefeOlho(c, dt, h, grau) {
  c.x = W / 2 + Math.sin(c.t * 0.5) * 18; c.y = AS / 2 - 10 + Math.cos(c.t * 0.7) * 8;
  c.tiroT -= dt; c.tiro2 -= dt;
  if (c.tiroT <= 0) {
    c.tiroT = Math.max(0.08, 0.15 - grau * 0.01); c.giro += (Math.floor(c.t / 5) % 2 ? 0.2 : -0.2);
    for (let i = 0; i < 3; i++) bala(c.x, c.y, c.giro + i * Math.PI * 2 / 3, 42);
  }
  if (c.tiro2 <= 0) {
    c.tiro2 = Math.max(1.3, 2.6 - grau * 0.2);
    const n = 20, brecha = rand(n);
    for (let i = 0; i < n; i++) if ((i - brecha + n) % n > 2) bala(c.x, c.y, i * Math.PI * 2 / n, 56, CORES.o);
  }
}

function posOrbe(i) {
  const h = jogo.heroi, ang = jogo.tempo * 3.2 + i * Math.PI * 2 / jogo.stats.orbes;
  return { x: h.x + Math.cos(ang) * 17, y: h.y + Math.sin(ang) * 17 };
}
function limparSala() {
  sala.limpa = true; jogo.combate = false; som('porta');
  if (sala.temChave) { sala.itens.push({ tipo: 'chave', x: W / 2, y: AS / 2 }); sala.temChave = false; }
  else if (sala.tipo === 'normal') {
    const r = Math.random();
    if (r < 0.12) sala.itens.push({ tipo: 'coracao', x: W / 2, y: AS / 2 });
    else if (r < 0.26) soltarArma(W / 2, AS / 2, 0);
  }
  if (sala.tipo === 'escada' || sala.tipo === 'chefe') sala.objetos.push({ tipo: 'escada', x: W / 2, y: AS / 2 });
}

function atualizar(dt) {
  const s = jogo.stats, h = jogo.heroi;
  jogo.flashT = (jogo.flashT || 0) - dt;
  if (jogo.pausa > 0) { jogo.pausa -= dt; return; }        // "hit-stop": o jogo congela um piscar de olhos para o golpe pesar
  if (h.vida <= 1 && Math.random() < dt * 8) manchar({ x: h.x + rand(5) - 2, y: h.y + 4, t: 1, cor: '#6a0c0c' });      // no ultimo coracao voce deixa um rastro
  const dtR = dt;                // tempo real, usado so pelo mago
  jogo.lento = !!(tecla.ShiftLeft || tecla.ShiftRight || pad.foco) && jogo.foco > 0;
  if (jogo.lento) { jogo.foco = Math.max(0, jogo.foco - dtR * 0.3 * s.focoGasto); dt *= 0.35; }
  jogo.tempo += dt; jogo.avisoT -= dtR; jogo.tremor -= dtR;
  jogo.comboT -= dtR * (jogo.combate ? 1 : 0.5);          // fora de combate a furia cai mais devagar: corra para a proxima sala
  if (jogo.comboT <= 0) jogo.combo = 0;
  if (jogo.surto > 0) {                                    // SURTO: nada te fere, e encostar em inimigo e que machuca ele
    if (jogo.combate) jogo.surto -= dtR;                   // fora de luta o relogio para: leve o surto para a proxima sala
    for (const o of sala.objetos) if (quebravel(o) && Math.hypot(o.x - h.x, o.y - h.y) < 10) quebrar(o);
    for (const e of jogo.inimigos) if (!e.morto && e.nasce <= 0 && !(e.dashT > jogo.tempo) && Math.hypot(e.x - h.x, e.y - h.y) < e.r + 7) {
      e.dashT = jogo.tempo + 0.25; e.estourado = true; ferirInimigo(e, (8 + jogo.andar * 3) * s.dano, e.x, e.y, null); e.estourado = false;
    }
    if (jogo.surto <= 0) { explodir(h.x, h.y, 46, 8 + jogo.andar * 3); h.invencivel = Math.max(h.invencivel, 0.8); }      // acaba com um estouro
  }
  if (droneGanho && !mudo) droneGanho.gain.value = jogo.surto > 0 ? 0.09 : 0.03;
  if (jogo.vinganca && ((jogo.vinganca.t -= dtR) <= 0 || jogo.vinganca.e.morto)) jogo.vinganca = null;

  // movimento e dash
  let mx = pad.mx || (tecla.KeyD || tecla.ArrowRight ? 1 : 0) - (tecla.KeyA || tecla.ArrowLeft ? 1 : 0);
  let my = pad.my || (tecla.KeyS || tecla.ArrowDown ? 1 : 0) - (tecla.KeyW || tecla.ArrowUp ? 1 : 0);
  const forca = Math.hypot(mx, my);
  if (forca > 1) { mx /= forca; my /= forca; }
  if (forca > 0.1) { h.dx = mx / Math.min(1, forca); h.dy = my / Math.min(1, forca); }
  h.dashRecarga -= dtR; h.invencivel -= dtR;
  if ((tecla.Space || mouse.dash || pad.dash) && h.dashRecarga <= 0) { som('dash'); h.dashT = 0.12; h.dashRecarga = s.recargaDash; h.invencivel = Math.max(h.invencivel, 0.24); gatilho('aoDash'); }
  const passo = 106 * s.velHeroi * (1 + furia() * 0.5) * (jogo.surto > 0 ? 1.3 : 1) * dtR;
  if (h.dashT > 0) { h.dashT -= dtR; mover(h, h.dx * 300 * s.dashDist * dtR, h.dy * 300 * s.dashDist * dtR, 4); faisca(h.x, h.y, CORES.p, 1, 30); golpeDash(); }
  else mover(h, mx * passo, my * passo, 4);

  // porta trancada abre encostando nela com uma chave
  for (const d in sala.portas) {
    const p = sala.portas[d], [px, py] = CENTRO_PORTA[d];
    if (p.lig.estado === 'trancada' && jogo.chaves > 0 && Math.hypot(px - h.x, py - h.y) < 20) { p.lig.estado = 'aberta'; jogo.chaves--; som('porta'); avisar('PORTA ABERTA'); }
  }
  // atravessar uma porta leva para a sala vizinha
  const saida = h.y < 6 ? 'n' : h.y > AS - 6 ? 's' : h.x < 6 ? 'o' : h.x > W - 6 ? 'l' : null;
  if (saida && sala.portas[saida]) { entrarSala(sala.portas[saida].para, DIRS[saida][2]); pedidoUsar = false; return; }

  // mira
  const vivos = jogo.inimigos.filter(e => !e.morto);
  const angPara = e => Math.atan2(e.y - h.y, e.x - h.x);
  if (fonteMira === 'mouse') jogo.mira = Math.atan2(mouse.y - h.y, mouse.x - h.x);
  else if (pad.mirando) {
    const bruto = Math.atan2(pad.ay, pad.ax);
    let melhor = null, menor = 0.3;
    for (const e of vivos) { const d = difAng(angPara(e), bruto); if (d < menor) { menor = d; melhor = e; } }
    jogo.mira = melhor ? angPara(melhor) : bruto;
  } else if (pad.atirar && vivos.length) {
    let perto = vivos[0], dist = 1e9;
    for (const e of vivos) { const d = Math.hypot(e.x - h.x, e.y - h.y); if (d < dist) { dist = d; perto = e; } }
    jogo.mira = angPara(perto);
  }

  jogo.tiroT -= dtR;
  if ((mouse.baixo || pad.atirar) && jogo.tiroT <= 0) atacar();

  // projeteis do mago
  for (const t of jogo.tiros) {
    for (let k = 0; k < 2; k++) { moverTiro(t, 'x', dt / 2); moverTiro(t, 'y', dt / 2); }
    t.vida -= dt;
    if (!t.fim && t.vida <= 0) fimDoTiro(t);
  }
  jogo.tiros = jogo.tiros.filter(t => !t.fim);

  // inimigos
  const andar = jogo.andar, ritmo = 0.85 + loucura() * 0.75, velI = Math.min(2.4, 0.95 + loucura() * 0.3);
  for (const e of jogo.inimigos) {
    if (e.morto) continue;
    atirador = e;
    e.piscar -= dt;
    if (e.nasce > 0) { e.nasce -= dt; continue; }          // aviso antes de entrar em acao
    if (e.fogo > 0) {
      e.fogo -= dt; e.vida -= e.fogoDps * dt;
      if (Math.random() < 0.25) faisca(e.x + (Math.random() - 0.5) * 8, e.y - 4, CORES.o, 1, 30);
      if (e.vida <= 0) { matar(e, null); continue; }
    }
    if (e.chefe) atualizarChefe(e, e.vida < e.vidaMax / 2 ? dt * 1.3 : dt, h);      // com metade da vida, o chefao acelera
    else {
      const T = TIPOS[e.tipo], dist = Math.hypot(h.x - e.x, h.y - e.y);
      const paraHeroi = Math.atan2(h.y - e.y, h.x - e.x);
      let vx = 0, vy = 0;
      if (T.investe) {
        // investida: persegue devagar; perto, para e avisa (linha vermelha); depois dispara em linha reta
        e.invT -= dt;
        if (e.carga > 0) { e.carga -= dt; if (e.carga <= 0) { e.corre = 0.42; som('investe'); } }
        else if (e.corre > 0) { e.corre -= dt; vx = Math.cos(e.angInv) * 200; vy = Math.sin(e.angInv) * 200; if (e.corre <= 0) e.invT = 1.1; }
        else {
          vx = Math.cos(paraHeroi) * T.vel; vy = Math.sin(paraHeroi) * T.vel;
          if (dist < 85 && e.invT <= 0) { e.carga = 0.45; e.angInv = paraHeroi; }
        }
      } else if (!T.atira) {
        e.fase += dt * 6;
        const desvio = T.voa ? Math.sin(e.fase) * 0.9 : 0;
        vx = Math.cos(paraHeroi + desvio) * T.vel; vy = Math.sin(paraHeroi + desvio) * T.vel;
      } else {
        // atiradores mantem distancia: chegam perto se estao longe, recuam se voce encosta, e andam de lado
        const frente = dist > 95 ? 1 : dist < 55 ? -1 : 0;
        if (Math.random() < dt * 0.4) e.lado = -e.lado;
        if (!e.travado) {
          vx = (Math.cos(paraHeroi) * frente + Math.cos(paraHeroi + Math.PI / 2) * e.lado * 0.7) * T.vel;
          vy = (Math.sin(paraHeroi) * frente + Math.sin(paraHeroi + Math.PI / 2) * e.lado * 0.7) * T.vel;
        }
        e.tiroT -= dt;
        if (T.atira === 'laser' && e.tiroT < 0.7 && !e.travado) { e.travado = true; e.angInv = paraHeroi; }
        if (e.tiroT <= 0) {
          e.tiroT = T.ritmo / ritmo * (e.elite ? 0.7 : 1);
          if (T.atira === 'mira') { bala(e.x, e.y, paraHeroi, 64); if (andar >= 6) bala(e.x, e.y, paraHeroi, 46); }
          else if (T.atira === 'leque') { const k = andar >= 8 ? 3 : 2; for (let i = -k; i <= k; i++) bala(e.x, e.y, paraHeroi + i * 0.25, 54, CORES.y); }
          else if (T.atira === 'anel') { const n = andar >= 10 ? 14 : 10; for (let i = 0; i < n; i++) bala(e.x, e.y, paraHeroi + i * Math.PI * 2 / n, 44, CORES.o); }
          else if (T.atira === 'espiral') { e.giro += 0.45; bala(e.x, e.y, e.giro, 40, CORES.y); if (andar >= 9) bala(e.x, e.y, e.giro + Math.PI, 40, CORES.y); }
          else { bala(e.x, e.y, e.angInv, 150, '#ff3030'); e.travado = false; som('laser'); }
        }
      }
      if (!(e.corre > 0)) { vx *= velI; vy *= velI; }      // a investida ja e rapida: nao acelera, para nao atravessar parede
      if (T.voa) { e.x = Math.max(TL + 5, Math.min(W - TL - 5, e.x + vx * dt)); e.y = Math.max(TL + 5, Math.min(AS - TL - 5, e.y + vy * dt)); }
      else mover(e, vx * dt, vy * dt, 5);
    }
    if (!e.morto && Math.hypot(e.x - h.x, e.y - h.y) < e.r + 3) { const bomba = !e.chefe && TIPOS[e.tipo].estoura; ferirHeroi(bomba ? null : e); if (bomba) matar(e, null); }
  }
  atirador = null;
  jogo.inimigos = jogo.inimigos.filter(e => !e.morto);
  if (jogo.combate && sala.reserva > 0) {                  // reforcos chegando; sala vazia = o proximo vem na hora
    sala.reforcoT -= dt;
    if (sala.reforcoT <= 0 || !jogo.inimigos.length) {
      const vagas = sala.livres.filter(([x, y]) => Math.hypot(x * TL + 6 - h.x, y * TL + 6 - h.y) > 55), [x, y] = vagas[rand(vagas.length)] || [9, 7];
      criarInimigo(sala.sortear(), x * TL + 6, y * TL + 6, false);
      sala.reserva--; sala.reforcoT = sala.reforcoCada;
    }
  }
  if (jogo.combate && !jogo.inimigos.length) {
    if (sala.ondas > 0) { sala.ondas--; povoar(sala); avisar('MAIS UMA ONDA!'); som('porta'); }
    else limparSala();
  }

  // trava de seguranca: 12 segundos de luta sem ninguem se ferir = alguem esta perdido ou preso.
  // Os que sobraram reaparecem (com aviso) num ponto alcancavel da sala.
  if (jogo.combate) {
    jogo.semDano = (jogo.semDano || 0) + dtR;
    if (jogo.semDano > 12) {
      jogo.semDano = 0;
      const vagas = sala.livres.filter(([x, y]) => Math.hypot(x * TL + 6 - h.x, y * TL + 6 - h.y) > 50);
      for (const e of jogo.inimigos) {
        const fora = !(e.x > 0 && e.x < W && e.y > 0 && e.y < AS);         // tambem pega posicao invalida
        if (e.chefe && !fora) continue;
        const [x, y] = vagas[rand(vagas.length)] || [9, 7];
        e.x = x * TL + 6; e.y = y * TL + 6; e.nasce = 0.7; e.carga = 0; e.corre = 0; e.travado = false;
      }
    }
  }

  // orbes guardioes: giram em volta do mago, apagam balas e ferem quem encostar
  for (let i = 0; i < s.orbes; i++) {
    const o = posOrbe(i);
    for (const b of jogo.balas) if (Math.hypot(b.x - o.x, b.y - o.y) < 5) { b.fora = true; faisca(b.x, b.y, '#7fd6ff', 2, 40); }
    for (const e of jogo.inimigos)
      if (!e.morto && e.nasce <= 0 && Math.hypot(e.x - o.x, e.y - o.y) < e.r + 3 && !(e.orbeT > jogo.tempo)) { e.orbeT = jogo.tempo + 0.4; ferirInimigo(e, 3 * s.dano * (1 + andar * 0.15), o.x, o.y, null); }
  }

  // balas inimigas: paredes e blocos servem de cobertura
  for (const b of jogo.balas) {
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (solidoPx(b.x, b.y)) { b.fora = true; continue; }
    const d = Math.hypot(b.x - h.x, b.y - h.y);
    if (d < s.hitbox + 1.5) { b.fora = true; ferirHeroi(b.dono); }
    else if (d < 9 && !b.raspou && h.invencivel <= 0) { b.raspou = true; faisca(b.x, b.y, '#7fd6ff', 2, 40); ganharXp(0.25); jogo.foco = Math.min(1, jogo.foco + 0.05 * s.focoGanho); som('raspao'); }
  }
  jogo.balas = jogo.balas.filter(b => !b.fora);

  // itens e objetos da sala
  jogo.perto = null;
  for (const it of sala.itens) {
    const d = Math.hypot(it.x - h.x, it.y - h.y);
    if (it.tipo === 'coracao' && d < 9 && h.vida < s.vidaMax) { h.vida++; it.fora = true; som('pegar'); }
    else if (it.tipo === 'chave' && d < 9) { jogo.chaves++; it.fora = true; som('pegar'); avisar('CHAVE!'); }
    else if (it.tipo === 'reliquia' && d < 9) { it.fora = true; pegarReliquia(it.rel); }
    else if (it.tipo === 'arma' && d < 13 && (!jogo.perto || d < jogo.perto.d)) jogo.perto = { it, d };
  }
  for (const o of sala.objetos) {
    const d = Math.hypot(o.x - h.x, o.y - h.y);
    if (o.tipo === 'bau' && !o.usado && d < 12) { o.usado = true; som('pegar'); soltarArma(o.x, o.y + 16, o.sorte); faisca(o.x, o.y, CORES.y, 14); }
    else if (((o.tipo === 'altar' || o.tipo === 'sangue') && !o.usado || o.tipo === 'escada') && d < 13 && !jogo.perto) jogo.perto = { obj: o, d };
  }
  if (pedidoUsar && jogo.perto) {
    const p = jogo.perto;
    if (p.it) {                                            // pega a arma do chao; se as duas maos estao cheias, larga a atual
      const vaga = jogo.armas[1] ? jogo.armaAtual : 1, velha = jogo.armas[vaga];
      jogo.armas[vaga] = p.it.arma; jogo.armaAtual = vaga; som('pegar');
      if (velha) p.it.arma = velha; else p.it.fora = true;
    } else if (p.obj.tipo === 'altar') { p.obj.usado = true; abrirEscolha(); }
    else if (p.obj.tipo === 'sangue') {                    // altar de sangue: 1 coracao maximo por uma reliquia
      if (s.vidaMax > 1) { p.obj.usado = true; s.vidaMax--; h.vida = Math.max(1, Math.min(h.vida, s.vidaMax)); som('dano'); jogo.tremor = 0.3; soltarReliquia(p.obj.x, p.obj.y + 18); }
      else avisar('VOCE NAO TEM O QUE DAR');
    }
    else if (p.obj.tipo === 'escada') { pedidoUsar = false; descer(jogo.andar + 1); return; }
  }
  pedidoUsar = false;
  sala.itens = sala.itens.filter(it => !it.fora);
  sala.objetos = sala.objetos.filter(o => !o.fora);

  for (const p of jogo.particulas) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt;
    if (p.pedaco) {                                        // pedaco desliza, perde forca, bate na parede e deixa rastro
      p.vx *= 1 - 3.5 * dt; p.vy *= 1 - 3.5 * dt;
      if (solidoPx(p.x, p.y)) { p.x -= p.vx * dt * 2; p.y -= p.vy * dt * 2; p.vx *= -0.5; p.vy *= -0.5; }
      if (!p.seco && Math.random() < dt * 5) manchar({ x: p.x, y: p.y, t: 1, cor: '#6a0c0c' });
      if (p.t <= 0) manchar({ x: p.x - 1, y: p.y - 1, t: p.pedaco, cor: p.cor });
    } else if (p.mancha && p.t <= 0) manchar({ x: p.x, y: p.y, t: 1 + rand(2), cor: p.cor === CORES.r ? (Math.random() < 0.5 ? '#6a0c0c' : '#8a1212') : p.cor + '90' });
  }
  jogo.particulas = jogo.particulas.filter(p => p.t > 0);
  for (const x of jogo.efeitos) x.t -= dt;
  jogo.efeitos = jogo.efeitos.filter(x => x.t > 0);
}

// ---------- desenho ----------
function texto(t, x, y, cor, alinhar) {
  g.font = '8px monospace'; g.textAlign = alinhar || 'left'; g.textBaseline = 'top';
  g.fillStyle = '#000'; g.fillText(t, x + 1, y + 1);
  g.fillStyle = cor || '#e8e4d8'; g.fillText(t, x, y);
}
const cartao = i => ({ x: 20, y: 44 + i * 46, w: W - 40, h: 41 });
const sombra = document.createElement('canvas'); sombra.width = W; sombra.height = AS;
const sx = sombra.getContext('2d');

function desenharPortas() {
  const T = temaDoAndar(jogo.andar);
  for (const d in sala.portas) {
    const lig = sala.portas[d].lig;
    for (const [bx, by] of BLOCOS_PORTA[d]) {
      const x = bx * TL, y = by * TL;
      if (lig.estado === 'rachada') {                      // parece parede, mas tem rachaduras: procure!
        g.fillStyle = T.parede; g.fillRect(x, y, TL, TL); g.fillStyle = T.topo; g.fillRect(x, y, TL, 3);
        g.fillStyle = '#00000090'; g.fillRect(x + 3, y + 3, 1, 4); g.fillRect(x + 4, y + 6, 3, 1); g.fillRect(x + 7, y + 6, 1, 4); g.fillRect(x + 8, y + 2, 1, 3);
      } else if (lig.estado === 'trancada') {
        g.fillStyle = '#8a6a1c'; g.fillRect(x, y, TL, TL); g.fillStyle = CORES.y; g.fillRect(x + 1, y + 1, TL - 2, TL - 2);
        g.fillStyle = '#14121c'; g.fillRect(x + 5, y + 4, 2, 2); g.fillRect(x + 5, y + 6, 2, 3);
      } else if (jogo.combate) {                           // grade fechada durante a luta
        g.fillStyle = '#14121c'; g.fillRect(x, y, TL, TL);
        g.fillStyle = CORES.r; for (let i = 1; i < TL; i += 3) g.fillRect(x + i, y, 1, TL);
      } else { g.fillStyle = '#07060a'; g.fillRect(x, y, TL, TL); }
    }
  }
}
function desenharArma(a, x, y) {            // icone pequeno, com a cor da raridade
  g.fillStyle = a.cor;
  if (a.modo === 'tiro' && a.flecha) { g.fillRect(x - 4, y, 8, 1); g.fillRect(x - 1, y - 3, 1, 7); }
  else if (a.modo === 'tiro') { g.fillRect(x - 4, y - 1, 8, 2); g.fillRect(x - 4, y + 1, 2, 3); }
  else if (a.modo === 'chama') { g.fillRect(x - 1, y - 1, 2, 6); g.fillStyle = CORES.o; g.fillRect(x - 2, y - 4, 4, 3); }
  else if (a.modo === 'estocada') { g.fillRect(x, y - 5, 1, 10); g.fillRect(x - 1, y - 5, 3, 2); }
  else { g.fillRect(x, y - 5, 1, 8); g.fillRect(x - 2, y + 2, 5, 1); g.fillRect(x, y + 3, 1, 2); }
}
function desenharMinimapa() {
  const conhecidas = new Set();
  for (const s of jogo.mapa.salas) if (s.visitada) { conhecidas.add(s); for (const p of Object.values(s.portas)) if (p.lig.estado !== 'rachada') conhecidas.add(p.para); }
  let maxX = -9, minY = 9;
  for (const s of conhecidas) { maxX = Math.max(maxX, s.gx); minY = Math.min(minY, s.gy); }
  for (const s of conhecidas) {
    const x = W - 9 - (maxX - s.gx) * 7, y = TOPO + 4 + (s.gy - minY) * 6;
    g.fillStyle = '#000000a0'; g.fillRect(x - 1, y - 1, 8, 7);
    g.fillStyle = s === sala ? '#ffffff' : s.visitada ? '#6a6478' : '#2f2a3c'; g.fillRect(x, y, 6, 5);
    const marca = s.tipo === 'chefe' ? CORES.r : s.tipo === 'escada' ? '#7fd6ff' : s.tipo === 'tesouro' || s.tipo === 'secreta' ? CORES.y : s.tipo === 'santuario' ? CORES.m : s.tipo === 'sangue' ? CORES.o : null;
    if (marca && s !== sala) { g.fillStyle = marca; g.fillRect(x + 2, y + 1, 2, 2); }
  }
}

function desenhar() {
  const s = jogo.stats, h = jogo.heroi, a = arma();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#07060a'; g.fillRect(0, 0, W, H);
  g.translate(0, TOPO);
  if (jogo.tremor > 0) g.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 4));
  g.drawImage(chaoCv, 0, 0);
  desenharPortas();

  for (const o of sala.objetos) {
    const x = Math.round(o.x), y = Math.round(o.y);
    if (o.tipo === 'bau') {
      g.fillStyle = o.usado ? '#3a2a1c' : '#8a5a2c'; g.fillRect(x - 7, y - 5, 14, 10);
      g.fillStyle = o.usado ? '#5a4a2c' : CORES.y; g.fillRect(x - 7, y - 1, 14, 2); g.fillRect(x - 1, y - 2, 2, 4);
    } else if (o.tipo === 'altar') {
      g.fillStyle = '#4a2a94'; g.fillRect(x - 7, y - 2, 14, 8); g.fillStyle = '#7b4bd6'; g.fillRect(x - 5, y - 5, 10, 4);
      if (!o.usado) { g.fillStyle = Math.floor(jogo.tempo * 4) % 2 ? CORES.m : '#ffffff'; g.fillRect(x - 1, y - 9, 2, 3); }
    } else if (o.tipo === 'sangue') {
      g.fillStyle = '#5a1418'; g.fillRect(x - 7, y - 2, 14, 8); g.fillStyle = o.usado ? '#3a2a30' : CORES.r; g.fillRect(x - 5, y - 5, 10, 4);
      if (!o.usado) { g.fillStyle = Math.floor(jogo.tempo * 4) % 2 ? CORES.r : '#ffffff'; g.fillRect(x - 1, y - 9, 2, 3); }
    } else if (o.tipo === 'barril') {
      g.fillStyle = '#5a2a1c'; g.fillRect(x - 4, y - 5, 8, 10); g.fillStyle = CORES.o; g.fillRect(x - 4, y - 3, 8, 1); g.fillRect(x - 4, y + 2, 8, 1);
      g.fillStyle = CORES.e; g.fillRect(x - 1, y - 1, 2, 2);
    } else if (o.tipo === 'urna') {
      g.fillStyle = '#8a6a4c'; g.fillRect(x - 3, y - 4, 6, 8); g.fillRect(x - 4, y - 2, 8, 4); g.fillStyle = '#3a2a1c'; g.fillRect(x - 2, y - 5, 4, 1);
    } else if (o.tipo === 'tumulo') {
      g.fillStyle = '#6a6478'; g.fillRect(x - 4, y - 6, 8, 10); g.fillRect(x - 3, y - 7, 6, 1);
      g.fillStyle = '#2f2a3c'; g.fillRect(x - 1, y - 4, 2, 6); g.fillRect(x - 2, y - 2, 4, 1);
    } else {
      g.fillStyle = '#000000'; g.fillRect(x - 8, y - 7, 16, 14);
      g.fillStyle = '#4a4266'; for (let i = 0; i < 4; i++) g.fillRect(x - 8 + i * 2, y - 7 + i * 3, 16 - i * 4, 2);
    }
  }
  for (const it of sala.itens) {
    const x = Math.round(it.x), y = Math.round(it.y + Math.sin(jogo.tempo * 5 + it.x) * 1.5);
    if (it.tipo === 'coracao') { g.fillStyle = CORES.r; g.fillRect(x - 3, y - 2, 2, 3); g.fillRect(x + 1, y - 2, 2, 3); g.fillRect(x - 2, y - 1, 4, 3); g.fillRect(x - 1, y + 2, 2, 1); }
    else if (it.tipo === 'chave') { g.fillStyle = CORES.y; g.fillRect(x - 3, y - 3, 4, 4); g.fillRect(x, y - 1, 5, 1); g.fillRect(x + 3, y, 1, 2); g.fillStyle = '#14121c'; g.fillRect(x - 2, y - 2, 2, 2); }
    else if (it.tipo === 'reliquia') {                     // um losango da cor da reliquia
      g.fillStyle = it.rel.cor || '#ffffff'; g.fillRect(x - 1, y - 4, 2, 8); g.fillRect(x - 2, y - 3, 4, 6); g.fillRect(x - 3, y - 2, 6, 4); g.fillRect(x - 4, y - 1, 8, 2);
      g.fillStyle = '#ffffff'; g.fillRect(x - 1, y - 2, 1, 2);
    }
    else { g.fillStyle = '#00000080'; g.fillRect(x - 5, y + 5, 10, 1); desenharArma(it.arma, x, y); }
  }
  for (const x of jogo.efeitos) {
    if (x.tipo === 'explosao') { g.fillStyle = x.t > 0.12 ? '#fff3c4' : CORES.o; g.beginPath(); g.arc(Math.round(x.x), Math.round(x.y), x.r * (1 - x.t * 2), 0, 7); g.fill(); }
    else if (x.tipo === 'corte') {
      g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.globalAlpha = x.t / 0.12;
      g.beginPath(); g.arc(x.x, x.y, x.alc - 2, x.ang - x.arco / 2, x.ang + x.arco / 2); g.stroke(); g.globalAlpha = 1;
    } else {
      g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.globalAlpha = x.t / 0.12;
      g.beginPath(); g.moveTo(x.x, x.y); g.lineTo(x.x + Math.cos(x.ang) * x.alc, x.y + Math.sin(x.ang) * x.alc); g.stroke(); g.globalAlpha = 1;
    }
  }
  for (const e of jogo.inimigos) {
    if (e.nasce > 0) {                                     // marca de invocacao piscando
      if (Math.floor(e.nasce * 12) % 2) { g.fillStyle = CORES.r; g.fillRect(Math.round(e.x) - 4, Math.round(e.y), 9, 1); g.fillRect(Math.round(e.x), Math.round(e.y) - 4, 1, 9); }
      continue;
    }
    if (e.carga > 0 || e.travado) {                        // linha vermelha: avisa a investida ou o tiro certeiro
      g.fillStyle = CORES.r;
      for (let d = 8, fim = e.travado ? 300 : e.chefe ? 160 : 76; d < fim; d += 3) {
        const px = e.x + Math.cos(e.angInv) * d, py = e.y + Math.sin(e.angInv) * d;
        if (solidoPx(px, py)) break;
        g.fillRect(Math.round(px), Math.round(py), 1, 1);
      }
    }
    const esc = e.chefe ? 2 : 1, ox = e.chefe ? 15 : 6, oy = e.chefe ? 12 : 5;
    const branco = e.piscar > 0 || (e.carga > 0 && Math.floor(jogo.tempo * 20) % 2);
    if (e.elite && !branco) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) sprite(SPR[e.tipo], e.x - ox + dx, e.y - oy + dy, CORES.y);
    if (!e.chefe && !branco && e.vida < e.vidaMax && e.vida <= e.vidaMax * 0.35 && Math.floor(jogo.tempo * 12) % 2)       // quase morto: pisca. Dash nele = execucao
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) sprite(SPR[e.tipo], e.x - ox + dx, e.y - oy + dy, CORES.e);
    sprite(SPR[e.tipo], e.x - ox, e.y - oy, branco ? '#ffffff' : null, esc, e.troca);
    if (jogo.vinganca && jogo.vinganca.e === e) {          // seta vermelha: foi este que te feriu
      const vx = Math.round(e.x), vy = Math.round(e.y) - 12 + (Math.floor(jogo.tempo * 6) % 2);
      g.fillStyle = CORES.e; g.fillRect(vx - 3, vy, 7, 2); g.fillRect(vx - 2, vy + 2, 5, 1); g.fillRect(vx - 1, vy + 3, 3, 1); g.fillRect(vx, vy + 4, 1, 1);
    }
    if (!e.chefe && e.vida < e.vidaMax) {
      g.fillStyle = '#000'; g.fillRect(Math.round(e.x) - 6, Math.round(e.y) + 7, 12, 1);
      g.fillStyle = e.fogo > 0 ? CORES.o : CORES.r; g.fillRect(Math.round(e.x) - 6, Math.round(e.y) + 7, Math.max(1, Math.round(12 * e.vida / e.vidaMax)), 1);
    }
  }
  for (const t of jogo.tiros) {
    const x = Math.round(t.x), y = Math.round(t.y);
    if (t.chama) { g.fillStyle = t.vida > 0.12 ? CORES.y : CORES.o; g.fillRect(x - 1, y - 1, 3, 3); }
    else if (t.flecha) { g.strokeStyle = '#e8e4d8'; g.lineWidth = 1; g.beginPath(); g.moveTo(t.x, t.y); g.lineTo(t.x - Math.cos(t.ang) * 6, t.y - Math.sin(t.ang) * 6); g.stroke(); }
    else { g.fillStyle = t.explosao ? '#8cff9a' : '#9fe8ff'; g.fillRect(Math.round(t.x - t.tam / 2), Math.round(t.y - t.tam / 2), t.tam + 1, t.tam + 1); }
  }
  for (const b of jogo.balas) {
    const x = Math.round(b.x), y = Math.round(b.y);
    g.fillStyle = b.cor; g.fillRect(x - 2, y - 1, 4, 2); g.fillRect(x - 1, y - 2, 2, 4);
    g.fillStyle = '#ffffff'; g.fillRect(x - 1, y - 1, 2, 2);
  }
  if (h.invencivel <= 0 || Math.floor(jogo.tempo * 20) % 2) sprite(SPR.heroi, h.x - 6, h.y - 5, null, 1, jogo.surto > 0 ? { p: '#d81a1a', P: '#6a0c0c' } : null);
  desenharArma(a, Math.round(h.x + Math.cos(jogo.mira) * 8), Math.round(h.y + Math.sin(jogo.mira) * 8));
  g.fillStyle = '#ffffff'; g.fillRect(Math.round(h.x) - 1, Math.round(h.y) - 1, 2, 2);
  for (let i = 0; i < s.orbes; i++) { const o = posOrbe(i), x = Math.round(o.x), y = Math.round(o.y); g.fillStyle = '#7fd6ff'; g.fillRect(x - 1, y - 1, 3, 3); g.fillStyle = '#ffffff'; g.fillRect(x, y, 1, 1); }
  g.fillStyle = h.dashRecarga <= 0 ? '#b48cff' : '#3a2a5a';
  g.fillRect(Math.round(h.x - 6), Math.round(h.y + 7), Math.round(12 * (1 - Math.max(0, h.dashRecarga) / s.recargaDash)), 1);
  for (const p of jogo.particulas) { const t = p.pedaco || 1; g.fillStyle = p.cor; g.fillRect(Math.round(p.x), Math.round(p.y), t, t); }

  // escuridao: uma camada preta com um buraco de luz em volta do mago. Quanto mais fundo, menor a luz.
  const escuro = Math.min(0.94, 0.2 + jogo.andar * 0.07 + (sala.mod === 'escura' ? 0.3 : 0));
  const raio = Math.max(38, 120 - jogo.andar * 6 - (sala.mod === 'escura' ? 30 : 0)) + s.luz + (a.luz || 0) + Math.sin(jogo.tempo * 13) * 1.5 + Math.sin(jogo.tempo * 7.3) * 1.5;      // a luz treme como chama
  sx.globalCompositeOperation = 'source-over'; sx.clearRect(0, 0, W, AS);
  sx.fillStyle = 'rgba(0,0,0,' + escuro + ')'; sx.fillRect(0, 0, W, AS);
  sx.globalCompositeOperation = 'destination-out';
  const luz = (x, y, r) => { const gr = sx.createRadialGradient(x, y, r * 0.3, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); sx.fillStyle = gr; sx.fillRect(x - r, y - r, r * 2, r * 2); };
  luz(h.x, h.y, raio);
  for (const x of jogo.efeitos) if (x.tipo === 'explosao') luz(x.x, x.y, x.r * 2.5);
  for (const t of jogo.tiros) if (t.chama || t.explosao) luz(t.x, t.y, 16);
  // inimigo sempre deixa um brilho no escuro; quando sobram poucos, o brilho cresce para voce achar o ultimo
  const poucos = jogo.inimigos.length <= 3;
  for (const e of jogo.inimigos) if (e.nasce <= 0) luz(e.x, e.y, e.chefe ? 40 : poucos ? 24 : 12);
  for (const b of jogo.balas) luz(b.x, b.y, 7);            // bala inimiga brilha: sempre da para ver o perigo
  for (const o of sala.objetos) if (o.tipo !== 'urna' && (o.tipo !== 'bau' || !o.usado)) luz(o.x, o.y, o.tipo === 'barril' ? 10 : 22);
  if (jogo.vinganca) luz(jogo.vinganca.e.x, jogo.vinganca.e.y, 26);
  for (const it of sala.itens) if (it.tipo === 'reliquia') luz(it.x, it.y, 16);
  for (let i = 0; i < s.orbes; i++) { const o = posOrbe(i); luz(o.x, o.y, 10); }
  g.drawImage(sombra, 0, 0);
  const vg = g.createRadialGradient(W / 2, AS / 2, 70, W / 2, AS / 2, 170);
  const perigo = h.vida <= 1 ? 0.35 + Math.sin(jogo.tempo * 6) * 0.15 : 0;
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, perigo ? 'rgba(140,0,0,' + perigo + ')' : 'rgba(0,0,0,0.5)');
  g.fillStyle = vg; g.fillRect(0, 0, W, AS);
  if (jogo.surto > 0) { g.fillStyle = 'rgba(200,0,0,' + (0.08 + Math.sin(jogo.tempo * 18) * 0.03) + ')'; g.fillRect(0, 0, W, AS); }
  if (jogo.flashT > 0) { g.fillStyle = 'rgba(160,0,0,' + Math.min(0.35, jogo.flashT * 2.5) + ')'; g.fillRect(0, 0, W, AS); }

  // mira e dica do que esta ao alcance
  if (jogo.modo === 'jogando') {
    if (fonteMira === 'mouse') {
      const x = Math.round(mouse.x), y = Math.round(mouse.y);
      g.fillStyle = '#ffffff'; g.fillRect(x - 4, y, 3, 1); g.fillRect(x + 2, y, 3, 1); g.fillRect(x, y - 4, 1, 3); g.fillRect(x, y + 2, 1, 3);
    } else { g.fillStyle = '#ffffff60'; for (let d = 14; d < 60; d += 6) g.fillRect(Math.round(h.x + Math.cos(jogo.mira) * d), Math.round(h.y + Math.sin(jogo.mira) * d), 1, 1); }
    const p = jogo.perto, botao = pad.ligado && fonteMira === 'pad' ? 'X' : 'E';
    if (p && p.it) {
      const nova = p.it.arma, dif = Math.round((dpsDaArma(nova) / dpsDaArma(a) - 1) * 100);
      const y = Math.max(2, Math.min(AS - 24, p.it.y - 26));
      texto(nova.nome, W / 2, y, nova.cor, 'center');
      texto(botao + ': pegar  (' + (dif >= 0 ? '+' : '') + dif + '% dano/s)', W / 2, y + 10, dif >= 0 ? CORES.g : CORES.r, 'center');
    } else if (p && p.obj) texto(botao + (p.obj.tipo === 'altar' ? ': fazer um pacto' : p.obj.tipo === 'sangue' ? ': -1 coracao max, +1 reliquia' : ': descer'), W / 2, p.obj.y - 22, '#ffffff', 'center');
  }
  if (jogo.avisoT > 0) { texto(jogo.aviso, W / 2, 30, CORES.y, 'center'); if (jogo.aviso2) texto(jogo.aviso2, W / 2, 40, '#ffffff', 'center'); }

  // barra de status
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (jogo.lento && jogo.modo === 'jogando') { g.fillStyle = '#3c78ff30'; g.fillRect(0, 0, W, H); }
  g.fillStyle = '#07060a'; g.fillRect(0, 0, W, TOPO);
  for (let i = 0; i < s.vidaMax; i++) { g.fillStyle = i < h.vida ? CORES.r : '#3a2a30'; g.fillRect(3 + i * 6, 3, 4, 5); }
  if (jogo.chaves) { g.fillStyle = CORES.y; g.fillRect(70, 3, 4, 4); g.fillRect(73, 5, 5, 1); texto('x' + jogo.chaves, 80, 1, CORES.y); }
  texto('ANDAR ' + jogo.andar, W / 2 + 10, 1, CORES.y, 'center');
  if (jogo.combo >= 2) {                                   // furia: quanto mais quente a cor, mais rapido voce esta
    const c = Math.floor(jogo.combo);
    texto('x' + c, 160, 1, c >= 25 ? CORES.r : c >= 12 ? CORES.o : '#e8e4d8');
    g.fillStyle = CORES.o; g.fillRect(160, 9, Math.round(18 * Math.max(0, jogo.comboT) / (2.6 * s.furiaDura)), 1);
  }
  g.fillStyle = '#2a2636'; g.fillRect(W - 46, 4, 42, 3);
  g.fillStyle = jogo.lento ? '#ffffff' : '#7fd6ff'; g.fillRect(W - 46, 4, Math.round(42 * jogo.foco), 3);
  g.fillStyle = '#2a2636'; g.fillRect(0, TOPO - 2, W, 2);
  g.fillStyle = '#5a8cf0'; g.fillRect(0, TOPO - 2, W * jogo.xp / xpNecessario(), 2);
  if (jogo.chefe) { g.fillStyle = '#000'; g.fillRect(30, TOPO + 3, W - 60, 4); g.fillStyle = CORES.r; g.fillRect(31, TOPO + 4, (W - 62) * Math.max(0, jogo.chefe.vida) / jogo.chefe.vidaMax, 2); }
  desenharMinimapa();
  // barra de raiva, no pe da tela. No surto ela vira o relogio do surto.
  g.fillStyle = '#2a2636'; g.fillRect(0, H - 2, W, 2);
  if (jogo.surto > 0) { g.fillStyle = Math.floor(jogo.tempo * 14) % 2 ? '#ffffff' : CORES.e; g.fillRect(0, H - 2, W * jogo.surto / 6, 2); }
  else { g.fillStyle = CORES.r; g.fillRect(0, H - 2, W * Math.min(1, jogo.raiva / metaRaiva()), 2); }
  jogo.reliquias.forEach((r, i) => { g.fillStyle = '#000000'; g.fillRect(1, TOPO + 13 + i * 5, 5, 5); g.fillStyle = r.cor || '#ffffff'; g.fillRect(2, TOPO + 14 + i * 5, 3, 3); });
  texto(a.nome, 3, H - 10, a.cor);
  const outra = jogo.armas[1 - jogo.armaAtual];
  if (outra) texto(outra.nome, W - 3, H - 10, '#6a6478', 'right');

  if (jogo.modo !== 'jogando') { g.fillStyle = '#000000c8'; g.fillRect(0, 0, W, H); }
  if (jogo.modo === 'titulo') {
    texto('CRIPTA SEM FUNDO', W / 2, 18, CORES.y, 'center');
    texto('ninguem voltou la de baixo.', W / 2, 32, '#6a6478', 'center');
    texto('voce tambem nao vai.', W / 2, 42, '#6a6478', 'center');
    texto('TECLADO E MOUSE', W / 2, 62, '#5a8cf0', 'center');
    texto('WASD anda - mouse mira - clique ataca', W / 2, 73, null, 'center');
    texto('espaco dash - shift camera lenta', W / 2, 83, null, 'center');
    texto('E pega/usa - Q troca de arma - M som', W / 2, 93, null, 'center');
    texto('CONTROLE', W / 2, 112, pad.ligado ? CORES.g : '#6a6478', 'center');
    texto('esq anda - dir mira e ataca - RT auto', W / 2, 123, null, 'center');
    texto('A dash - LT lenta - X usa - Y troca', W / 2, 133, null, 'center');
    texto('recorde: andar ' + recorde + '  -  ' + nomePatente(), W / 2, 154, CORES.y, 'center');
    texto(pad.ligado ? 'clique ou aperte A' : 'clique para descer', W / 2, 170, '#5a8cf0', 'center');
  } else if (jogo.modo === 'pacto') {
    texto('ASSINE COM SANGUE', W / 2, 28, CORES.y, 'center');
    jogo.escolhas.forEach((u, i) => {
      const c = cartao(i), cor = COR_PACTO[u.raridade] || COR_PACTO.comum;
      g.fillStyle = cor; g.fillRect(c.x, c.y, c.w, c.h);
      g.fillStyle = pad.ligado && i === sel ? '#2c2640' : '#17141f'; g.fillRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      texto((i + 1) + '. ' + u.nome, c.x + 5, c.y + 3, cor);
      texto('+ ' + u.bom, c.x + 5, c.y + 15, CORES.g);
      texto('- ' + u.ruim, c.x + 5, c.y + 26, CORES.r);
    });
  } else if (jogo.modo === 'morto') {
    texto('A CRIPTA TE ENGOLIU', W / 2, 60, CORES.r, 'center');
    texto('andar ' + jogo.andar + '  -  ' + jogo.abates + ' abates  -  nivel ' + jogo.nivel, W / 2, 80, null, 'center');
    texto(jogo.novoRecorde ? 'NOVO RECORDE!' : 'recorde: andar ' + recorde, W / 2, 94, CORES.y, 'center');
    texto('maior furia x' + jogo.comboMax + '  -  ' + jogo.reliquias.length + ' reliquias', W / 2, 106, '#6a6478', 'center');
    texto('sua arma ficou num tumulo no andar ' + jogo.andar + '.', W / 2, 120, '#b48cff', 'center');
    texto('clique ou A para descer de novo', W / 2, 136, '#5a8cf0', 'center');
    const pt = patente(), de = metaPatente(pt), ate = metaPatente(pt + 1);
    texto((jogo.subiu ? 'SUBIU DE PATENTE: ' : 'patente: ') + nomePatente(), W / 2, 152, jogo.subiu ? CORES.y : '#e8e4d8', 'center');
    g.fillStyle = '#2a2636'; g.fillRect(60, 164, 120, 3);
    g.fillStyle = CORES.r; g.fillRect(60, 164, Math.round(120 * (caveiras - de) / (ate - de)), 3);
    texto('+' + jogo.abates + ' caveiras  (' + caveiras + ' / ' + ate + ')', W / 2, 170, '#6a6478', 'center');
  }
}

// ---------- laco principal ----------
let ultimo = performance.now();
function quadro(agora) {
  const dt = Math.min(0.033, (agora - ultimo) / 1000);
  ultimo = agora;
  lerControle();
  if (jogo.modo === 'jogando') atualizar(dt);
  else if (jogo.modo === 'pacto') {
    const n = jogo.escolhas.length;
    if (pad.ligado && agora - pactoDesde > 350) {
      if (pad.cima) sel = (sel + n - 1) % n;
      if (pad.baixo) sel = (sel + 1) % n;
      if (pad.ok) escolher(sel);
    }
    if (mouse.clicou && jogo.modo === 'pacto')
      for (let i = 0; i < n; i++) {
        const c = cartao(i), my = mouse.y + TOPO;
        if (mouse.x >= c.x && mouse.x < c.x + c.w && my >= c.y && my < c.y + c.h) { escolher(i); break; }
      }
  } else if (mouse.clicou || pad.ok) { novoJogo('jogando'); mouse.baixo = false; }
  mouse.clicou = false;
  desenhar();
  requestAnimationFrame(quadro);
}
novoJogo('titulo');
requestAnimationFrame(quadro);
