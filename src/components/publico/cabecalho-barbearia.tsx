import type { ReactNode } from "react";
import { MapPin, MessageCircle } from "lucide-react";
import { iniciais, linkWhatsApp } from "@/lib/formatar";

export function urlDoLogo(slug: string, atualizadoEm: Date | null): string | null {
  return atualizadoEm ? `/api/publico/${slug}/logo?v=${atualizadoEm.getTime()}` : null;
}

export function linkComoChegar(endereco: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
}

// Cabeçalho das páginas públicas da barbearia (agendar e meu horário): logo,
// nome, endereço com "Como chegar" e WhatsApp da barbearia.
export function CabecalhoBarbearia({
  nome,
  slug,
  endereco,
  telefone,
  logoAtualizadoEm,
  subtitulo,
  antes,
}: {
  nome: string;
  slug: string;
  endereco: string | null;
  telefone: string | null;
  logoAtualizadoEm: Date | null;
  subtitulo: string;
  antes?: ReactNode;
}) {
  const logo = urlDoLogo(slug, logoAtualizadoEm);
  const numero = telefone ? linkWhatsApp(telefone) : null;
  const whatsapp = numero ? `${numero}?text=${encodeURIComponent(`Olá! Vim pela página de agendamento da ${nome}.`)}` : null;
  return (
    <header className="publico-topo">
      <div className="publico-topo-conteudo">
        {antes}
        <div className="publico-identidade">
          {logo ? (
            // Logo enviado pela barbearia, servido pela própria API.
            // eslint-disable-next-line @next/next/no-img-element
            <img className="publico-logo" src={logo} alt={`Logo da ${nome}`} width={64} height={64} />
          ) : (
            <span className="publico-logo publico-logo-iniciais" aria-hidden="true">
              {iniciais(nome)}
            </span>
          )}
          <div className="publico-identidade-texto">
            <h1>{nome}</h1>
            <p className="texto-secundario">{subtitulo}</p>
          </div>
        </div>
        {(endereco || whatsapp) && (
          <div className="publico-contato">
            {endereco && (
              <a href={linkComoChegar(endereco)} target="_blank" rel="noopener noreferrer" className="publico-contato-item">
                <MapPin size={16} aria-hidden="true" />
                <span>
                  {endereco}
                  <span className="publico-contato-acao">Como chegar</span>
                </span>
              </a>
            )}
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="publico-contato-item">
                <MessageCircle size={16} aria-hidden="true" />
                <span>
                  WhatsApp da barbearia
                  <span className="publico-contato-acao">Conversar</span>
                </span>
              </a>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
