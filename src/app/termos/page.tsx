import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/legal/pagina-legal";
import { DIAS_TESTE, PRECO_ADICIONAL_WHATSAPP, WHATSAPP_VENDAS } from "@/lib/precos";
import { formatarMoeda, formatarTelefone } from "@/lib/formatar";
import { PRESTADOR } from "@/lib/prestador";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Regras de uso do Barbium: conta, teste grátis, assinatura, pagamento, adicional de WhatsApp e responsabilidades.",
};

const CONTATO = `https://wa.me/${WHATSAPP_VENDAS}`;
const TELEFONE = formatarTelefone(WHATSAPP_VENDAS.slice(2));

export default function PaginaTermos() {
  return (
    <PaginaLegal
      titulo="Termos de uso"
      resumo={
        <p>
          Estes termos valem para quem cria uma conta no Barbium e para quem usa o painel. Ao criar a conta, você concorda com eles e com a{" "}
          <Link href="/privacidade" className="link">
            Política de privacidade
          </Link>
          . Os clientes que só marcam horário pelo link da barbearia não precisam de conta.
        </p>
      }
      secoes={[
        {
          id: "servico",
          titulo: "O que é o Barbium",
          conteudo: (
            <>
              <p>
                O Barbium é um sistema online para barbearias: agenda, link de agendamento para os clientes, cadastro de clientes, serviços e
                equipe, caixa, comissões e indicadores. Ele funciona no navegador do celular e do computador.
              </p>
              <p>
                O sistema pode mudar com o tempo: funções podem ser melhoradas, criadas ou retiradas. Mudanças que afetem o que você contratou
                serão avisadas antes.
              </p>
            </>
          ),
        },
        {
          id: "conta",
          titulo: "Conta e acesso",
          conteudo: (
            <>
              <p>
                Quem cria a conta é o dono da barbearia e responde por ela. O dono pode cadastrar profissionais, que entram com o próprio e-mail
                e senha e só veem o que o papel deles permite.
              </p>
              <p>
                Guarde sua senha e não a compartilhe. Se perceber um acesso que não reconhece, troque a senha (isso encerra as sessões abertas
                em outros aparelhos) e fale com a gente.
              </p>
              <p>
                Os dados que você informa no cadastro precisam ser verdadeiros. Podemos suspender contas usadas para fraude, envio de mensagens
                indesejadas ou qualquer uso contra a lei ou contra estes termos.
              </p>
            </>
          ),
        },
        {
          id: "teste",
          titulo: "Teste grátis",
          conteudo: (
            <p>
              Toda barbearia nova tem {DIAS_TESTE} dias grátis com o sistema completo, sem cartão. No fim do teste, o painel fica pausado até a
              assinatura; agenda, clientes e caixa continuam guardados. Não há cobrança automática no fim do teste.
            </p>
          ),
        },
        {
          id: "assinatura",
          titulo: "Assinatura e pagamento",
          conteudo: (
            <>
              <p>
                Os planos (Solo, Barbearia e Rede) se diferenciam pela quantidade de profissionais que usam a agenda. O pagamento é mensal,
                semestral ou anual, feito pela plataforma de pagamentos Cakto, com os preços mostrados na{" "}
                <Link href="/#planos" className="link">
                  página de planos
                </Link>{" "}
                no momento da compra. O acesso é liberado pelo período pago.
              </p>
              <p>
                Pagamentos com renovação são renovados ao fim de cada período, até você cancelar. Você pode cancelar a qualquer momento pelo
                canal da Cakto ou falando com a gente; o acesso continua até o fim do período já pago.
              </p>
              <p>
                Pelo Código de Defesa do Consumidor, você pode desistir de uma contratação feita pela internet em até 7 dias depois do
                pagamento e receber o valor de volta.
              </p>
            </>
          ),
        },
        {
          id: "whatsapp",
          titulo: "Adicional de WhatsApp",
          conteudo: (
            <>
              <p>
                As mensagens automáticas no WhatsApp (confirmação, lembrete, link para o cliente remarcar ou cancelar e avisos para a
                barbearia) são um adicional de {formatarMoeda(PRECO_ADICIONAL_WHATSAPP)}/mês, contratado no pagamento da assinatura. No teste
                grátis, elas já vêm ligadas.
              </p>
              <p>
                O envio depende do WhatsApp e de serviços de terceiros. Fazemos o possível para que toda mensagem saia, mas não garantimos a
                entrega de cada uma. Todo cliente pode pedir para não receber mensagens, e o sistema respeita esse pedido.
              </p>
            </>
          ),
        },
        {
          id: "dados",
          titulo: "Dados da barbearia e dos clientes",
          conteudo: (
            <>
              <p>
                Os dados que a barbearia cadastra (clientes, agendamentos, caixa, comissões) são da barbearia. Ela decide o que cadastrar e
                responde por ter autorização para usar os dados dos clientes dela. O Barbium trata esses dados só para fazer o sistema
                funcionar, como explica a{" "}
                <Link href="/privacidade" className="link">
                  Política de privacidade
                </Link>
                .
              </p>
              <p>Cada barbearia só enxerga os próprios dados; profissionais só veem o que o papel deles permite.</p>
            </>
          ),
        },
        {
          id: "responsabilidades",
          titulo: "Responsabilidades e disponibilidade",
          conteudo: (
            <>
              <p>
                Trabalhamos para manter o sistema no ar e os dados seguros, mas o serviço pode ficar fora do ar por manutenção ou por falhas
                de fornecedores. Não respondemos por prejuízos causados por uso indevido da conta, por informações erradas cadastradas pela
                barbearia ou por falhas de serviços de terceiros (como WhatsApp, Mercado Pago e Cakto).
              </p>
              <p>
                Os preços dos serviços da barbearia, os sinais cobrados no Pix e a relação com os clientes são responsabilidade da barbearia.
              </p>
            </>
          ),
        },
        {
          id: "mudancas",
          titulo: "Mudanças nestes termos",
          conteudo: (
            <p>
              Podemos atualizar estes termos. A data no topo mostra a última versão; mudanças importantes serão avisadas com antecedência. Estes
              termos seguem a lei brasileira.
            </p>
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
                Dúvidas sobre estes termos, cancelamento ou reembolso:{" "}
                <a href={`mailto:${PRESTADOR.email}`} className="link">
                  {PRESTADOR.email}
                </a>{" "}
                ou{" "}
                <a href={CONTATO} target="_blank" rel="noopener noreferrer" className="link">
                  WhatsApp {TELEFONE}
                </a>
                .
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
