import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ofertaDoPedido, pedidosDoEvento, webhookAutentico } from "./cakto-regras";
import { linkAssinar } from "./precos";

const SEGREDO = "segredo-de-teste";
const assinar = (ts: string, corpo: string) => "v1=" + createHmac("sha256", SEGREDO).update(`${ts}.${corpo}`).digest("hex");

describe("webhook da Cakto", () => {
  const corpo = JSON.stringify({ event: "purchase_approved", data: { id: "p1" } });
  const agora = 1_800_000_000;

  it("aceita a assinatura do cabeçalho e recusa adulteração ou atraso", () => {
    const ts = String(agora);
    expect(webhookAutentico(corpo, { assinatura: assinar(ts, corpo), timestamp: ts }, SEGREDO, agora)).toBe(true);
    expect(webhookAutentico(corpo + " ", { assinatura: assinar(ts, corpo), timestamp: ts }, SEGREDO, agora)).toBe(false);
    expect(webhookAutentico(corpo, { assinatura: assinar(ts, corpo), timestamp: ts }, SEGREDO, agora + 301)).toBe(false);
    expect(webhookAutentico(corpo, { assinatura: "v1=00", timestamp: ts }, SEGREDO, agora)).toBe(false);
  });

  it("sem cabeçalho, confere o secret do corpo", () => {
    const comSecret = JSON.stringify({ secret: SEGREDO, event: "purchase_approved", data: {} });
    const errado = JSON.stringify({ secret: "outro", event: "purchase_approved", data: {} });
    expect(webhookAutentico(comSecret, { assinatura: null, timestamp: null }, SEGREDO)).toBe(true);
    expect(webhookAutentico(errado, { assinatura: null, timestamp: null }, SEGREDO)).toBe(false);
    expect(webhookAutentico("não é json", { assinatura: null, timestamp: null }, SEGREDO)).toBe(false);
  });

  it("descobre plano e período pela oferta ou pelo link do checkout", () => {
    expect(ofertaDoPedido({ offer: { id: "vdgmx46" } })).toEqual({ plano: "BARBEARIA", periodo: "MENSAL", meses: 1 });
    expect(ofertaDoPedido({ checkoutUrl: "https://pay.cakto.com.br/htdvqbo?sck=abc" })).toEqual({ plano: "REDE", periodo: "ANUAL", meses: 12 });
    expect(ofertaDoPedido({ offer: { id: "asxogd4" } })).toEqual({ plano: "SOLO", periodo: "MENSAL", meses: 1 });
    expect(ofertaDoPedido({ checkoutUrl: "https://pay.cakto.com.br/asxogd4_1364596" })).toEqual({ plano: "SOLO", periodo: "MENSAL", meses: 1 });
    expect(ofertaDoPedido({ offer: { id: "382rmg4" } })).toEqual({ plano: "SOLO", periodo: "SEMESTRAL", meses: 6 });
    expect(ofertaDoPedido({ offer: { id: "outra" } })).toBeNull();
  });

  it("aceita o formato antigo (um pedido) e o novo (lista)", () => {
    expect(pedidosDoEvento({ data: { id: "a" } })).toHaveLength(1);
    expect(pedidosDoEvento({ data: [{ id: "a" }, { id: "b" }] })).toHaveLength(2);
    expect(pedidosDoEvento({})).toHaveLength(0);
  });

  it("o link de assinar do painel leva a barbearia no sck", () => {
    expect(linkAssinar("BARBEARIA", "MENSAL", "Barbearia", "barb123")).toBe("https://pay.cakto.com.br/vdgmx46?sck=barb123");
    expect(linkAssinar("BARBEARIA", "MENSAL", "Barbearia")).toBe("https://pay.cakto.com.br/vdgmx46");
  });
});
