# BARBIUM — app

Backend + painéis do BARBIUM. Next.js 15 (App Router) rodando 100% na Vercel,
banco Neon (Postgres serverless) via Prisma com o driver adapter oficial.

Este projeto **não** inclui a landing page de marketing (aquela é o site
estático separado, em HTML/CSS/JS). Aqui mora o produto: super admin, painel
da barbearia e a página pública de agendamento.

## O que já está funcionando

- **Login** único para todos os papéis (`/login`), com sessão em JWT num
  cookie `httpOnly`.
- **Super admin** (`/super-admin`): visão geral, listar barbearias, criar
  barbearia + dono numa operação só, trocar plano e ativar/suspender acesso.
- **Painel da barbearia** (`/painel`): agenda do dia já lendo do banco.
  Clientes, Serviços, Equipe e Caixa estão como tela "em construção" —
  a estrutura de dados já existe no schema, falta só a interface.
- **Agendamento público** (`/agendar/[slug]`): lista os serviços da
  barbearia. O formulário de escolher horário e confirmar ainda não foi
  construído.

## O que falta pra virar um MVP completo

1. Fluxo de agendamento público de ponta a ponta (escolher barbeiro,
   horário livre, confirmar com nome/telefone).
2. CRUD de Clientes, Serviços e Equipe no painel da barbearia.
3. Lançamento automático no Caixa quando um agendamento é concluído, e
   apuração de comissão por barbeiro.
4. Lembrete de agendamento por WhatsApp (`wa.me` manual, pra começar).

## Rodando localmente

1. Crie um projeto em [neon.tech](https://neon.tech) (ou conecte o Neon
   direto pela integração da Vercel, que faz esse passo por você).
2. Copie `.env.example` pra `.env` e preencha `DATABASE_URL`, `DIRECT_URL`,
   `JWT_SECRET` e os dados do `SUPER_ADMIN_*`.
3. Instale as dependências e gere o cliente Prisma:

   ```bash
   npm install
   npm run prisma:generate
   ```

4. Aplique o schema no banco (cria as tabelas):

   ```bash
   npm run prisma:migrate
   ```

5. Crie o primeiro usuário super admin:

   ```bash
   npm run prisma:seed
   ```

6. Suba o app:

   ```bash
   npm run dev
   ```

7. Acesse `http://localhost:3000/login` com o e-mail/senha do
   `SUPER_ADMIN_*` que você definiu no `.env`.

## Deploy na Vercel

1. Suba este projeto pra um repositório Git (GitHub, por exemplo) e importe
   na Vercel.
2. Na aba **Storage** do projeto na Vercel, adicione a integração **Neon**
   — ela já injeta `DATABASE_URL` e `DIRECT_URL` automaticamente.
3. Adicione a variável `JWT_SECRET` nas Environment Variables do projeto.
4. No primeiro deploy, rode a migration e o seed contra o banco de produção
   (pela Vercel CLI, ou localmente apontando o `.env` pra connection string
   de produção):

   ```bash
   npm run prisma:deploy
   npm run prisma:seed
   ```

5. Pronto — `/login` já funciona com o super admin criado no seed.

## Estrutura

```
prisma/
  schema.prisma     — todas as entidades (Barbearia, Usuario, Cliente, …)
  seed.ts            — cria o primeiro SUPER_ADMIN
src/
  lib/
    prisma.ts         — cliente Prisma com o adapter serverless do Neon
    auth.ts            — hash de senha e JWT de sessão
    sessao.ts          — leitura da sessão em Server Components/rotas
    planos.ts          — rótulos dos planos (Solo/Barbearia/Rede)
  middleware.ts        — protege /super-admin/** e /painel/** por papel
  app/
    login/              — tela de login única
    super-admin/         — painel de controle da plataforma
    painel/               — painel da barbearia (dono/barbeiro)
    agendar/[slug]/        — página pública de agendamento
    api/                    — rotas server-side (auth, super-admin)
```
