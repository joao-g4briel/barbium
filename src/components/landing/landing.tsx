import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, CheckCheck, ChevronDown, MessageCircle } from "lucide-react";
import { Marca } from "@/components/ui/marca";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { TabelaPrecos } from "@/components/precos/tabela-precos";
import { DIAS_TESTE, PRECO_ADICIONAL_WHATSAPP, WHATSAPP_VENDAS } from "@/lib/precos";
import { formatarMoeda } from "@/lib/formatar";
import { ReguaDoDia } from "./regua-do-dia";
import { CapituloDoDia, type HoraDoDia } from "./capitulo-do-dia";
import { Carteirinha } from "./carteirinha";
import { WhatsappFlutuante } from "./whatsapp-flutuante";
import { fonteDisplay } from "./fonte-display";

// Landing do Barbium: o dia da barbearia como uma régua de horários. A
// abertura mostra um horário marcado pelo celular caindo na agenda do dia; o
// capítulo seguinte percorre o mesmo dia em quatro horas; depois, os planos
// de corte, os preços, as perguntas e o fechamento. Telas de exemplo usam
// dados fictícios, sempre identificados assim.

const CTA_TESTE = `Começar ${DIAS_TESTE} dias grátis`;
const ADICIONAL = formatarMoeda(PRECO_ADICIONAL_WHATSAPP);

function Mensagem({ de, children }: { de: string; children: ReactNode }) {
  return (
    <div className="dia-mensagem">
      <p className="dia-mensagem-de">
        <MessageCircle size={14} aria-hidden="true" />
        {de}
      </p>
      <div className="dia-mensagem-balao">{children}</div>
    </div>
  );
}

