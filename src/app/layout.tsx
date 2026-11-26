import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { RegistrarServiceWorker } from "@/components/registrar-service-worker";
import { MetaPixel } from "@/components/meta-pixel";
import { Analitica } from "@/components/analitica";
import { urlPublicaDoApp } from "@/lib/link-cliente";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Barbium",
    template: "%s · Barbium",
  },
  description: "Agenda, clientes e caixa da sua barbearia em um só lugar.",
  // Endereço base das imagens de prévia (og:image precisa de URL completa).
  metadataBase: new URL(urlPublicaDoApp() ?? "http://localhost:3000"),
  // Páginas do Barbium usam a imagem da landing (app/previa.png/route.tsx).
  openGraph: {
    siteName: "Barbium",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/previa.png", width: 1200, height: 630, alt: "Barbium: o cliente marca sozinho, você segue no corte." }],
  },
  twitter: { card: "summary_large_image" },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Barbium",
  },
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d1110",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={manrope.variable}>
      <body>
        {children}
        <RegistrarServiceWorker />
        <MetaPixel />
        <Analitica />
      </body>
    </html>
  );
}
