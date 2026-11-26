import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { limparEvento, limparMigalha, limparTexto } from "./sentry-privacidade";

describe("limpeza do que vai para o Sentry", () => {
  it("tira o código dos links do cliente e o token de redefinir senha", () => {
    expect(limparTexto("https://barbium.vercel.app/meu-horario/cmabc123xyz.Qw-12_ab?x=1")).toBe("https://barbium.vercel.app/meu-horario/:codigo?x=1");
    expect(limparTexto("/minha-assinatura/cmabc123.zz9")).toBe("/minha-assinatura/:codigo");
    expect(limparTexto("/redefinir-senha?token=abc%2Fdef&a=2")).toBe("/redefinir-senha?token=:oculto&a=2");
    expect(limparTexto("/painel/agenda?data=2026-11-26")).toBe("/painel/agenda?data=2026-11-26");
  });

  it("limpa URL, cabeçalhos, cookies e corpo do pedido no evento", () => {
    const evento = {
      type: undefined,
      request: {
        url: "https://x.app/meu-horario/abc.def",
        query_string: "token=segredo",
        cookies: { sessao: "jwt" },
        data: { senha: "123" },
        headers: { Cookie: "sessao=jwt", Authorization: "Bearer x", Referer: "https://x.app/minha-assinatura/zz.yy", "User-Agent": "Safari" },
      },
      transaction: "GET /meu-horario/abc.def",
      exception: { values: [{ type: "Error", value: "falhou em /meu-horario/abc.def" }] },
      breadcrumbs: [{ category: "navigation", data: { from: "/minha-assinatura/q.w", to: "/painel" } }],
    } as unknown as ErrorEvent;

    const limpo = limparEvento(evento);
    expect(limpo.request?.url).toBe("https://x.app/meu-horario/:codigo");
    expect(limpo.request?.query_string).toBe("token=:oculto");
    expect(limpo.request?.cookies).toBeUndefined();
    expect(limpo.request?.data).toBeUndefined();
    expect(limpo.request?.headers).toEqual({ Referer: "https://x.app/minha-assinatura/:codigo", "User-Agent": "Safari" });
    expect(limpo.transaction).toBe("GET /meu-horario/:codigo");
    expect(limpo.exception?.values?.[0].value).toBe("falhou em /meu-horario/:codigo");
    expect(limpo.breadcrumbs?.[0].data).toEqual({ from: "/minha-assinatura/:codigo", to: "/painel" });
  });

  it("limpa migalhas de navegação e de fetch", () => {
    expect(limparMigalha({ category: "fetch", data: { url: "/api/x?token=abc" } }).data).toEqual({ url: "/api/x?token=:oculto" });
  });
});
