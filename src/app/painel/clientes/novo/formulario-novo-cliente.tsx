"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";
import { apenasDigitos } from "@/lib/formatar";

interface Erros {
  nome?: string;
  telefone?: string;
  geral?: string;
}

// Mesmas regras da rota POST /api/painel/clientes, checadas antes de enviar
// pra mostrar o erro ao lado do campo.
function validar(nome: string, telefone: string): Erros {
  const erros: Erros = {};
  if (nome.trim().length < 2) erros.nome = "Informe o nome do cliente.";
  if (apenasDigitos(telefone).length < 8) erros.telefone = "Informe um telefone válido, com DDD.";
  return erros;
}

export function FormularioNovoCliente() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    const validacao = validar(nome, telefone);
    setErros(validacao);
    if (Object.keys(validacao).length > 0) return;

    setSalvando(true);
    try {
      const resposta = await fetch("/api/painel/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, telefone }),
      });
      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        const mensagem = dados?.erro ?? "Não foi possível cadastrar o cliente.";
        setErros(resposta.status === 409 ? { telefone: mensagem } : { geral: mensagem });
        setSalvando(false);
        return;
      }

      router.push(`/painel/clientes/${dados.cliente.id}`);
      router.refresh();
    } catch {
      setErros({ geral: "Falha de conexão. Seus dados continuam no formulário — tente novamente." });
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} className="card form" noValidate style={{ maxWidth: 560 }}>
      {erros.geral && <Alerta tom="perigo">{erros.geral}</Alerta>}

      <div className="form-secao">
        <h2 className="form-secao-titulo">Dados do cliente</h2>
        <Campo id="nome" rotulo="Nome" erro={erros.nome}>
          <input
            {...ariaCampo("nome", { erro: erros.nome })}
            className="input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="name"
            required
          />
        </Campo>
        <Campo
          id="telefone"
          rotulo="Telefone"
          dica="Com DDD. É por ele que o cliente é reconhecido ao agendar pelo link."
          erro={erros.telefone}
        >
          <input
            {...ariaCampo("telefone", { dica: true, erro: erros.telefone })}
            className="input num"
            type="tel"
            inputMode="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(11) 91234-5678"
            autoComplete="tel"
            required
          />
        </Campo>
      </div>

      <div className="form-acoes">
        <Botao type="submit" variante="primary" carregando={salvando} textoCarregando="Cadastrando…">
          Cadastrar cliente
        </Botao>
        <Link href="/painel/clientes" className="btn btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
