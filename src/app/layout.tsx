import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BARBIUM",
  description: "Painel de gestão do BARBIUM",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
