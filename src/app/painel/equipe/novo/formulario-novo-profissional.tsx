"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";
import { CredenciaisGeradas } from "@/components/ui/credenciais-geradas";
import {
  CamposProfissional,
  comissaoParaApi,
  validarProfissional,
  type ErrosProfissional,
  type ValoresProfissional,
} from "../campos-profissional";

export function FormularioNovoProfissional() {
  const router = useRouter();
  const [valores, setValores] = useState<ValoresProfissional>({ nome: "", email: "", comissao: "" });
  const [erros, setErros] = useState<ErrosProfissional>({});
  const [salvando, setSalvando] = useState(false);
  const [criado, setCriado] = useState<{ id: string; nome: string; email: string; senha: string } | null>(null);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    const validacao = validarProfissional(valores);
    setErros(validacao);
    if (Object.keys(validacao).length > 0) return;

    setSalvando(true);
    try {
      const resposta = await fetch("/api/painel/equipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: valores.nome,
          email: valores.email,
          comissaoPercentual: comissaoParaApi(valores.comissao),
        }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErros(
          resposta.status === 409 && dados?.codigo !== "LIMITE_PLANO"
            ? { email: dados?.erro }
            : { geral: dados?.erro ?? "Não foi possível cadastrar." },
        );
        return;
      }
      setCriado({ ...dados.profissional, senha: dados.senhaTemporaria });
      router.refresh();
    } catch {
      setErros({ geral: "Falha de conexão. Seus dados continuam aqui — tente novamente." });
    } finally {
      setSalvando(false);
    }
  }

  if (criado) {
    return (
      <section className="card" style={{ maxWidth: 560 }} aria-labelledby="titulo-criado">
        <div className="pilha-sm">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span className="confirmacao-icone" style={{ width: 44, height: 44 }} aria-hidden="true">
              <CheckCircle2 size={22} />
            </span>
            <h2 id="titulo-criado" className="card-titulo">
              {criado.nome} entrou para a equipe
            </h2>
          </div>
          <p className="texto-secundario texto-pequeno">
            Expediente inicial: segunda a sábado, das 09:00 às 19:00. A pessoa ajusta em “Meus horários” depois de entrar.
          </p>
          <CredenciaisGeradas
            email={criado.email}
            senha={criado.senha}
            para={criado.nome}
            acoes={
              <Link href="/painel/equipe" className="btn btn-primary btn-sm">
                Voltar para a equipe
              </Link>
            }
          />
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={aoEnviar} className="card form" noValidate style={{ maxWidth: 640 }}>
      {erros.geral && <Alerta tom="perigo">{erros.geral}</Alerta>}
      <CamposProfissional valores={valores} erros={erros} aoMudar={setValores} />
      <p className="texto-secundario texto-pequeno">
        Uma senha temporária é gerada ao salvar. O profissional entra como barbeiro: vê a própria agenda, os clientes e
        os serviços, sem acesso ao financeiro.
      </p>
      <div className="form-acoes">
        <Botao type="submit" variante="primary" carregando={salvando} textoCarregando="Cadastrando…">
          Cadastrar profissional
        </Botao>
        <Link href="/painel/equipe" className="btn btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
