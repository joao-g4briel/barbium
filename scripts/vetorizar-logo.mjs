// Vetoriza uma logo (PNG com tinta escura sobre fundo branco) em contornos.
// Uso: node scripts/vetorizar-logo.mjs <png> <saida.json> [tolerancia]
// Depois: ver os passos no topo de scripts/gerar-marca.mjs.
// Separa a tinta escura (faixas claras + nome) da faixa esmeralda e contorna cada
// uma com marching squares + simplificação Ramer–Douglas–Peucker.
import fs from "node:fs";
import zlib from "node:zlib";

const [, , arquivo, saida, tolArg] = process.argv;
const TOL = Number(tolArg ?? 0.9);

function decodificarPNG(buf) {
  let pos = 8, w = 0, h = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const tipo = buf.toString("ascii", pos + 4, pos + 8);
    const dados = buf.subarray(pos + 8, pos + 8 + len);
    if (tipo === "IHDR") { w = dados.readUInt32BE(0); h = dados.readUInt32BE(4); }
    else if (tipo === "IDAT") idat.push(dados);
    else if (tipo === "IEND") break;
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      let v = src[x];
      if (ft === 1) v += a;
      else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 255;
    }
  }
  return { w, h, data: out };
}

const { w, h, data } = decodificarPNG(fs.readFileSync(arquivo));

// Composição sobre branco e cobertura: tinta e esmeralda têm o vermelho perto
// de zero, então a cobertura sai do canal vermelho; o verde puro separa as duas.
const W = w + 2, H = h + 2; // borda de 1px vazia para fechar os contornos
const tinta = new Float32Array(W * H);
const faixa = new Float32Array(W * H);
let somaTinta = [0, 0, 0, 0], somaFaixa = [0, 0, 0, 0];
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const al = data[i + 3] / 255;
    const R = data[i] * al + 255 * (1 - al);
    const G = data[i + 1] * al + 255 * (1 - al);
    const B = data[i + 2] * al + 255 * (1 - al);
    const cob = Math.max(0, Math.min(1, (255 - R) / 248));
    if (cob < 0.02) continue;
    const gPuro = (G - (1 - cob) * 255) / cob;
    const k = (y + 1) * W + (x + 1);
    if (gPuro > 118) {
      faixa[k] = cob;
      if (cob > 0.98) { somaFaixa[0] += R; somaFaixa[1] += G; somaFaixa[2] += B; somaFaixa[3]++; }
    } else {
      tinta[k] = cob;
      if (cob > 0.98) { somaTinta[0] += R; somaTinta[1] += G; somaTinta[2] += B; somaTinta[3]++; }
    }
  }
}
const media = (s) => s.slice(0, 3).map((v) => Math.round(v / s[3]));

function marchingSquares(f, limiar = 0.5) {
  const pontosArestas = new Map(); // id da aresta -> ponto interpolado
  const vizinhos = new Map(); // id da aresta -> [ids ligados]
  const ponto = (id, x0, y0, x1, y1, v0, v1) => {
    if (!pontosArestas.has(id)) {
      const t = (limiar - v0) / (v1 - v0);
      pontosArestas.set(id, [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
    }
    return id;
  };
  const ligar = (a, b) => {
    if (!vizinhos.has(a)) vizinhos.set(a, []);
    if (!vizinhos.has(b)) vizinhos.set(b, []);
    vizinhos.get(a).push(b);
    vizinhos.get(b).push(a);
  };
  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W - 1; x++) {
      const tl = f[y * W + x], tr = f[y * W + x + 1], br = f[(y + 1) * W + x + 1], bl = f[(y + 1) * W + x];
      const caso = (tl >= limiar ? 8 : 0) | (tr >= limiar ? 4 : 0) | (br >= limiar ? 2 : 0) | (bl >= limiar ? 1 : 0);
      if (caso === 0 || caso === 15) continue;
      const topo = () => ponto(`h${x},${y}`, x, y, x + 1, y, tl, tr);
      const dir = () => ponto(`v${x + 1},${y}`, x + 1, y, x + 1, y + 1, tr, br);
      const base = () => ponto(`h${x},${y + 1}`, x, y + 1, x + 1, y + 1, bl, br);
      const esq = () => ponto(`v${x},${y}`, x, y, x, y + 1, tl, bl);
      const centro = (tl + tr + br + bl) / 4 >= limiar;
      switch (caso) {
        case 1: case 14: ligar(esq(), base()); break;
        case 2: case 13: ligar(base(), dir()); break;
        case 3: case 12: ligar(esq(), dir()); break;
        case 4: case 11: ligar(topo(), dir()); break;
        case 6: case 9: ligar(topo(), base()); break;
        case 7: case 8: ligar(esq(), topo()); break;
        case 5: if (centro) { ligar(esq(), topo()); ligar(base(), dir()); } else { ligar(esq(), base()); ligar(topo(), dir()); } break;
        case 10: if (centro) { ligar(esq(), base()); ligar(topo(), dir()); } else { ligar(esq(), topo()); ligar(base(), dir()); } break;
      }
    }
  }
  const visitado = new Set();
  const laços = [];
  for (const inicio of vizinhos.keys()) {
    if (visitado.has(inicio)) continue;
    const laço = [];
    let atual = inicio, anterior = null;
    while (atual && !visitado.has(atual)) {
      visitado.add(atual);
      laço.push(pontosArestas.get(atual));
      const prox = vizinhos.get(atual).find((n) => n !== anterior && !visitado.has(n));
      anterior = atual;
      atual = prox;
    }
    if (laço.length > 8) laços.push(laço.map(([px, py]) => [px - 1, py - 1]));
  }
  return laços;
}

function rdp(pts, tol) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
    if (d > max) { max = d; idx = i; }
  }
  if (max <= tol) return [pts[0], pts[pts.length - 1]];
  return [...rdp(pts.slice(0, idx + 1), tol).slice(0, -1), ...rdp(pts.slice(idx), tol)];
}

function simplificarLaço(laço, tol) {
  // corta o laço no ponto mais distante do primeiro e simplifica as duas metades
  let longe = 0, dmax = 0;
  for (let i = 0; i < laço.length; i++) {
    const d = Math.hypot(laço[i][0] - laço[0][0], laço[i][1] - laço[0][1]);
    if (d > dmax) { dmax = d; longe = i; }
  }
  const a = rdp(laço.slice(0, longe + 1), tol);
  const b = rdp([...laço.slice(longe), laço[0]], tol);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

const caixa = (l) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of l) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
};

const resultado = { largura: w, altura: h, corTinta: media(somaTinta), corFaixa: media(somaFaixa), tinta: [], faixa: [] };
for (const [nome, campo] of [["tinta", tinta], ["faixa", faixa]]) {
  for (const laço of marchingSquares(campo)) {
    const s = simplificarLaço(laço, TOL);
    resultado[nome].push({ caixa: caixa(s), pontos: s.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]) });
  }
}
fs.writeFileSync(saida, JSON.stringify(resultado));
const total = (n) => resultado[n].reduce((s, l) => s + l.pontos.length, 0);
console.log({ w, h, corTinta: resultado.corTinta, corFaixa: resultado.corFaixa, laçosTinta: resultado.tinta.length, pontosTinta: total("tinta"), laçosFaixa: resultado.faixa.length, pontosFaixa: total("faixa") });
for (const n of ["tinta", "faixa"]) for (const l of resultado[n]) console.log(n, JSON.stringify(l.caixa, (k, v) => (typeof v === "number" ? Math.round(v) : v)), l.pontos.length);
