import type { ButtonHTMLAttributes, ReactNode } from "react";

export type VarianteBotao = "primary" | "secondary" | "ghost" | "danger" | "danger-outline";

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao;
  pequeno?: boolean;
  bloco?: boolean;
  icone?: ReactNode;
  carregando?: boolean;
  textoCarregando?: string;
}

export function classesBotao({
  variante = "secondary",
  pequeno,
  bloco,
  extra,
}: {
  variante?: VarianteBotao;
  pequeno?: boolean;
  bloco?: boolean;
  extra?: string;
}): string {
  return ["btn", `btn-${variante}`, pequeno && "btn-sm", bloco && "btn-bloco", extra].filter(Boolean).join(" ");
}

// Enquanto `carregando`, o botão fica desabilitado — é a proteção contra
// envio duplicado em todos os formulários do painel.
export function Botao({
  variante = "secondary",
  pequeno,
  bloco,
  icone,
  carregando,
  textoCarregando,
  className,
  disabled,
  children,
  type = "button",
  ...resto
}: BotaoProps) {
  return (
    <button
      type={type}
      className={classesBotao({ variante, pequeno, bloco, extra: className })}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...resto}
    >
      {carregando ? <span className="spinner" aria-hidden="true" /> : icone}
      {carregando && textoCarregando ? textoCarregando : children}
    </button>
  );
}
