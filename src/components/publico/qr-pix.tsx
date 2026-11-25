"use client";

import { CopiarTexto } from "@/components/ui/copiar-texto";

// QR code e código copia e cola de um Pix gerado pelo Mercado Pago.
export function QrPix({ qrCode, qrCodeBase64, alt }: { qrCode: string; qrCodeBase64: string | null; alt: string }) {
  return (
    <>
      {qrCodeBase64 && (
        // QR gerado pelo Mercado Pago, já em base64: não passa por otimização de imagem.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="pix-qr" src={`data:image/png;base64,${qrCodeBase64}`} alt={alt} />
      )}
      <p className="texto-pequeno texto-secundario">
        Abra o app do seu banco, escolha pagar com Pix e leia o QR code ou use o código abaixo.
      </p>
      <p className="pix-codigo num">{qrCode}</p>
      <CopiarTexto texto={qrCode} rotulo="Copiar código Pix" mensagemCopiado="Código Pix copiado." />
    </>
  );
}

export function formatarContagem(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
