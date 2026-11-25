---
name: Barbium
description: The barbershop's day in one dark, sober green workspace — agenda, cash and commissions readable at a glance, in plain Portuguese.
colors:
  bg-page: "#0d1110"
  bg-surface: "#18231c"
  bg-surface-raised: "#1e2c23"
  bg-surface-raised-hover: "#243529"
  bg-input: "#111a15"
  brand-primary: "#047857"
  brand-primary-hover: "#065f46"
  brand-primary-pressed: "#064e3b"
  on-primary: "#ffffff"
  brand-accent: "#10b981"
  brand-accent-text: "#6ee7b7"
  brand-selected-bg: "#123d2c"
  text-primary: "#f4f7f5"
  text-secondary: "#a3afa7"
  text-muted: "#91a398"
  border-subtle: "#2c3b32"
  border-strong: "#3b4d41"
  border-control: "#637d6c"
  focus-ring: "#6ee7b7"
  success-fg: "#6ee7b7"
  success-bg: "#123d2c"
  success-border: "#1f6b4d"
  warning-fg: "#fbbf24"
  warning-bg: "#382d16"
  warning-border: "#5e4a1f"
  error-fg: "#f87171"
  error-bg: "#3b1d23"
  error-border: "#6b2f39"
  error-hover: "#fca5a5"
  on-error: "#1c0a0d"
  info-fg: "#93c5fd"
  info-bg: "#172a3e"
  info-border: "#2b4a6b"
  overlay: "rgba(6, 9, 8, 0.72)"
typography:
  display:
    fontFamily: "Manrope, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2rem, 4.5vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  section:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  metric:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  title:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  support:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
  caption:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  xs: "4px"
  sm: "8px"
  control: "10px"
  card: "16px"
  dialog: "20px"
  full: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"
components:
  button-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.brand-primary-hover}"
  button-primary-active:
    backgroundColor: "{colors.brand-primary-pressed}"
  button-secondary:
    backgroundColor: "{colors.bg-surface-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.bg-surface-raised-hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.error-fg}"
    textColor: "{colors.on-error}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-small:
    typography: "{typography.support}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "36px"
  button-landing-cta:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "48px"
  link:
    textColor: "{colors.brand-accent-text}"
    typography: "{typography.label}"
  input:
    backgroundColor: "{colors.bg-input}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.bg-surface}"
    rounded: "{rounded.card}"
    padding: "20px"
  indicator:
    backgroundColor: "{colors.bg-surface}"
    rounded: "{rounded.card}"
    padding: "20px"
  dialog:
    backgroundColor: "{colors.bg-surface-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.dialog}"
    width: "480px"
  badge-neutral:
    backgroundColor: "{colors.bg-surface-raised}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "24px"
  badge-success:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success-fg}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "24px"
  badge-info:
    backgroundColor: "{colors.info-bg}"
    textColor: "{colors.info-fg}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "24px"
  badge-attention:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning-fg}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "24px"
  badge-danger:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.error-fg}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "24px"
  nav-item:
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "42px"
  nav-item-active:
    backgroundColor: "{colors.brand-selected-bg}"
    textColor: "{colors.brand-accent-text}"
  selected-option:
    backgroundColor: "{colors.brand-selected-bg}"
    textColor: "{colors.brand-accent-text}"
    rounded: "{rounded.control}"
    height: "44px"
  day-cell:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.control}"
    height: "60px"
  day-cell-selected:
    backgroundColor: "{colors.brand-selected-bg}"
    textColor: "{colors.brand-accent-text}"
  plan-card:
    backgroundColor: "{colors.bg-surface}"
    rounded: "{rounded.card}"
    padding: "24px"
---

