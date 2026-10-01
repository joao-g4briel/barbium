"use client";

import { Campo, ariaCampo } from "@/components/ui/campo";

export interface ValoresProfissional {
  nome: string;
  email: string;
  comissao: string;
}

export interface ErrosProfissional {
  nome?: string;
  email?: string;
  comissao?: string;
  geral?: string;
}

export function validarProfissional(v: ValoresProfissional): ErrosProfissional {
  const erros: ErrosProfissional = {};
  if (v.nome.trim().length < 2) erros.nome = "Informe o nome.";
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) erros.email = "Informe um e-mail válido.";
  if (v.comissao.trim()) {
    const n = Number(v.comissao.replace(",", "."));
    if (Number.isNaN(n) || n < 0 || n > 100) erros.comissao = "A comissão vai de 0% a 100%.";
  }
  return erros;
}

export function comissaoParaApi(comissao: string): number | null {
  return comissao.trim() ? Number(comissao.replace(",", ".")) : null;
}

export function CamposProfissional({
  valores,
  erros,
  aoMudar,
}: {
  valores: ValoresProfissional;
  erros: ErrosProfissional;
  aoMudar: (v: ValoresProfissional) => void;
}) {
  return (
    <>
      <div className="form-grade form-grade-2">
        <Campo id="nome" rotulo="Nome" erro={erros.nome}>
          <input
            {...ariaCampo("nome", { erro: erros.nome })}
            className="input"
            value={valores.nome}
            onChange={(e) => aoMudar({ ...valores, nome: e.target.value })}
            autoComplete="off"
          />
        </Campo>
        <Campo id="email" rotulo="E-mail de acesso" erro={erros.email} dica="É com ele que a pessoa entra no painel.">
          <input
            {...ariaCampo("email", { dica: true, erro: erros.email })}
            type="email"
            inputMode="email"
            className="input"
            value={valores.email}
            onChange={(e) => aoMudar({ ...valores, email: e.target.value })}
            autoComplete="off"
          />
        </Campo>
      </div>
      <Campo
        id="comissao"
        rotulo="Comissão"
        opcional
        erro={erros.comissao}
        dica="Percentual do valor dos atendimentos. Fica registrado no cadastro; o cálculo automático ainda não existe."
      >
        <div className="input-sufixo">
          <input
            {...ariaCampo("comissao", { dica: true, erro: erros.comissao })}
            className="input num"
            inputMode="decimal"
            value={valores.comissao}
            onChange={(e) => aoMudar({ ...valores, comissao: e.target.value })}
            placeholder="0"
          />
          <span aria-hidden="true">%</span>
        </div>
      </Campo>
    </>
  );
}
