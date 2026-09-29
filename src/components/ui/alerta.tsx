import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type TomAlerta = "info" | "sucesso" | "atencao" | "perigo";

const ICONE: Record<TomAlerta, typeof Info> = {
  info: Info,
  sucesso: CheckCircle2,
  atencao: AlertTriangle,
  perigo: XCircle,
};

export function Alerta({ tom = "info", titulo, children }: { tom?: TomAlerta; titulo?: string; children?: ReactNode }) {
  const Icone = ICONE[tom];
  return (
    <div className="alerta" data-tom={tom} role={tom === "perigo" ? "alert" : "status"}>
      <Icone size={18} aria-hidden="true" />
      <div>
        {titulo && <p className="alerta-titulo">{titulo}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}
