"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function FormularioLogin({ proximaRota }: { proximaRota: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
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

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível entrar.");
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
    <form onSubmit={aoEnviar} className="card" style={{ display: "grid", gap: 16 }}>
      <div>
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </div>
      <div>
        <label htmlFor="senha">Senha</label>
        <input
          id="senha"
          type="password"
          className="input"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
      </div>

      {erro && <p className="erro-form">{erro}</p>}

      <button type="submit" className="btn btn-primary" disabled={carregando}>
        {carregando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