<!-- Provenance: recorded after the build from the shipped artifact — src/app/globals.css (official palette at :root plus the --color-* role layer), src/app/layout.tsx, src/components/ui/* (marca + marca-caminhos, botao, campo, badge, dialogo, indicador, estado-vazio, skeleton, alerta), src/components/app/*, src/components/agenda/agenda-interativa.tsx, src/lib/status-agendamento.ts, src/components/landing/*, src/components/precos/tabela-precos.tsx, src/lib/previas.ts — and local renders with fictional data in .impeccable/review (landing at 1440 and 390 with and without reduced motion, carousel, painel, agenda, agenda detail at 390, dialog open and exiting, login 390, assinatura, public booking 390). Verified from code only: the super admin pages (never rendered) and the per-professional agenda grid with real multi-professional data. /meu-horario was rendered at 390 only. Replaces the superseded "Calm Front Desk" mint world (#4ade80 fills with dark ink) entirely; the tonal-depth, word-and-icon status, tabular-figure and pt-BR rules carry over because the build still does them. External checkout colors live in docs/CHECKOUT_CAKTO_CORES.md and derive from the tokens below. -->

# Design System: Barbium

## Overview

**Creative North Star: "The Working Day on the Rail"**

Barbium is the barbershop's day laid along the agenda's time rail: a column of times, a 1px rail, a node per appointment, and the day moving down it. The ground is a near-black green, surfaces rise one sober green step at a time, and color is spent on function. Deep emerald fills carry the one action that moves the day forward, with white text. A brighter emerald accent marks only what is chosen, reached or received: the selected day and time, the current page, progress, links, icons that confirm, and money that came in.

The same world serves two registers. The panel and public booking are working tools: balanced density, 44px targets, 16px body text, tabular figures, status always as icon plus word. The landing persuades with the same palette, Manrope and real components; it adds a larger display step and the rail as its spine (the opening demo where a booked 14:00 drops into today's agenda, and "um dia na barbearia" in four hours, whose rail lights the hour reached). Example screens carry an "exemplo" caption; the carousel artworks carry "Prévia ilustrativa" and are never presented as real captures.

The world refuses neon, glow, decorative gradients, glass, green shadows, particles and moving backgrounds, and it refuses the static hero mockup and the row of identical icon-and-text cards. The one piece of barbershop heritage is the approved logo, vectorized from docs/images: a pole with rounded caps and three diagonal stripes beside the "barbium" wordmark, caps and name in the text color, stripes in the accent.

**Key Characteristics:**
- Near-black green ground (`bg-page`) with three tonal surface steps and 1px hairlines; no card shadows.
- Two greens with separate jobs: emerald fills for action, bright emerald for selection, progress, links and received money.
- Manrope 400–700, 16px body and 14px support text, tabular figures for every time and amount.
- Gently rounded forms: 10px controls, 16px cards, 20px dialogs and the landing closing panel.
- Short, purposeful motion on four duration tokens; everything static and complete under reduced motion.

## Colors

A sober, green-tinted dark field with one action green, one accent green and four semantic tones held in reserve.

### Primary
- **Workshop Emerald** (`brand-primary`): the fill of primary buttons (the main action of a view, "Começar 30 dias grátis", "Novo agendamento", "Confirmar horário") with **White** (`on-primary`) text, and the text-selection highlight. Hover deepens to `brand-primary-hover`, press to `brand-primary-pressed`. White on this fill is about 5.5:1.

### Secondary
- **Signal Emerald** (`brand-accent`): non-text signals — the logo stripes, confirming icons (check marks in plan lists, guarantees, the "Sem cartão no teste" note), the progress bar fill, the rail's lit nodes and its 2px progress line, the agenda "now" line, the borders of selected options and the "Agora" card, the checked toggle track, the text caret and checkbox accent. Never a fill under small white text.
- **Mint Text** (`brand-accent-text`): accent as text — links, the active nav label, the selected day and time label, the reached hour on the rail, the FAQ summary on hover. Also the focus ring (`focus-ring`) and the success foreground (`success-fg`).
- **Selected Pine** (`brand-selected-bg`): the fill behind anything chosen or current — active nav item, selected day cell, selected time slot, checked payment method or plan, segmented selection, icon tiles of highlighted indicators and add-ons. Doubles as `success-bg`.

### Tertiary
- **Ledger Blue** (`info-fg` / `info-bg` / `info-border`): "Confirmado" and "Chegou", informational alerts, the free-trial strip atop the panel.
- **Caution Amber** (`warning-fg` / `warning-bg` / `warning-border`): "Falta", "Aguardando sinal", attention alerts, overdue subscriptions.
- **Alarm Red** (`error-fg` / `error-bg` / `error-border`): field errors, destructive buttons (`on-error` text, `error-hover` on hover), negative money, the danger tone of alerts and indicators.

### Neutral
- **Night Green** (`bg-page`): page ground, the viewport theme color, the rail node knockout ring.
- **Counter Green** (`bg-surface`): cards, indicators, sidebar, top bar, bottom nav, landing header, demo panels, plan cards, dialog footers, day cells.
- **Raised Green** (`bg-surface-raised`, hover `bg-surface-raised-hover`): dialogs, secondary buttons, hover fills of ghost buttons and nav items, the neutral badge and icon tile, skeletons.
- **Field Green** (`bg-input`): inputs, time slots, payment and plan options, the segmented track, the progress track.
- **Hairline** (`border-subtle`): decorative 1px dividers and card edges only. **Hairline Strong** (`border-strong`): secondary buttons, dialogs, avatars, day cells, scrollbar thumbs. **Control Edge** (`border-control`): every input and selectable option, the unchecked toggle, inactive rail nodes and carousel dots.
- **Chalk** (`text-primary`), **Sage** (`text-secondary`), **Faded Sage** (`text-muted`): primary text; secondary text, labels and descriptions; then placeholders, chevrons, nav group headings, captions and footers. Note that the component layer maps `text-secondary` to `--color-text-muted` and `text-muted` to `--color-text-subtle`.

### Named Rules
**The Two Greens Rule.** Emerald (`brand-primary`) fills actions and carries white text; the accent (`brand-accent` / `brand-accent-text`) marks what is selected, reached or received. An accent never becomes a button fill, and an action button never turns accent.

**The Red Is For Harm Rule.** Red marks errors, destructive actions and negative money only. A cancelled appointment is neutral and a no-show is amber.

**The Word-and-Icon Rule.** Every status carries its tone, a Lucide icon and its word: Confirmado = calendar-check, Chegou = user-check (info); Em atendimento = scissors, Concluído = check-circle (success); Falta = user-x, Aguardando sinal = hourglass (attention); Cancelado = circle-slash (neutral). `TOM_STATUS` in `src/lib/status-agendamento.ts` and `ICONE_STATUS` in `src/components/ui/badge.tsx` are the single mapping. Color alone never carries meaning.

**The Decorative Border Rule.** `border-subtle` separates; it never bounds a control. Inputs, options and toggles use `border-control` so their edges stay visible.

## Typography

**Display Font:** Manrope (next/font, `--font-manrope`), falling back to ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif
**Body Font:** Manrope, same stack
**Label/Mono Font:** none; numbers use Manrope with tabular figures

**Character:** One geometric-humanist sans at 400–700. Headings are bold and slightly tight; body is plain and even. Hierarchy comes from size, weight and the secondary text color, never from a second family.

### Hierarchy
- **Display** (700, `clamp(2rem, 4.5vw, 3.75rem)`, 1.08, -0.035em, max 14ch): the landing title only.
- **Section** (700, `clamp(1.75rem, 3vw, 2.5rem)`, 1.15, -0.03em): landing section titles and the closing title (max 18ch).
- **Headline** (700, 1.5rem → 1.75rem from 768px → 2rem from 1024px, -0.025em): panel page titles; the login and signup title is 1.75rem; the public booking header 1.25rem.
- **Metric** (700, 1.25rem → 1.625rem from 1024px, -0.02em, tabular): indicator values; the highlighted indicator grows to 1.75rem → 2rem. Plan price 2.5rem (-0.03em); add-on price 1.5rem.
- **Title** (700, 1.125rem): card, dialog, booking step, benefit and FAQ-adjacent titles; rail hour titles 1.25rem; plan names 1.25rem.
- **Body** (400, 1rem, 1.5): default text, inputs, buttons (700), nav items (600), table cells. Landing supporting copy is 1.125rem at 1.55 with 46–62ch measures.
- **Support** (400–600, 0.875rem): descriptions, hints, field errors, list sub-lines, small buttons, segmented items, landing nav links.
- **Label** (600, 0.875rem): field labels, indicator labels, facts labels.
- **Caption** (600–700, 0.75rem): badges, indicator details, bottom-nav labels, nav group headings, demo and "exemplo" captions. Table column headers are the only uppercase text (700, 0.75rem, 0.04em).

### Named Rules
**The Tabular Figures Rule.** Every time, date, amount and count sits in tabular figures (`<time>`, `.num`, tables, lists, facts, indicators, time slots, the rail) so columns align.

**The Plain Portuguese Rule.** Dates, money and times follow pt-BR in the Brasília time zone ("R$ 30,00", "22/09 13:25", "Terça-feira, 25/11 às 14:00"), in sentence case.

**The 400–700 Rule.** Weights stay between 400 and 700; size and color do the rest.

## Layout

A 4px spacing scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64) drives every gap.

- **Panel, desktop (≥1024px):** sticky 256px sidebar on Counter Green (logo, barbershop context tile, grouped nav, user summary pinned to the bottom) beside a main column capped at 1320px, padded 32px. Working panels use a 2:1 grid (main beside a min-300px side panel) or 1:1.
- **Panel, below 1024px:** 60px sticky top bar and a fixed 64px bottom nav (four destinations plus "Mais", which opens the rest in a sheet). Main padding 16px (24px from 768px) with clearance for the nav and safe area.
- **Indicators:** two columns on phones, up to four from 1024px. With a highlighted indicator, it spans the full row on phones, then sits in a 1.6fr first column from 1024px. Icon tiles appear from 640px.
- **Tables:** below 768px responsive tables collapse to stacked rows with inline column labels.
- **Public booking and auth:** a single centered column (560px booking, 400px login, 480px signup), no shell.
- **Landing:** content capped at 1200px with 16 / 20 (390px) / 32px (768px) side padding. Solid sticky 64px header. The opening is one column on phones (copy and CTA first, demo below, never full-height), and a 1 : 1.1 two-column grid from 1024px. Sections pad 48px, 64px from 1024px. The carousel shows 88% slides on phones and, from 768px, the active slide at full width minus 40px. Benefits become three columns divided by hairlines from 900px; the four-hour rail gains its own 56px time column from 900px; plans go three-up from 900px.

Breakpoints: 390, 480, 640, 768, 900 (landing only), 1024px.

## Elevation & Depth

Flat by default. Depth comes from tonal steps (Night Green → Counter Green → Raised Green) and 1px hairlines. The only drop shadow belongs to modal layers, which float over a 72% green-black backdrop. State is drawn with inset 1px rings, never with lift: the selected segment, the selected time slot, the checked plan option, and the recommended plan card.

### Shadow Vocabulary
- **Overlay** (`box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.3)`): dialogs, side sheets and bottom sheets only.

Rail nodes use a solid knockout ring in the ground color (3–4px) so the rail appears to pass behind them; that is a drawing device, not elevation.

### Named Rules
**The Overlay-Only Shadow Rule.** A surface casts a shadow only when it floats as a modal layer. Cards, indicators, plan cards and buttons stay flat.

**The One Card Deep Rule.** Cards never nest. A list inside a card drops its own row frames (flat rows that highlight on hover).

## Shapes

Gently rounded, never pill-shaped except true tracks and dots. Controls (buttons, inputs, nav items, day cells, time slots, options, alerts, segmented track, icon tiles) use 10px (`control`); containers (cards, indicators, appointment cards, demo panels, plan cards, carousel frames, booking options) use 16px (`card`); dialogs and the landing closing panel use 20px (`dialog`); small buttons, badges, grid blocks, skeletons and segmented items use 8px (`sm`). Full rounding is reserved for progress bars, the toggle, booking step bars, carousel dots, scrollbar thumbs and circles (avatars, rail nodes, the confirmation icon). WhatsApp message bubbles round 4px at the top-left (the tail) and 16px elsewhere. On phones, dialogs become bottom sheets rounded only at the top (20px). Borders are always 1px, dashed only for free slots, breaks, disabled times and blocks awaiting a deposit.

## Components

### Buttons
Solid and direct; weight 700, 1px press nudge, 120ms color transitions.
- **Shape:** 10px radius, 44px tall, 16px padding; small 36px, 12px padding, 8px radius; icon-only buttons square (44 / 36px); landing CTAs 48px with 20px padding.
- **Primary:** Workshop Emerald with white text; hover `brand-primary-hover`, press `brand-primary-pressed`. One per view.
- **Secondary:** Raised Green with a Hairline Strong edge; hover steps to the raised-hover tone with a Control Edge border.
- **Ghost:** transparent, Sage text; hover gains a Raised Green fill and Chalk text. Close, back, pause/repeat, icon actions.
- **Danger / Danger outline:** red fill with dark `on-error` text for confirmed destructive steps; a red-outline variant opens that confirmation.
- **States:** disabled 55% opacity; loading swaps in a 16px spinner with `aria-busy`. Focus is the global 2px Mint Text outline offset 2px.
- **Links:** Mint Text, 600, underline on hover, often with a trailing arrow.

### Chips (status badges)
- **Style:** 24px tall, 8px radius, 1px tone border over the tone background, 0.75rem/700 text, 13px icon at stroke 2.2.
- **Tones:** info, success, attention, neutral, danger, assigned only through `TOM_STATUS`.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** Counter Green; header and footer bands separated by hairlines.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px Hairline.
- **Internal Padding:** 20px; flush cards put 16/20px on header, body and footer bands.
- **Indicators:** label, bold tabular value, caption detail, and from 640px a 44px icon tile (neutral, or Selected Pine with accent icon for the primary tone, red for danger). The `destaque` variant marks the page's main figure with a wider column and a larger value, so a row of indicators never has identical weights.

### Inputs / Fields
- **Style:** Field Green fill, 1px Control Edge border, 10px radius, 44px tall, 1rem text; 0.875rem/600 label above, Sage hint below; autofill keeps the field tone.
- **Hover / Focus:** hover lifts the border to Faded Sage; focus draws a 2px Mint Text outline offset 1px and turns the border Signal Emerald.
- **Error / Disabled:** red border and red outline on focus, plus a red icon-and-text message; disabled 60% opacity.
- **Selectable options** (time slots, payment methods, plan choice at signup): Field Green with Control Edge; hover border goes accent; chosen state is Selected Pine, accent border plus inset ring, Mint Text label at 700. Unavailable times are dashed at 60%.
- **Segmented control:** Field Green track, 2px padding; the selected segment is Selected Pine with Mint Text and an inset success-border ring (180ms).
- **Toggle:** 40×24 track, Control Edge off, Signal Emerald on with a Night Green knob.

### Navigation
- **Sidebar:** 42px items, 20px Lucide icons at stroke 1.9, 600 weight, Sage; hover Raised Green; the active item is Selected Pine with Mint Text. Groups carry small sentence-case headings in Faded Sage.
- **Bottom nav:** equal columns, icon over a 0.75rem label; active in Mint Text with a 4px dot below.
- **Landing header:** solid Counter Green, logo left; Demonstração (from 640px), Planos and Entrar (secondary small button) right, all 44px targets.
- **Brand:** the vectorized approved logo (`Marca`, symbol-only `SimboloBarbium`), caps and wordmark in currentColor, stripes in Signal Emerald. Static files in public/brand and public/icons are generated from it by scripts/vetorizar-logo.mjs and scripts/gerar-marca.mjs; never redraw it by hand.

### Dialogs and Sheets
Native `<dialog>` on Raised Green with a Hairline Strong edge, 20px radius and the overlay shadow; footer band on Counter Green. Centered up to 480px, or a 460px full-height side sheet on desktop; below 640px every dialog is a bottom sheet (max 92dvh) whose footer buttons share the width. Enter in 180ms (`motion-normal`, `ease-out`): rise 8px with 0.98 scale, slide 16px from the right, or slide up 24px; the backdrop fades. Exit in 120ms (`motion-fast`, `ease-in-out`) with the content kept in place until it disappears; reduced motion closes immediately. Esc and backdrop close unless an operation is in flight; focus returns to the trigger. Destructive steps go through a confirmation dialog.

### Agenda (signature)
- **Week strip:** seven 60px day cells on Counter Green with Hairline Strong edges (weekday caption over a 1.125rem/700 number); the selected day is Selected Pine with an accent border and Mint Text; today carries a 4px accent dot.
- **Time-rail list:** 52px right-aligned time column, 1px rail with a 9px node, and an appointment card (avatar, 700 client name, status badge, Sage service, meta row, chevron). Cancelled and no-show names fall to Sage.
- **"Agora":** the appointment in progress by real clock time gets a Mint Text time, an accent node and an accent-edged card. Never a stored status.
- **Per-professional grid (desktop):** 64px hour column, one column per professional (min 200px, horizontal scroll), solid hour lines, dashed half-hours, a 2px accent "now" line, and 8px-radius blocks on solid status backgrounds with icon-and-word status. *Verified from code only with real multi-professional data.*
- **Detail panel:** any card or block opens one shared panel (side sheet on desktop, bottom sheet on phones) with a facts list (Sage label left, bold tabular value right), only the valid status transitions, and a collapsible history on its own rail.

### Landing rail and demo (signature)
- **Opening demo:** two Counter Green panels — the booking link with 14:00 chosen and "Confirmar horário", and today's agenda on the rail — running an 8s sequence where the confirmed booking opens a gap and lands as an accent-edged Selected Pine row. Pause/continue and repeat controls; it runs only while visible and is static and complete under reduced motion. Captioned as an example with fictional data.
- **Four-hour rail:** the 1px rail with a 2px accent progress line that follows the scroll and lights each reached node (240ms); all lit under reduced motion.
- **Carousel "Por dentro do Barbium":** manual, scroll-snapped 16:9 frames with 16px radius, arrow buttons, 44px-tall dots (the current one a 20px accent bar) and a counter; artworks labelled "Prévia ilustrativa".
- **Plans:** three Counter Green plan cards (24px padding); the recommended plan gets an accent border plus inset ring; prices swap with a 180ms fade, never moving the cards; the WhatsApp add-on sits in its own card with a Selected Pine icon tile.

### Lists, Tables and States
- **List rows:** 64px minimum, hairline-separated, 700 title, Sage sub-line, tabular trailing values, Faded Sage chevron; linked rows highlight on hover.
- **Tables:** uppercase caption headers, 12/20px cells, hover rows; stacked rows below 768px.
- **Empty state:** centered 48px neutral icon tile, 1rem/700 title, Sage description capped at 44ch, optional action.
- **Skeleton:** Raised Green blocks pulsing at 1.4s.
- **Alerts:** 10px radius, tone background and border, tone-colored icon, Chalk text.
- **Saved feedback:** success-colored icon and word inline. Received money uses `success-fg` with a "+" sign.

### Motion
Four duration tokens: `motion-fast` 120ms (hover, press, dialog exit), `motion-normal` 180ms (selection, segmented, price swap, dialog enter), `motion-expand` 240ms (FAQ, rail progress, demo rows), `motion-reveal` 350ms (landing opening, once, 12px rise). `ease-out` is `cubic-bezier(0.22, 1, 0.36, 1)`; `ease-in-out` is `cubic-bezier(0.4, 0, 0.2, 1)`. Landing sections reveal once on entering view. Under `prefers-reduced-motion` CSS collapses animations, removes press nudges and positional transitions, and every JS motion (demo sequence, rail progress, section reveal, carousel smooth scroll, dialog exit) is skipped; color and opacity feedback remains, and the spinner keeps a slow 1.4s turn.

## Do's and Don'ts

### Do:
- **Do** keep one Workshop Emerald button per view, with white text; everything else is secondary, ghost or link.
- **Do** mark selection, progress, links and received money with the accent (`brand-accent` for signals, `brand-accent-text` for text, `brand-selected-bg` behind chosen items).
- **Do** pair every status tone with its Lucide icon and word through `TOM_STATUS` and `ICONE_STATUS`.
- **Do** set every time, date and amount in tabular figures, pt-BR format and Brasília time.
- **Do** build depth from tonal steps and 1px hairlines; bound controls with `border-control`.
- **Do** keep interactive targets at least 44px (36px only for small buttons in dense rows and headers).
- **Do** use the motion tokens (120 / 180 / 240 / 350ms) and make every animation static and complete under reduced motion.
- **Do** caption interface examples as "exemplo" and carousel artworks as "Prévia ilustrativa".
- **Do** take checkout colors from docs/CHECKOUT_CAKTO_CORES.md, which derives from these tokens.

### Don't:
- **Don't** fill buttons with the accent green or put small white text on `brand-accent`.
- **Don't** use red for cancelled appointments or neutral information.
- **Don't** add shadows to cards, indicators, plan cards or buttons; the overlay shadow belongs to dialogs and sheets.
- **Don't** nest bordered cards; flatten rows inside a card.
- **Don't** add neon, glow, decorative gradients, glass or backdrop blur, green shadows, particles or moving backgrounds.
- **Don't** introduce a second typeface or icon family, or weights above 700.
- **Don't** mark "Agora" or any status the data does not support.
- **Don't** put uppercase eyebrow or kicker labels above titles; uppercase is limited to table column headers.
- **Don't** redraw or recolor the logo; regenerate it from the approved file with the scripts.
