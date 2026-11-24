# Prompt de implementação — Barbium
## Redesign da landing page e identidade visual aplicada ao sistema inteiro

Ambiente de execução: Claude Code no VS Code, com o repositório da Barbium aberto. As imagens fornecidas ficarão em `docs/images`. Esta pasta é a origem dos arquivos, não uma URL pública garantida.

Implemente o redesign visual da Barbium no projeto existente. A landing page e todas as interfaces próprias do produto devem compartilhar um único design system: cores sólidas, verdes sóbrios, tipografia Manrope, componentes consistentes e animações discretas.

O projeto já possui Impeccable. Use a instalação existente para orientar a implementação e revisar o resultado. Execute o trabalho até entregar código funcional, validação e documentação; uma análise ou proposta isolada não conclui esta tarefa.

## 1. Contexto e referências

Produto: SaaS de gerenciamento de barbearias, usado por proprietários e profissionais, principalmente pelo celular. O público precisa agendar, acompanhar atendimentos, consultar clientes, registrar pagamentos e entender o caixa rapidamente.

Referência funcional principal:
- https://barbium.vercel.app/ — preserve o produto, as funcionalidades e a linguagem comercial existentes, melhorando a apresentação.
- Na versão analisada, a narrativa “hora a hora” possui sete etapas, os planos são Solo, Barbearia e Rede, e o WhatsApp é adicional. Confira as configurações atuais no código antes de alterar qualquer apresentação comercial.

Referências de direção, sem copiar identidades ou funcionalidades:
- https://linear.app/ — estudar hierarquia, apresentação do produto e organização de interfaces. A interpretação para a Barbium deve usar a paleta definida neste documento.
- https://cal.com/ — estudar a clareza do fluxo de escolha de serviço, profissional, data e horário. Não importar recursos que a Barbium não oferece.
- https://fonts.google.com/specimen/Manrope — família tipográfica já identificada na landing page.

Identidade aprovada:
- Logo horizontal: https://chatgpt.com/library?file_id=libfile_0a8fb66ee35881919d2fffd1eea5c1af&account_id=personal
- Logo compacta, 300 × 250: https://chatgpt.com/library?file_id=libfile_54fd227409c08191ac4ecf4096cb554e&account_id=personal
- Símbolo: poste de barbeiro minimalista, com três faixas diagonais e tampas horizontais arredondadas.
- Use os arquivos aprovados existentes no repositório ou anexados ao trabalho. Links privados de arquivos podem exigir acesso separado; não pressuponha que o editor consiga baixá-los.
- As referências antigas servem para a forma da marca; a paleta deste prompt é a especificação final de cores. Preserve proporções e legibilidade.

Referências técnicas:
- Impeccable: https://impeccable.style/ e https://github.com/pbakaus/impeccable
- Movimento reduzido: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion
- Contraste: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html

## 2. Primeiro, conheça o projeto

Leia CLAUDE.md, AGENTS.md, package.json, documentação, rotas, layouts, componentes e arquivos de tema existentes. Identifique a stack, o gerenciador de pacotes e as bibliotecas de UI e animação realmente instaladas.

Localize e leia as instruções da versão instalada do Impeccable. A sintaxe e os nomes de comandos variam entre versões e ferramentas: use os disponíveis no projeto. Não reinstale nem atualize a ferramenta apenas para executar este trabalho.

Use, quando disponíveis, as capacidades de critique/audit, extract/document, quieter/distill, typeset/layout, adapt, animate, harden/optimize e polish. Faça uma revisão inicial, implemente as mudanças e repita a revisão ao final.

No Claude, prefira os comandos da versão instalada, por exemplo `/impeccable critique`, `/impeccable audit`, `/impeccable layout`, `/impeccable adapt`, `/impeccable animate` e `/impeccable polish`, com um alvo específico. Se a instalação usar comandos separados, adapte à sintaxe encontrada nos arquivos locais. Não suponha que Impeccable seja uma biblioteca de componentes de runtime.

Crie uma lista das rotas e superfícies visuais, incluindo as renderizadas em portais. Registre problemas e prioridades brevemente e prossiga com a implementação.

## 3. Direção visual

A interface deve parecer um produto de gestão confiável, organizado e confortável para uso diário.

