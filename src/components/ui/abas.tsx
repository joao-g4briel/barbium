import Link from "next/link";

export interface ItemAba {
  href: string;
  rotulo: string;
  ativo: boolean;
}

// Abas que são navegação (mudam a URL): links com aria-current, não role="tab".
export function Abas({ itens, rotulo }: { itens: ItemAba[]; rotulo: string }) {
  return (
    <nav className="segmentado" aria-label={rotulo}>
      {itens.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="segmentado-item"
          aria-current={item.ativo ? "page" : undefined}
        >
          {item.rotulo}
        </Link>
      ))}
    </nav>
  );
}
