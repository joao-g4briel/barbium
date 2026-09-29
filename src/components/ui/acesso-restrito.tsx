import Link from "next/link";
import { Lock } from "lucide-react";
import { EstadoVazio } from "./estado-vazio";

export function AcessoRestrito({ descricao, voltarPara = "/painel" }: { descricao: string; voltarPara?: string }) {
  return (
    <div className="card">
      <EstadoVazio
        icone={<Lock size={22} />}
        titulo="Acesso restrito"
        descricao={descricao}
        acao={
          <Link href={voltarPara} className="btn btn-secondary">
            Voltar para a visão geral
          </Link>
        }
      />
    </div>
  );
}
