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
  limite por plano, expediente e bloqueios, caixa com comissões.
- **Agendamento público** (`/agendar/[slug]`): escolher serviço, profissional
  e horário, com sinal opcional por Pix (Mercado Pago).
- **Caixa automático**: sinal entra quando o Pix é aprovado; o restante e a
  comissão entram ao concluir o atendimento.

Regras de negócio detalhadas em [PRODUCT.md](PRODUCT.md).

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
