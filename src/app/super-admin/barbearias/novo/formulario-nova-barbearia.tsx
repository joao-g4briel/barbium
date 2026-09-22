"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { PLANOS, ROTULO_PLANO } from "@/lib/planos";

function slugificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface ResultadoCriacao {
  senhaTemporaria: string;
  emailDono: string;
  nomeBarbearia: string;
}

export function FormularioNovaBarbearia() {
  const [nomeBarbearia, setNomeBarbearia] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditadoManualmente, setSlugEditadoManualmente] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [plano, setPlano] = useState<(typeof PLANOS)[number]>("SOLO");
  const [nomeDono, setNomeDono] = useState("");
  const [emailDono, setEmailDono] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCriacao | null>(null);

  function aoMudarNome(valor: string) {
    setNomeBarbearia(valor);
    if (!slugEditadoManualmente) {
      setSlug(slugificar(valor));
    }
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const resposta = await fetch("/api/super-admin/barbearias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomeBarbearia, slug, telefone, plano, nomeDono, emailDono }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível criar a barbearia.");
        setCarregando(false);
        return;
      }

      setResultado({
        senhaTemporaria: dados.senhaTemporaria,
        emailDono: dados.dono.email,
        nomeBarbearia: dados.barbearia.nome,
      });
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  if (resultado) {
    return (
      <div className="card" style={{ display: "grid", gap: 12 }}>
        <p style={{ color: "var(--neon)", fontWeight: 700 }}>
          Barbearia {resultado.nomeBarbearia} criada.
        </p>
        <p style={{ color: "var(--muted)" }}>
          Repasse esses dados de acesso pro dono — a senha só aparece aqui, essa vez:
        </p>
        <div className="card" style={{ background: "var(--surface-2)" }}>
          <p style={{ margin: 0 }}>
            <strong>E-mail:</strong> {resultado.emailDono}
          </p>
          <p style={{ margin: "4px 0 0" }}>
            <strong>Senha temporária:</strong> {resultado.senhaTemporaria}
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/super-admin/barbearias" className="btn btn-primary">
            Voltar pra lista
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={aoEnviar} className="card" style={{ display: "grid", gap: 16, maxWidth: 480 }}>
      <div>
        <label htmlFor="nomeBarbearia">Nome da barbearia</label>
        <input
          id="nomeBarbearia"
          className="input"
          value={nomeBarbearia}
          onChange={(e) => aoMudarNome(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="slug">Link de agendamento (barbium.com.br/agendar/…)</label>
        <input
          id="slug"
          className="input"
          value={slug}
          onChange={(e) => {
            setSlug(slugificar(e.target.value));
            setSlugEditadoManualmente(true);
          }}
          required
        />
      </div>

      <div>
        <label htmlFor="telefone">Telefone (opcional)</label>
        <input
          id="telefone"
          className="input"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="plano">Plano</label>
        <select
          id="plano"
          className="input"
          value={plano}
          onChange={(e) => setPlano(e.target.value as (typeof PLANOS)[number])}
        >
          {PLANOS.map((p) => (
            <option key={p} value={p}>
              {ROTULO_PLANO[p]}
            </option>
          ))}
        </select>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--line)" }} />

      <div>
        <label htmlFor="nomeDono">Nome do dono</label>
        <input
          id="nomeDono"
          className="input"
          value={nomeDono}
          onChange={(e) => setNomeDono(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="emailDono">E-mail do dono (login)</label>
        <input
          id="emailDono"
          type="email"
          className="input"
          value={emailDono}
          onChange={(e) => setEmailDono(e.target.value)}
          required
        />
      </div>

      {erro && <p className="erro-form">{erro}</p>}

      <button type="submit" className="btn btn-primary" disabled={carregando}>
        {carregando ? "Criando…" : "Criar barbearia"}
      </button>
    </form>
  );
}
