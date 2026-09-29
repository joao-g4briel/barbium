"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";
import { apenasDigitos, formatarTelefone } from "@/lib/formatar";

interface Erros {
  nome?: string;
  telefone?: string;
  geral?: string;
}

export function FormularioEditarCliente({
  clienteId,
  nomeInicial,
  telefoneInicial,
}: {
  clienteId: string;
  nomeInicial: string;
  telefoneInicial: string;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeInicial);
  const [telefone, setTelefone] = useState(formatarTelefone(telefoneInicial));
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const alterado = nome !== nomeInicial || apenasDigitos(telefone) !== apenasDigitos(telefoneInicial);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const validacao: Erros = {};
    if (nome.trim().length < 2) validacao.nome = "Informe o nome do cliente.";
    if (apenasDigitos(telefone).length < 8) validacao.telefone = "Informe um telefone válido, com DDD.";
    setErros(validacao);
    setSalvo(false);
    if (Object.keys(validacao).length > 0) return;

    setSalvando(true);
    try {
      const resposta = await fetch(`/api/painel/clientes/${clienteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, telefone }),
      });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        const mensagem = dados?.erro ?? "Não foi possível salvar.";
        setErros(resposta.status === 409 ? { telefone: mensagem } : { geral: mensagem });
        return;
      }
      setSalvo(true);
      router.refresh();
    } catch {
      setErros({ geral: "Falha de conexão. Suas alterações continuam no formulário — tente novamente." });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="form" noValidate>
      {erros.geral && <Alerta tom="perigo">{erros.geral}</Alerta>}
      <Campo id="nome" rotulo="Nome" erro={erros.nome}>
        <input
          {...ariaCampo("nome", { erro: erros.nome })}
          className="input"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            setSalvo(false);
          }}
          autoComplete="off"
        />
      </Campo>
      <Campo id="telefone" rotulo="Telefone" erro={erros.telefone}>
        <input
          {...ariaCampo("telefone", { erro: erros.telefone })}
          className="input num"
          type="tel"
          inputMode="tel"
          value={telefone}
          onChange={(e) => {
            setTelefone(e.target.value);
            setSalvo(false);
          }}
          autoComplete="off"
        />
      </Campo>
      <div className="form-acoes">
        <Botao type="submit" variante="primary" carregando={salvando} textoCarregando="Salvando…" disabled={!alterado}>
          Salvar alterações
        </Botao>
        <span role="status" aria-live="polite">
          {salvo && (
            <span className="feedback-salvo">
              <Check size={16} aria-hidden="true" />
              Dados salvos
            </span>
          )}
        </span>
      </div>
    </form>
  );
}
