"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";

interface Valores {
  nome: string;
  duracaoMinutos: string;
  preco: string;
  comissaoPercentual: string;
  ativo: boolean;
}

type Erros = Partial<Record<keyof Valores | "geral", string>>;

function numero(texto: string): number {
  return Number(texto.replace(",", "."));
}

// Mesmos limites das rotas /api/painel/servicos.
function validar(v: Valores): Erros {
  const erros: Erros = {};
  if (v.nome.trim().length < 2) erros.nome = "Informe o nome do serviço.";
  const duracao = numero(v.duracaoMinutos);
  if (!Number.isInteger(duracao) || duracao < 5 || duracao > 480) {
    erros.duracaoMinutos = "Use um valor entre 5 e 480 minutos.";
  }
  const preco = numero(v.preco);
  if (v.preco.trim() === "" || Number.isNaN(preco) || preco < 0) erros.preco = "Informe o preço.";
  if (v.comissaoPercentual.trim() !== "") {
    const comissao = numero(v.comissaoPercentual);
    if (Number.isNaN(comissao) || comissao < 0 || comissao > 100) {
      erros.comissaoPercentual = "Use um percentual entre 0 e 100.";
    }
  }
  return erros;
}

export function FormularioServico({
  servicoId,
  valoresIniciais,
}: {
  servicoId?: string;
  valoresIniciais?: Valores;
}) {
  const router = useRouter();
  const editando = Boolean(servicoId);
  const [valores, setValores] = useState<Valores>(
    valoresIniciais ?? { nome: "", duracaoMinutos: "30", preco: "", comissaoPercentual: "", ativo: true },
  );
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);

  function atualizar<K extends keyof Valores>(campo: K, valor: Valores[K]) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    const validacao = validar(valores);
    setErros(validacao);
    if (Object.keys(validacao).length > 0) return;

    setSalvando(true);
    const comissao = valores.comissaoPercentual.trim() === "" ? null : numero(valores.comissaoPercentual);
    const corpo = {
      nome: valores.nome,
      duracaoMinutos: numero(valores.duracaoMinutos),
      preco: numero(valores.preco),
      comissaoPercentual: editando ? comissao : (comissao ?? undefined),
      ...(editando ? { ativo: valores.ativo } : {}),
    };

    try {
      const resposta = await fetch(editando ? `/api/painel/servicos/${servicoId}` : "/api/painel/servicos", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        setErros({ geral: dados?.erro ?? "Não foi possível salvar o serviço." });
        setSalvando(false);
        return;
      }
      router.push("/painel/servicos");
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
        <h2 className="form-secao-titulo">Serviço</h2>
        <Campo id="nome" rotulo="Nome do serviço" erro={erros.nome}>
          <input
            {...ariaCampo("nome", { erro: erros.nome })}
            className="input"
            value={valores.nome}
            onChange={(e) => atualizar("nome", e.target.value)}
            placeholder="Ex.: Corte + barba"
          />
        </Campo>
        <div className="form-grade form-grade-2">
          <Campo id="duracaoMinutos" rotulo="Duração (minutos)" erro={erros.duracaoMinutos}>
            <input
              {...ariaCampo("duracaoMinutos", { erro: erros.duracaoMinutos })}
              className="input num"
              type="number"
              inputMode="numeric"
              min={5}
              max={480}
              step={5}
              value={valores.duracaoMinutos}
              onChange={(e) => atualizar("duracaoMinutos", e.target.value)}
            />
          </Campo>
          <Campo id="preco" rotulo="Preço" erro={erros.preco}>
            <div className="input-prefixo">
              <span aria-hidden="true">R$</span>
              <input
                {...ariaCampo("preco", { erro: erros.preco })}
                className="input num"
                inputMode="decimal"
                value={valores.preco}
                onChange={(e) => atualizar("preco", e.target.value)}
                placeholder="0,00"
              />
            </div>
          </Campo>
        </div>
      </div>

      <div className="form-secao">
        <h2 className="form-secao-titulo">Comissão</h2>
        <Campo
          id="comissaoPercentual"
          rotulo="Comissão do profissional (%)"
          opcional
          dica="Percentual do valor do serviço que fica com quem atende."
          erro={erros.comissaoPercentual}
        >
          <input
            {...ariaCampo("comissaoPercentual", { dica: true, erro: erros.comissaoPercentual })}
            className="input num"
            inputMode="decimal"
            value={valores.comissaoPercentual}
            onChange={(e) => atualizar("comissaoPercentual", e.target.value)}
            placeholder="Ex.: 40"
            style={{ maxWidth: 200 }}
          />
        </Campo>
      </div>

      {editando && (
        <div className="form-secao">
          <h2 className="form-secao-titulo">Disponibilidade</h2>
          <label className="checkbox">
            <input type="checkbox" checked={valores.ativo} onChange={(e) => atualizar("ativo", e.target.checked)} />
            <span className="checkbox-texto">
              <span className="checkbox-rotulo">Serviço ativo</span>
              <span className="campo-dica">
                Desativado, ele some do link de agendamento, mas continua no histórico.
              </span>
            </span>
          </label>
        </div>
      )}

      <div className="form-acoes">
        <Botao type="submit" variante="primary" carregando={salvando} textoCarregando="Salvando…">
          {editando ? "Salvar alterações" : "Criar serviço"}
        </Botao>
        <Link href="/painel/servicos" className="btn btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
