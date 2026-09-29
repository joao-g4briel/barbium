"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarOff, Lock, LockOpen, Plus, Trash2 } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { Alerta } from "@/components/ui/alerta";
import { Badge } from "@/components/ui/badge";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { DialogoConfirmacao } from "@/components/ui/dialogo-confirmacao";

interface Bloqueio {
  id: string;
  inicio: string; // ISO
  fim: string | null; // ISO ou null = indefinido
  motivo: string | null;
}

// Bloqueios são criados no fuso do navegador (datas escolhidas no
// calendário local) e exibidos da mesma forma, como sempre foram.
function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function SecaoBloqueios({ bloqueiosIniciais }: { bloqueiosIniciais: Bloqueio[] }) {
  const router = useRouter();
  const [processando, setProcessando] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erros, setErros] = useState<{ inicio?: string; fim?: string }>({});
  const [erro, setErro] = useState<string | null>(null);
  const [remover, setRemover] = useState<Bloqueio | null>(null);

  // Sempre deriva da prop, nunca guarda cópia própria — router.refresh()
  // já traz a lista atualizada do servidor depois de cada ação.
  const travaAtiva = bloqueiosIniciais.find((b) => b.fim === null) ?? null;
  const periodosAgendados = bloqueiosIniciais.filter((b) => b.fim !== null);

  async function requisitar(chave: string, url: string, init: RequestInit): Promise<boolean> {
    setProcessando(chave);
    setErro(null);
    try {
      const resposta = await fetch(url, init);
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        setErro(corpo?.erro ?? "Não foi possível salvar.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setErro("Falha de conexão. Tente novamente.");
      return false;
    } finally {
      setProcessando(null);
    }
  }

  function trancarAgora() {
    return requisitar("trava", "/api/painel/bloqueios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inicio: new Date().toISOString(), fim: null, motivo: "Trava de emergência" }),
    });
  }

  function destravar(id: string) {
    return requisitar("trava", `/api/painel/bloqueios/${id}`, { method: "DELETE" });
  }

  async function confirmarRemocao() {
    if (!remover) return;
    const ok = await requisitar(`remover-${remover.id}`, `/api/painel/bloqueios/${remover.id}`, { method: "DELETE" });
    if (ok) setRemover(null);
  }

  async function criarPeriodo(evento: FormEvent) {
    evento.preventDefault();
    const validacao: { inicio?: string; fim?: string } = {};
    if (!dataInicio) validacao.inicio = "Escolha o primeiro dia.";
    if (!dataFim) validacao.fim = "Escolha o último dia.";
    if (dataInicio && dataFim && dataFim < dataInicio) validacao.fim = "O último dia precisa ser depois do primeiro.";
    setErros(validacao);
    if (Object.keys(validacao).length > 0) return;

    const ok = await requisitar("periodo", "/api/painel/bloqueios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inicio: new Date(`${dataInicio}T00:00:00`).toISOString(),
        fim: new Date(`${dataFim}T23:59:59`).toISOString(),
        motivo: motivo || undefined,
      }),
    });
    if (ok) {
      setMostrarForm(false);
      setDataInicio("");
      setDataFim("");
      setMotivo("");
    }
  }

  return (
    <>
      <section className="card" aria-labelledby="titulo-trava">
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0, flex: "1 1 280px" }}>
            <span className="estado-vazio-icone" style={{ margin: 0 }} aria-hidden="true">
              {travaAtiva ? <Lock size={20} /> : <LockOpen size={20} />}
            </span>
            <div style={{ display: "grid", gap: 4 }}>
              <h2 id="titulo-trava" className="card-titulo" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                Agenda {travaAtiva ? "trancada" : "aberta"}
                <Badge tom={travaAtiva ? "atencao" : "sucesso"}>{travaAtiva ? "Sem novos agendamentos" : "Recebendo agendamentos"}</Badge>
              </h2>
              <p className="texto-secundario texto-pequeno">
                {travaAtiva
                  ? "Ninguém consegue marcar horário com você até destravar."
                  : "Clientes agendam normalmente, dentro do seu expediente. Trancar é útil para um imprevisto."}
              </p>
            </div>
          </div>
          {travaAtiva ? (
            <Botao
              variante="primary"
              icone={<LockOpen size={18} aria-hidden="true" />}
              onClick={() => destravar(travaAtiva.id)}
              carregando={processando === "trava"}
              textoCarregando="Destravando…"
            >
              Destravar agenda
            </Botao>
          ) : (
            <Botao
              icone={<Lock size={18} aria-hidden="true" />}
              onClick={trancarAgora}
              carregando={processando === "trava"}
              textoCarregando="Trancando…"
            >
              Trancar agenda agora
            </Botao>
          )}
        </div>
      </section>

      <section className="card card-sem-padding" aria-labelledby="titulo-folgas">
        <div className="card-cabecalho">
          <div>
            <h2 id="titulo-folgas" className="card-titulo">
              Folgas e férias
            </h2>
            <p className="card-descricao">Dias em que você não recebe agendamentos.</p>
          </div>
          {!mostrarForm && (
            <Botao pequeno icone={<Plus size={16} aria-hidden="true" />} onClick={() => setMostrarForm(true)}>
              Marcar período
            </Botao>
          )}
        </div>

        {erro && !remover && (
          <div style={{ padding: "16px 20px 0" }}>
            <Alerta tom="perigo">{erro}</Alerta>
          </div>
        )}

        {mostrarForm && (
          <form onSubmit={criarPeriodo} className="form" noValidate style={{ padding: 20, borderBottom: "1px solid var(--color-border)" }}>
            <div className="form-grade form-grade-2">
              <Campo id="dataInicio" rotulo="Primeiro dia" erro={erros.inicio}>
                <input
                  {...ariaCampo("dataInicio", { erro: erros.inicio })}
                  type="date"
                  className="input"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </Campo>
              <Campo id="dataFim" rotulo="Último dia" erro={erros.fim}>
                <input
                  {...ariaCampo("dataFim", { erro: erros.fim })}
                  type="date"
                  className="input"
                  value={dataFim}
                  min={dataInicio || undefined}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </Campo>
            </div>
            <Campo id="motivo" rotulo="Motivo" opcional>
              <input
                id="motivo"
                className="input"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: Férias"
                maxLength={200}
              />
            </Campo>
            <div className="form-acoes">
              <Botao type="submit" variante="primary" carregando={processando === "periodo"} textoCarregando="Salvando…">
                Salvar período
              </Botao>
              <Botao
                variante="ghost"
                onClick={() => {
                  setMostrarForm(false);
                  setErros({});
                }}
              >
                Cancelar
              </Botao>
            </div>
          </form>
        )}

        {periodosAgendados.length === 0 ? (
          <EstadoVazio
            compacto
            icone={<CalendarOff size={22} />}
            titulo="Nenhum período marcado"
            descricao="Marque férias ou folgas para bloquear esses dias no link de agendamento."
          />
        ) : (
          <div className="lista">
            {periodosAgendados.map((b) => (
              <div key={b.id} className="lista-item">
                <div className="lista-item-principal">
                  <p className="lista-item-titulo num">
                    {formatarData(b.inicio)} a {formatarData(b.fim!)}
                  </p>
                  {b.motivo && <p className="lista-item-sub">{b.motivo}</p>}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-icone"
                  onClick={() => setRemover(b)}
                  aria-label={`Remover período de ${formatarData(b.inicio)} a ${formatarData(b.fim!)}`}
                  title="Remover período"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <DialogoConfirmacao
        aberto={remover !== null}
        titulo="Remover período?"
        descricao={
          remover
            ? `Os dias de ${formatarData(remover.inicio)} a ${formatarData(remover.fim!)} voltam a aceitar agendamentos.`
            : ""
        }
        rotuloConfirmar="Remover período"
        textoCarregando="Removendo…"
        perigo
        processando={remover !== null && processando === `remover-${remover.id}`}
        erro={remover ? erro : null}
        aoConfirmar={confirmarRemocao}
        aoCancelar={() => {
          setRemover(null);
          setErro(null);
        }}
      />
    </>
  );
}
