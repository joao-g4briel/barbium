// Publica as artes do carrossel: copia os WebP listados em
// docs/images/carrossel.json para public/images/barbium, que é o caminho
// servido pelo site. docs/images continua sendo a origem (não mover nem apagar).
// Roda sozinho antes do build (npm "prebuild"); para rodar à mão:
//   node scripts/publicar-imagens.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origem = path.join(raiz, "docs/images");
const destino = path.join(raiz, "public/images/barbium");
const manifesto = JSON.parse(fs.readFileSync(path.join(origem, "carrossel.json"), "utf8"));

fs.mkdirSync(destino, { recursive: true });
for (const slide of manifesto.slides) {
  fs.copyFileSync(path.join(origem, slide.webp), path.join(destino, slide.webp));
}
console.log(`publicar-imagens: ${manifesto.slides.length} artes em public/images/barbium`);
