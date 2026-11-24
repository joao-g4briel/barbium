# Carrossel Barbium — HD

Cinco artes ilustrativas para o site, seguindo a identidade verde da Barbium.

## Conteúdo

- `docs/images/`: cinco PNGs, cinco WebPs e `carrossel.json`.
- `docs/Prompt_Implementacao_Barbium_Design_System.md`: prompt completo atualizado para Claude Code no VS Code.
- `docs/PROMPTS_IMAGENS.md`: prompts utilizados na geração das artes.

## Ordem sugerida

| Ordem | Título | Arquivo para o site |
|---|---|---|
| 1 | Seu dia em um só lugar. | `barbium-01-visao-geral.webp` |
| 2 | Seu cliente agenda pelo link. | `barbium-02-agendamento.webp` |
| 3 | Confirmações sem trabalho manual. | `barbium-03-whatsapp-automatico.webp` |
| 4 | Cada atendimento, no seu ritmo. | `barbium-04-atendimentos.webp` |
| 5 | Concluiu? O caixa acompanha. | `barbium-05-caixa-comissoes.webp` |

## Formato

- Arquivos finais: **1920 × 1080 pixels**, proporção **16:9**.
- PNG: versão de referência e edição.
- WebP: versão comprimida para uso no site, qualidade 88.
- As artes foram criadas com geração de imagens e normalizadas sem corte para o tamanho final. Dimensão dos arquivos gerados antes da exportação: 1672x941.
- As interfaces e os dados são ilustrativos; não são capturas do sistema em produção. Essa indicação também aparece nas artes.

## Uso no projeto

Extraia o pacote na raiz do repositório. Os arquivos ficarão em `docs/images`, conforme definido para o projeto.

Abra o prompt em `docs/Prompt_Implementacao_Barbium_Design_System.md` e forneça seu conteúdo ao Claude Code no VS Code. O prompt orienta o Claude a inspecionar a stack e publicar corretamente os assets, preservando a pasta de origem.

`docs/images` não é necessariamente servida como uma URL pública. Em um projeto que exija uma pasta pública, publique cópias em `public/images/barbium` ou use uma estratégia de importação compatível com o framework. Verifique o resultado no navegador e no build.

Use as imagens sem corte e declare largura, altura e proporção. Reutilize títulos, descrições e textos alternativos de `carrossel.json`; no celular, apresente também o título e a descrição em HTML para manter a legibilidade.

## Paleta de referência

| Papel | Cor |
|---|---|
| Fundo | #0D1110 |
| Superfície | #18231C |
| Botão principal | #047857 |
| Destaque | #10B981 |
| Texto principal | #F4F7F5 |
| Texto secundário | #A3AFA7 |
| Borda discreta | #2C3B32 |
