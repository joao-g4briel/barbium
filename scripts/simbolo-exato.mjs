// Troca o contorno do símbolo pela geometria exata da logo de 2026-11-25
// (docs/logo): três paralelogramos com inclinação 0,38 (cerca de 21°), barras
// claras de 100 unidades, faixa verde de 130, espessura 36 e passo 55. O nome
// continua vindo do contorno. Uso:
//   node scripts/simbolo-exato.mjs <contorno.json de scripts/vetorizar-logo.mjs> <saida.json>
import fs from "node:fs";

const [, , entrada, saida] = process.argv;
const v = JSON.parse(fs.readFileSync(entrada, "utf8"));

// Tudo que fica à direita do símbolo é o nome.
const fimSimbolo = Math.max(...v.faixa.map((l) => l.caixa.x1)) + 20;
const nome = v.tinta.filter((l) => l.caixa.x0 > fimSimbolo);
const simbolo = [...v.tinta.filter((l) => l.caixa.x1 < fimSimbolo), ...v.faixa];
const X0 = Math.min(...simbolo.map((l) => l.caixa.x0));
const Y0 = Math.min(...simbolo.map((l) => l.caixa.y0));
const Y1 = Math.max(...simbolo.map((l) => l.caixa.y1));
const ALTURA = 184; // altura do símbolo nas unidades abaixo
const escala = (Y1 - Y0) / ALTURA;

const paralelogramo = (y, largura) => {
  const sobe = largura * 0.38;
  return [[0, y], [largura, y - sobe], [largura, y - sobe + 36], [0, y + 36]];
};
const laço = (pts) => {
  const p = pts.map(([x, y]) => [Math.round((X0 + x * escala) * 10) / 10, Math.round((Y0 + y * escala) * 10) / 10]);
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  return { caixa: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }, pontos: p };
};

v.tinta = [laço(paralelogramo(38, 100)), laço(paralelogramo(148, 100)), ...nome];
v.faixa = [laço(paralelogramo(93, 130))];
fs.writeFileSync(saida, JSON.stringify(v));
console.log({ escala: +escala.toFixed(3), laçosNome: nome.length });
