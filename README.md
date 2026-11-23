# BARBIUM — app

Backend + painéis do BARBIUM. Next.js 15 (App Router) rodando 100% na Vercel,
banco Neon (Postgres serverless) via Prisma com o driver adapter oficial.

Este projeto **não** inclui a landing page de marketing (aquela é o site
estático separado, em HTML/CSS/JS). Aqui mora o produto: super admin, painel
da barbearia e a página pública de agendamento.

## O que já está funcionando

- **Login** único para todos os papéis (`/login`), sessão em JWT num cookie
  `httpOnly`, conferida no banco a cada requisição. Recuperação de senha por
  e-mail (Resend). Limite de tentativas contra força bruta.
- **Super admin** (`/super-admin`): barbearias, plano, ativar/suspender.
- **Painel da barbearia** (`/painel`): visão geral, agenda (dia/semana),
  novo agendamento pelo balcão, clientes com assinatura, serviços, equipe com
  limite por plano, expediente e bloqueios, caixa com comissões (o dono vê
  a equipe e o extrato de cada um; o barbeiro vê só as próprias, em "Minhas
  comissões") e indicadores do período (ticket médio, ocupação da agenda,
  faltas e cancelamentos, no geral e por profissional; só o dono).
- **Agendamento público** (`/agendar/[slug]`): escolher serviço, profissional
  e horário, com sinal opcional por Pix (Mercado Pago).
- **Caixa automático**: sinal entra quando o Pix é aprovado; o restante e a
  comissão entram ao concluir o atendimento.

- **Landing e cadastro** (`/` e `/cadastro`): quem não está logado vê a
  landing com os preços; o cadastro cria a barbearia em **teste grátis de 7
  dias**. No fim do teste (ou da assinatura) o painel, as rotas da equipe, o
  link público e os lembretes param, e o dono vê os planos para assinar.

Regras de negócio detalhadas em [PRODUCT.md](PRODUCT.md).

## Assinaturas

Preços e links de pagamento ficam em `src/lib/precos.ts`. O pagamento é pela
**Cakto**: preencha `CHECKOUT_CAKTO` com o link de cada plano e período;
enquanto um link estiver vazio, o botão "Assinar" abre o WhatsApp de vendas.

Cada barbearia tem um prazo (`acessoAte`). Vazio é sem prazo (as cadastradas
pelo super admin). Depois de confirmar um pagamento na Cakto, o super admin
estende o acesso na tela da barbearia (+1 mês, +6 meses, +1 ano). A
liberação automática pelo webhook da Cakto ainda não existe.

## Rodando localmente