const HORAS: HoraDoDia[] = [
  {
    hora: "08:12",
    titulo: "O cliente agenda pelo link",
    legenda: "Página de agendamento",
    texto: (
      <p>
        Ele escolhe o serviço, o profissional e um horário livre, sem criar conta. A agenda só oferece horários dentro do
        expediente e fora do almoço, e o horário pode ficar garantido com um sinal no Pix.
      </p>
    ),
    exemplo: (
      <div className="dia-tela">
        <p className="dia-tela-titulo">Escolha o horário</p>
        <p className="texto-secundario texto-pequeno">Corte + barba · com Rafael · terça, 25/11</p>
        <div className="horarios">
          {["13:00", "13:40", "14:00", "14:40", "15:20", "16:00"].map((h) => (
            <span key={h} className="horario" data-escolhido={h === "14:00" || undefined}>
              {h}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    hora: "12:00",
    titulo: "Confirmação e lembrete no WhatsApp",
    selo: "Adicional",
    legenda: "Lembrete automático",
    texto: (
      <p>
        Quem marca recebe a confirmação na hora e, antes do horário, o lembrete com o link para remarcar ou cancelar. Você
        recebe o aviso de cada agendamento.
      </p>
    ),
    exemplo: (
      <div className="dia-tela">
        <Mensagem de="WhatsApp do cliente">
          <p>Olá, Lucas!</p>
          <p>
            Passando pra lembrar do seu horário na <b>Barbearia Exemplo</b>: <b>hoje às 14:00</b>.
          </p>
          <p className="dia-mensagem-link">Precisa remarcar ou cancelar? barbium…/meu-horario/…</p>
        </Mensagem>
        <p className="dia-mensagem-nota">
          <CheckCheck size={14} aria-hidden="true" />
          Confirmação enviada às 08:12, quando ele marcou.
        </p>
      </div>
    ),
  },
  {
    hora: "14:00",
    titulo: "Chegou, em atendimento, concluído",
    legenda: "Agenda",
    texto: (
      <p>
        Na agenda do dia, cada atendimento passa por chegou e em atendimento até concluir, e a equipe vê em que ponto o dia
        está. Fica registrado quem mudou cada coisa e quando.
      </p>
    ),
    exemplo: (
      <div className="agendamento-card dia-card-agenda">
        <Avatar nome="Lucas Andrade" tamanho={40} />
        <div className="agendamento-corpo">
          <div className="agendamento-topo">
            <p className="agendamento-cliente">Lucas Andrade</p>
            <StatusBadge status="EM_ATENDIMENTO" />
          </div>
          <p className="agendamento-servico">Corte + barba · 14:00 – 14:40</p>
          <ol className="dia-historico">
            <li>
              <span>Marcado como Em atendimento</span>
              <span className="texto-secundario num">14:03 · Rafael</span>
            </li>
            <li>
              <span>Marcado como Chegou</span>
              <span className="texto-secundario num">13:56 · Rafael</span>
            </li>
          </ol>
        </div>
      </div>
    ),
  },
  {
    hora: "14:40",
    titulo: "Concluiu, o caixa já sabe",
    legenda: "Conclusão do atendimento",
    texto: (
      <p>
        Ao concluir, você marca como o cliente pagou. O valor entra no caixa e a comissão é calculada com o percentual do
        profissional ou do serviço.
      </p>
    ),
    exemplo: (
      <dl className="fatos dia-fatos">
        <div>
          <dt>Pagamento</dt>
          <dd className="num">R$ 55,00 · Pix</dd>
        </div>
        <div>
          <dt>Comissão de Rafael</dt>
          <dd className="num">R$ 22,00 · 40%</dd>
        </div>
        <div>
          <dt>Caixa de hoje</dt>
          <dd className="num dia-positivo">+ R$ 55,00</dd>
        </div>
      </dl>
    ),
  },
];

const PLANOS_DE_CORTE: [string, string][] = [
  ["Pix ou cartão", "No cartão, o Mercado Pago cobra todo mês sozinho. No Pix, o cliente renova quando quiser."],
  ["Limite por mês", "Ilimitado ou um número de atendimentos. A agenda confere sozinha e devolve o uso quando ele cancela."],
  ["Comissão fixa", "Você define quanto o profissional ganha em cada atendimento feito pelo plano."],
  ["Aviso de renovação", "Perto do vencimento, o assinante recebe no WhatsApp o link para renovar. Faz parte do adicional de WhatsApp."],
];

const PERGUNTAS: [string, string][] = [
  [
    "Preciso de cartão para testar?",
    `Não. Você cria a conta e usa tudo por ${DIAS_TESTE} dias. No fim do teste, escolhe o plano e o período e paga pela Cakto.`,
  ],
  [
    "O que acontece quando o teste acaba?",
    "O painel fica pausado até a assinatura. Agenda, clientes e caixa continuam guardados; assinou, tudo volta como estava.",
  ],
  [
    "Como funcionam os planos de corte?",
    "Você cria planos mensais no painel, com valor, serviços incluídos e quantos atendimentos por mês. O cliente assina pelo seu link e paga no Pix ou no cartão, pela sua conta do Mercado Pago. Quem paga no balcão, você registra no painel.",
  ],
  [
    "As mensagens no WhatsApp custam à parte?",
    `Sim. Confirmação, lembrete, o link para o cliente remarcar ou cancelar e os avisos para a barbearia são um adicional de ${ADICIONAL}/mês, incluído no pagamento da assinatura. No teste grátis, já vêm ligadas.`,
  ],
  [
    "Dá para escolher quando sai o lembrete?",
    "Sim, de 1 hora a 1 dia antes do horário. Cada horário recebe um lembrete só, e quem marca em cima da hora não recebe repetido. Faz parte do adicional de WhatsApp.",
  ],
  [
    "Até quando o cliente pode remarcar ou cancelar?",
    "Até 2 horas antes, pelo link da mensagem de confirmação. O horário vago volta para a agenda e você recebe o aviso.",
  ],
  [
    "Meus barbeiros veem o caixa?",
    "Não. Cada barbeiro vê a própria agenda e o próprio extrato de comissão. Caixa, equipe e indicadores são só do dono.",
  ],
  [
    "Funciona no celular?",
    "Sim. O Barbium roda no navegador do celular e do computador, e dá para instalar na tela inicial do celular como um app.",
  ],
  [
    "Posso mudar de plano depois?",
    "Pode. Se a equipe crescer, fale com a gente e sua barbearia passa para o plano que comporta mais profissionais.",
  ],
];

export function Landing() {
  const whatsapp = `https://wa.me/${WHATSAPP_VENDAS}?text=${encodeURIComponent("Olá! Quero saber mais sobre o Barbium.")}`;

  return (
    <div className={`landing ${fonteDisplay.variable}`}>
      <header className="landing-topo">
        <div className="landing-largura landing-topo-conteudo">
          <Link href="/" aria-label="Barbium — início" className="landing-marca">
            <Marca tamanho={30} />
          </Link>
          <nav className="landing-nav" aria-label="Seções">
            <a href="#o-dia" className="landing-nav-link landing-nav-opcional">
              Demonstração
            </a>
            <a href="#planos" className="landing-nav-link">
              Planos
            </a>
            <Link href="/login" className="btn btn-secondary btn-sm">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="landing-abertura lp-abertura" aria-labelledby="titulo-landing">
          <div className="landing-largura lp-abertura-texto">
            <h1 id="titulo-landing" className="lp-titulo lp-entra" data-papel="titulo">
              O cliente marca sozinho. Você segue no corte.
            </h1>
            <div className="lp-entra lp-abertura-apoio" data-papel="apoio">
              <p className="lp-subtitulo">
                Ele marca pelo link, sem te chamar no WhatsApp, e pode garantir o horário com um sinal no Pix.
                {/* No computador o subtítulo fica numa linha, para o desfecho da cena caber na primeira tela. */}
                <span className="lp-subtitulo-extra"> Menos horário vago por cliente que falta.</span>
              </p>
              <div className="lp-acoes">
                <Link href="/cadastro" className="btn btn-primary lp-cta">
                  {CTA_TESTE}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-secondary lp-cta">
                  <MessageCircle size={18} aria-hidden="true" />
                  Falar no WhatsApp
                </a>
                <p className="lp-nota">
                  <Check size={16} aria-hidden="true" />
                  Sem cartão no teste
                </p>
              </div>
            </div>
          </div>
          <div className="landing-largura lp-entra" data-papel="palco">
            <ReguaDoDia />
          </div>
        </section>

        <section id="o-dia" className="lp-dia" aria-labelledby="titulo-dia">
          <div className="landing-largura">
            <div className="lp-cabecalho">
              <h2 id="titulo-dia" className="lp-secao-titulo">
                Um dia na barbearia, do primeiro horário ao caixa.
              </h2>
              <p className="lp-secao-texto">Do cliente que marca de manhã ao caixa atualizado quando o atendimento termina.</p>
            </div>
            <CapituloDoDia horas={HORAS} />
          </div>
        </section>

        <section className="lp-planos-corte" aria-labelledby="titulo-planos-corte">
          <div className="landing-largura lp-planos-corte-grade">
            <div className="lp-planos-corte-texto">
              <h2 id="titulo-planos-corte" className="lp-secao-titulo">
                Venda planos de corte pelo seu link.
              </h2>
              <p className="lp-secao-texto">
                Você cria planos mensais, como 4 cortes por mês. O cliente assina pelo link e paga no Pix ou no cartão. Depois,
                agenda pelo plano, sem pagar na hora.
              </p>
              <dl className="lp-fatos-plano">
                {PLANOS_DE_CORTE.map(([titulo, texto]) => (
                  <div key={titulo}>
                    <dt>{titulo}</dt>
                    <dd>{texto}</dd>
                  </div>
                ))}
              </dl>
              <p className="lp-nota-fina">
                Para receber online, conecte o Mercado Pago da barbearia. Quem paga no balcão, você registra no painel.
              </p>
            </div>
            <Carteirinha />
          </div>
        </section>

        <section id="planos" className="lp-precos" aria-labelledby="titulo-planos">
          <div className="landing-largura">
            <div className="lp-cabecalho">
              <h2 id="titulo-planos" className="lp-secao-titulo">
                Quanto custa o Barbium.
              </h2>
              <p className="lp-secao-texto">
                Todos os planos têm agenda, link de agendamento, planos de corte, caixa, comissões e indicadores; muda quantos
                profissionais usam a agenda. Comece com {DIAS_TESTE} dias grátis, sem cartão. Depois, o pagamento é feito pela
                Cakto.
              </p>
            </div>
            <TabelaPrecos acao="cadastro" />
          </div>
        </section>

        <section className="lp-perguntas" aria-labelledby="titulo-perguntas">
          <div className="landing-largura lp-perguntas-grade">
            <h2 id="titulo-perguntas" className="lp-secao-titulo">
              Perguntas frequentes
            </h2>
            <div className="lp-perguntas-lista">
              {PERGUNTAS.map(([pergunta, resposta]) => (
                <details key={pergunta} className="lp-pergunta">
                  <summary>
                    {pergunta}
                    <ChevronDown size={20} className="lp-pergunta-icone" aria-hidden="true" />
                  </summary>
                  <p>{resposta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-fim lp-fim" aria-labelledby="titulo-fim">
          <div className="landing-largura lp-fim-conteudo">
            <p className="lp-fim-hora num" aria-hidden="true">
              09:00
            </p>
            <h2 id="titulo-fim" className="lp-fim-titulo">
              Comece pela agenda de amanhã.
            </h2>
            <p className="lp-secao-texto">
              Cadastre a barbearia, os serviços e o expediente em poucos minutos e mande o link para os clientes.
            </p>
            <div className="lp-acoes">
              <Link href="/cadastro" className="btn btn-primary lp-cta">
                {CTA_TESTE}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-secondary lp-cta">
                <MessageCircle size={18} aria-hidden="true" />
                Tirar dúvidas no WhatsApp
              </a>
            </div>
            <ul className="lp-garantias">
              {["Sem cartão no teste", "Todas as funções liberadas no teste", "Seus dados ficam guardados"].map((t) => (
                <li key={t}>
                  <Check size={16} aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="landing-rodape">
        <div className="landing-largura landing-rodape-conteudo">
          <Marca tamanho={24} />
          <nav aria-label="Rodapé" className="landing-rodape-links">
            <a href="#planos">Planos</a>
            <Link href="/termos">Termos de uso</Link>
            <Link href="/privacidade">Privacidade</Link>
            <Link href="/login">Entrar</Link>
            <Link href="/cadastro">Criar conta</Link>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer">
              Contato
            </a>
          </nav>
        </div>
      </footer>
      <WhatsappFlutuante href={whatsapp} />
    </div>
  );
}
