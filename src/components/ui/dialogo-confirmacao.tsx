"use client";

import type { ReactNode } from "react";
import { Dialogo } from "./dialogo";
import { Botao } from "./botao";
import { Alerta } from "./alerta";

export function DialogoConfirmacao({
  aberto,
  titulo,
  descricao,
  rotuloConfirmar,
  textoCarregando = "Aguarde…",
  perigo,
  processando,
  erro,
  aoConfirmar,
  aoCancelar,
}: {
  aberto: boolean;
  titulo: string;
  descricao: ReactNode;
  rotuloConfirmar: string;
  textoCarregando?: string;
  perigo?: boolean;
  processando?: boolean;
  erro?: string | null;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}) {
  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoCancelar}
      titulo={titulo}
      descricao={descricao}
      bloquearFechamento={processando}
      rodape={
        <>
          <Botao variante="secondary" onClick={aoCancelar} disabled={processando}>
            Voltar
          </Botao>
          <Botao
            variante={perigo ? "danger" : "primary"}
            onClick={aoConfirmar}
            carregando={processando}
            textoCarregando={textoCarregando}
          >
            {rotuloConfirmar}
          </Botao>
        </>
      }
    >
      {erro && <Alerta tom="perigo">{erro}</Alerta>}
    </Dialogo>
  );
}
