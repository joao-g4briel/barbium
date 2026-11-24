import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, Check, MessageCircle, Receipt, UserX } from "lucide-react";
import { Marca } from "@/components/ui/marca";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { Indicador } from "@/components/ui/indicador";
import { TabelaPrecos } from "@/components/precos/tabela-precos";
import { DIAS_TESTE, PRECO_ADICIONAL_WHATSAPP, WHATSAPP_VENDAS } from "@/lib/precos";
import { formatarMoeda } from "@/lib/formatar";
import { TrilhoDoDia } from "./trilho-do-dia";

// Landing do Barbium: um dia de trabalho na barbearia, hora a hora, cada hora
// mostrando a tela ou a mensagem real que o sistema usa naquele momento. Os
// dados das telas são de exemplo (marcados assim); preços vêm de lib/precos.

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

// "adicional": parte do adicional de WhatsApp, contratado à parte no pagamento.
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

export function Landing() {
  const whatsapp = `https://wa.me/${WHATSAPP_VENDAS}?text=${encodeURIComponent("Olá! Quero saber mais sobre o Barbium.")}`;

  return (
    <div className="landing">
      <header className="landing-topo">
        <div className="landing-largura landing-topo-conteudo">
          <Link href="/" aria-label="Barbium — início" className="landing-marca">
            <Marca variante="landing" tamanho={26} />
          </Link>
          <nav className="landing-nav" aria-label="Seções">
            <a href="#dia" className="landing-nav-link">Como funciona</a>
            <a href="#precos" className="landing-nav-link">Preços</a>
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
              O dia da sua barbearia, do primeiro horário ao fechamento.
            </h1>
            <p className="landing-subtitulo">
              O cliente marca sozinho pelo link, a agenda acompanha cada atendimento, e cada um concluído já cai no caixa
              com a comissão calculada.
            </p>
            <div className="landing-acoes">
              <Link href="/cadastro" className="btn btn-primary landing-cta">
                {CTA_TESTE}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a href="#precos" className="btn btn-ghost">
                Ver preços
              </a>
            </div>
            <p className="landing-nota">Sem cartão no teste. Funciona no navegador do celular e do computador.</p>
          </div>

          <div className="landing-abertura-dia" aria-hidden="true">
            <div className="abertura-linha" data-agora="true">
              <span className="abertura-hora num">08:12</span>
              <span className="abertura-no" />
              <div className="agendamento-card abertura-card">
                <Avatar nome="Lucas Andrade" tamanho={40} />
                <div className="agendamento-corpo">
                  <div className="agendamento-topo">
                    <p className="agendamento-cliente">Lucas Andrade</p>
                    <StatusBadge status="CONFIRMADO" />
                  </div>
                  <p className="agendamento-servico">Corte + barba · 14:00 com Rafael</p>
                  <p className="abertura-origem">Marcado pelo link de agendamento</p>
                </div>
              </div>
            </div>
            {[
              ["13:56", "Lucas chegou"],
              ["14:03", "Em atendimento com Rafael"],
              ["14:40", "Concluído · R$ 55,00 no caixa"],
              ["20:00", "Fechamento do dia"],
            ].map(([hora, texto]) => (
              <div className="abertura-linha" key={hora}>
                <span className="abertura-hora num">{hora}</span>
                <span className="abertura-no" />
                <p className="abertura-proximo">{texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="dia" className="landing-dia landing-largura" aria-labelledby="titulo-dia">
          <h2 id="titulo-dia" className="landing-secao-titulo">
            Um dia de trabalho, hora a hora
          </h2>
          <p className="landing-secao-texto">
            É assim que o Barbium acompanha a barbearia, do cliente que marca de manhã ao caixa fechado à noite.
          </p>

          <TrilhoDoDia>
            <Hora
              hora="08:12"
              titulo="O cliente marca sozinho, pelo link"
              exemplo={
                <Exemplo rotulo="Página de agendamento">
                  <div className="dia-tela">
                    <p className="dia-tela-titulo">Escolha o horário</p>
                    <p className="texto-secundario texto-pequeno">Corte + barba · com Rafael · terça, 25/11</p>
                    <div className="horarios">
                      {["13:00", "13:40", "14:00", "14:40", "15:20", "16:00"].map((h) => (
                        <span key={h} className="horario" aria-pressed={h === "14:00"}>
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                </Exemplo>
              }
            >
              <p>
                Cada barbearia ganha um link próprio. O cliente escolhe o serviço, o profissional e um horário livre, sem
                criar conta. Só aparecem horários dentro do expediente, fora do almoço e das folgas.
              </p>
              <p>Se você quiser, o horário só fica garantido com um sinal pago no Pix.</p>
            </Hora>

            <Hora
              hora="08:12"
              titulo="Confirmação no WhatsApp, para ele e para você"
              adicional
              exemplo={
                <Exemplo rotulo="Mensagens automáticas">
                  <Mensagem de="WhatsApp do cliente">
                    <p>Olá, Lucas! ✂️</p>
                    <p>
                      Seu horário na <b>Barbearia Exemplo</b> está marcado.
                    </p>
                    <p>
                      <b>Quando:</b> Terça-feira, 25/11 às 14:00
                    </p>
                    <p className="dia-mensagem-link">Precisa remarcar ou cancelar? barbium…/meu-horario/…</p>
                  </Mensagem>
                  <Mensagem de="Seu WhatsApp">
                    <p>
                      ✂️ <b>Novo agendamento</b>
                    </p>
                    <p>Lucas Andrade · Corte + barba · com Rafael</p>
                  </Mensagem>
                </Exemplo>
              }
            >
              <p>
                O cliente recebe o horário marcado e um link para remarcar ou cancelar. Você recebe o aviso de cada
                agendamento novo no WhatsApp que escolher.
              </p>
              <p>
                Quem não quiser mensagens pede para parar, e o sistema respeita. As mensagens no WhatsApp são um
                adicional de {formatarMoeda(PRECO_ADICIONAL_WHATSAPP)}/mês; no teste grátis, já vêm ligadas.
              </p>
            </Hora>

            <Hora
              hora="11:30"
              titulo="Lembrete antes do horário"
              adicional
              exemplo={
                <Exemplo rotulo="Lembrete">
                  <Mensagem de="WhatsApp do cliente">
                    <p>Olá, Lucas! ⏰</p>
                    <p>
                      Passando pra lembrar do seu horário na <b>Barbearia Exemplo</b>.
                    </p>
                    <p>
                      <b>Quando:</b> Hoje às 14:00
                    </p>
                  </Mensagem>
                </Exemplo>
              }
            >
              <p>
                Você escolhe a antecedência, de 1 hora a 1 dia antes. Cada horário recebe um lembrete só, e quem marcou em
                cima da hora não recebe repetido.
              </p>
            </Hora>

            <Hora
              hora="12:10"
              titulo="Precisa mudar? O cliente resolve pelo link"
              adicional
              exemplo={
                <Exemplo rotulo="Aviso para a barbearia">
                  <Mensagem de="Seu WhatsApp">
                    <p>
                      🔁 <b>Cliente remarcou pelo link</b>
                    </p>
                    <p>Bruno Costa · Corte</p>
                    <p>
                      <b>Antes:</b> Terça-feira, 25/11 às 16:00
                    </p>
                    <p>
                      <b>Agora:</b> Quarta-feira, 26/11 às 10:00
                    </p>
                  </Mensagem>
                </Exemplo>
              }
            >
              <p>
                Até 2 horas antes, o cliente escolhe outro horário livre ou cancela, sem precisar te chamar. Você recebe o
                aviso com o horário de antes e o de agora, e o horário vago volta para a agenda.
              </p>
              <p>O link para mudar chega na mensagem de confirmação.</p>
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
                Na agenda do dia, cada atendimento passa por chegou e em atendimento até concluir. Fica registrado quem
                mudou cada coisa e quando, inclusive o que o cliente fez pelo link.
              </p>
              <p>Cada barbeiro vê a própria agenda; o dono vê a de todos, lado a lado.</p>
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
                Ao concluir, você marca como o cliente pagou. O valor entra no caixa e a comissão do profissional é
                calculada na hora, com o percentual que vale para ele ou para o serviço.
              </p>
              <p>O sinal pago no Pix entra sozinho quando o pagamento é aprovado.</p>
            </Hora>

            <Hora
              hora="20:00"
              titulo="Fechamento sem calculadora"
              exemplo={
                <Exemplo rotulo="Indicadores do mês">
                  <div className="dia-indicadores">
                    <Indicador rotulo="Ticket médio" valor="R$ 47,50" icone={<Receipt size={20} />} tomIcone="primario" detalhe="em 186 atendimentos" />
                    <Indicador rotulo="Ocupação" valor="72%" icone={<CalendarClock size={20} />} detalhe="da agenda do mês" />
                    <Indicador rotulo="Faltas" valor="4%" icone={<UserX size={20} />} detalhe="8 de 194" />
                  </div>
                </Exemplo>
              }
            >
              <p>
                O que entrou, ticket médio, ocupação da agenda, faltas e cancelamentos, por período e por profissional.
                Cada barbeiro acompanha o próprio extrato de comissão, e o caixa continua só com você.
              </p>
            </Hora>
          </TrilhoDoDia>
        </section>

        <section id="precos" className="landing-precos landing-largura" aria-labelledby="titulo-precos">
          <h2 id="titulo-precos" className="landing-secao-titulo">
            Um preço para cada tamanho de equipe
          </h2>
          <p className="landing-secao-texto">
            Todo plano tem o que aparece acima, menos as mensagens no WhatsApp, que são um adicional. Muda quantos
            profissionais usam a agenda. Comece com {DIAS_TESTE} dias grátis, sem cartão; depois, o pagamento é feito
            pela Cakto.
          </p>
          <TabelaPrecos acao="cadastro" />
        </section>

        <section className="landing-perguntas landing-largura" aria-labelledby="titulo-perguntas">
          <h2 id="titulo-perguntas" className="landing-secao-titulo">
            Perguntas frequentes
          </h2>
          <div className="landing-perguntas-lista">
            {[
              [
                "Preciso de cartão para testar?",
                `Não. Você cria a conta e usa tudo por ${DIAS_TESTE} dias. No fim do teste, escolhe o plano e o período e paga pela Cakto.`,
              ],
              [
                "O que acontece quando o teste acaba?",
                "O painel fica pausado até a assinatura. Agenda, clientes e caixa continuam guardados; assinou, tudo volta como estava.",
              ],
              [
                "Funciona no celular?",
                "Sim. O Barbium roda no navegador do celular e do computador, e dá para instalar na tela inicial do celular como um app.",
              ],
              [
                "As mensagens no WhatsApp custam à parte?",
                `Sim. Confirmação, lembrete, o link para o cliente remarcar ou cancelar e os avisos para a barbearia são um adicional de ${formatarMoeda(PRECO_ADICIONAL_WHATSAPP)}/mês, que você inclui na hora de pagar a assinatura. No teste grátis, as mensagens já vêm ligadas para você experimentar.`,
              ],
              [
                "Meus barbeiros veem o caixa?",
                "Não. Cada barbeiro vê a própria agenda e o próprio extrato de comissão. Caixa, equipe e indicadores são só do dono.",
              ],
              [
                "Posso mudar de plano depois?",
                "Pode. Se a equipe crescer, fale com a gente e sua barbearia passa para o plano que comporta mais profissionais.",
              ],
            ].map(([pergunta, resposta]) => (
              <details key={pergunta} className="landing-pergunta">
                <summary>{pergunta}</summary>
                <p>{resposta}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-fim landing-largura" aria-labelledby="titulo-fim">
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
            {["Sem cartão no teste", "Todas as funções liberadas", "Seus dados ficam guardados"].map((t) => (
              <li key={t}>
                <Check size={16} aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="landing-rodape">
        <div className="landing-largura landing-rodape-conteudo">
          <Marca variante="landing-rodape" tamanho={20} />
          <nav aria-label="Rodapé" className="landing-rodape-links">
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
