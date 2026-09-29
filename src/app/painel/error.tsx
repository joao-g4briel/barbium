"use client";

import { ErroArea } from "@/components/app/estados-area";

export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErroArea reset={reset} inicio="/painel" />;
}
