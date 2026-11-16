// O ARSENAL: armas de humanos. Cada arma achada na cripta = tipo base + raridade + afixos.
//
// modo:
//   'tiro'     dispara projeteis (armas de fogo, arco, besta)
//   'corte'    golpe em arco na frente do mago; tambem apaga balas inimigas
//   'estocada' golpe em linha reta, longo e fino; tambem apaga balas inimigas
//   'chama'    jato curto de fogo que atravessa tudo e deixa queimando
//
// Campos: intervalo (segundos entre ataques), dano, vel (projetil), espalha (imprecisao em radianos),
// balas (projeteis por disparo), quiques (ricochetes na parede), perfura (inimigos atravessados),
// explosao (raio), vida (segundos que o projetil dura), alcance e arco (corpo a corpo),
// critico (chance extra de dano dobrado), queima (dano de fogo por segundo), luz (ilumina a escuridao).

const ARMAS_BASE = [
  // --- armas de fogo ---
  { id: 'pistola',      nome: 'Pistola',        modo: 'tiro', intervalo: 0.28, dano: 3,   vel: 300, espalha: 0.04 },
  { id: 'metralhadora', nome: 'Metralhadora',   modo: 'tiro', intervalo: 0.075, dano: 1,  vel: 290, espalha: 0.16, quiques: 1 },
  { id: 'escopeta',     nome: 'Escopeta',       modo: 'tiro', intervalo: 0.65, dano: 2,   vel: 260, espalha: 0.60, balas: 7, vida: 0.34 },
  { id: 'fuzil',        nome: 'Fuzil',          modo: 'tiro', intervalo: 0.55, dano: 8,   vel: 460, espalha: 0, quiques: 2, perfura: 2, tam: 2 },
  { id: 'granadeiro',   nome: 'Lanca-granadas', modo: 'tiro', intervalo: 1.20, dano: 10,  vel: 170, espalha: 0, explosao: 26, tam: 3 },
  // --- arcos e bestas ---
  { id: 'arco',         nome: 'Arco',           modo: 'tiro', intervalo: 0.42, dano: 5,   vel: 380, espalha: 0.02, perfura: 1, critico: 0.20, flecha: true },
  { id: 'besta',        nome: 'Besta',          modo: 'tiro', intervalo: 0.90, dano: 14,  vel: 520, espalha: 0, perfura: 4, flecha: true, tam: 2 },
  // --- armas brancas ---
  { id: 'adaga',        nome: 'Adaga',          modo: 'corte', intervalo: 0.16, dano: 3,  alcance: 18, arco: 1.2, critico: 0.25 },
  { id: 'espada',       nome: 'Espada',         modo: 'corte', intervalo: 0.36, dano: 6,  alcance: 26, arco: 1.9 },
  { id: 'machado',      nome: 'Machado',        modo: 'corte', intervalo: 0.80, dano: 16, alcance: 30, arco: 2.6 },
  { id: 'lanca',        nome: 'Lanca',          modo: 'estocada', intervalo: 0.45, dano: 8, alcance: 48, largura: 5 },
  // --- fogo ---
  { id: 'tocha',        nome: 'Tocha',          modo: 'chama', intervalo: 0.06, dano: 0.6, alcance: 44, espalha: 0.5, queima: 4, luz: 34 },

  // --- segunda leva: cada uma tem uma qualidade forte e um defeito claro ---
  { id: 'revolver',     nome: 'Revolver',       modo: 'tiro', intervalo: 0.50, dano: 7,   vel: 380, espalha: 0.02, critico: 0.15, tam: 2 },
  { id: 'mosquete',     nome: 'Mosquete',       modo: 'tiro', intervalo: 1.70, dano: 28,  vel: 600, espalha: 0, perfura: 3, tam: 2 },
  { id: 'canhao',       nome: 'Canhao de Mao',  modo: 'tiro', intervalo: 1.90, dano: 20,  vel: 150, espalha: 0, explosao: 36, tam: 4 },
  { id: 'funda',        nome: 'Funda',          modo: 'tiro', intervalo: 0.48, dano: 4,   vel: 250, espalha: 0.05, quiques: 5, tam: 2 },
  { id: 'facas',        nome: 'Facas',          modo: 'tiro', intervalo: 0.30, dano: 2,   vel: 330, espalha: 0.10, balas: 3, vida: 0.45, critico: 0.10, flecha: true },
  { id: 'lancachamas',  nome: 'Lanca-chamas',   modo: 'chama', intervalo: 0.05, dano: 0.5, alcance: 72, espalha: 0.3, queima: 6, luz: 20 },
  { id: 'katana',       nome: 'Katana',         modo: 'corte', intervalo: 0.22, dano: 5,  alcance: 28, arco: 2.4, critico: 0.10 },
  { id: 'alabarda',     nome: 'Alabarda',       modo: 'corte', intervalo: 0.95, dano: 14, alcance: 44, arco: 1.3 },
  { id: 'martelo',      nome: 'Martelo',        modo: 'corte', intervalo: 1.15, dano: 20, alcance: 25, arco: 6.3 },      // gira em volta toda
  { id: 'rapieira',     nome: 'Rapieira',       modo: 'estocada', intervalo: 0.20, dano: 4, alcance: 34, largura: 4, critico: 0.30 },
  { id: 'chicote',      nome: 'Chicote',        modo: 'estocada', intervalo: 0.34, dano: 4, alcance: 74, largura: 3 },
];

