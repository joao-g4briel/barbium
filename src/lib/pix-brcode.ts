// Pix pela chave da barbearia (qualquer banco), sem integração: monta o
// código "copia e cola" (BR Code) no padrão EMV do Banco Central, com o valor
// já preenchido. Não há confirmação automática: quem confere o recebimento é
// o dono. Sem dependências: roda no servidor e nos testes.

export type TipoChave = "CPF" | "CNPJ" | "TELEFONE" | "EMAIL" | "ALEATORIA";

export const ROTULO_TIPO_CHAVE: Record<TipoChave, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  TELEFONE: "Celular",
  EMAIL: "E-mail",
  ALEATORIA: "Chave aleatória",
};

function digitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (base: string, peso: number) => {
    let soma = 0;
    for (const c of base) soma += Number(c) * peso--;
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return dv(cpf.slice(0, 9), 10) === Number(cpf[9]) && dv(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

function cnpjValido(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const dv = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = [...base].reduce((s, c, i) => s + Number(c) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return dv(cnpj.slice(0, 12)) === Number(cnpj[12]) && dv(cnpj.slice(0, 13)) === Number(cnpj[13]);
}

// Confere a chave e devolve no formato que vai no código (ou null se não
// é válida): CPF e CNPJ só números, celular como +55DDDNÚMERO, e-mail em
// minúsculas, aleatória como o UUID em minúsculas.
export function normalizarChave(tipo: TipoChave, valor: string): string | null {
  const bruto = valor.trim();
  switch (tipo) {
    case "CPF": {
      const d = digitos(bruto);
      return cpfValido(d) ? d : null;
    }
    case "CNPJ": {
      const d = digitos(bruto);
      return cnpjValido(d) ? d : null;
    }
    case "TELEFONE": {
      let d = digitos(bruto);
      if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
      // DDD (2) + 8 ou 9 dígitos; celular com 9 dígitos começa com 9.
      if (!/^[1-9]{2}\d{8,9}$/.test(d)) return null;
      if (d.length === 11 && d[2] !== "9") return null;
      return `+55${d}`;
    }
    case "EMAIL": {
      const e = bruto.toLowerCase();
      return e.length <= 77 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
    }
    case "ALEATORIA": {
      const a = bruto.toLowerCase();
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(a) ? a : null;
    }
  }
}

// Como mostrar a chave na tela (sem esconder: é do próprio dono).
export function exibirChave(tipo: TipoChave, chave: string): string {
  if (tipo === "CPF") return chave.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (tipo === "CNPJ") return chave.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  if (tipo === "TELEFONE") {
    const d = chave.replace(/^\+55/, "");
    return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return chave;
}

// Nome e cidade no código: sem acento, só letras, números e espaço, no
// tamanho máximo do padrão (25 e 15).
export function textoDoCodigo(texto: string, maximo: number): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximo)
    .trim();
}

function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

// CRC16-CCITT (polinômio 0x1021, início 0xFFFF), exigido no campo 63.
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function montarBrCode(dados: {
  chave: string;
  nome: string;
  cidade: string;
  valor: number;
  // Identificador da cobrança (até 25 letras e números); aparece no extrato.
  txid?: string;
  // Mensagem curta para quem paga (cortada se não couber).
  descricao?: string;
}): string {
  const nome = textoDoCodigo(dados.nome, 25) || "BARBEARIA";
  const cidade = textoDoCodigo(dados.cidade, 15) || "BRASIL";
  const txid = (dados.txid ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";

  const gui = campo("00", "br.gov.bcb.pix");
  const chave = campo("01", dados.chave);
  // A conta do Pix (campo 26) cabe em 99 caracteres; a descrição usa o resto.
  const sobra = 99 - gui.length - chave.length - 4;
  const descricao = dados.descricao ? textoDoCodigo(dados.descricao, Math.max(0, sobra)) : "";
  const conta = gui + chave + (descricao ? campo("02", descricao) : "");

  const corpo =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    campo("54", dados.valor.toFixed(2)) +
    campo("58", "BR") +
    campo("59", nome) +
    campo("60", cidade) +
    campo("62", campo("05", txid)) +
    "6304";
  return corpo + crc16(corpo);
}
