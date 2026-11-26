// Gera os ativos da marca a partir da logo vetorizada: caminhos para o
// componente React, SVGs em public/brand e os ícones PNG do app.
// Passos (logo de 2026-11-25, docs/logo):
//   node scripts/vetorizar-logo.mjs <docs/logo/barbium-c-logo-claro.png em RGBA, fundo branco> contorno.json
//   node scripts/simbolo-exato.mjs contorno.json logo.json
//   node scripts/gerar-marca.mjs logo.json .
// Cada PNG gerado leva a origem no campo de texto "impeccable:prompt".
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const [, , entrada, raiz] = process.argv;
const v = JSON.parse(fs.readFileSync(entrada, "utf8"));

// Caixa da arte toda (barras, faixa e nome)
const todos = [...v.tinta, ...v.faixa];
const X0 = Math.min(...todos.map((l) => l.caixa.x0));
const Y0 = Math.min(...todos.map((l) => l.caixa.y0));
const X1 = Math.max(...todos.map((l) => l.caixa.x1));
const Y1 = Math.max(...todos.map((l) => l.caixa.y1));
const ESCALA = 100 / (Y1 - Y0); // altura da logo = 100 unidades
const LARGURA = +((X1 - X0) * ESCALA).toFixed(1);

const limiteSimbolo = Math.max(...v.faixa.map((l) => l.caixa.x1)) + 20; // o nome começa bem depois
const barras = v.tinta.filter((l) => l.caixa.x1 < limiteSimbolo);
const nome = v.tinta.filter((l) => l.caixa.x0 > limiteSimbolo);
const faixas = [...v.faixa].sort((a, b) => a.caixa.y0 - b.caixa.y0);
// A faixa verde é a peça mais longa do símbolo.
const LARGURA_SIMBOLO = +((Math.max(...[...barras, ...faixas].map((l) => l.caixa.x1)) - X0) * ESCALA).toFixed(1);

const norm = (l) => l.pontos.map(([x, y]) => [+((x - X0) * ESCALA).toFixed(1), +((y - Y0) * ESCALA).toFixed(1)]);
const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1)).replace(/^0\./, ".").replace(/^-0\./, "-.");
function caminho(laços) {
  return laços
    .map((l) => {
      const p = norm(l);
      let d = `M${fmt(p[0][0])} ${fmt(p[0][1])}`;
      let [px, py] = p[0];
      for (let i = 1; i < p.length; i++) {
        const dx = +(p[i][0] - px).toFixed(1), dy = +(p[i][1] - py).toFixed(1);
        d += `l${fmt(dx)}${dy < 0 ? "" : " "}${fmt(dy)}`;
        px = +(px + dx).toFixed(1);
        py = +(py + dy).toFixed(1);
      }
      return d + "z";
    })
    .join("");
}

const dBarras = caminho(barras);
const dNome = caminho(nome);
const dFaixas = caminho(faixas);

// 1) caminhos para o componente
const ts = `// Logo de 2026-11-25 (docs/logo): três faixas inclinadas, a do meio verde e
// mais longa (o horário marcado na régua do dia), ao lado do nome em grotesca
// condensada. Faixas em geometria exata; nome vetorizado por contorno.
// Não editar à mão: ver os passos no topo de scripts/gerar-marca.mjs.
// Altura da arte = 100 unidades; o símbolo ocupa de x=0 a x=${LARGURA_SIMBOLO}.
export const LARGURA_LOGO = ${LARGURA};
export const LARGURA_SIMBOLO = ${LARGURA_SIMBOLO};
export const CAMINHO_BARRAS = "${dBarras}";
export const CAMINHO_FAIXAS = "${dFaixas}";
export const CAMINHO_NOME = "${dNome}";
`;
fs.writeFileSync(path.join(raiz, "src/components/ui/marca-caminhos.ts"), ts);

// 2) SVGs estáticos (documentação, checkout, favicon)
const pastaMarca = path.join(raiz, "public/brand");
fs.mkdirSync(pastaMarca, { recursive: true });
const svg = (vb, corpo, titulo = "Barbium") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${titulo}">${corpo}</svg>\n`;
const ESCURO = { tinta: "#F4F7F5", faixa: "#10B981" };
const CLARO = { tinta: "#111614", faixa: "#10B981" };
const arte = (c, comNome = true) =>
  `<path fill="${c.tinta}" fill-rule="evenodd" d="${dBarras}${comNome ? dNome : ""}"/><path fill="${c.faixa}" d="${dFaixas}"/>`;