// Afixos: bonus sorteados que entram no nome da arma. "so" limita a um grupo: 'tiro' ou 'corpo' (corte e estocada).
const AFIXOS = [
  { nome: 'Veloz',      ap: a => { a.intervalo *= 0.78; } },
  { nome: 'Brutal',     ap: a => { a.dano *= 1.3; } },
  { nome: 'Certeira',   ap: a => { a.critico = (a.critico || 0) + 0.15; } },
  { nome: 'Flamejante', ap: a => { a.queima = (a.queima || 0) + 3; } },
  { nome: 'Vampirica',  ap: a => { a.vampiro = (a.vampiro || 0) + 0.05; } },
  { nome: 'Ricochete',  so: 'tiro',  ap: a => { a.quiques = (a.quiques || 0) + 2; } },
  { nome: 'Perfurante', so: 'tiro',  ap: a => { a.perfura = (a.perfura || 0) + 2; } },
  { nome: 'Dupla',      so: 'tiro',  ap: a => { a.balas = (a.balas || 1) + 1; } },
  { nome: 'Longa',      so: 'corpo', ap: a => { a.alcance *= 1.3; } },
];

// Raridade: multiplica o dano e define quantos afixos a arma ganha.
const RARIDADES = [
  { nome: 'comum',    cor: '#c8c4b8', mult: 1.0,  afixos: 0, peso: 60 },
  { nome: 'magica',   cor: '#5a8cf0', mult: 1.25, afixos: 1, peso: 28 },
  { nome: 'rara',     cor: '#f2c744', mult: 1.6,  afixos: 2, peso: 10 },
  { nome: 'lendaria', cor: '#ff7a3c', mult: 2.1,  afixos: 3, peso: 2 },
];

// Sorteia uma arma. "andar" aumenta o dano; "sorte" (0, 1, 2...) puxa a raridade para cima (baus e chefoes).
function gerarArma(andar, sorte, idFixo) {
  const base = idFixo ? ARMAS_BASE.find(b => b.id === idFixo) : ARMAS_BASE[Math.random() * ARMAS_BASE.length | 0];
  const pesos = RARIDADES.map((r, i) => r.peso * (i === 0 ? 1 / (1 + (sorte || 0) * 1.5) : 1 + (sorte || 0) * i * 0.8 + andar * 0.06 * i));
  let r = Math.random() * pesos.reduce((x, y) => x + y, 0), ri = 0;
  while ((r -= pesos[ri]) > 0 && ri < RARIDADES.length - 1) ri++;
  if (idFixo) ri = 0;
  const rar = RARIDADES[ri], a = Object.assign({}, base);
  const grupo = a.modo === 'corte' || a.modo === 'estocada' ? 'corpo' : a.modo === 'tiro' ? 'tiro' : 'outro';
  const livres = AFIXOS.filter(f => !f.so || f.so === grupo), nomes = [];
  for (let i = 0; i < rar.afixos && livres.length; i++) {
    const f = livres.splice(Math.random() * livres.length | 0, 1)[0];
    f.ap(a); nomes.push(f.nome);
  }
  a.dano *= rar.mult * (1 + (andar - 1) * 0.15);
  a.nome = [base.nome].concat(nomes).join(' ');
  a.raridade = rar.nome; a.cor = rar.cor;
  return a;
}
// dano por segundo aproximado, usado para comparar a arma do chao com a que voce segura
const dpsDaArma = a => (a.dano * (a.balas || 1) + (a.queima || 0) * 0.3) / a.intervalo;
