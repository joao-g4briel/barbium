import { cssDoTema } from "@/lib/tema";

// Aplica as cores da barbearia (botões e fundo) à página inteira, inclusive
// janelas e o fundo atrás do conteúdo. Sai junto com a página: ao navegar
// pra fora dela, as cores voltam ao padrão. O CSS só tem cores #rrggbb já
// validadas (lib/tema), então pode ir direto no <style>.
export function TemaDaBarbearia({ corMarca, corFundo }: { corMarca: string | null; corFundo: string | null }) {
  const css = cssDoTema({ corMarca, corFundo });
  if (!css) return null;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
