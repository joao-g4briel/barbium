"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";
import { formatarMoeda } from "@/lib/formatar";

export interface ValoresPlano {
  nome: string;
  valor: string;
  ilimitado: boolean;
  usosPorMes: string;
  comissaoValor: string;
  servicoIds: string[];
  ativo: boolean;
}

type Erros = Partial<Record<keyof ValoresPlano | "geral", string>>;

function numero(texto: string): number {
  return Number(texto.replace(/\./g, "").replace(",", "."));
}

// Mesmos limites da rota /api/painel/planos.
function validar(v: ValoresPlano): Erros {
  const erros: Erros = {};
  if (v.nome.trim().length < 2) erros.nome = "Informe o nome do plano.";
  const valor = numero(v.valor);
  if (v.valor.trim() === "" || Number.isNaN(valor) || valor < 1) erros.valor = "Informe o valor do mês.";
  if (!v.ilimitado) {
    const usos = numero(v.usosPorMes);
    if (!Number.isInteger(usos) || usos < 1 || usos > 100) erros.usosPorMes = "Use um número entre 1 e 100.";
  }
  const comissao = v.comissaoValor.trim() === "" ? 0 : numero(v.comissaoValor);
  if (Number.isNaN(comissao) || comissao < 0) erros.comissaoValor = "Informe um valor, ou deixe em branco.";
  if (v.servicoIds.length === 0) erros.servicoIds = "Escolha pelo menos um serviço do plano.";
  return erros;
}