fs.writeFileSync(path.join(pastaMarca, "barbium-horizontal.svg"), svg(`0 0 ${LARGURA} 100`, arte(ESCURO)));
fs.writeFileSync(path.join(pastaMarca, "barbium-horizontal-claro.svg"), svg(`0 0 ${LARGURA} 100`, arte(CLARO)));
fs.writeFileSync(path.join(pastaMarca, "barbium-simbolo.svg"), svg(`0 0 ${LARGURA_SIMBOLO} 100`, arte(ESCURO, false)));
// Compacta (símbolo sobre o nome), na proporção da arte compacta aprovada
const larguraNome = LARGURA - (nome.length ? (Math.min(...nome.map((l) => l.caixa.x0)) - X0) * ESCALA : 0);
const desvioNome = (Math.min(...nome.map((l) => l.caixa.x0)) - X0) * ESCALA;
const escalaSimboloCompacto = 1.25;
const alturaSimbolo = 100 * escalaSimboloCompacto;
const alturaNomeTopo = (Math.min(...nome.map((l) => l.caixa.y0)) - Y0) * ESCALA;
const alturaNome = 100 - alturaNomeTopo;
const vao = 14;
const larguraCompacta = +larguraNome.toFixed(1);
const alturaCompacta = +(alturaSimbolo + vao + alturaNome).toFixed(1);
const xSimbolo = (larguraCompacta - LARGURA_SIMBOLO * escalaSimboloCompacto) / 2;
const compacta =
  `<g transform="translate(${xSimbolo.toFixed(1)} 0) scale(${escalaSimboloCompacto})"><path fill="${ESCURO.tinta}" d="${dBarras}"/><path fill="${ESCURO.faixa}" d="${dFaixas}"/></g>` +
  `<g transform="translate(${(-desvioNome).toFixed(1)} ${(alturaSimbolo + vao - alturaNomeTopo).toFixed(1)})"><path fill="${ESCURO.tinta}" fill-rule="evenodd" d="${dNome}"/></g>`;
fs.writeFileSync(path.join(pastaMarca, "barbium-compacto.svg"), svg(`0 0 ${larguraCompacta} ${alturaCompacta}`, compacta));
// Favicon: símbolo sobre o fundo da marca, cantos arredondados
const lado = 128, altS = 92, larS = (LARGURA_SIMBOLO * altS) / 100;
fs.writeFileSync(
  path.join(pastaMarca, "favicon.svg"),
  svg(
    `0 0 ${lado} ${lado}`,
    `<rect width="${lado}" height="${lado}" rx="28" fill="#0D1110"/><g transform="translate(${((lado - larS) / 2).toFixed(1)} ${((lado - altS) / 2).toFixed(1)}) scale(${altS / 100})"><path fill="${ESCURO.tinta}" d="${dBarras}"/><path fill="${ESCURO.faixa}" d="${dFaixas}"/></g>`,
  ),
);

// 3) Rasterização (ícones PNG): preenchimento par-ímpar por linhas, 4x4 amostras por pixel
function cobertura(laços, tamanhoX, tamanhoY, escala, dx, dy) {
  const SS = 4;
  const cob = new Float32Array(tamanhoX * tamanhoY);
  const arestas = [];
  for (const l of laços) {
    const p = norm(l).map(([x, y]) => [x * escala + dx, y * escala + dy]);
    for (let i = 0; i < p.length; i++) arestas.push([p[i], p[(i + 1) % p.length]]);
  }
  const linha = new Float32Array(tamanhoX * SS);
  for (let py = 0; py < tamanhoY; py++) {
    for (let sy = 0; sy < SS; sy++) {
      const y = py + (sy + 0.5) / SS;
      const xs = [];
      for (const [[x0, y0], [x1, y1]] of arestas) {
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
      }
      xs.sort((a, b) => a - b);
      linha.fill(0);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const a = Math.max(0, Math.round(xs[i] * SS)), b = Math.min(tamanhoX * SS, Math.round(xs[i + 1] * SS));
        for (let k = a; k < b; k++) linha[k] = 1;
      }
      for (let px = 0; px < tamanhoX; px++) {
        let s = 0;
        for (let k = 0; k < SS; k++) s += linha[px * SS + k];
        cob[py * tamanhoX + px] += s / (SS * SS);
      }
    }
  }
  return cob;
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const tabelaCRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = tabelaCRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const ORIGEM =
  "Origem: rasterizado por scripts/gerar-marca.mjs a partir da logo docs/logo/barbium-c-logo-claro.png " +
  "(imagem gerada por IA e escolhida pelo dono da marca): nome vetorizado por contorno, faixas em geometria exata.";
