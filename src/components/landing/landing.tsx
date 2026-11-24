import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, CheckCheck, ChevronDown, Circle, MessageCircle, Scissors } from "lucide-react";
import { Marca } from "@/components/ui/marca";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { TabelaPrecos } from "@/components/precos/tabela-precos";
import { DIAS_TESTE, PRECO_ADICIONAL_WHATSAPP, WHATSAPP_VENDAS } from "@/lib/precos";
import { formatarMoeda } from "@/lib/formatar";
import { TrilhoDoDia } from "./trilho-do-dia";
import { DemoAgenda } from "./demo-agenda";
import { CarrosselPrevias } from "./carrossel-previas";
import { RevelarSecoes } from "./revelar-secoes";

// Landing do Barbium. A abertura demonstra o mecanismo (o cliente marca pelo
// link e a agenda recebe o horário); depois vêm as prévias ilustrativas, três
// benefícios, o dia em quatro horas, os planos e as perguntas. Telas de exemplo
// usam os componentes reais com dados fictícios, sempre identificados assim.

function Exemplo({ children, rotulo }: { children: ReactNode; rotulo: string }) {
  return (
    <figure className="dia-exemplo">
      {children}
      <figcaption className="dia-exemplo-legenda">{rotulo} · exemplo</figcaption>
    </figure>
  );
}

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

function Hora({
  hora,
  titulo,
  children,
  exemplo,
  adicional = false,
}: {
  hora: string;
  titulo: string;
  children: ReactNode;
  exemplo: ReactNode;
  adicional?: boolean;
}) {
  return (
    <li className="dia-hora" data-hora>
      <time className="dia-hora-relogio num">{hora}</time>
      <span className="dia-hora-no" aria-hidden="true" />
      <div className="dia-hora-corpo">
        <div className="dia-hora-texto">
          <h3 className="dia-hora-titulo">
            {titulo}
            {adicional && (
              <span className="badge dia-hora-adicional" data-tom="info">
                Adicional
              </span>
            )}
          </h3>
          {children}
        </div>
        {exemplo}
      </div>
    </li>
  );
}

