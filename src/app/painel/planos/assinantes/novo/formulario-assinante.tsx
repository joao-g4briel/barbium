"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FormaPagamento } from "@prisma/client";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";
import { apenasDigitos, formatarMoeda } from "@/lib/formatar";
import { descreverUsos } from "@/lib/planos-corte-regras";
import { EscolhaForma } from "../../acoes-assinante";

interface PlanoOpcao {
  id: string;
  nome: string;
  valor: number;
  usosPorMes: number | null;
}

type Erros = Partial<Record<"nome" | "telefone" | "plano" | "forma" | "geral", string>>;

export function FormularioAssinante({
  planos,
  cliente,
  voltarPara,
}: {
  planos: PlanoOpcao[];
  // Vindo da ficha do cliente: ele já está escolhido.
  cliente: { id: string; nome: string } | null;
  voltarPara: string;
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [planoId, setPlanoId] = useState(planos.length === 1 ? planos[0].id : "");
  const [forma, setForma] = useState<FormaPagamento | null>(null);
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);
  const plano = planos.find((p) => p.id === planoId) ?? null;

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    const validacao: Erros = {};
    if (!cliente) {
      if (nome.trim().length < 2) validacao.nome = "Informe o nome do cliente.";
      if (apenasDigitos(telefone).length < 10) validacao.telefone = "Informe o WhatsApp com DDD.";
    }
    if (!planoId) validacao.plano = "Escolha o plano.";
    if (!forma) validacao.forma = "Escolha como o cliente pagou.";
    setErros(validacao);
    if (Object.keys(validacao).length > 0) return;

    setSalvando(true);
    try {
      const resposta = await fetch("/api/painel/planos/assinantes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planoId,
          formaPagamento: forma,
          ...(cliente ? { clienteId: cliente.id } : { nome, telefone }),
        }),
      });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        setErros({ geral: dados?.erro ?? "Não foi possível adicionar o assinante." });
        setSalvando(false);
        return;
      }
      router.push(voltarPara);
      router.refresh();
    } catch {
      setErros({ geral: "Falha de conexão. Seus dados continuam no formulário — tente novamente." });
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} className="card form" noValidate style={{ maxWidth: 640 }}>
      {erros.geral && <Alerta tom="perigo">{erros.geral}</Alerta>}

      <div className="form-secao">
        <h2 className="form-secao-titulo">Cliente</h2>
        {cliente ? (
          <p className="checkbox-rotulo">{cliente.nome}</p>
        ) : (
          <div className="form-grade form-grade-2">
            <Campo id="assinante-nome" rotulo="Nome" erro={erros.nome}>
              <input
                {...ariaCampo("assinante-nome", { erro: erros.nome })}
                className="input"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="off"
              />
            </Campo>
            <Campo
              id="assinante-telefone"
              rotulo="WhatsApp"
              dica="Se já for cliente, é achado por ele."
              erro={erros.telefone}
            >
              <input
                {...ariaCampo("assinante-telefone", { dica: true, erro: erros.telefone })}
                className="input num"
                type="tel"
                inputMode="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 91234-5678"
              />
            </Campo>
          </div>
        )}
      </div>

      <div className="form-secao">
        <h2 className="form-secao-titulo">Plano e primeiro mês</h2>
        <Campo id="assinante-plano" rotulo="Plano" erro={erros.plano}>
          <select
            {...ariaCampo("assinante-plano", { erro: erros.plano })}
            className="input"
            value={planoId}
            onChange={(e) => setPlanoId(e.target.value)}
          >
            <option value="">Escolha o plano</option>
            {planos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} · {formatarMoeda(p.valor)}/mês · {descreverUsos(p.usosPorMes).toLowerCase()}
              </option>
            ))}
          </select>
        </Campo>
        <EscolhaForma
          nome="assinante-forma"
          titulo={plano ? `Como o cliente pagou ${formatarMoeda(plano.valor)}?` : "Como o cliente pagou?"}
          valor={forma}
          onChange={setForma}
        />
        {erros.forma && <p className="campo-erro">{erros.forma}</p>}
        <p className="campo-dica">O plano vale por 30 dias a partir de hoje, e o valor entra no caixa.</p>
      </div>

      <div className="form-acoes">
        <Botao type="submit" variante="primary" carregando={salvando} textoCarregando="Salvando…">
          Adicionar assinante
        </Botao>
        <Link href={voltarPara} className="btn btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
