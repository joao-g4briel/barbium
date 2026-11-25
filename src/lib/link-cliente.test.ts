import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  agendamentoDoCodigo,
  assinaturaDoCodigo,
  codigoDaAssinatura,
  codigoDoAgendamento,
  linkDaAssinatura,
  linkDoCliente,
  podeAlterarPeloLink,
  urlPublicaDoApp,
} from "./link-cliente";

const ID = "cmwtq5mjh0002vkzspv4lhayc";
const ambiente = { ...process.env };

describe("link do cliente", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "segredo-de-teste";
    delete process.env.APP_URL;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  });
  afterEach(() => {
    process.env = { ...ambiente };
  });

  it("o código abre o próprio agendamento", () => {
    expect(agendamentoDoCodigo(codigoDoAgendamento(ID))).toBe(ID);
  });

  it("link da assinatura abre só a assinatura, e não serve como link de horário", () => {
    const codigo = codigoDaAssinatura(ID);
    expect(assinaturaDoCodigo(codigo)).toBe(ID);
    expect(agendamentoDoCodigo(codigo)).toBeNull();
    expect(assinaturaDoCodigo(codigoDoAgendamento(ID))).toBeNull();
    const [, assinatura] = codigo.split(".");
    expect(assinaturaDoCodigo(`cmwtq5mjh0002vkzspv4lhayd.${assinatura}`)).toBeNull();
  });

  it("monta o link da assinatura só com APP_URL", () => {
    expect(linkDaAssinatura(ID)).toBeNull();
    process.env.APP_URL = "https://barbium.example/";
    expect(linkDaAssinatura(ID)).toBe(`https://barbium.example/minha-assinatura/${codigoDaAssinatura(ID)}`);
  });

  it("trocar o id ou a assinatura não abre nada", () => {
    const [, assinatura] = codigoDoAgendamento(ID).split(".");
    expect(agendamentoDoCodigo(`cmwtq5mjh0002vkzspv4lhayd.${assinatura}`)).toBeNull();
    expect(agendamentoDoCodigo(`${ID}.${assinatura.slice(0, -1)}A`)).toBeNull();
    expect(agendamentoDoCodigo(ID)).toBeNull();
    expect(agendamentoDoCodigo(`${ID}.${assinatura}.extra`)).toBeNull();
  });

  it("com outro segredo, o código antigo deixa de valer", () => {
    const codigo = codigoDoAgendamento(ID);
    process.env.JWT_SECRET = "outro-segredo";
    expect(agendamentoDoCodigo(codigo)).toBeNull();
  });

  it("o endereço vem de APP_URL ou do domínio de produção da Vercel, nunca da requisição", () => {
    expect(urlPublicaDoApp()).toBeNull();
    expect(linkDoCliente(ID)).toBeNull();
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "barbium.vercel.app";
    expect(linkDoCliente(ID)).toMatch(/^https:\/\/barbium\.vercel\.app\/meu-horario\/cmwtq5mjh0002vkzspv4lhayc\./);
    process.env.APP_URL = "https://app.barbium.com.br/";
    expect(urlPublicaDoApp()).toBe("https://app.barbium.com.br");
  });

  it("mudar ou cancelar pelo link só até 2 horas antes, e só confirmado", () => {
    const agora = new Date("2026-11-26T12:00:00Z");
    const daqui = (min: number) => new Date(agora.getTime() + min * 60e3);
    expect(podeAlterarPeloLink({ status: "CONFIRMADO", inicio: daqui(121) }, agora)).toBe(true);
    expect(podeAlterarPeloLink({ status: "CONFIRMADO", inicio: daqui(120) }, agora)).toBe(true);
    expect(podeAlterarPeloLink({ status: "CONFIRMADO", inicio: daqui(119) }, agora)).toBe(false);
    expect(podeAlterarPeloLink({ status: "CANCELADO", inicio: daqui(600) }, agora)).toBe(false);
    expect(podeAlterarPeloLink({ status: "AGUARDANDO_PAGAMENTO", inicio: daqui(600) }, agora)).toBe(false);
  });
});
