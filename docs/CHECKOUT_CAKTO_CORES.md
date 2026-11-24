# Checkout da Cakto: cores e logo do Barbium

O checkout fica no domínio da Cakto e não recebe o CSS do Barbium. Para ele combinar com o site e o painel, aplique os valores abaixo nos campos de personalização que o painel da Cakto oferecer para cada produto ou oferta. Os nomes dos campos variam conforme o painel; use a coluna "Papel" para achar o equivalente.

Os 9 links de checkout e o adicional de WhatsApp (order bump de R$ 60/mês) não mudam. Os links estão em `src/lib/precos.ts` (`CHECKOUT_CAKTO`).

## Cores

| Papel | Cor | Observação |
|---|---|---|
| Cor principal / botão de pagamento | `#047857` | Texto do botão em branco `#FFFFFF`. |
| Botão ao passar o mouse | `#065F46` | Se houver o campo. |
| Destaque (selos, ícones, marcação de opção) | `#10B981` | Não usar como fundo de texto branco pequeno. |
| Links em fundo escuro | `#6EE7B7` | |
| Fundo da página (tema escuro) | `#0D1110` | Se o checkout tiver tema escuro. |
| Fundo de cartões e caixas (tema escuro) | `#18231C` | |
| Texto principal (tema escuro) | `#F4F7F5` | |
| Texto secundário (tema escuro) | `#A3AFA7` | |
| Bordas (tema escuro) | `#2C3B32` | Decorativas. Em campos, prefira `#637D6C`. |

Se o checkout só permitir tema claro, use fundo branco, texto `#0D1110` e mantenha `#047857` como cor principal (contraste com texto branco: 5,5:1).

## Logo

- Fundo claro: `public/brand/barbium-horizontal-claro.png` (PNG transparente, 1200 px de largura) ou `public/brand/barbium-horizontal-claro.svg`.
- Fundo escuro: `public/brand/barbium-horizontal.png` ou `public/brand/barbium-horizontal.svg`.
- Ícone quadrado: `public/icons/icon-512.png`.

Os arquivos foram gerados a partir da logo aprovada em `docs/images` (scripts `scripts/vetorizar-logo.mjs` e `scripts/gerar-marca.mjs`).
