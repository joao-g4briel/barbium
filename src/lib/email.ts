import "server-only";

// Envio de e-mail pela API do Resend (sem SDK). Precisa de:
//   RESEND_API_KEY  — chave criada no painel do Resend
//   EMAIL_REMETENTE — ex.: "Barbium <nao-responda@seudominio.com.br>", de um
//                     domínio verificado no Resend
// RESEND_API_URL existe só pra apontar pra um servidor falso em teste.
const API = process.env.RESEND_API_URL ?? "https://api.resend.com";

export function emailConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_REMETENTE);
}

export async function enviarEmail(dados: { para: string; assunto: string; html: string; texto: string }): Promise<void> {
  const chave = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE;
  if (!chave || !remetente) throw new Error("Envio de e-mail não configurado (RESEND_API_KEY / EMAIL_REMETENTE).");

  const resposta = await fetch(`${API}/emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: remetente,
      to: [dados.para],
      subject: dados.assunto,
      html: dados.html,
      text: dados.texto,
    }),
    cache: "no-store",
  });
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    throw new Error(`Resend respondeu ${resposta.status}: ${corpo?.message ?? "sem detalhes"}`);
  }
}
