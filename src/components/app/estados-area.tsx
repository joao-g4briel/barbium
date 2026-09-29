"use client";

import Link from "next/link";
import { AlertTriangle, FileQuestion } from "lucide-react";
import { EstadoVazio } from "@/components/ui/estado-vazio";

// Estados de erro e "não encontrado" dentro da área logada: mantêm o menu
// e oferecem um caminho de volta, em vez de uma página em branco.

export function ErroArea({ reset, inicio }: { reset: () => void; inicio: string }) {
  return (
    <div className="card" role="alert">
      <EstadoVazio
        icone={<AlertTriangle size={22} />}
        titulo="Não foi possível carregar esta tela"
        descricao="Pode ter sido uma falha de conexão. Tente de novo — se continuar, volte ao início."
        acao={
          <div className="form-acoes" style={{ justifyContent: "center" }}>
            <button type="button" className="btn btn-primary" onClick={reset}>
              Tentar de novo
            </button>
            <Link href={inicio} className="btn btn-secondary">
              Voltar ao início
            </Link>
          </div>
        }
      />
    </div>
  );
}

export function NaoEncontradoArea({ inicio, descricao }: { inicio: string; descricao: string }) {
  return (
    <div className="card">
      <EstadoVazio
        icone={<FileQuestion size={22} />}
        titulo="Não encontrado"
        descricao={descricao}
        acao={
          <Link href={inicio} className="btn btn-secondary">
            Voltar ao início
          </Link>
        }
      />
    </div>
  );
}
