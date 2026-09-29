"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Campo } from "@/components/ui/campo";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";

export function FormularioLogin({ proximaRota }: { proximaRota: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const resposta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        setErro(dados?.erro ?? "Não foi possível entrar.");
        setCarregando(false);
        return;
      }

      const destinoPadrao = dados.role === "SUPER_ADMIN" ? "/super-admin" : "/painel";
      router.push(proximaRota ?? destinoPadrao);
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente novamente.");
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} className="form">
      {erro && <Alerta tom="perigo">{erro}</Alerta>}

      <Campo id="email" rotulo="E-mail">
        <input
          id="email"
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          required
          autoFocus
        />
      </Campo>

      <Campo id="senha" rotulo="Senha">
        <div className="senha-campo">
          <input
            id="senha"
            type={mostrarSenha ? "text" : "password"}
            className="input"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="btn btn-ghost btn-icone"
            onClick={() => setMostrarSenha((v) => !v)}
            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={mostrarSenha}
          >
            {mostrarSenha ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
      </Campo>

      <Botao type="submit" variante="primary" bloco carregando={carregando} textoCarregando="Entrando…">
        Entrar
      </Botao>
    </form>
  );
}
