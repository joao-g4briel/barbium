import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Check, Scissors, Users, Wallet } from "lucide-react";
import { Marca } from "@/components/ui/marca";
import { Alerta } from "@/components/ui/alerta";
import { emailConfigurado } from "@/lib/email";
import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = { title: "Entrar" };

// Só aceita redirecionar pra dentro do próprio app depois do login.
function rotaSegura(valor: string | undefined): string | null {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//")) return null;
  return valor;
}

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; senha?: string }>;
}) {
  const { next, senha } = await searchParams;

  return (
    <main className="auth auth-login">
      <section className="login-apresentacao" aria-label="Barbium, gestão para barbearias">
        <Marca variante="login" tamanho={32} />
        <div className="login-mensagem">
          <p className="login-selo"><span /> SUA BARBEARIA, EM ORDEM</p>
          <h2>Mais tempo para<br />o que você faz<br /><em>de melhor.</em></h2>
          <p>Uma rotina mais leve começa com agenda,<br className="login-quebra" /> clientes e financeiro no mesmo lugar.</p>
        </div>
        <div className="login-ilustracao" aria-hidden="true">
          <div className="login-ilustracao-topo"><span><CalendarDays size={18} /> Tudo no seu horário</span><ArrowUpRight size={18} /></div>
          <div className="login-ilustracao-linha"><span className="login-hora">09:00</span><span className="login-servico-icone"><Scissors size={20} /></span><div><strong>Corte + barba</strong><span>Tempo para cuidar de cada detalhe</span></div><Check size={18} /></div>
          <div className="login-ilustracao-linha"><span className="login-hora">10:00</span><span className="login-servico-icone"><Users size={20} /></span><div><strong>Seu próximo cliente</strong><span>Uma boa experiência, do início ao fim</span></div><Check size={18} /></div>
        </div>
        <div className="login-recursos"><span><CalendarDays size={16} /> Agenda</span><span><Users size={16} /> Clientes</span><span><Wallet size={16} /> Financeiro</span></div>
      </section>
      <section className="login-formulario">
      <div className="auth-caixa">
        <div className="auth-cabecalho">
          <div className="login-marca-mobile"><Marca variante="login" tamanho={28} /></div>
          <div>
            <p className="login-boas-vindas">BEM-VINDO DE VOLTA</p>
            <h1 className="auth-titulo">Entrar no painel</h1>
            <p className="auth-subtitulo">Seu dia na barbearia começa aqui.</p>
          </div>
        </div>
        {senha === "redefinida" && <Alerta tom="sucesso">Senha redefinida. Entre com a nova senha.</Alerta>}
        <div className="login-form-card">
          <FormularioLogin proximaRota={rotaSegura(next)} />
        </div>
        {/* Sem envio de e-mail configurado, o link levaria a um recurso que não funciona. */}
        {emailConfigurado() && (
          <Link href="/recuperar-senha" className="auth-link">
            Esqueci minha senha
          </Link>
        )}
        <p className="login-rodape">Barbium · Gestão afiada para barbearias.</p>
      </div>
      </section>
    </main>
  );
}
