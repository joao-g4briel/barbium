---
version: 1
slug: "src-app-painel"
primary_target: "src/app/painel"
related_targets: ["src/app/super-admin","src/app/login","src/app/agendar"]
---

## Direction contract

**Scope & mode:** Full redesign from scratch, Operate mode, across the whole frontend (painel da barbearia, super-admin da plataforma, login, agendamento público, estados auxiliares). Direction is brief-pinned by the user (palette, font, structure, two reference comps: mobile Agenda list and desktop Visão geral) — no direction roll. Product truth, APIs, business rules unchanged; see PRODUCT.md.

**THESIS:** A calm, trustworthy operations console for a barbershop's day — the schedule and the money readable at a glance, in plain Portuguese — refusing both the generic neon-on-black SaaS look and decorative barbershop kitsch.

**OWN-WORLD:** Deep green-black ground (#0D1110), sidebar/surfaces #131A16, cards/menus/dialogs #19221C, discreet borders #2A362E. One primary green (#4ADE80) with dark ink on filled buttons. Semantic tones only where they carry meaning: green = concluído/recebido, blue = confirmado/informação, amber = atenção/falta, red = erro/ação destrutiva, neutral gray = cancelado. Every status pairs color with an icon and a word. Manrope everywhere, tabular figures for times and money. Radii 10–14px, 4/8 spacing, hairline borders, shadows only on overlays. No glow, glass, decorative gradients or nested cards. Lucide icons at one stroke weight.

**STORY:** A dono opens Visão geral and knows what came in, what is still to receive, who is next and how full the chairs are; a barbeiro between clients opens Agenda on the phone, filters to himself, and closes the current appointment in one tap.

**FIRST VIEWPORT:** Desktop `/painel`: fixed sidebar (brand, barbearia name, grouped nav, user + sair at bottom); header with "Visão geral", today's date and a green "Novo agendamento"; a row of at most four indicators (recebido hoje with a-receber detail, agendamentos, concluídos, cancelamentos/faltas); below, "Agenda de hoje" as a per-profissional time grid (2/3 width) beside "Próximos clientes" (1/3). Mobile `/painel/agenda`: brand + avatar top bar, big "Agenda" title with the date, a 7-day strip, profissional filter, "8 agendamentos · 3 concluídos", full-width green "Novo agendamento", then a chronological time-rail list of appointment cards; bottom nav with four destinations + Mais.

**FORM:** Brief-pinned (user reference comps + written brief), not rolled; code-led (no image generation). Signature interaction: tapping any appointment (grid block or list card) opens one detail panel — side sheet on desktop, bottom sheet on mobile — with its facts and the only valid status transitions, destructive ones confirmed; the current appointment is marked "Agora" from real time, never a fake status.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
