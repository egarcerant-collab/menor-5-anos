"use client";
import { useMemo } from "react";
import { Calendar } from "lucide-react";
import { contarControlesPorMes, type ConteoMes } from "@/lib/contadorControles";

interface ContadorControlesProps {
  rawRows: Record<string, unknown>[] | null;
}

export function ContadorControles({ rawRows }: ContadorControlesProps) {
  const conteos: ConteoMes[] = useMemo(() => {
    if (!rawRows || rawRows.length === 0) return [];
    return contarControlesPorMes(rawRows, 4, 2026);
  }, [rawRows]);

  const conDatos = conteos.filter(c => c.conteo > 0);
  const total = conteos.reduce((s, c) => s + c.conteo, 0);

  if (!rawRows) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-xl border border-border">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-xs text-muted-foreground">Controles por mes — cargue el Excel</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-card rounded-xl border border-border shadow-sm">
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Calendar className="w-3.5 h-3.5 text-violet-600" />
        <span className="text-xs font-semibold text-muted-foreground">Controles:</span>
      </div>
      {conDatos.length === 0 ? (
        <span className="text-xs text-muted-foreground italic">Sin datos de fecha registrados</span>
      ) : (
        <>
          {conDatos.map(c => (
            <span
              key={c.mes}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300 text-xs font-semibold"
            >
              <span className="opacity-70">{c.mes.charAt(0) + c.mes.slice(1, 3).toLowerCase()}</span>
              <span className="font-bold">{c.conteo.toLocaleString("es-CO")}</span>
            </span>
          ))}
          <span className="ml-auto text-[11px] text-muted-foreground font-medium tabular-nums">
            Total: <span className="font-bold text-violet-600">{total.toLocaleString("es-CO")}</span>
          </span>
        </>
      )}
    </div>
  );
}
