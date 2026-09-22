import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegistrarServiceWorker } from "@/components/registrar-service-worker";

export const metadata: Metadata = {
  title: "BARBIUM",
  description: "Painel de gestão do BARBIUM",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BARBIUM",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
