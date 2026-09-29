---
name: Barbium
description: Calm operations console for a barbershop's day — schedule and money readable at a glance, in plain Portuguese.
colors:
  bg: "#0d1110"
  surface: "#131a16"
  card: "#19221c"
  card-hover: "#1f2a23"
  border: "#2a362e"
  border-strong: "#3a4a40"
  text: "#f4f7f5"
  text-muted: "#a3afa7"
  text-subtle: "#84928a"
  primary: "#4ade80"
  primary-hover: "#6be597"
  primary-press: "#3bc96f"
  primary-ink: "#0b1a10"
  primary-soft: "rgba(74, 222, 128, 0.12)"
  primary-border: "rgba(74, 222, 128, 0.4)"
  info: "#7cb6fa"
  info-soft: "rgba(96, 165, 250, 0.12)"
  info-surface: "#1a2533"
  warning: "#facc15"
  warning-soft: "rgba(250, 204, 21, 0.1)"
  warning-surface: "#2a2714"
  danger: "#f87171"
  danger-soft: "rgba(248, 113, 113, 0.12)"
  success-surface: "#183021"
  neutral-soft: "rgba(163, 175, 167, 0.1)"
typography:
  display:
    fontFamily: "Manrope, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  metric:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 800
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
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.5
  caption:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  sm: "8px"
  md: "10px"
  lg: "14px"
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
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-primary-active:
    backgroundColor: "{colors.primary-press}"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.card-hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-small:
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "36px"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
    padding: "20px"
  badge-info:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.info}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "24px"
  badge-success:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "24px"
  badge-attention:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "24px"
  badge-neutral:
    backgroundColor: "{colors.neutral-soft}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "24px"
  nav-item:
    textColor: "{colors.text-muted}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "42px"
  nav-item-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
  day-strip-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.md}"
    height: "60px"
  time-slot-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.md}"
    height: "44px"
---

