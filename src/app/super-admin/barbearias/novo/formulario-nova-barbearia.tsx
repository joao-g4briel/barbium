"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { PLANOS, ROTULO_PLANO, descreverLimite } from "@/lib/planos";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";
import { CopiarTexto } from "@/components/ui/copiar-texto";

function slugificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface ResultadoCriacao {
  senhaTemporaria: string;
  emailDono: string;
  nomeBarbearia: string;
}

type Erros = Partial<Record<"nomeBarbearia" | "slug" | "nomeDono" | "emailDono" | "geral", string>>;

export function FormularioNovaBarbearia() {
  const [nomeBarbearia, setNomeBarbearia] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditadoManualmente, setSlugEditadoManualmente] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [plano, setPlano] = useState<(typeof PLANOS)[number]>("SOLO");
  const [nomeDono, setNomeDono] = useState("");
  const [emailDono, setEmailDono] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCriacao | null>(null);

  function aoMudarNome(valor: string) {
    setNomeBarbearia(valor);
    if (!slugEditadoManualmente) setSlug(slugificar(valor));
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    const validacao: Erros = {};
    if (nomeBarbearia.trim().length < 2) validacao.nomeBarbearia = "Informe o nome da barbearia.";
    if (slug.length < 2) validacao.slug = "O link precisa ter pelo menos 2 caracteres.";
    if (nomeDono.trim().length < 2) validacao.nomeDono = "Informe o nome do dono.";
    if (!/^\S+@\S+\.\S+$/.test(emailDono)) validacao.emailDono = "Informe um e-mail válido.";
    setErros(validacao);
    if (Object.keys(validacao).length > 0) return;

    setCarregando(true);
    try {
      const resposta = await fetch("/api/super-admin/barbearias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomeBarbearia, slug, telefone, plano, nomeDono, emailDono }),
      });
      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        setErros({ geral: dados?.erro ?? "Não foi possível criar a barbearia." });
        return;
      }

      setResultado({
        senhaTemporaria: dados.senhaTemporaria,
        emailDono: dados.dono.email,
        nomeBarbearia: dados.barbearia.nome,
      });
    } catch {
      setErros({ geral: "Falha de conexão. Os dados continuam no formulário — tente novamente." });
    } finally {
      setCarregando(false);
    }
  }

  if (resultado) {
    return (
      <section className="card" style={{ maxWidth: 560 }} aria-labelledby="titulo-criada">
        <div className="pilha-sm">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span className="confirmacao-icone" style={{ width: 44, height: 44 }} aria-hidden="true">
              <CheckCircle2 size={22} />
            </span>
            <h2 id="titulo-criada" className="card-titulo">
              {resultado.nomeBarbearia} foi criada
            </h2>
          </div>
          <Alerta tom="atencao" titulo="Anote a senha agora">
            Ela aparece só esta vez. Repasse estes dados de acesso ao dono.
          </Alerta>
          <dl className="fatos">
            <div>
              <dt>E-mail</dt>
              <dd>{resultado.emailDono}</dd>
            </div>
            <div>
              <dt>Senha temporária</dt>
              <dd className="num" style={{ letterSpacing: "0.04em" }}>
                {resultado.senhaTemporaria}
              </dd>
            </div>
          </dl>
          <div className="form-acoes">
            <CopiarTexto
              texto={`E-mail: ${resultado.emailDono}\nSenha temporária: ${resultado.senhaTemporaria}`}
              rotulo="Copiar acesso"
            />
            <Link href="/super-admin/barbearias" className="btn btn-primary btn-sm">
              Voltar para a lista
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={aoEnviar} className="card form" noValidate style={{ maxWidth: 640 }}>
      {erros.geral && <Alerta tom="perigo">{erros.geral}</Alerta>}

      <div className="form-secao">
        <h2 className="form-secao-titulo">Barbearia</h2>
        <Campo id="nomeBarbearia" rotulo="Nome da barbearia" erro={erros.nomeBarbearia}>
          <input
            {...ariaCampo("nomeBarbearia", { erro: erros.nomeBarbearia })}
            className="input"
            value={nomeBarbearia}
            onChange={(e) => aoMudarNome(e.target.value)}
          />
        </Campo>
        <Campo
          id="slug"
          rotulo="Link de agendamento"
          dica={`Endereço público: /agendar/${slug || "nome-da-barbearia"}. Só letras minúsculas, números e hífen.`}
          erro={erros.slug}
        >
          <input
            {...ariaCampo("slug", { dica: true, erro: erros.slug })}
            className="input"
            value={slug}
            onChange={(e) => {
              setSlug(slugificar(e.target.value));
              setSlugEditadoManualmente(true);
            }}
          />
        </Campo>
        <div className="form-grade form-grade-2">
          <Campo id="telefone" rotulo="Telefone" opcional>
            <input
              id="telefone"
              className="input num"
              type="tel"
              inputMode="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </Campo>
          <Campo id="plano" rotulo="Plano">
            <select
              id="plano"
              className="input"
              value={plano}
              onChange={(e) => setPlano(e.target.value as (typeof PLANOS)[number])}
            >
              {PLANOS.map((p) => (
                <option key={p} value={p}>
                  {ROTULO_PLANO[p]} · {descreverLimite(p)}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      </div>

      <div className="form-secao">
        <h2 className="form-secao-titulo">Dono</h2>
        <p className="form-secao-descricao">Uma senha temporária é gerada para o primeiro acesso.</p>
        <Campo id="nomeDono" rotulo="Nome do dono" erro={erros.nomeDono}>
          <input
            {...ariaCampo("nomeDono", { erro: erros.nomeDono })}
            className="input"
            value={nomeDono}
            onChange={(e) => setNomeDono(e.target.value)}
          />
        </Campo>
        <Campo id="emailDono" rotulo="E-mail do dono" dica="Será o login dele no painel." erro={erros.emailDono}>
          <input
            {...ariaCampo("emailDono", { dica: true, erro: erros.emailDono })}
            className="input"
            type="email"
            autoComplete="off"
            value={emailDono}
            onChange={(e) => setEmailDono(e.target.value)}
          />
        </Campo>
      </div>

      <div className="form-acoes">
        <Botao type="submit" variante="primary" carregando={carregando} textoCarregando="Criando…">
          Criar barbearia
        </Botao>
        <Link href="/super-admin/barbearias" className="btn btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
