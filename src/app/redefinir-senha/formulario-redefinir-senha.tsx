"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";

export function FormularioRedefinirSenha({ token, minimo }: { token: string; minimo: number }) {
  const router = useRouter();
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [erros, setErros] = useState<{ nova?: string; confirmacao?: string }>({});
  const [erro, setErro] = useState<string | null>(null);
  const [linkInvalido, setLinkInvalido] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    const validacao: typeof erros = {};
    if (nova.length < minimo) validacao.nova = `Use pelo menos ${minimo} caracteres.`;
    if (confirmacao !== nova) validacao.confirmacao = "As senhas não são iguais.";
    setErros(validacao);
    if (Object.keys(validacao).length > 0) return;

    setSalvando(true);
    try {
      const resposta = await fetch("/api/auth/redefinir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, novaSenha: nova }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro(dados?.erro ?? "Não foi possível salvar a nova senha.");
        if (dados?.erro?.startsWith("Este link")) setLinkInvalido(true);
        setSalvando(false);
        return;
      }
      router.replace("/login?senha=redefinida");
    } catch {
      setErro("Falha de conexão. Tente novamente.");
      setSalvando(false);
    }
  }

  const tipo = mostrar ? "text" : "password";

  return (
    <form onSubmit={aoEnviar} className="form" noValidate>
      {erro && (
        <Alerta tom="perigo">
          {erro}{" "}
          {linkInvalido && (
            <Link href="/recuperar-senha" className="link">
              Pedir novo link
            </Link>
          )}
        </Alerta>
      )}
      <Campo id="nova-senha" rotulo="Nova senha" erro={erros.nova} dica={`Pelo menos ${minimo} caracteres.`}>
        <div className="senha-campo">
          <input
            {...ariaCampo("nova-senha", { dica: true, erro: erros.nova })}
            className="input"
            type={tipo}
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            autoComplete="new-password"
            autoFocus
          />
          <button
            type="button"
            className="btn btn-ghost btn-icone"
            onClick={() => setMostrar((v) => !v)}
            aria-label={mostrar ? "Ocultar senhas" : "Mostrar senhas"}
            aria-pressed={mostrar}
          >
            {mostrar ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
      </Campo>
      <Campo id="confirmacao-senha" rotulo="Repita a nova senha" erro={erros.confirmacao}>
        <input
          {...ariaCampo("confirmacao-senha", { erro: erros.confirmacao })}
          className="input"
          type={tipo}
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          autoComplete="new-password"
        />
      </Campo>
      <Botao type="submit" variante="primary" bloco carregando={salvando} textoCarregando="Salvando…">
        Salvar nova senha
      </Botao>
    </form>
  );
}