const CTA_TESTE = `Começar ${DIAS_TESTE} dias grátis`;
const ADICIONAL = formatarMoeda(PRECO_ADICIONAL_WHATSAPP);

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
    <div className="landing">
      <RevelarSecoes />
      <header className="landing-topo">
        <div className="landing-largura landing-topo-conteudo">
          <Link href="/" aria-label="Barbium — início" className="landing-marca">
            <Marca tamanho={30} />
          </Link>
          <nav className="landing-nav" aria-label="Seções">
            <a href="#demonstracao" className="landing-nav-link landing-nav-opcional">
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
        <section className="landing-abertura landing-largura" aria-labelledby="titulo-landing">
          <div className="landing-abertura-texto">
            <h1 id="titulo-landing" className="landing-titulo">
              Agenda, caixa e comissões em um só lugar.
            </h1>
            <p className="landing-subtitulo">
              Seu cliente agenda pelo link. Você acompanha os atendimentos e fecha o caixa com as comissões calculadas.
            </p>
            <div className="landing-acoes">
              <Link href="/cadastro" className="btn btn-primary landing-cta">
                {CTA_TESTE}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a href="#planos" className="btn btn-secondary landing-cta-secundario">
                Ver planos
              </a>
            </div>
            <p className="landing-nota">
              <Check size={16} aria-hidden="true" />
              Sem cartão no teste
            </p>
          </div>
          <DemoAgenda />
        </section>

        <section id="demonstracao" className="landing-secao landing-previas" aria-labelledby="titulo-previas">
          <div className="landing-largura">
            <div className="landing-secao-cabecalho" data-revelar="">
              <h2 id="titulo-previas" className="landing-secao-titulo">
                Por dentro do Barbium
              </h2>
              <p className="landing-secao-texto">
                Prévias ilustrativas da agenda, do agendamento pelo link, do WhatsApp, dos atendimentos e do caixa, no computador e no
                celular.
              </p>
            </div>
            <div data-revelar="">
              <CarrosselPrevias />
            </div>
          </div>
        </section>

        <section className="landing-secao landing-largura" aria-labelledby="titulo-beneficios">
          <div className="landing-secao-cabecalho" data-revelar="">
            <h2 id="titulo-beneficios" className="landing-secao-titulo">
              O que muda no seu dia
            </h2>
          </div>
          <ul className="beneficios" data-revelar="">
            <li className="beneficio">
              <ol className="beneficio-visual beneficio-dia" aria-hidden="true">
                {[
                  ["09:00", "Carlos · Corte", "ocupado"],
                  ["09:40", "Livre", "livre"],
                  ["10:20", "Bruno · Barba", "ocupado"],
                  ["12:00", "Almoço", "pausa"],
                ].map(([hora, texto, tipo]) => (
                  <li key={hora} data-tipo={tipo}>
                    <span className="num">{hora}</span>
                    <span>{texto}</span>
                  </li>
                ))}
              </ol>
              <h3 className="beneficio-titulo">Horários organizados</h3>
              <p className="beneficio-texto">O cliente marca sozinho e a agenda só oferece horários livres, dentro do expediente e fora do almoço.</p>
            </li>
            <li className="beneficio">
              <ol className="beneficio-visual beneficio-etapas" aria-hidden="true">
                <li data-estado="feito">
                  <span className="beneficio-etapa-no">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span>Confirmado</span>
                  <span className="num">08:12</span>
                </li>
                <li data-estado="feito">
                  <span className="beneficio-etapa-no">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span>Chegou</span>
                  <span className="num">13:56</span>
                </li>
                <li data-estado="atual">
                  <span className="beneficio-etapa-no">
                    <Scissors size={12} strokeWidth={2.5} />
                  </span>
                  <span>Em atendimento</span>
                  <span className="num">14:03</span>
                </li>
                <li data-estado="proximo">
                  <span className="beneficio-etapa-no">
                    <Circle size={8} strokeWidth={3} />
                  </span>
                  <span>Concluído</span>
                  <span className="num">—</span>
                </li>
              </ol>
              <h3 className="beneficio-titulo">Atendimento acompanhado</h3>
              <p className="beneficio-texto">Cada atendimento passa pelos estados reais na agenda, e a equipe vê em que ponto o dia está.</p>
            </li>
            <li className="beneficio">
              <div className="beneficio-visual beneficio-comissoes" aria-hidden="true">
                <p className="beneficio-comissoes-titulo">Comissões de hoje</p>
                <dl className="fatos">
                  <div>
                    <dt>Rafael · 6 atendimentos</dt>
                    <dd className="num">R$ 132,00</dd>
                  </div>
                  <div>
                    <dt>Diego · 4 atendimentos</dt>
                    <dd className="num">R$ 88,00</dd>
                  </div>
                  <div>
                    <dt>Recebido hoje</dt>
                    <dd className="num dia-positivo">R$ 550,00</dd>
                  </div>
                </dl>
              </div>
              <h3 className="beneficio-titulo">Caixa e comissões claros</h3>
              <p className="beneficio-texto">Concluiu, o valor entra no caixa e a comissão de cada profissional sai calculada.</p>
            </li>
          </ul>
        </section>

        <section id="como-funciona" className="landing-secao landing-largura" aria-labelledby="titulo-dia">
          <div className="landing-secao-cabecalho" data-revelar="">
            <h2 id="titulo-dia" className="landing-secao-titulo">
              Um dia na barbearia, hora a hora
            </h2>
            <p className="landing-secao-texto">Do cliente que marca de manhã ao caixa atualizado quando o atendimento termina.</p>
          </div>

          <TrilhoDoDia>
            <Hora
              hora="08:12"
              titulo="O cliente agenda pelo link"
              exemplo={
                <Exemplo rotulo="Página de agendamento">
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
                </Exemplo>
              }
            >
              <p>
                Ele escolhe o serviço, o profissional e um horário livre, sem criar conta. Se você quiser, o horário só fica garantido com
                um sinal no Pix.
              </p>
            </Hora>

            <Hora
              hora="12:00"
              titulo="Confirmação e lembrete no WhatsApp"
              adicional
              exemplo={
                <Exemplo rotulo="Lembrete automático">
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
                </Exemplo>
              }
            >
              <p>
                Quem marca recebe a confirmação na hora e, antes do horário, o lembrete com o link para remarcar ou cancelar. Você recebe o
                aviso de cada agendamento.
              </p>
            </Hora>

            <Hora
              hora="14:00"
              titulo="Chegou, em atendimento, concluído"
              exemplo={
                <Exemplo rotulo="Agenda">
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
                </Exemplo>
              }
            >
              <p>
                Na agenda do dia, cada atendimento passa por chegou e em atendimento até concluir. Fica registrado quem mudou cada coisa e
                quando.
              </p>
            </Hora>

            <Hora
              hora="14:40"
              titulo="Concluiu, o caixa já sabe"
              exemplo={
                <Exemplo rotulo="Conclusão do atendimento">
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
                </Exemplo>
              }
            >
              <p>
                Ao concluir, você marca como o cliente pagou. O valor entra no caixa e a comissão é calculada com o percentual do
                profissional ou do serviço.
              </p>
            </Hora>
          </TrilhoDoDia>
        </section>

        <section id="planos" className="landing-secao landing-planos" aria-labelledby="titulo-planos">
          <div className="landing-largura">
            <div className="landing-secao-cabecalho" data-revelar="">
              <h2 id="titulo-planos" className="landing-secao-titulo">
                Planos para cada tamanho de equipe
              </h2>
              <p className="landing-secao-texto">
                Todos têm agenda, link de agendamento, caixa, comissões e indicadores; muda quantos profissionais usam a agenda. Comece com{" "}
                {DIAS_TESTE} dias grátis, sem cartão. Depois, o pagamento é feito pela Cakto.
              </p>
            </div>
            <TabelaPrecos acao="cadastro" />
          </div>
        </section>

        <section className="landing-secao landing-largura landing-perguntas" aria-labelledby="titulo-perguntas">
          <h2 id="titulo-perguntas" className="landing-secao-titulo" data-revelar="">
            Perguntas frequentes
          </h2>
          <div className="landing-perguntas-lista" data-revelar="">
            {PERGUNTAS.map(([pergunta, resposta]) => (
              <details key={pergunta} className="landing-pergunta">
                <summary>
                  {pergunta}
                  <ChevronDown size={20} className="landing-pergunta-icone" aria-hidden="true" />
                </summary>
                <p>{resposta}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-fim landing-largura" aria-labelledby="titulo-fim">
          <div className="landing-fim-conteudo" data-revelar="">
            <h2 id="titulo-fim" className="landing-fim-titulo">
              Comece pela agenda de amanhã.
            </h2>
            <p className="landing-secao-texto">
              Cadastre a barbearia, os serviços e o expediente em poucos minutos e mande o link para os clientes.
            </p>
            <div className="landing-acoes landing-acoes-centro">
              <Link href="/cadastro" className="btn btn-primary landing-cta">
                {CTA_TESTE}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                <MessageCircle size={18} aria-hidden="true" />
                Tirar dúvidas no WhatsApp
              </a>
            </div>
            <ul className="landing-fim-garantias">
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
    </div>
  );
}
