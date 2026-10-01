"use client";

import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";

export function FormularioRecuperarSenha({ validadeMinutos }: { validadeMinutos: number }) {
  const [email, setEmail] = useState("");
  const [erroEmail, setErroEmail] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErroEmail("Informe um e-mail válido.");
      return;
    }
    setErroEmail(null);
    setEnviando(true);
    try {
      const resposta = await fetch("/api/auth/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        setErro(dados?.erro ?? "Não foi possível enviar agora. Tente de novo em instantes.");
        return;
      }
      setEnviado(true);
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="pilha-sm" role="status">
        <span className="confirmacao-icone" style={{ width: 44, height: 44 }} aria-hidden="true">
          <MailCheck size={22} />
        </span>
        <p style={{ fontWeight: 700 }}>Confira seu e-mail</p>
        <p className="texto-secundario">
          Se existir uma conta com <strong>{email.trim()}</strong>, enviamos um link para escolher uma senha nova. Ele
          vale por {validadeMinutos} minutos. Não chegou? Veja a caixa de spam ou peça de novo daqui a 2 minutos.
        </p>
        <div>
          <Botao pequeno variante="ghost" onClick={() => setEnviado(false)}>
            Usar outro e-mail
          </Botao>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={aoEnviar} className="form" noValidate>
      {erro && <Alerta tom="perigo">{erro}</Alerta>}
      <Campo id="email" rotulo="E-mail de acesso" erro={erroEmail}>
        <input
          {...ariaCampo("email", { erro: erroEmail })}
          type="email"
          inputMode="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
        />
      </Campo>
      <Botao type="submit" variante="primary" bloco carregando={enviando} textoCarregando="Enviando…">
        Enviar link
      </Botao>
    </form>
  );
}
