import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/legal/pagina-legal";
import { WHATSAPP_VENDAS } from "@/lib/precos";
import { formatarTelefone } from "@/lib/formatar";
import { PRESTADOR } from "@/lib/prestador";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como o Barbium trata os dados das barbearias, da equipe e dos clientes, de acordo com a LGPD.",
};

const CONTATO = `https://wa.me/${WHATSAPP_VENDAS}`;
const TELEFONE = formatarTelefone(WHATSAPP_VENDAS.slice(2));

export default function PaginaPrivacidade() {
  return (
    <PaginaLegal
      titulo="Política de privacidade"
      resumo={
        <p>
          Esta política explica quais dados o Barbium trata, para quê, com quem compartilha e como você exerce seus direitos pela Lei Geral de
          Proteção de Dados (Lei 13.709/2018, LGPD). Ela vale junto com os{" "}
          <Link href="/termos" className="link">
            Termos de uso
          </Link>
          .
        </p>
      }
      secoes={[
        {
          id: "papeis",
          titulo: "Quem é responsável pelos dados",
          conteudo: (
            <>
              <p>
                <b>Dados da conta</b> (dono e profissionais da barbearia): o Barbium é o controlador, porque usa esses dados para dar acesso
                ao sistema e para cobrar a assinatura.
              </p>
              <p>
                <b>Dados dos clientes da barbearia</b> (quem marca horário): a barbearia é a controladora e decide o que cadastrar. O Barbium
                é o operador: trata esses dados só para fazer o sistema funcionar para ela, seguindo as instruções da barbearia.
              </p>
            </>
          ),
        },
        {
          id: "dados",
          titulo: "Quais dados tratamos",
          conteudo: (
            <ul>
              <li>
                <b>Conta:</b> nome, e-mail, WhatsApp e senha (guardada só em forma cifrada) do dono e dos profissionais, e o papel de cada um.
              </li>
              <li>
                <b>Barbearia:</b> nome, telefones, serviços, preços, expediente, plano e prazo da assinatura.
              </li>
              <li>
                <b>Clientes da barbearia:</b> nome, telefone, os agendamentos (serviço, profissional, data, horário, status e histórico de
                mudanças), a assinatura do cliente quando a barbearia registra uma, e a preferência de receber ou não mensagens.
              </li>
              <li>
                <b>Financeiro:</b> lançamentos do caixa, formas de pagamento, comissões e, quando a barbearia cobra sinal, o pagamento do Pix
                pelo Mercado Pago (não guardamos dados de cartão).
              </li>
              <li>
                <b>Uso técnico:</b> registros de acesso e de erro necessários para segurança e para corrigir falhas.
              </li>
            </ul>
          ),
        },
        {
          id: "finalidades",
          titulo: "Para que usamos e com qual base legal",
          conteudo: (
            <ul>
              <li>
                Criar e manter a conta, dar acesso ao painel e cobrar a assinatura: execução do contrato.
              </li>
              <li>
                Agenda, link de agendamento, confirmações e lembretes, caixa e comissões da barbearia: execução do contrato com a barbearia,
                em nome dela.
              </li>
              <li>
                Mensagens no WhatsApp para os clientes: contratadas pela barbearia; todo cliente pode pedir para parar e o sistema respeita.
              </li>
              <li>
                Segurança, prevenção de fraude e correção de erros: legítimo interesse.
              </li>
              <li>Guardar registros exigidos por lei: cumprimento de obrigação legal.</li>
            </ul>
          ),
        },
        {
          id: "compartilhamento",
          titulo: "Com quem compartilhamos",
          conteudo: (
            <>
              <p>Não vendemos dados. Usamos fornecedores que tratam dados só para prestar o serviço:</p>
              <ul>
                <li>Vercel (hospedagem do site e do sistema, e contagem de visitas) e Neon (banco de dados).</li>
                <li>Cakto (pagamento da assinatura) e Mercado Pago (Pix do sinal, quando a barbearia usa).</li>
                <li>Resend (envio de e-mails, como o de redefinir senha).</li>
                <li>WhatsApp e a infraestrutura de envio das mensagens automáticas, quando o adicional está ligado.</li>
              </ul>
              <p>Alguns desses fornecedores podem guardar dados fora do Brasil, com as garantias que a LGPD exige.</p>
            </>
          ),
        },
        {
          id: "cookies",
          titulo: "Cookies",
          conteudo: (
            <p>
              Usamos apenas o cookie de sessão necessário para manter você conectado ao painel. Não usamos cookies de publicidade nem de
              rastreamento. Para saber quantas pessoas visitam o site, usamos a contagem de visitas da Vercel, que não usa cookies e não
              identifica quem visita.
            </p>
          ),
        },
        {
          id: "seguranca",
          titulo: "Segurança e guarda",
          conteudo: (
            <>
              <p>
                O acesso é por e-mail e senha, as senhas são guardadas cifradas e cada barbearia só enxerga os próprios dados. As credenciais de
                pagamento da barbearia ficam cifradas no banco.
              </p>
              <p>
                Guardamos os dados enquanto a conta existir. Quando a barbearia exclui um cliente que já tem atendimentos pagos, o nome e o
                telefone dele são apagados e só o registro financeiro continua, para o caixa e as comissões baterem. Se a barbearia pedir o
                encerramento da conta, apagamos ou anonimizamos os dados, exceto o que a lei obriga a manter pelo prazo legal.
              </p>
            </>
          ),
        },
        {
          id: "direitos",
          titulo: "Seus direitos",
          conteudo: (
            <>
              <p>
                Pela LGPD, você pode pedir confirmação de que tratamos seus dados, acesso, correção, anonimização ou exclusão, portabilidade,
                informação sobre compartilhamento e revisão do consentimento, quando ele for a base.
              </p>
              <p>
                Se você é cliente de uma barbearia, faça o pedido diretamente a ela, que é a responsável pelos seus dados; se preferir, fale com
                a gente e encaminhamos. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
              </p>
            </>
          ),
        },
        {
          id: "contato",
          titulo: "Quem presta o serviço e contato",
          conteudo: (
            <>
              <p>
                O Barbium é prestado por pessoa física, {PRESTADOR.documento}.
              </p>
              <p>
                Pedidos e dúvidas sobre privacidade:{" "}
                <a href={`mailto:${PRESTADOR.email}`} className="link">
                  {PRESTADOR.email}
                </a>{" "}
                ou{" "}
                <a href={CONTATO} target="_blank" rel="noopener noreferrer" className="link">
                  WhatsApp {TELEFONE}
                </a>
                . Respondemos em até 15 dias.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