function png(largura, altura, rgba) {
  const bloco = (tipo, dados) => {
    const t = Buffer.from(tipo, "ascii");
    const len = Buffer.alloc(4); len.writeUInt32BE(dados.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, dados])));
    return Buffer.concat([len, t, dados, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0); ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const bruto = Buffer.alloc((largura * 4 + 1) * altura);
  for (let y = 0; y < altura; y++) rgba.copy(bruto, y * (largura * 4 + 1) + 1, y * largura * 4, (y + 1) * largura * 4);
  const texto = Buffer.from(`impeccable:prompt ${ORIGEM}`, "latin1");
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    bloco("IHDR", ihdr),
    bloco("tEXt", texto),
    bloco("IDAT", zlib.deflateSync(bruto, { level: 9 })),
    bloco("IEND", Buffer.alloc(0)),
  ]);
}
function desenhar({ largura, altura, fundo, camadas, escala, dx, dy }) {
  const rgba = Buffer.alloc(largura * altura * 4);
  const corFundo = fundo ? hex(fundo) : null;
  const cobs = camadas.map((c) => ({ cor: hex(c.cor), cob: cobertura(c.laços, largura, altura, escala, dx, dy) }));
  for (let i = 0; i < largura * altura; i++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (const { cor, cob } of cobs) {
      const k = Math.min(1, cob[i]);
      r += cor[0] * k; g += cor[1] * k; b += cor[2] * k; a += k;
    }
    a = Math.min(1, a);
    if (corFundo) {
      rgba[i * 4] = Math.round(r + corFundo[0] * (1 - a));
      rgba[i * 4 + 1] = Math.round(g + corFundo[1] * (1 - a));
      rgba[i * 4 + 2] = Math.round(b + corFundo[2] * (1 - a));
      rgba[i * 4 + 3] = 255;
    } else {
      rgba[i * 4] = a ? Math.round(r / a) : 0;
      rgba[i * 4 + 1] = a ? Math.round(g / a) : 0;
      rgba[i * 4 + 2] = a ? Math.round(b / a) : 0;
      rgba[i * 4 + 3] = Math.round(a * 255);
    }
  }
  return png(largura, altura, rgba);
}
const camadasSimbolo = (c) => [{ cor: c.tinta, laços: barras }, { cor: c.faixa, laços: faixas }];
function icone(lado, proporcao, arquivo) {
  const alt = lado * proporcao, esc = alt / 100, lar = LARGURA_SIMBOLO * esc;
  fs.writeFileSync(
    path.join(raiz, "public/icons", arquivo),
    desenhar({ largura: lado, altura: lado, fundo: "#0D1110", camadas: camadasSimbolo(ESCURO), escala: esc, dx: (lado - lar) / 2, dy: (lado - alt) / 2 }),
  );
}
icone(192, 0.62, "icon-192.png");
icone(512, 0.62, "icon-512.png");
icone(512, 0.5, "icon-maskable-512.png");
icone(180, 0.6, "apple-touch-icon.png");
// Logo em PNG para enviar ao checkout (fundo transparente), clara e escura
const larguraPNG = 1200, alturaPNG = Math.round((larguraPNG * 100) / LARGURA);
const escPNG = alturaPNG / 100;
for (const [arq, c] of [["barbium-horizontal-claro.png", CLARO], ["barbium-horizontal.png", ESCURO]]) {
  fs.writeFileSync(
    path.join(pastaMarca, arq),
    desenhar({ largura: larguraPNG, altura: alturaPNG, fundo: null, camadas: [{ cor: c.tinta, laços: [...barras, ...nome] }, { cor: c.faixa, laços: faixas }], escala: escPNG, dx: 0, dy: 0 }),
  );
}
console.log({ LARGURA, LARGURA_SIMBOLO, bytesCaminhos: dBarras.length + dFaixas.length + dNome.length, barras: barras.length, nome: nome.length, faixas: faixas.length });
