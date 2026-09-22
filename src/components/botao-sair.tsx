"use client";

import { useRouter } from "next/navigation";

export function BotaoSair() {
  const router = useRouter();

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={sair} className="btn btn-ghost btn-sm">
      Sair
    </button>
  );
}
