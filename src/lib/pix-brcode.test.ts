import { describe, expect, it } from "vitest";
import { crc16, exibirChave, montarBrCode, normalizarChave, textoDoCodigo } from "./pix-brcode";

// Lê um código EMV (ID de 2 dígitos + tamanho de 2 dígitos + valor).
function ler(codigo: string): Record<string, string> {
  const campos: Record<string, string> = {};
  let i = 0;
  while (i < codigo.length) {
    const id = codigo.slice(i, i + 2);
    const tamanho = Number(codigo.slice(i + 2, i + 4));
    campos[id] = codigo.slice(i + 4, i + 4 + tamanho);
    i += 4 + tamanho;
  }
  return campos;
}

describe("CRC16 do Pix", () => {
  it("bate com o valor de referência do CRC-16/CCITT-FALSE", () => {
    expect(crc16("123456789")).toBe("29B1");
  });

  it("bate com o exemplo do manual do Banco Central", () => {
    const corpo =
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304";
    expect(crc16(corpo)).toBe("1D3D");
  });
});

describe("código copia e cola", () => {
  const codigo = montarBrCode({
    chave: "+5581999998888",
    nome: "Barbearia São João & Cia Ltda Muito Comprida",
    cidade: "Jaboatão dos Guararapes",
    valor: 27.5,
    txid: "cmabc123-xyz_456",
    descricao: "Sinal Corte + barba",
  });
  const campos = ler(codigo);

  it("tem os campos do padrão, com o valor e o CRC certos", () => {
    expect(campos["00"]).toBe("01");
    expect(campos["52"]).toBe("0000");
    expect(campos["53"]).toBe("986");
    expect(campos["54"]).toBe("27.50");
    expect(campos["58"]).toBe("BR");
    expect(codigo.slice(-8, -4)).toBe("6304");
    expect(codigo.slice(-4)).toBe(crc16(codigo.slice(0, -4)));
  });

  it("põe a chave na conta Pix e corta nome e cidade sem acento", () => {
    const conta = ler(campos["26"]);
    expect(conta["00"]).toBe("br.gov.bcb.pix");
    expect(conta["01"]).toBe("+5581999998888");
    expect(conta["02"]).toBe("Sinal Corte barba");
    expect(campos["59"]).toBe("Barbearia Sao Joao Cia Lt");
    expect(campos["59"].length).toBeLessThanOrEqual(25);
    expect(campos["60"]).toBe("Jaboatao dos Gu");
    expect(ler(campos["62"])["05"]).toBe("cmabc123xyz456");
  });

  it("sem txid usa *** e a conta Pix nunca passa de 99 caracteres", () => {
    const email = "um.email.comprido.da.barbearia.para.testar.o.limite@exemplo.com.br";
    expect(normalizarChave("EMAIL", email)).toBe(email);
    const longo = montarBrCode({
      chave: email,
      nome: "X",
      cidade: "Recife",
      valor: 100,
      descricao: "Uma descrição bem grande que não deveria caber inteira",
    });
    const c = ler(longo);
    expect(c["26"].length).toBeLessThanOrEqual(99);
    expect(ler(c["62"])["05"]).toBe("***");
    expect(longo.slice(-4)).toBe(crc16(longo.slice(0, -4)));
  });
});

describe("chaves", () => {
  it("aceita CPF e CNPJ válidos e recusa os inválidos", () => {
    expect(normalizarChave("CPF", "529.982.247-25")).toBe("52998224725");
    expect(normalizarChave("CPF", "529.982.247-24")).toBeNull();
    expect(normalizarChave("CPF", "111.111.111-11")).toBeNull();
    expect(normalizarChave("CNPJ", "11.222.333/0001-81")).toBe("11222333000181");
    expect(normalizarChave("CNPJ", "11.222.333/0001-80")).toBeNull();
  });

  it("monta o celular com +55", () => {
    expect(normalizarChave("TELEFONE", "(81) 99999-8888")).toBe("+5581999998888");
    expect(normalizarChave("TELEFONE", "+55 81 99999-8888")).toBe("+5581999998888");
    expect(normalizarChave("TELEFONE", "81 3197-3711")).toBe("+558131973711");
    expect(normalizarChave("TELEFONE", "99999-8888")).toBeNull();
    expect(normalizarChave("TELEFONE", "(81) 89999-8888")).toBeNull();
  });

  it("e-mail em minúsculas e chave aleatória no formato UUID", () => {
    expect(normalizarChave("EMAIL", " Contato@Barbearia.com ")).toBe("contato@barbearia.com");
    expect(normalizarChave("EMAIL", "sem-arroba")).toBeNull();
    expect(normalizarChave("ALEATORIA", "123E4567-E12B-12D1-A456-426655440000")).toBe("123e4567-e12b-12d1-a456-426655440000");
    expect(normalizarChave("ALEATORIA", "123e4567")).toBeNull();
  });

  it("mostra a chave formatada", () => {
    expect(exibirChave("CPF", "52998224725")).toBe("529.982.247-25");
    expect(exibirChave("TELEFONE", "+5581999998888")).toBe("(81) 99999-8888");
    expect(exibirChave("CNPJ", "11222333000181")).toBe("11.222.333/0001-81");
  });

  it("limpa texto para o código", () => {
    expect(textoDoCodigo("  Ação  Çedilha!! ", 25)).toBe("Acao Cedilha");
  });
});