<!-- Provenance: recorded from the shipped build (src/app/globals.css, src/app/layout.tsx, src/components/ui/*, src/components/app/*, src/components/agenda/agenda-interativa.tsx, src/lib/status-agendamento.ts, src/lib/formatar.ts) after an impeccable finish review (fix → verdict "ship" on the 8 scored fixes; not a fresh full-surface review) and production renders at 390/768/1440. The per-professional agenda grid was verified from code only; it has never been rendered with real multi-professional data. Replaces the superseded "financial terminal" direction entirely. -->

# Design System: Barbium

## Overview

**Creative North Star: "The Calm Front Desk"**

Barbium is the barbershop's front desk after closing time: dark, quiet, and in order. The schedule and the money are the two things on the counter, and everything else steps back. The ground is a deep green-black, surfaces rise one tonal step at a time, and a single mint-green carries every "go" signal: the main action, the current page, the money that came in, the appointment that was done. Everything else is neutral gray-green until a status has something to say.

Density is balanced rather than packed. Pages open with a large title and today's date, then a row of at most four indicators, then working panels. Rows are tall enough for a thumb (44px minimum on every control), times and money always sit in tabular figures, and all copy is plain Brazilian Portuguese. Status is never color alone; it always arrives with an icon and a word.

The world rejects generic neon-on-black SaaS styling and decorative barbershop kitsch. The one piece of barbershop heritage is the brand symbol: the barber pole redrawn as a rounded capsule with diagonal stripes, in the primary green, beside a lowercase "barbium" wordmark.

**Key Characteristics:**
- Deep green-black ground with three tonal surface steps and hairline borders.
- One primary green that doubles as the success tone; blue, yellow and red appear only when they mean something.
- Manrope throughout, weights 400–800, tabular figures for every time and amount.
- Gently rounded forms (8/10/14px), flat at rest; shadows only on overlays.
- One detail panel for every appointment: side sheet on desktop, bottom sheet on phones.

## Colors

A dark, green-tinted neutral field with one mint-green voice and four semantic tones held in reserve.

### Primary
- **Barber Mint** (`primary`): filled primary buttons (with Pine Ink text), active navigation, the selected day in the week strip, the selected booking time, the "Agora" marker, focus rings, text caret and selection, progress fill, positive money values, and the "Concluído"/success tone. Hover lifts to `primary-hover`, press sinks to `primary-press`.
- **Pine Ink** (`primary-ink`): text and icons placed on filled mint (and on filled danger). Never used as a surface.
- **Mint Wash / Mint Edge** (`primary-soft`, `primary-border`): tinted backgrounds and borders for active nav, success badges and alerts, the icon tile of highlighted indicators, and the "Agora" appointment outline.

### Secondary
- **Ledger Blue** (`info`, `info-soft`, `info-surface`): "Confirmado" status and informational alerts. `info-surface` is the solid fill of confirmed blocks in the agenda grid.

### Tertiary
- **Caution Yellow** (`warning`, `warning-soft`, `warning-surface`): "Falta" status and attention alerts.
- **Alarm Red** (`danger`, `danger-soft`): field errors, destructive buttons, negative money values, the danger tone of alerts and indicators.

### Neutral
- **Night Green** (`bg`): page ground, input fill, top bar.
- **Shop Floor** (`surface`): sidebar, bottom nav, card footers, dialog footers, segmented control track, table header band, the public booking header.
- **Counter Top** (`card`): cards, indicators, dialogs, list rows, booking options. `card-hover` is its hover step and the selected segment.
- **Hairline / Hairline Strong** (`border`, `border-strong`): 1px dividers and card edges; the strong step for inputs, dialogs, avatars, scrollbar thumbs, and hover edges.
- **Chalk** (`text`), **Sage Gray** (`text-muted`), **Faded Sage** (`text-subtle`): primary text, secondary text and labels, then placeholders, chevrons, nav group headings and the public footer.
- **Neutral Wash** (`neutral-soft`): the "Cancelado" badge and the default icon tile.

### Named Rules
**The One Green Rule.** Mint is both the brand accent and the success tone. There is no separate success hue; "Concluído", money received and the primary action share the same green.

**The Red Is For Harm Rule.** Red marks errors, destructive actions and negative money only. A cancelled appointment is neutral gray and a no-show is yellow; neither is red.

**The Word-and-Icon Rule.** Every status carries its color, a Lucide icon and its label (Confirmado = calendar-check, Concluído = check-circle, Falta = user-x, Cancelado = circle-slash). Color alone never carries meaning.

## Typography

**Display Font:** Manrope (loaded via next/font, `--font-manrope`), falling back to ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif
**Body Font:** Manrope, same stack
**Label/Mono Font:** none; numbers use Manrope with `tabular-nums`

**Character:** One geometric-humanist sans set at weights 400–800. Headings are heavy and slightly tight; body is plain and even. Hierarchy comes from weight and size, never from a second family.

### Hierarchy
- **Display** (800, 1.75rem mobile → 2.125rem from 768px, 1.2, -0.03em): page titles ("Visão geral", "Agenda") and the login title (1.75rem).
- **Headline** (800, 1.375rem): the public booking header's barbershop name.
- **Metric** (800, 1.375rem mobile → 1.625rem from 1024px, -0.02em, tabular): indicator values; mint when positive, red when negative.
- **Title** (700–800, 1.125rem): card titles, dialog titles, booking step titles, day-strip numbers, next-client times. The appointment client name uses 800 at 1rem.
- **Body** (400, 0.9375rem, 1.5): default text, table cells, nav items (600). Inputs render at 1rem so phones never zoom. Page descriptions use 1rem muted.
- **Label** (700, 0.8125rem): field labels, small buttons, segmented items; secondary lines at 400–600 in Sage Gray.
- **Caption** (600–700, 0.75rem): badges, indicator details, bottom-nav labels, nav group headings, grid blocks. Table column headers are the only uppercase text (700, 0.75rem, 0.04em tracking).

### Named Rules
**The Tabular Figures Rule.** Every time, date, amount and count sits in tabular figures (`<time>`, `.num`, tables, lists, facts, indicators) so columns of numbers align.

**The Plain Portuguese Rule.** Dates, money and times follow pt-BR format in the Brasília time zone ("R$ 30,00", "22/09 13:25", "Terça-feira, 22 de setembro"), in sentence case.

## Layout

A 4px spacing scale (4, 8, 12, 16, 20, 24, 32, 40, 48) drives every gap. Content lives in a centered main column capped at 1320px.

- **Desktop (≥1024px):** a sticky 256px sidebar on Shop Floor (wordmark, barbershop context tile, grouped nav, user summary and sign-out pinned to the bottom) beside the main column, padded 32px. Working panels use a 2:1 grid (main panel beside a min-300px side panel) or 1:1.
- **Below 1024px:** a 60px sticky top bar (wordmark, barbershop name, avatar) and a fixed 64px bottom nav with at most four destinations plus "Mais", which opens the remaining sections in a sheet. Main padding is 16px (24px from 768px) with bottom clearance for the nav and the safe area.
- **Page header:** title and description on the left, actions on the right, bottom-aligned; below 768px actions go full width and the primary button stretches.
- **Indicators:** two columns on phones, up to four (`--indicadores-colunas`) from 1024px. Their icon tile only appears from 640px.
- **Tables:** below 768px, responsive tables collapse into stacked rows, each cell showing its column name as an inline label.
- **Forms:** single column, two columns from 640px where paired; sections are separated by a hairline and 20px.
- **Public booking and auth:** a single centered column (560px for booking, 400px for login) with no app shell.

Breakpoints: 640px (sheets, form pairs, indicator icons), 768px (tables, type step, padding), 1024px (shell switch, grids).

## Elevation & Depth

Flat by default. Depth comes from tonal steps (Night Green → Shop Floor → Counter Top → hover) and 1px hairlines, not shadows. The only shadow in the system belongs to overlays; it sits under a 70% green-black backdrop.

### Shadow Vocabulary
- **Overlay** (`box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.35)`): dialogs, side sheets and bottom sheets only.

Inset 1px rings (not drop shadows) mark state: the selected segment, and the "Agora" appointment card or grid block.

### Named Rules
**The Overlay-Only Shadow Rule.** A surface casts a shadow only when it floats above the page as a modal layer. Cards, indicators and buttons stay flat.

**The One Card Deep Rule.** Cards never nest. A list placed inside a card drops its own row frames (flat rows that highlight on hover) instead of stacking bordered cards inside a bordered card.

## Shapes

Gently rounded, never pill-shaped except for true tracks. Controls (buttons, inputs, nav items, day cells, time slots, alerts) use 10px; containers (cards, indicators, appointment cards, booking options, dialogs, empty-state icon tiles) use 14px; small elements (small buttons, badges, grid blocks, skeletons, icon tiles) use 8px; segmented items use 7px to sit inside their 10px track. Full rounding is reserved for the progress bar, the toggle, booking step bars, scrollbar thumbs, and circles (avatars, dots, the confirmation icon). On phones, dialogs become bottom sheets with only the top corners rounded (14px). Borders are always 1px.

## Components

### Buttons
Solid and direct; weight 700 with a 1px press nudge.
- **Shape:** gently rounded (10px), 44px tall, 16px horizontal padding; small variant 36px, 12px padding, 8px radius; icon-only variants are square (44 / 36px).
- **Primary:** Barber Mint fill with Pine Ink text; hover `primary-hover`, press `primary-press`. One per view, for the main action ("Novo agendamento").
- **Secondary:** Counter Top fill with a hairline; hover steps to `card-hover` with a strong hairline.
- **Ghost:** transparent, Sage Gray text; hover gains a Counter Top fill and Chalk text. Used for close, back and icon actions.
- **Danger / Danger outline:** red fill with Pine Ink text for confirmed destructive actions; a red-outline variant for the button that opens that confirmation.
- **States:** disabled at 55% opacity; loading swaps in a 16px spinner. Focus uses the global 2px mint outline offset 2px. Transitions run 120ms ease-out.
- **Links:** mint, 700, underline on hover, usually with a trailing arrow ("Abrir agenda →").

### Chips (Status badges)
- **Style:** 24px tall, 8px radius, 1px tinted border over a tinted wash, 0.75rem/700 text, 13px icon.
- **Tones:** info (Confirmado), success in mint (Concluído), attention (Falta), neutral (Cancelado), danger (errors only). `TOM_STATUS` in `src/lib/status-agendamento.ts` is the single mapping.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** Counter Top; header and footer bands separated by hairlines, footers on Shop Floor.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px Hairline.
- **Internal Padding:** 20px; flush cards put 16/20px on their header, body and footer bands.
- **Indicators:** a card holding an icon tile (44px, tinted by tone), a muted label, a heavy tabular value and a caption detail.

### Inputs / Fields
- **Style:** Night Green fill, 1px Hairline Strong border, 10px radius, 44px tall, 1rem text; bold 0.8125rem label above, muted hint below. Selects use a custom chevron; search and filter selects carry a leading icon.
- **Focus:** border turns mint with a 3px Mint Wash ring.
- **Error / Disabled:** red border plus a red icon-and-text message; disabled at 60% opacity.
- **Segmented control:** a Shop Floor track with 3px padding; the selected segment sits on `card-hover` with an inset hairline. Used for view switches (Dia / Semana / Mês / Período) and radio choices.
- **Toggle:** 40×24 track, Hairline Strong when off, mint when on with a Pine Ink knob.

### Navigation
- **Sidebar:** 42px items, 20px Lucide icons at stroke 1.9, 600 weight, Sage Gray; hover gets a Counter Top fill; the active item (the most specific matching route) gets Mint Wash and mint text. Groups carry small sentence-case headings in Faded Sage.
- **Bottom nav:** equal columns, 22px icon over a 0.75rem label; active is mint with a 4px dot below. "Mais" opens a sheet listing the other sections and sign-out.
- **Brand:** the barber-pole symbol in mint beside a lowercase "barbium" at 800, -0.035em.

### Dialogs and Sheets
Native `<dialog>`, Counter Top, Hairline Strong edge, 14px radius, overlay shadow. Centered at up to 480px, or as a 460px full-height side sheet on desktop. Below 640px every dialog becomes a bottom sheet (max 92dvh) whose footer buttons share the width. They enter with a 220ms ease-out (rise-and-scale, slide from the right, or slide up). Background scroll locks with scrollbar-width compensation; Esc and backdrop close unless an operation is in flight; focus returns to the trigger. Destructive steps go through a confirmation dialog.

### Agenda (signature)
- **Week strip:** seven 60px day cells on Shop Floor (weekday caption over an 800-weight number); the selected day is filled mint; today carries a 4px mint dot.
- **Time-rail list:** a 52px right-aligned time column, a 1px vertical rail with a 9px node, and an appointment card (avatar, 800-weight client name, status badge, muted service, meta row with professional and duration, chevron). Times are grouped per day. Cancelled and no-show names fall to Sage Gray.
- **"Agora":** the appointment in progress by real clock time gets a mint time, a mint node and a mint-edged card. It is never a stored status.
- **Per-professional grid (desktop):** a 64px hour column plus one column per professional (min 200px, horizontal scroll), hour lines solid, half-hours dashed, a 2px mint "now" line, and absolutely positioned 8px-radius blocks on solid status surfaces (info / success / warning; cancelled on Shop Floor) with an icon-and-word status. *Verified from code only; never rendered with real multi-professional data. Known defect: two appointments starting at the same time in one column overlap.*
- **Detail panel:** tapping any card or block opens one shared panel (side sheet on desktop, bottom sheet on phones) with a facts list (muted label left, bold tabular value right) and only the valid status transitions.

### Lists, Tables and States
- **List rows:** 64px minimum, hairline-separated, 700 title and muted sub-line, tabular trailing values, subtle chevron; linked rows highlight on hover.
- **Tables:** uppercase caption headers on a Shop Floor band, 12/20px cells, hover rows; stacked-row mode below 768px.
- **Empty state:** centered 48px icon tile, 1rem/700 title, muted description capped at 44ch, optional action.
- **Skeleton:** `card-hover` blocks pulsing at 1.4s.
- **Alerts:** 10px radius, tinted wash and border by tone, tone-colored icon, Chalk text.

### Public Booking
A four-step progress row of 3px bars (mint when done or current), a stack of 64px booking options on Counter Top with a heavy price, a horizontally snapping day strip, and a grid of 44px time slots (min 84px) that fill mint when chosen. Confirmation shows a 56px mint-wash circle icon.

## Do's and Don'ts

### Do:
- **Do** keep one filled mint button per view, for the main action; everything else is secondary, ghost or link.
- **Do** pair every status color with its Lucide icon and word, using `TOM_STATUS` and `ICONE_STATUS`.
- **Do** set every time, date and amount in tabular figures, in pt-BR format and Brasília time.
- **Do** build depth from the tonal steps (`bg` → `surface` → `card` → `card-hover`) and 1px hairlines.
- **Do** keep every interactive target at least 44px tall (36px only for small buttons inside dense rows and headers).
- **Do** open appointment details in the shared panel: side sheet from 640px, bottom sheet below.
- **Do** respect reduced motion; the stylesheet collapses animations and transitions to near zero (the spinner keeps a slow turn).

### Don't:
- **Don't** use red for cancelled appointments or neutral information; red is for errors, destructive actions and negative money.
- **Don't** add shadows to cards, indicators or buttons; the overlay shadow belongs to dialogs and sheets.
- **Don't** nest bordered cards; flatten rows inside a card.
- **Don't** add glow, glass, backdrop blur or decorative gradients; the build uses none.
- **Don't** introduce a second typeface or icon family; Manrope and Lucide at stroke ~1.9–2.2 only.
- **Don't** mark "Agora" or any status that the data does not support; "Agora" comes from the real clock.
- **Don't** put uppercase eyebrow or kicker labels above titles; uppercase is limited to table column headers.
