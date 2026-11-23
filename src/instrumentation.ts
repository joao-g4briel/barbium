import type { Instrumentation } from "next";

// O Next chama isto para todo erro não tratado no servidor (páginas, rotas
// de API, middleware). Avisa no WhatsApp da plataforma (ver lib/alerta-erro).
//
// Este arquivo também é compilado para o runtime edge (middleware), que não
// tem banco nem módulos do Node. O import fica dentro do if com
// NEXT_RUNTIME === "nodejs" pra o Next tirar esse trecho do pacote edge.
export const onRequestError: Instrumentation.onRequestError = async (erro, request, contexto) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { alertarErro } = await import("./lib/alerta-erro");
      // routePath (ex.: /painel/clientes/[id]) em vez do caminho real: não leva
      // ids nem parâmetros da URL pra mensagem, e agrupa o mesmo erro.
      await alertarErro(erro, `${request.method} ${contexto.routePath}`, (erro as { digest?: string }).digest);
    } catch (falha) {
      console.error("Alerta de erro:", falha instanceof Error ? falha.message : falha);
    }
  }
};
