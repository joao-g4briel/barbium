import { describe, expect, it } from "vitest";
import { limparEndereco } from "./analitica";

describe("limparEndereco", () => {
  it("esconde o código do link do cliente", () => {
    expect(limparEndereco("https://barbium.vercel.app/meu-horario/abc123XYZ")).toBe("https://barbium.vercel.app/meu-horario/[codigo]");
  });

  it("tira o token de redefinir senha", () => {
    expect(limparEndereco("https://barbium.vercel.app/redefinir-senha?token=segredo")).toBe("https://barbium.vercel.app/redefinir-senha");
  });

  it("mantém as marcas de campanha", () => {
    expect(limparEndereco("https://barbium.vercel.app/?utm_source=instagram&x=1")).toBe("https://barbium.vercel.app/?utm_source=instagram");
  });

  it("não mexe no link de agendamento", () => {
    expect(limparEndereco("https://barbium.vercel.app/agendar/barbearia-rio")).toBe("https://barbium.vercel.app/agendar/barbearia-rio");
  });
});
