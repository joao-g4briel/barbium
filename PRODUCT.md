# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Donos de barbearia** — gerenciam agenda, clientes, serviços, equipe e caixa da própria barbearia pelo `/painel`. Hoje inclui o uso real do próprio criador do produto, rodando sua própria barbearia nele.
- **Barbeiros** — profissionais vinculados a uma barbearia, com expediente semanal e bloqueios de agenda próprios; usam o `/painel` com escopo mais restrito que o dono.
- **Super admin** — opera a plataforma BARBIUM em si (por enquanto a mesma pessoa que constrói o produto): cadastra barbearias, define plano, ativa/suspende acesso, pelo `/super-admin`.
- **Clientes finais** — agendam horário publicamente em `/agendar/[slug]`, sem login, identificados só por telefone.

## Product Purpose

Plataforma multi-tenant de gestão para barbearias: agenda, clientes, serviços, equipe e caixa num só lugar, com uma página pública de agendamento por barbearia. Hoje em uso piloto — o próprio criador roda sua barbearia nela — enquanto evolui para um produto vendável a outras barbearias.

## Positioning

Ainda não definida. O usuário confirmou que o foco atual é terminar o MVP funcional, não se posicionar contra concorrentes de categoria (Trinks, Booksy, GestãoDS foram citados só como referência, não como comparação resolvida). Não inventar diferencial de mercado ("mais simples", "tudo integrado" etc.) até isso ser decidido explicitamente.

## Operating Context

- Multi-tenant real: cada `Barbearia` é isolada por `barbeariaId`; múltiplas `Unidade` só são usadas de fato no plano Rede.
- Fuso horário é um ponto historicamente sensível (commits recentes corrigindo bug de fuso/agenda). Expediente semanal é guardado como texto `"HH:mm"`, não `DateTime`, deliberadamente para evitar esse tipo de bug — qualquer nova UI de horário/agenda deve preservar essa escolha.
- Status de assinatura do cliente final é calculado a partir do vencimento, não armazenado — vencimento é a fonte da verdade.
- Caixa é alimentado automaticamente ao concluir um agendamento (`ENTRADA`) e manualmente pelo dono para o resto (ex.: `SAIDA`).
- Lembrete de agendamento hoje é via `wa.me` manual — não é integração de API do WhatsApp.

## Capabilities and Constraints

- Papéis (`Role`): `SUPER_ADMIN` (sem `barbeariaId`), `DONO` e `BARBEIRO` (sempre vinculados a uma barbearia). Login único para todos os papéis, sessão em JWT num cookie `httpOnly`.
- Planos (`Plano`): `SOLO`, `BARBEARIA`, `REDE`.
- Cliente final não tem conta/login; identificado por telefone (único por barbearia).
- Stack já definida pelo projeto existente: Next.js 15 (App Router) na Vercel, Postgres serverless (Neon) via Prisma com o driver adapter oficial — fora de escopo decidir de novo aqui.
- O README do repositório descreve um MVP ainda incompleto (fluxo público de agendamento ponta a ponta, CRUDs de clientes/serviços/equipe, lançamento automático de comissão por barbeiro), mas parte disso já avançou no código atual (ex.: assistente de agendamento público e CRUD de clientes/serviços já existem) — tratar o README como possivelmente desatualizado, não como status corrente.
- Sem backend hoje (a interface não deve fingir que existe): criar agendamento por dentro do painel (o "Novo agendamento" leva ao link público, que aplica as regras de expediente e conflito); cadastrar/editar profissionais da equipe; editar dados da barbearia ou do perfil pelo painel; recuperar senha; forma de pagamento dos lançamentos; apuração de comissão (os percentuais existem no cadastro, o cálculo não).
- Caixa e visão da equipe são exclusivos do dono (as rotas de escrita já exigiam isso; as telas agora também).

## Brand Commitments

- Interface inteira em português do Brasil, com datas e valores no formato brasileiro e horários no fuso de Brasília.
- Linguagem simples, voltada à operação do dia a dia; o produto deve transmitir organização, confiança e qualidade.
- Referências conceituais citadas pelo usuário (não para copiar): SQUIRE (organização da operação), Booksy (clareza de agendamento), dashboards profissionais (hierarquia e densidade equilibrada).
- Símbolo: o poste de barbeiro estilizado (mantido pelo usuário ao longo dos redesenhos).

## Evidence on Hand

Uso piloto real: o próprio criador do produto opera sua barbearia através do BARBIUM — não é dado fictício. Não há, porém, depoimentos, estudos de caso ou clientes pagantes externos documentados ainda; não fabricar testemunhos, cases ou métricas de outros clientes.

## Product Principles

1. Isolamento multi-tenant estrito — toda tabela de negócio carrega `barbeariaId` e é sempre filtrada por ele.
2. Modelagem pelo caso real, não pelo genérico — horário de expediente como texto `"HH:mm"`, assinatura calculada em vez de armazenada.
3. Fluxo do cliente final sem fricção — sem conta, sem senha, identificado só por telefone.
4. Papéis com escopo claro — super admin nunca pertence a uma barbearia; dono e barbeiro sempre pertencem.
5. Automatizar o que é mecânico — concluir um agendamento deve gerar caixa e apurar comissão sem lançamento manual (parte ainda pendente do MVP).
