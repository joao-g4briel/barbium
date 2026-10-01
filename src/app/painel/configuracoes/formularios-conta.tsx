"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { Alerta } from "@/components/ui/alerta";
import { apenasDigitos } from "@/lib/formatar";
import { SENHA_MINIMO } from "@/lib/senha";

type Erros = Record<string, string | undefined>;

async function enviar(url: string, metodo: "PATCH" | "POST", corpo: unknown) {
  try {
    const resposta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const dados = await resposta.json().catch(() => null);
    return { ok: resposta.ok, status: resposta.status, erro: dados?.erro as string | undefined };
  } catch {
    return { ok: false, status: 0, erro: "Falha de conexão. Seus dados continuam aqui — tente novamente." };
  }
}

export function FormularioBarbearia({ nomeInicial, telefoneInicial }: { nomeInicial: string; telefoneInicial: string }) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeInicial);
  const [telefone, setTelefone] = useState(telefoneInicial);
  const [erros, setErros] = useState<Erros>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setAviso(null);
    const validacao: Erros = {};
    if (nome.trim().length < 2) validacao.nome = "Informe o nome da barbearia.";
    const digitos = apenasDigitos(telefone);
    if (digitos && digitos.length < 8) validacao.telefone = "Informe um telefone válido, com DDD.";
    setErros(validacao);
    if (Object.values(validacao).some(Boolean)) return;

    setSalvando(true);
    const r = await enviar("/api/painel/barbearia", "PATCH", { nome, telefone: telefone.trim() || null });
    setSalvando(false);
    if (!r.ok) return setErros({ geral: r.erro ?? "Não foi possível salvar." });
    setAviso("Dados da barbearia salvos.");
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="form" noValidate>
      {erros.geral && <Alerta tom="perigo">{erros.geral}</Alerta>}
      {aviso && <Alerta tom="sucesso">{aviso}</Alerta>}
      <Campo id="barbearia-nome" rotulo="Nome" erro={erros.nome}>
        <input
          {...ariaCampo("barbearia-nome", { erro: erros.nome })}
          className="input"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </Campo>
      <Campo id="barbearia-telefone" rotulo="Telefone" opcional erro={erros.telefone}>
        <input
          {...ariaCampo("barbearia-telefone", { erro: erros.telefone })}
          className="input num"
          type="tel"
          inputMode="tel"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="(11) 91234-5678"
        />
      </Campo>
      <div className="form-acoes">
        <Botao type="submit" variante="primary" carregando={salvando} textoCarregando="Salvando…">
          Salvar
        </Botao>
      </div>
    </form>
  );
}

export function FormularioPerfil({ nomeInicial, emailInicial }: { nomeInicial: string; emailInicial: string }) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeInicial);
  const [email, setEmail] = useState(emailInicial);
  const [erros, setErros] = useState<Erros>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setAviso(null);
    const validacao: Erros = {};
    if (nome.trim().length < 2) validacao.nome = "Informe seu nome.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) validacao.email = "Informe um e-mail válido.";
    setErros(validacao);
    if (Object.values(validacao).some(Boolean)) return;

    setSalvando(true);
    const r = await enviar("/api/painel/perfil", "PATCH", { nome, email });
    setSalvando(false);
    if (!r.ok) return setErros(r.status === 409 ? { email: r.erro } : { geral: r.erro ?? "Não foi possível salvar." });
    setAviso(email.trim() !== emailInicial ? "Perfil salvo. Use o novo e-mail no próximo acesso." : "Perfil salvo.");
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="form" noValidate>
      {erros.geral && <Alerta tom="perigo">{erros.geral}</Alerta>}
      {aviso && <Alerta tom="sucesso">{aviso}</Alerta>}
      <Campo id="perfil-nome" rotulo="Seu nome" erro={erros.nome}>
        <input
          {...ariaCampo("perfil-nome", { erro: erros.nome })}
          className="input"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoComplete="name"
        />
      </Campo>
      <Campo id="perfil-email" rotulo="E-mail de acesso" erro={erros.email}>
        <input
          {...ariaCampo("perfil-email", { erro: erros.email })}
          className="input"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </Campo>
      <div className="form-acoes">
        <Botao type="submit" variante="primary" carregando={salvando} textoCarregando="Salvando…">
          Salvar perfil
        </Botao>
      </div>
    </form>
  );
}

export function FormularioSenha() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setAviso(null);
    const validacao: Erros = {};
    if (!atual) validacao.atual = "Informe sua senha atual.";
    if (nova.length < SENHA_MINIMO) validacao.nova = `Use pelo menos ${SENHA_MINIMO} caracteres.`;
    else if (nova === atual) validacao.nova = "A nova senha precisa ser diferente da atual.";
    if (confirmacao !== nova) validacao.confirmacao = "As senhas não são iguais.";
    setErros(validacao);
    if (Object.values(validacao).some(Boolean)) return;

    setSalvando(true);
    const r = await enviar("/api/painel/perfil/senha", "POST", { senhaAtual: atual, novaSenha: nova });
    setSalvando(false);
    if (!r.ok) {
      return setErros(
        r.erro === "A senha atual não confere." ? { atual: r.erro } : { geral: r.erro ?? "Não foi possível trocar a senha." },
      );
    }
    setAtual("");
    setNova("");
    setConfirmacao("");
    setAviso("Senha trocada. Use a nova senha no próximo acesso.");
  }

  const tipo = mostrar ? "text" : "password";

  return (
    <form onSubmit={salvar} className="form" noValidate>
      {erros.geral && <Alerta tom="perigo">{erros.geral}</Alerta>}
      {aviso && <Alerta tom="sucesso">{aviso}</Alerta>}
      <Campo id="senha-atual" rotulo="Senha atual" erro={erros.atual}>
        <input
          {...ariaCampo("senha-atual", { erro: erros.atual })}
          className="input"
          type={tipo}
          value={atual}
          onChange={(e) => setAtual(e.target.value)}
          autoComplete="current-password"
        />
      </Campo>
      <div className="form-grade form-grade-2">
        <Campo id="senha-nova" rotulo="Nova senha" erro={erros.nova} dica={`Pelo menos ${SENHA_MINIMO} caracteres.`}>
          <input
            {...ariaCampo("senha-nova", { dica: true, erro: erros.nova })}
            className="input"
            type={tipo}
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            autoComplete="new-password"
          />
        </Campo>
        <Campo id="senha-confirmacao" rotulo="Repita a nova senha" erro={erros.confirmacao}>
          <input
            {...ariaCampo("senha-confirmacao", { erro: erros.confirmacao })}
            className="input"
            type={tipo}
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            autoComplete="new-password"
          />
        </Campo>
      </div>
      <div className="form-acoes">
        <Botao type="submit" variante="primary" carregando={salvando} textoCarregando="Trocando…">
          Trocar senha
        </Botao>
        <Botao
          variante="ghost"
          icone={mostrar ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          onClick={() => setMostrar((v) => !v)}
          aria-pressed={mostrar}
        >
          {mostrar ? "Ocultar senhas" : "Mostrar senhas"}
        </Botao>
      </div>
    </form>
  );
}
