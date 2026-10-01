"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";
import { DialogoConfirmacao } from "@/components/ui/dialogo-confirmacao";
import { CredenciaisGeradas } from "@/components/ui/credenciais-geradas";
import {
  CamposProfissional,
  comissaoParaApi,
  validarProfissional,
  type ErrosProfissional,
  type ValoresProfissional,
} from "../campos-profissional";

export function FormularioEditarProfissional({
  id,
  valoresIniciais,
  ativoInicial,
  ehDono,
  agendamentosFuturos,
}: {
  id: string;
  valoresIniciais: ValoresProfissional;
  ativoInicial: boolean;
  ehDono: boolean;
  agendamentosFuturos: number;
}) {
  const router = useRouter();
  const [valores, setValores] = useState(valoresIniciais);
  const [ativo, setAtivo] = useState(ativoInicial);
  const [erros, setErros] = useState<ErrosProfissional>({});
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const [confirmarSenha, setConfirmarSenha] = useState(false);
  const [gerandoSenha, setGerandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [senhaNova, setSenhaNova] = useState<string | null>(null);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setAviso(null);
    const validacao = validarProfissional(valores);
    setErros(validacao);
    if (Object.keys(validacao).length > 0) return;

    setSalvando(true);
    try {
      const resposta = await fetch(`/api/painel/equipe/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: valores.nome,
          email: valores.email,
          comissaoPercentual: comissaoParaApi(valores.comissao),
          ativo,
        }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErros(
          resposta.status === 409 && dados?.codigo !== "LIMITE_PLANO"
            ? { email: dados?.erro }
            : { geral: dados?.erro ?? "Não foi possível salvar." },
        );
        return;
      }
      setAviso("Alterações salvas.");
      router.refresh();
    } catch {
      setErros({ geral: "Falha de conexão. Seus dados continuam aqui — tente novamente." });
    } finally {
      setSalvando(false);
    }
  }

  async function gerarSenha() {
    setGerandoSenha(true);
    setErroSenha(null);
    try {
      const resposta = await fetch(`/api/painel/equipe/${id}/senha`, { method: "POST" });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErroSenha(dados?.erro ?? "Não foi possível gerar a senha.");
        return;
      }
      setSenhaNova(dados.senhaTemporaria);
      setConfirmarSenha(false);
    } catch {
      setErroSenha("Falha de conexão. Tente novamente.");
    } finally {
      setGerandoSenha(false);
    }
  }

  const desativando = ativoInicial && !ativo;

  return (
    <div className="pilha" style={{ maxWidth: 640 }}>
      <form onSubmit={salvar} className="card form" noValidate>
        {erros.geral && <Alerta tom="perigo">{erros.geral}</Alerta>}
        {aviso && <Alerta tom="sucesso">{aviso}</Alerta>}

        <CamposProfissional valores={valores} erros={erros} aoMudar={setValores} />

        {ehDono ? (
          <p className="texto-secundario texto-pequeno">O dono da barbearia não pode ser desativado.</p>
        ) : (
          <div className="pilha-sm">
            <label className="interruptor">
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              <span className="interruptor-trilho" aria-hidden="true" />
              Ativo na barbearia
            </label>
            {desativando && (
              <Alerta tom="atencao">
                Sem acesso ao painel e fora do agendamento online a partir de agora.
                {agendamentosFuturos > 0 &&
                  ` ${agendamentosFuturos === 1 ? "O agendamento futuro continua" : `Os ${agendamentosFuturos} agendamentos futuros continuam`} na agenda — remarque ou cancele.`}
              </Alerta>
            )}
          </div>
        )}

        <div className="form-acoes">
          <Botao type="submit" variante="primary" carregando={salvando} textoCarregando="Salvando…">
            Salvar
          </Botao>
          <Link href="/painel/equipe" className="btn btn-ghost">
            Voltar
          </Link>
        </div>
      </form>

      {!ehDono && (
        <section className="card" aria-labelledby="titulo-acesso">
          <div className="card-cabecalho">
            <div>
              <h2 id="titulo-acesso" className="card-titulo">
                Acesso
              </h2>
              <p className="card-descricao">Se a pessoa esqueceu a senha, gere uma temporária nova e repasse.</p>
            </div>
          </div>
          {senhaNova ? (
            <CredenciaisGeradas email={valores.email} senha={senhaNova} para={valores.nome} />
          ) : (
            <Botao icone={<KeyRound size={16} aria-hidden="true" />} onClick={() => setConfirmarSenha(true)}>
              Gerar nova senha
            </Botao>
          )}
        </section>
      )}

      <DialogoConfirmacao
        aberto={confirmarSenha}
        titulo="Gerar nova senha?"
        descricao={`A senha atual de ${valores.nome} deixa de funcionar na hora.`}
        rotuloConfirmar="Gerar nova senha"
        textoCarregando="Gerando…"
        processando={gerandoSenha}
        erro={erroSenha}
        aoConfirmar={gerarSenha}
        aoCancelar={() => setConfirmarSenha(false)}
      />
    </div>
  );
}