- Superfícies escuras com leve tonalidade verde.
- Preenchimentos sólidos e bordas discretas.
- Verde concentrado em ações, seleção e destaques relevantes.
- Hierarquia por tipografia, espaçamento e contraste.
- Densidade adequada ao trabalho: a landing page pode ter mais respiro; a agenda e as tabelas devem facilitar a leitura rápida.
- Evitar neon, glow, gradientes decorativos, vidro excessivo, sombras verdes, partículas e fundos em movimento.
- Evitar cartões dentro de cartões quando uma separação por espaço ou linha resolver.
- Preservar regras de negócio, permissões, autenticação, integrações e cálculos. Este é um trabalho de apresentação e experiência.

## 4. Paleta oficial e tokens globais

Defina os tokens em uma fonte central, carregada por todas as rotas. Adapte os nomes e o formato ao sistema de temas existente; não crie um tema paralelo só para a landing page.

```css
:root {
  color-scheme: dark;

  --bg-page: #0D1110;
  --bg-surface: #18231C;
  --bg-surface-raised: #1E2C23;
  --bg-input: #111A15;

  --brand-primary: #047857;
  --brand-primary-hover: #065F46;
  --brand-primary-pressed: #064E3B;
  --on-primary: #FFFFFF;

  --brand-accent: #10B981;
  --brand-accent-text: #6EE7B7;
  --brand-selected-bg: #123D2C;

  --text-primary: #F4F7F5;
  --text-secondary: #A3AFA7;
  --text-muted: #91A398;

  --border-subtle: #2C3B32;
  --border-control: #637D6C;
  --focus-ring: #6EE7B7;

  --success-fg: #6EE7B7;
  --success-bg: #123D2C;
  --warning-fg: #FBBF24;
  --warning-bg: #382D16;
  --error-fg: #F87171;
  --error-bg: #3B1D23;
  --info-fg: #93C5FD;
  --info-bg: #172A3E;

  --radius-control: 10px;
  --radius-card: 16px;
  --radius-dialog: 20px;

  --motion-fast: 120ms;
  --motion-normal: 180ms;
  --motion-expand: 240ms;
  --motion-reveal: 350ms;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

Aplicação obrigatória:

| Elemento | Tokens |
|---|---|
| Fundo da landing page e do aplicativo | bg-page |
| Cartões, sidebar e cabeçalhos | bg-surface |
| Modais, menus e popovers | bg-surface-raised |
| Campos, selects e áreas de texto | bg-input |
| Botão principal | brand-primary + on-primary |
| Hover e pressionamento do botão principal | brand-primary-hover / brand-primary-pressed |
| Links em fundo escuro | brand-accent-text |
| Ícones de destaque e progresso | brand-accent |
| Item selecionado | brand-selected-bg + brand-accent-text |
| Texto e rótulos | text-primary / text-secondary |
| Texto auxiliar legível | text-muted |
| Separação decorativa | border-subtle |
| Limite de campo que precisa ser identificado | border-control |
| Foco de teclado | focus-ring |

Regras:
- Branco sobre #047857 para botões; não usar o esmeralda claro com texto branco pequeno.
- #047857 não deve ser a cor de links pequenos em fundo escuro; usar brand-accent-text.
- border-subtle é decorativa. Validar contraste dos limites e estados de controles; não reutilizá-la cegamente em campos.
- Vermelho, âmbar e azul ficam restritos a significado semântico, sempre acompanhados de texto ou ícone.
- Centralizar variantes e cores derivadas. Não espalhar novos hexadecimais, classes arbitrárias e estilos inline pelas páginas.
- Se houver Tailwind, shadcn, CSS Modules ou outra solução instalada, integrar seus tokens corretamente, respeitando o formato esperado por sua versão.
- O tema precisa alcançar portais, autofill, calendários, gráficos, toasts e componentes de terceiros.
- Se já existir modo claro ou personalização por barbearia, preservar escolhas explícitas e dados existentes. A identidade Barbium definida aqui será o padrão e a base dos componentes compartilhados.

## 5. Escopo: sistema inteiro

Aplique a identidade às superfícies existentes, confirmando quais estão presentes:
- Landing page, login, cadastro, recuperação de senha e onboarding.
- Dashboard, agenda, atendimentos e histórico.
- Clientes, profissionais, serviços e horários de funcionamento.
- Caixa, pagamentos, comissões, relatórios e indicadores.
- Configurações, perfil, assinatura, planos e integração com WhatsApp.
- Agendamento público e fluxos de remarcar/cancelar.
- Modais, drawers, menus, tabs, tooltips, selects, datepickers e notificações.
- Estados vazios, carregamento, sucesso, erro, falta de permissão e páginas de erro.

Replicar identidade não significa repetir o layout promocional dentro do painel. Compartilhe tokens, tipografia, componentes e estados, adaptando a composição à tarefa.

Telas hospedadas na Cakto ou em outro domínio não herdam o CSS do aplicativo. Para o checkout externo, documente o mapeamento das cores nos controles de personalização disponíveis; mantenha os links e a integração de pagamento.

## 6. Tipografia, medidas e componentes

Mantenha Manrope e reutilize o carregamento já existente. Pesos preferenciais: 400, 500, 600 e 700; 800 apenas quando necessário.

- H1 da landing: clamp(2rem, 4.5vw, 3.75rem), entrelinha aproximada 1.08.
- H2: clamp(1.75rem, 3vw, 2.5rem).
- Títulos do aplicativo: 24–32px, adequados à largura.
- Corpo: 16px; textos de apoio: 14px. Campos no celular: pelo menos 16px.
- Números financeiros e horários: algarismos tabulares; manter formatos brasileiros.
- Espaçamento baseado em 4/8px: 4, 8, 12, 16, 24, 32, 48 e 64.
- Landing: container de aproximadamente 1120–1200px, com margens de 16–20px no celular.
- Controles importantes com área de toque de 44px ou mais.
- Uma família de ícones consistente, preferindo a já instalada.

Normalize componentes compartilhados: Button, Input, Select, Textarea, Checkbox, Switch, Badge, Tabs, Card, Table, Dialog/Drawer, Toast e Tooltip, conforme a arquitetura existente. Inclua default, hover, focus-visible, active, disabled, loading, invalid e selected.

A elevação de cartões no hover deve ocorrer somente quando forem interativos. Campos devem ter labels persistentes e mensagens de erro associadas.

## 7. Nova estrutura da landing page

### Cabeçalho
Mantenha o cabeçalho fixo existente, com fundo sólido e borda discreta. Padronize a logo aprovada. No desktop, mantenha navegação clara para demonstração, planos e entrada. No celular, preserve o acesso a Planos e Entrar; use menu acessível se necessário.

### Abertura
Encurte o texto e reduza o vazio acima do título. Use:

Título: “Agenda, caixa e comissões em um só lugar.”
Apoio: “Seu cliente agenda pelo link. Você acompanha os atendimentos e fecha o caixa com as comissões calculadas.”
CTA principal: “Começar 7 dias grátis”.
Apoio ao CTA: “Sem cartão no teste”, se continuar verdadeiro na configuração atual.

Mantenha acesso direto aos preços e inclua demonstração quando houver espaço. Preserve rotas, parâmetros e rastreamento existentes.

No desktop, texto de um lado e demonstração da agenda do outro. No celular, texto e CTA primeiro, demonstração depois, sem altura artificial de 100vh.

Use as artes fornecidas como prévias ilustrativas, preservando essa identificação. Para demonstrações interativas, reutilize componentes reais do produto com dados fictícios, identificados como exemplo. Não apresente as artes geradas como capturas reais ou evidência de uma funcionalidade ausente.

### Benefícios
Apresente três benefícios curtos: organizar os horários, acompanhar o atendimento e entender caixa/comissões. Use exemplos visuais, evitando repetir parágrafos da seção seguinte.

### Fluxo da barbearia
Agrupe a sequência atual em quatro etapas:
1. Cliente agenda pelo link.
2. Confirmação, lembrete e alterações pelo WhatsApp, identificando o adicional.
3. Atendimento passa por seus estados reais.
4. Conclusão atualiza caixa e comissões conforme as regras existentes.

Preserve a ideia “hora a hora”. No celular, coloque o horário acima do conteúdo e elimine a coluna lateral larga. Cada etapa terá título, até duas frases e uma demonstração compacta. Detalhes operacionais devem ir para FAQ ou ajuda apropriada.

### Planos e WhatsApp
Use a fonte comercial existente no código. Não duplique preços ou calcule descontos separadamente do modelo usado na assinatura.

- Preservar planos, limites e períodos existentes.
- Destacar Barbearia com borda de marca, botão preenchido e indicação “Recomendado para equipes”.
- Não afirmar “mais vendido” sem dados reais.
- Exibir cobrança total e equivalente mensal com clareza para semestral/anual.
- Dar ao adicional WhatsApp um cartão próprio, com descrição breve, preço e indicação de cobrança adicional.
- Se o preço variar conforme o período, refletir a regra existente.
- Só oferecer um seletor de adicional se o fluxo real suportar e preservar essa escolha até o cadastro/checkout.
- Não adicionar recursos pagos automaticamente nem mudar condições comerciais.

### FAQ, encerramento e rodapé
Mantenha as dúvidas úteis, com respostas curtas e acessíveis. Preserve o CTA final e o contato existente. Adicione links institucionais somente quando as páginas e informações existirem.

Use depoimentos ou métricas apenas se forem reais e autorizados. A demonstração do produto deve sustentar a apresentação enquanto não houver esses materiais.

## 7A. Imagens e carrossel — origem em docs/images

Inspecione `docs/images` antes de implementar. Os arquivos entregues seguem esta ordem:

| Ordem | Arquivo principal | Conteúdo |
|---|---|---|
| 1 | `docs/images/barbium-01-visao-geral.webp` | Visão geral da agenda no computador e no celular |
| 2 | `docs/images/barbium-02-agendamento.webp` | Agendamento pelo link |
| 3 | `docs/images/barbium-03-whatsapp-automatico.webp` | Confirmações e lembretes; adicional |
| 4 | `docs/images/barbium-04-atendimentos.webp` | Acompanhamento dos atendimentos |
| 5 | `docs/images/barbium-05-caixa-comissoes.webp` | Caixa e comissões |

Cada arquivo também possui uma versão `.png` com o mesmo nome-base. As versões finais são 1920 × 1080 pixels, proporção 16:9. Use o manifesto `docs/images/carrossel.json` para títulos, descrições, ordem e textos alternativos.

Regras de integração:
- Preserve `docs/images` como origem dos arquivos. Adapte a publicação à stack encontrada. Se for necessário servir por uma pasta pública, configure uma cópia local ou de build para `public/images/barbium`, ou utilize importação de assets compatível com a versão do framework. Não mova nem apague a origem.
- Não use `/docs/images/arquivo.webp` como URL sem confirmar que o projeto serve esse caminho. Verifique as imagens no navegador e no build.
- Prefira WebP no site; mantenha os PNGs para referência e edição.
- Use proporção 16:9, dimensões declaradas e apresentação sem corte. Preserve a logo, os títulos e a identificação “Prévia ilustrativa”.
- No celular, mantenha título e descrição acessíveis também em HTML, usando o manifesto, porque o texto embutido pode ficar pequeno.
- O primeiro slide pode usar carregamento prioritário quando estiver na primeira dobra. Os demais devem carregar sob demanda, conforme os componentes e a stack existentes.
- Use botões reais de anterior/próximo, indicadores com nomes acessíveis, navegação por teclado e gesto de toque quando disponível.
- Comece com navegação manual. Se houver autoplay, ofereça pausa, pause com foco/hover, fora da área visível e em movimento reduzido.
- Não embuta setas, controles ou novas informações comerciais no bitmap. Os controles devem ser componentes HTML.
- Não use links privados de arquivos como URLs de imagens em produção.

## 8. Aplicativo: composição para trabalho diário

- Sidebar com seleção clara; no celular, navegação apropriada sem cobrir conteúdo.
- Dashboard com hierarquia entre indicadores principais e secundários; evitar um conjunto de cartões com pesos idênticos.
- Agenda com distinção entre horário livre, seleção e status de atendimento. Usar texto/ícone além da cor.
- Preservar estados, ações, filtros e mudanças de visualização já disponíveis.
- Tabelas com cabeçalhos legíveis, alinhamento financeiro e ações acessíveis por toque.
- Usar rolagem horizontal localizada para tabelas quando necessária, sem gerar overflow na página inteira.
- Formulários com agrupamento por assunto, ação principal clara e mensagens úteis.
- Gráficos com legendas, marcadores e contrastes que permitam distinguir séries. Não tornar séries diferentes visualmente idênticas.
- Empty states devem explicar o próximo passo com uma ação real.
- Não exibir sucesso em uma operação antes da confirmação do fluxo real.
- Preservar o tratamento de dados pessoais e o acesso por perfil.

## 9. Animações e microinterações

A landing apresenta o produto; o aplicativo responde às ações do usuário. As animações não devem atrasar o trabalho.

| Contexto | Comportamento | Duração |
|---|---|---|
| Abertura da landing | Opacidade e entrada vertical de até 12px | 350ms, uma vez |
| Seções da landing | Revelação leve ao entrar na área visível | 300–350ms, uma vez |
| Demonstração principal | Escolha de horário, confirmação e atualização coerente da agenda | Sequência total de 6–8s |
| Linha do tempo | Progresso e destaque da etapa visível | 180–240ms |
| Hover de botão/cartão interativo | Cor/borda; deslocamento de no máximo 2px quando útil | 120–180ms |
| Tabs e seleção | Indicador e cor de estado | 180ms |
| Troca de preços | Transição discreta, sem deslocar cartões | 180ms |
| FAQ e expansões | Abrir conteúdo e girar seta | 200–240ms |
| Dialog/Drawer | Opacidade e deslocamento curto | Entrada 180ms; saída 120ms |
| Toast | Entrada curta, estável e legível | 180ms |

Regras de implementação:
- Reutilizar a biblioteca já instalada. CSS e recursos nativos são suficientes para efeitos simples.
- Preferir transform e opacity; evitar transition: all.
- A demonstração não envia mensagens, não cria agendamentos e não altera dados reais.
- Oferecer pausa e repetição para demonstrações automáticas prolongadas; pausar fora da área visível e com aba oculta.
- Respeitar prefers-reduced-motion em CSS e na lógica JavaScript: remover movimentos decorativos e autoplay, mantendo todo o conteúdo acessível.
- O conteúdo deve aparecer mesmo se JavaScript falhar; não deixar seções permanentemente com opacity: 0.
- No sistema, não repetir animações de entrada a cada filtro, navegação ou atualização de dados.
- Não animar automaticamente valores de caixa e comissão. Exibir os valores reais de forma estável.
- Preservar funcionamento de scroll, foco, teclado e interações de agenda.

## 10. Acessibilidade e responsividade

- Validar contraste mínimo de 4.5:1 para texto comum e 3:1 para texto grande; verificar também controles e estados.
- Não usar cor como único indicador de status.
- Garantir foco visível, navegação por teclado, labels e ordem lógica.
- Dialogs devem gerenciar foco e permitir fechamento conforme o componente.
- Respeitar safe areas em elementos fixos no celular.
- Links de seção devem considerar a altura do cabeçalho fixo.
- Validar nomes longos, mensagens de erro extensas e números financeiros grandes.
- Testar larguras de 360, 390, 430, 768, 1024 e 1440px, além de zoom de 200%.
- Confirmar ausência de cortes na logo, CTAs escondidos e rolagem horizontal indevida.
- Ajustar o cabeçalho móvel para tornar Planos acessível em uma ação.

## 11. Implementação e validação

Faça a implantação visual nesta ordem:
1. Inventário de rotas e auditoria inicial com Impeccable.
2. Tokens globais e componentes compartilhados.
3. Migração do tema pelas rotas públicas e internas.
4. Reorganização da landing page e integração das imagens de `docs/images`.
5. Microinterações e movimento reduzido.
6. Revisão visual e funcional, com correção dos problemas encontrados.
7. Atualização de DESIGN.md e, quando já utilizado pelo projeto, PRODUCT.md.

Reutilize o gerenciador de pacotes, a arquitetura e as bibliotecas existentes. Evite adicionar dependências para efeitos pequenos. Preserve fronteiras servidor/cliente e carregamento das páginas.

Execute os checks disponíveis e apropriados: build, tipos, lint e testes existentes relevantes. Faça uma verificação funcional com dados de teste dos fluxos afetados: navegação, formulários, filtros, mudança de plano e agenda. Não faça cobranças ou disparos reais como parte da validação visual.

Use revisão no navegador e capturas com dados fictícios para comparar landing, login, dashboard, agenda, formulário e modal, em desktop e celular. Se autenticação ou ambiente impedir alguma verificação, registre a limitação específica; não declare a tela como validada.

## 12. Critérios de aceite e entrega

O trabalho estará concluído quando:
- Landing e sistema consumirem os mesmos tokens globais.
- Cores neon e estilos antigos divergentes tiverem sido migrados nas interfaces alcançáveis.
- Botões, campos, menus e portais seguirem o tema em todos os estados.
- Logo e tipografia estiverem consistentes.
- As cinco imagens de `docs/images` estiverem publicadas corretamente, sem cortes, com ordem e textos alternativos do manifesto.
- A landing estiver mais compacta, com demonstração coerente e preços fáceis de acessar.
- Planos, cobrança e regras comerciais continuarem corretos.
- O aplicativo continuar operável por teclado e toque.
- Animações respeitarem movimento reduzido e não bloquearem conteúdo.
- Os checks apropriados tiverem sido executados, com resultados reais documentados.

Ao finalizar, entregue:
- Resumo das mudanças e principais arquivos.
- Matriz de rotas verificadas, com eventuais pendências.
- Evidências visuais com dados de demonstração.
- Resultados de build, tipos, lint e testes que foram executados.
- DESIGN.md com paleta, componentes, tipografia, estados e movimento.
- Orientações de cores para o checkout externo, quando aplicável.

Comece pela leitura do projeto e pela auditoria inicial, depois implemente o redesign completo.