export function FormularioPlano({
  planoId,
  servicos,
  valoresIniciais,
}: {
  planoId?: string;
  servicos: { id: string; nome: string; preco: number; ativo: boolean }[];
  valoresIniciais?: ValoresPlano;
}) {
  const router = useRouter();
  const editando = Boolean(planoId);
  const [valores, setValores] = useState<ValoresPlano>(
    valoresIniciais ?? {
      nome: "",
      valor: "",
      ilimitado: false,
      usosPorMes: "4",
      comissaoValor: "",
      servicoIds: [],
      ativo: true,
    },
  );
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);

  function atualizar<K extends keyof ValoresPlano>(campo: K, valor: ValoresPlano[K]) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  }

  function alternarServico(id: string, marcado: boolean) {
    atualizar(
      "servicoIds",
      marcado ? [...valores.servicoIds, id] : valores.servicoIds.filter((s) => s !== id),
    );
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    const validacao = validar(valores);
    setErros(validacao);
    if (Object.keys(validacao).length > 0) return;

    setSalvando(true);
    const corpo = {
      nome: valores.nome,
      valor: numero(valores.valor),
      usosPorMes: valores.ilimitado ? null : numero(valores.usosPorMes),
      comissaoValor: valores.comissaoValor.trim() === "" ? 0 : numero(valores.comissaoValor),
      servicoIds: valores.servicoIds,
      ...(editando ? { ativo: valores.ativo } : {}),
    };
    try {
      const resposta = await fetch(editando ? `/api/painel/planos/${planoId}` : "/api/painel/planos", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        setErros({ geral: dados?.erro ?? "Não foi possível salvar o plano." });
        setSalvando(false);
        return;
      }
      router.push("/painel/planos");
      router.refresh();
    } catch {
      setErros({ geral: "Falha de conexão. Seus dados continuam no formulário — tente novamente." });
      setSalvando(false);
    }
  }

  // Serviço desativado só aparece se já estava no plano (pra poder tirar).
  const opcoes = servicos.filter((s) => s.ativo || valores.servicoIds.includes(s.id));

  return (
    <form onSubmit={aoEnviar} className="card form" noValidate style={{ maxWidth: 640 }}>
      {erros.geral && <Alerta tom="perigo">{erros.geral}</Alerta>}

      <div className="form-secao">
        <h2 className="form-secao-titulo">Plano</h2>
        <Campo id="plano-nome" rotulo="Nome do plano" erro={erros.nome}>
          <input
            {...ariaCampo("plano-nome", { erro: erros.nome })}
            className="input"
            value={valores.nome}
            onChange={(e) => atualizar("nome", e.target.value)}
            placeholder="Ex.: Plano Corte"
            maxLength={60}
          />
        </Campo>
        <Campo id="plano-valor" rotulo="Valor por mês" dica="Cobrado a cada 30 dias de plano." erro={erros.valor}>
          <div className="input-prefixo" style={{ maxWidth: 220 }}>
            <span aria-hidden="true">R$</span>
            <input
              {...ariaCampo("plano-valor", { dica: true, erro: erros.valor })}
              className="input num"
              inputMode="decimal"
              value={valores.valor}
              onChange={(e) => atualizar("valor", e.target.value)}
              placeholder="0,00"
            />
          </div>
        </Campo>
      </div>

      <div className="form-secao">
        <h2 className="form-secao-titulo">O que o plano inclui</h2>
        <fieldset className="campo plano-servicos" aria-describedby={erros.servicoIds ? "plano-servicos-erro" : undefined}>
          <legend className="campo-rotulo">Serviços</legend>
          {opcoes.length === 0 ? (
            <p className="texto-secundario texto-pequeno">
              Cadastre os serviços primeiro, em <Link href="/painel/servicos" className="link">Serviços</Link>.
            </p>
          ) : (
            <div className="plano-servicos-lista">
              {opcoes.map((s) => (
                <label key={s.id} className="checkbox">
                  <input
                    type="checkbox"
                    checked={valores.servicoIds.includes(s.id)}
                    onChange={(e) => alternarServico(s.id, e.target.checked)}
                  />
                  <span className="checkbox-texto">
                    <span className="checkbox-rotulo">{s.nome}</span>
                    <span className="campo-dica num">
                      {formatarMoeda(s.preco)}
                      {!s.ativo && " · serviço desativado"}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
          {erros.servicoIds && (
            <p id="plano-servicos-erro" className="campo-erro">
              {erros.servicoIds}
            </p>
          )}
        </fieldset>

        <fieldset className="campo">
          <legend className="campo-rotulo">Quantos atendimentos por mês</legend>
          <div className="plano-usos">
            <label className="radio">
              <input type="radio" name="plano-usos" checked={!valores.ilimitado} onChange={() => atualizar("ilimitado", false)} />
              <span>Até</span>
              <input
                aria-label="Atendimentos por mês"
                aria-invalid={erros.usosPorMes ? true : undefined}
                className="input num plano-usos-numero"
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={valores.usosPorMes}
                disabled={valores.ilimitado}
                onChange={(e) => atualizar("usosPorMes", e.target.value)}
              />
              <span>por mês</span>
            </label>
            <label className="radio">
              <input type="radio" name="plano-usos" checked={valores.ilimitado} onChange={() => atualizar("ilimitado", true)} />
              <span>Ilimitado</span>
            </label>
          </div>
          {erros.usosPorMes && <p className="campo-erro">{erros.usosPorMes}</p>}
          <p className="campo-dica">O assinante marca pelo link de agendamento. Horário cancelado devolve o atendimento.</p>
        </fieldset>
      </div>

      <div className="form-secao">
        <h2 className="form-secao-titulo">Comissão</h2>
        <Campo
          id="plano-comissao"
          rotulo="Comissão do profissional por atendimento"
          opcional
          dica="Valor fixo que fica com quem atende, em cada atendimento feito pelo plano."
          erro={erros.comissaoValor}
        >
          <div className="input-prefixo" style={{ maxWidth: 220 }}>
            <span aria-hidden="true">R$</span>
            <input
              {...ariaCampo("plano-comissao", { dica: true, erro: erros.comissaoValor })}
              className="input num"
              inputMode="decimal"
              value={valores.comissaoValor}
              onChange={(e) => atualizar("comissaoValor", e.target.value)}
              placeholder="0,00"
            />
          </div>
        </Campo>
      </div>

      {editando && (
        <div className="form-secao">
          <h2 className="form-secao-titulo">Disponibilidade</h2>
          <label className="checkbox">
            <input type="checkbox" checked={valores.ativo} onChange={(e) => atualizar("ativo", e.target.checked)} />
            <span className="checkbox-texto">
              <span className="checkbox-rotulo">Plano à venda</span>
              <span className="campo-dica">
                Desativado, ele some do link de agendamento e não aceita assinatura nova. Quem já assina continua
                usando até o fim do mês pago.
              </span>
            </span>
          </label>
        </div>
      )}

      <div className="form-acoes">
        <Botao type="submit" variante="primary" carregando={salvando} textoCarregando="Salvando…">
          {editando ? "Salvar alterações" : "Criar plano"}
        </Botao>
        <Link href="/painel/planos" className="btn btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
