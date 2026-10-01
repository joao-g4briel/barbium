"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";
import type { FormaPagamento } from "@prisma/client";
import { FORMAS_PAGAMENTO, ROTULO_FORMA_PAGAMENTO } from "@/lib/forma-pagamento";
import { FUSO_BRASIL } from "@/lib/fuso-brasil";

type Tipo = "ENTRADA" | "SAIDA";

interface Erros {
  descricao?: string;
  valor?: string;
  geral?: string;
}

export function FormularioNovoLancamento() {
  const router = useRouter();
  const [tipo, setTipo] = useState<Tipo>("SAIDA");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  // Hoje no calendário de Brasília (en-CA formata como AAAA-MM-DD).
  const [data, setData] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: FUSO_BRASIL }));
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento | "">("");
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    const numero = Number(valor.replace(",", "."));
    const validacao: Erros = {};
    if (descricao.trim().length < 2) validacao.descricao = "Informe uma descrição.";
    if (!valor || Number.isNaN(numero) || numero <= 0) validacao.valor = "Informe um valor maior que zero.";
    setErros(validacao);
    if (Object.keys(validacao).length > 0) return;

    setSalvando(true);
    try {
      const resposta = await fetch("/api/painel/caixa/lancamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, valor: numero, descricao, data, formaPagamento: formaPagamento || null }),
      });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        setErros({ geral: dados?.erro ?? "Não foi possível registrar o lançamento." });
        setSalvando(false);
        return;
      }
      router.push("/painel/caixa");
      router.refresh();
    } catch {
      setErros({ geral: "Falha de conexão. Seus dados continuam no formulário — tente novamente." });
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} className="card form" noValidate style={{ maxWidth: 560 }}>
      {erros.geral && <Alerta tom="perigo">{erros.geral}</Alerta>}

      <fieldset className="campo" style={{ border: "none", margin: 0, padding: 0 }}>
        <legend className="campo-rotulo" style={{ marginBottom: 8 }}>
          Tipo de lançamento
        </legend>
        <div className="segmentado">
          <label style={{ position: "relative" }}>
            <input type="radio" name="tipo" value="SAIDA" checked={tipo === "SAIDA"} onChange={() => setTipo("SAIDA")} />
            <span className="segmentado-item">
              <ArrowDownRight size={16} aria-hidden="true" />
              Saída (despesa)
            </span>
          </label>
          <label style={{ position: "relative" }}>
            <input
              type="radio"
              name="tipo"
              value="ENTRADA"
              checked={tipo === "ENTRADA"}
              onChange={() => setTipo("ENTRADA")}
            />
            <span className="segmentado-item">
              <ArrowUpRight size={16} aria-hidden="true" />
              Entrada avulsa
            </span>
          </label>
        </div>
        <p className="campo-dica">
          Atendimentos concluídos já entram no caixa sozinhos — use a entrada avulsa para vendas de produtos, por
          exemplo.
        </p>
      </fieldset>

      <Campo id="descricao" rotulo="Descrição" erro={erros.descricao}>
        <input
          {...ariaCampo("descricao", { erro: erros.descricao })}
          className="input"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder={tipo === "SAIDA" ? "Ex.: Aluguel, produtos" : "Ex.: Venda de pomada"}
        />
      </Campo>

      <div className="form-grade form-grade-2">
        <Campo id="valor" rotulo="Valor" erro={erros.valor}>
          <div className="input-prefixo">
            <span aria-hidden="true">R$</span>
            <input
              {...ariaCampo("valor", { erro: erros.valor })}
              className="input num"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
          </div>
        </Campo>
        <Campo id="data" rotulo="Data">
          <input id="data" type="date" className="input" value={data} onChange={(e) => setData(e.target.value)} required />
        </Campo>
      </div>

      <Campo id="forma-pagamento" rotulo="Forma de pagamento" opcional>
        <select
          id="forma-pagamento"
          className="input"
          style={{ maxWidth: 280 }}
          value={formaPagamento}
          onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento | "")}
        >
          <option value="">Não informar</option>
          {FORMAS_PAGAMENTO.map((f) => (
            <option key={f} value={f}>
              {ROTULO_FORMA_PAGAMENTO[f]}
            </option>
          ))}
        </select>
      </Campo>

      <div className="form-acoes">
        <Botao type="submit" variante="primary" carregando={salvando} textoCarregando="Registrando…">
          Registrar lançamento
        </Botao>
        <Link href="/painel/caixa" className="btn btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
