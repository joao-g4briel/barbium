"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import type { Plano } from "@prisma/client";
import { Botao } from "@/components/ui/botao";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { Alerta } from "@/components/ui/alerta";
import { PLANOS, ROTULO_PLANO, descreverLimite } from "@/lib/planos";
import { PRECOS } from "@/lib/precos";
import { formatarMoeda, numeroWhatsApp } from "@/lib/formatar";
import { SENHA_MINIMO } from "@/lib/senha";

type Campos = "nomeBarbearia" | "nome" | "email" | "whatsapp" | "senha";
type Erros = Partial<Record<Campos | "geral", string>>;

export function FormularioCadastro({ planoInicial }: { planoInicial: Plano }) {
  const router = useRouter();
  const [plano, setPlano] = useState<Plano>(planoInicial);
  const [valores, setValores] = useState<Record<Campos, string>>({
    nomeBarbearia: "",
    nome: "",
    email: "",
    whatsapp: "",
    senha: "",
  });
  const [site, setSite] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);

  const mudar = (campo: Campos) => (e: { target: { value: string } }) => {
    setValores((v) => ({ ...v, [campo]: e.target.value }));
    setErros((x) => ({ ...x, [campo]: undefined }));
  };

  function validar(): Erros {
    const e: Erros = {};
    if (valores.nomeBarbearia.trim().length < 2) e.nomeBarbearia = "Informe o nome da barbearia.";
    if (valores.nome.trim().length < 2) e.nome = "Informe o seu nome.";
    if (!/^\S+@\S+\.\S+$/.test(valores.email.trim())) e.email = "Informe um e-mail válido.";
    if (!numeroWhatsApp(valores.whatsapp)) e.whatsapp = "Informe o WhatsApp com DDD.";
    if (valores.senha.length < SENHA_MINIMO) e.senha = `A senha precisa ter pelo menos ${SENHA_MINIMO} caracteres.`;
    return e;
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const validacao = validar();
    setErros(validacao);
    if (Object.values(validacao).some(Boolean)) return;

    setEnviando(true);
    try {
      const resposta = await fetch("/api/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...valores, plano, site }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        const campo = dados?.campo as Campos | undefined;
        setErros(campo ? { [campo]: dados.erro } : { geral: dados?.erro ?? "Não foi possível criar a conta." });
        setEnviando(false);
        return;
      }
      router.push("/painel?bemvindo=1");
      router.refresh();
    } catch {
      setErros({ geral: "Falha de conexão. Seus dados continuam aqui — tente novamente." });
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="form" noValidate>
      {erros.geral && <Alerta tom="perigo">{erros.geral}</Alerta>}

      <fieldset className="campo cadastro-planos">
        <legend className="campo-rotulo">Plano</legend>
        <div className="cadastro-planos-opcoes">
          {PLANOS.map((p) => (
            <label key={p} className="cadastro-plano">
              <input type="radio" name="plano" value={p} checked={plano === p} onChange={() => setPlano(p)} />
              <span className="cadastro-plano-nome">{ROTULO_PLANO[p]}</span>
              <span className="cadastro-plano-detalhe">{descreverLimite(p)}</span>
              <span className="cadastro-plano-preco num">{formatarMoeda(PRECOS[p].MENSAL)}/mês</span>
            </label>
          ))}
        </div>
        <p className="campo-dica">Dá para trocar depois. Semestral e anual saem mais baratos; você escolhe ao assinar.</p>
      </fieldset>

      <Campo id="cad-barbearia" rotulo="Nome da barbearia" erro={erros.nomeBarbearia}>
        <input
          {...ariaCampo("cad-barbearia", { erro: erros.nomeBarbearia })}
          className="input"
          autoComplete="organization"
          value={valores.nomeBarbearia}
          onChange={mudar("nomeBarbearia")}
        />
      </Campo>
      <Campo id="cad-nome" rotulo="Seu nome" erro={erros.nome}>
        <input
          {...ariaCampo("cad-nome", { erro: erros.nome })}
          className="input"
          autoComplete="name"
          value={valores.nome}
          onChange={mudar("nome")}
        />
      </Campo>
      <Campo id="cad-email" rotulo="E-mail" dica="É com ele que você entra no painel." erro={erros.email}>
        <input
          {...ariaCampo("cad-email", { dica: true, erro: erros.email })}
          className="input"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={valores.email}
          onChange={mudar("email")}
        />
      </Campo>
      <Campo id="cad-whatsapp" rotulo="WhatsApp" dica="Onde você recebe o aviso de cada agendamento novo." erro={erros.whatsapp}>
        <input
          {...ariaCampo("cad-whatsapp", { dica: true, erro: erros.whatsapp })}
          className="input num"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 91234-5678"
          value={valores.whatsapp}
          onChange={mudar("whatsapp")}
        />
      </Campo>
      <Campo id="cad-senha" rotulo="Senha" dica={`Pelo menos ${SENHA_MINIMO} caracteres.`} erro={erros.senha}>
        <div className="senha-campo">
          <input
            {...ariaCampo("cad-senha", { dica: true, erro: erros.senha })}
            className="input"
            type={verSenha ? "text" : "password"}
            autoComplete="new-password"
            value={valores.senha}
            onChange={mudar("senha")}
          />
          <button
            type="button"
            className="btn btn-ghost btn-icone"
            onClick={() => setVerSenha((v) => !v)}
            aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={verSenha}
          >
            {verSenha ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
      </Campo>

      {/* Campo escondido contra cadastro automático: gente não vê nem preenche. */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="cad-site">Site</label>
        <input id="cad-site" tabIndex={-1} autoComplete="off" value={site} onChange={(e) => setSite(e.target.value)} />
      </div>

      <Botao type="submit" variante="primary" bloco carregando={enviando} textoCarregando="Criando a conta…">
        Criar conta e começar o teste
      </Botao>
    </form>
  );
}