1. Crie um projeto em [neon.tech](https://neon.tech). Para desenvolver, use
   um **branch** do Neon, nunca o banco de produção.
2. Copie `.env.example` pra `.env` e preencha as variáveis.
3. Instale as dependências (já gera o cliente Prisma):

   ```bash
   npm install
   ```

4. Aplique as migrations e crie o super admin:

   ```bash
   npm run prisma:deploy
   npm run prisma:seed
   ```

5. Suba o app: `npm run dev` e acesse `http://localhost:3000/login`.

## Verificações

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # Vitest (regras de fuso, agenda, comissão, sinal, caixa)
```

O `npm run build` (usado pela Vercel) roda os testes antes de compilar: teste
quebrado bloqueia o deploy.

Erros não tratados no servidor viram mensagem no WhatsApp de
`PLATAFORMA_WHATSAPP`, pelo mesmo webhook do n8n (`src/instrumentation.ts`).
O mesmo erro na mesma rota avisa no máximo uma vez a cada 30 minutos.

## Banco de dados e migrations

As migrations ficam em `prisma/migrations/` e são a fonte da verdade da
estrutura do banco. Para mudar o schema:

```bash
npm run prisma:migrate -- --name descricao-curta   # gera e aplica em dev
npm run prisma:deploy                               # aplica em produção
```

Não altere o banco à mão. Os scripts em `prisma/sql/` são o histórico das
mudanças que foram aplicadas assim antes das migrations serem organizadas; a
estrutura deles já está em `20261001000000_estrutura_aplicada_manualmente`.

A migration `20261103000000_trava_horario_e_limites` cria uma constraint que
impede dois agendamentos ativos do mesmo profissional no mesmo horário. Ela
não aparece no `schema.prisma` (o Prisma não representa esse tipo de
constraint), mas o código depende dela — ver `src/lib/conflito-horario.ts`.
A constraint lista os status que travam o horário; a
`20261124010100_trava_horario_novos_status` a recria incluindo "chegou" e
"em atendimento". **Status novo que ocupa horário precisa entrar nessa lista**
(numa migration separada da que cria o valor no enum).

Cada agendamento guarda o histórico de quem criou, mudou o status, o
horário ou o serviço (`agendamento_historico`, ver `src/lib/historico.ts`),
inclusive o cliente pelo link e o sistema (Pix pago ou expirado).

A migration `20261123000000_cliente_mensagens_e_remocao` é **vazia de
propósito**: foi registrada na produção por engano, sem nenhum SQL. Não
apague nem edite (a produção guarda o checksum dela); a estrutura de verdade
está na `20261123000100_cliente_aceita_mensagens_e_remocao`.

Antes de rodar qualquer comando do Prisma, confira a linha `Datasource` na
saída: o CLI lê só o `.env`, que aponta para a produção.

## Notificações no WhatsApp (n8n + Evolution API)

O app faz um `POST` em `N8N_WEBHOOK_URL` **por destinatário**, com o número
em `para`, o texto pronto em `mensagem` e quem recebe em `destinatario`
(`barbearia` ou `cliente`). O n8n só repassa `para` e `mensagem` pra Evolution.

| Quando | Barbearia recebe | Cliente recebe |
|---|---|---|
| Agendamento pelo link (sem sinal, ou com o Pix pago) | "Novo agendamento" | "Seu horário está marcado" |
| Agendamento feito pela equipe no painel | — | "Seu horário está marcado" |
| Equipe muda o dia, o horário ou o profissional ("Mudar", na agenda) | — | "Seu horário mudou" |
| X horas antes do horário (X escolhido em Configurações) | — | Lembrete |
| Cliente cancela pelo link | "Cliente cancelou pelo link" | "Seu horário foi cancelado" |
| Cliente muda o horário pelo link | "Cliente remarcou pelo link" (antes e agora) | "Seu horário mudou" |

As mensagens do cliente trazem o link da página dele
(`/meu-horario/<código>`), onde ele vê o horário e, até 2 horas antes, muda
(mesmo profissional e serviço, só horários livres) ou cancela. O código é
assinado com o `JWT_SECRET`: trocar o segredo invalida os links já enviados.
O endereço do link vem de `APP_URL` ou, sem ela, do domínio de produção que a
Vercel informa; sem nenhum dos dois, a mensagem volta a dizer "fale com a
barbearia".
| Pix pago depois do prazo, horário já ocupado | aviso pra devolver ou remarcar | — |

A barbearia recebe no **WhatsApp para avisos** (Configurações) ou, se ele
estiver vazio, no telefone da barbearia. O cliente recebe no telefone que
informou. Número sem DDD não recebe (o envio nem é feito). Sem a variável
configurada, nada é enviado; se o n8n estiver fora do ar, o agendamento
funciona normal e a falha só vai pro log.

Para configurar:

1. No n8n, importe [docs/n8n/barbium-aviso-agendamento.json](docs/n8n/barbium-aviso-agendamento.json).
2. No nó **Webhook Barbium**, crie uma credencial *Header Auth* com nome
   `x-barbium-token` e um valor secreto qualquer.
3. No nó **Enviar WhatsApp**, troque a URL da Evolution, o nome da instância e
   a `apikey`. (Exemplo para a Evolution v2; na v1 o corpo é
   `{ number, textMessage: { text } }`.)
4. Ative o fluxo e copie a **Production URL** do webhook.
5. No app, configure `N8N_WEBHOOK_URL` (essa URL) e `N8N_WEBHOOK_TOKEN` (o
   mesmo valor secreto do passo 2).

### Lembretes

Cada barbearia escolhe em **Configurações** quantas horas antes o cliente
recebe o lembrete (ou "não enviar", o padrão). Quem dispara é o n8n:

1. Importe [docs/n8n/barbium-lembretes.json](docs/n8n/barbium-lembretes.json).
2. No nó **Mandar lembretes**, troque a URL pelo endereço do app
   (`https://…/api/lembretes`) e escolha a **mesma credencial Header Auth**
   do webhook (`x-barbium-token`).
3. Ative o fluxo. A cada 15 minutos ele chama o app, que manda os lembretes
   que estão na hora (pelo mesmo webhook dos avisos) e responde quantos
   foram enviados.

Cada horário recebe no máximo um lembrete. Não recebe quem marcou já dentro
da janela (acabou de receber a confirmação), quem pediu pra não receber
mensagens, nem quem teve o horário mudado para dentro da janela (o "seu
horário mudou" faz esse papel). Se o n8n ficar parado, quem tinha horário
nesse intervalo fica sem lembrete; os outros recebem quando ele voltar.

## Deploy na Vercel

1. Importe o repositório na Vercel e adicione a integração **Neon** na aba
   **Storage** (injeta `DATABASE_URL` e `DIRECT_URL`).
2. Configure as demais variáveis do `.env.example` em Environment Variables.
3. Antes de publicar código que depende de migration nova, rode
   `npm run prisma:deploy` contra o banco de produção.

## Estrutura

```
prisma/
  schema.prisma      — todas as entidades
  migrations/        — histórico da estrutura do banco
  seed.ts            — cria o primeiro SUPER_ADMIN
src/
  lib/               — regras de negócio (agenda, sinal, caixa, fuso, sessão…)
  middleware.ts      — protege /super-admin/** e /painel/** por papel
  app/
    login/, recuperar-senha/, redefinir-senha/
    super-admin/     — painel da plataforma
    painel/          — painel da barbearia (dono/barbeiro)
    agendar/[slug]/  — página pública de agendamento
    api/             — rotas server-side
```
