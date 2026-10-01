"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { PLANOS, ROTULO_PLANO, descreverLimite } from "@/lib/planos";
import type { Plano } from "@prisma/client";
import { Campo } from "@/components/ui/campo";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";
import { DialogoConfirmacao } from "@/components/ui/dialogo-confirmacao";

interface Props {
  barbeariaId: string;
  nome: string;
  planoAtual: Plano;
  ativoAtual: boolean;
}

export function FormularioEditarBarbearia({ barbeariaId, nome, planoAtual, ativoAtual }: Props) {
  const router = useRouter();
  const [plano, setPlano] = useState<Plano>(planoAtual);
  const [ativo, setAtivo] = useState(ativoAtual);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [confirmarSuspensao, setConfirmarSuspensao] = useState(false);

  const alterado = plano !== planoAtual || ativo !== ativoAtual;

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/super-admin/barbearias/${barbeariaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano, ativo }),
      });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        setErro(dados?.erro ?? "Não foi possível salvar.");
        return;
      }
      setConfirmarSuspensao(false);
      setSalvo(true);
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setSalvo(false);
    // Suspender corta o login de toda a equipe — pede confirmação.
    if (ativoAtual && !ativo) {
      setConfirmarSuspensao(true);
      return;
    }
    salvar();
  }

  return (
    <form onSubmit={aoEnviar} className="card form" aria-labelledby="titulo-acesso">
      <div className="card-cabecalho" style={{ marginBottom: 0 }}>
        <h2 id="titulo-acesso" className="card-titulo">
          Plano e acesso
        </h2>
      </div>

      {erro && !confirmarSuspensao && <Alerta tom="perigo">{erro}</Alerta>}

      <Campo id="plano" rotulo="Plano" dica="O limite conta os profissionais ativos, dono incluído.">
        <select
          aria-describedby="plano-dica"
          id="plano"
          className="input"
          value={plano}
          onChange={(e) => {
            setPlano(e.target.value as Plano);
            setSalvo(false);
          }}
        >
          {PLANOS.map((p) => (
            <option key={p} value={p}>
              {ROTULO_PLANO[p]} · {descreverLimite(p)}
            </option>
          ))}
        </select>
      </Campo>

      <label className="interruptor" style={{ alignItems: "flex-start" }}>
        <input
          type="checkbox"
          checked={ativo}
          onChange={(e) => {
            setAtivo(e.target.checked);
            setSalvo(false);
          }}
        />
        <span className="interruptor-trilho" aria-hidden="true" style={{ marginTop: 2 }} />
        <span className="checkbox-texto">
          <span className="checkbox-rotulo">Barbearia ativa</span>
          <span className="campo-dica" style={{ fontWeight: 500 }}>
            Desativada, ninguém da equipe consegue entrar no painel e o link de agendamento sai do ar.
          </span>
        </span>
      </label>

      <div className="form-acoes">
        <Botao type="submit" variante="primary" carregando={salvando && !confirmarSuspensao} textoCarregando="Salvando…" disabled={!alterado}>
          Salvar alterações
        </Botao>
        <span role="status" aria-live="polite">
          {salvo && (
            <span className="feedback-salvo">
              <Check size={16} aria-hidden="true" />
              Alterações salvas
            </span>
          )}
        </span>
      </div>

      <DialogoConfirmacao
        aberto={confirmarSuspensao}
        titulo={`Suspender ${nome}?`}
        descricao="Ninguém da equipe vai conseguir entrar no painel e o link de agendamento deixa de funcionar até você reativar."
        rotuloConfirmar="Suspender barbearia"
        textoCarregando="Suspendendo…"
        perigo
        processando={salvando}
        erro={confirmarSuspensao ? erro : null}
        aoConfirmar={salvar}
        aoCancelar={() => {
          setConfirmarSuspensao(false);
          setErro(null);
        }}
      />
    </form>
  );
}
