"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";

// Ordem dos serviços ativos no link de agendamento. Botões de subir e descer
// em vez de arrastar: funcionam igual no celular, no mouse e no teclado.
export function OrdenarServicos({ servicos }: { servicos: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [lista, setLista] = useState(servicos);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const mudou = lista.some((s, i) => s.id !== servicos[i]?.id);

  function mover(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= lista.length) return;
    const nova = [...lista];
    [nova[indice], nova[destino]] = [nova[destino], nova[indice]];
    setLista(nova);
    setSalvo(false);
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/painel/servicos/ordem", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: lista.map((s) => s.id) }),
      });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        setErro(dados?.erro ?? "Não foi possível salvar a ordem.");
        return;
      }
      setSalvo(true);
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="card" aria-labelledby="titulo-ordem-servicos" style={{ marginTop: 24 }}>
      <div className="card-cabecalho">
        <div>
          <h2 id="titulo-ordem-servicos" className="card-titulo">
            Ordem no link de agendamento
          </h2>
          <p className="card-descricao">Ponha primeiro o que os clientes mais pedem.</p>
        </div>
      </div>
      <ol className="ordem-servicos">
        {lista.map((s, i) => (
          <li key={s.id} className="ordem-servico">
            <span className="ordem-servico-posicao num" aria-hidden="true">
              {i + 1}
            </span>
            <span className="ordem-servico-nome">{s.nome}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-icone"
              onClick={() => mover(i, -1)}
              disabled={i === 0}
              aria-label={`Subir ${s.nome}`}
            >
              <ArrowUp size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-icone"
              onClick={() => mover(i, 1)}
              disabled={i === lista.length - 1}
              aria-label={`Descer ${s.nome}`}
            >
              <ArrowDown size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      {erro && <Alerta tom="perigo">{erro}</Alerta>}
      <div className="form-acoes">
        <Botao variante="primary" onClick={salvar} disabled={!mudou} carregando={salvando} textoCarregando="Salvando…">
          Salvar ordem
        </Botao>
        {salvo && !mudou && (
          <span className="feedback-salvo" role="status">
            <Check size={16} aria-hidden="true" />
            Salvo
          </span>
        )}
      </div>
    </section>
  );
}
