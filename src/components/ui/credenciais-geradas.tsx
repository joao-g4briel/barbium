"use client";

import type { ReactNode } from "react";
import { Alerta } from "./alerta";
import { CopiarTexto } from "./copiar-texto";

// Mostra um acesso recém-gerado. A senha não fica guardada em lugar nenhum
// que dê pra consultar depois — por isso o aviso pra anotar agora.
export function CredenciaisGeradas({
  email,
  senha,
  para,
  acoes,
}: {
  email: string;
  senha: string;
  para: string;
  acoes?: ReactNode;
}) {
  return (
    <div className="pilha-sm">
      <Alerta tom="atencao" titulo="Anote a senha agora">
        Ela aparece só esta vez. Repasse estes dados de acesso para {para}, que pode trocar a senha depois em
        Configurações.
      </Alerta>
      <dl className="fatos">
        <div>
          <dt>E-mail</dt>
          <dd>{email}</dd>
        </div>
        <div>
          <dt>Senha temporária</dt>
          <dd className="num" style={{ letterSpacing: "0.04em" }}>
            {senha}
          </dd>
        </div>
      </dl>
      <div className="form-acoes">
        <CopiarTexto
          texto={`E-mail: ${email}\nSenha temporária: ${senha}`}
          rotulo="Copiar acesso"
          mensagemCopiado="Dados de acesso copiados."
        />
        {acoes}
      </div>
    </div>
  );
}
