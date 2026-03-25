"use client";
import { useMemo, useState } from "react";
import { Calendar, ChevronDown, ChevronUp, Stethoscope, Heart } from "lucide-react";
import {
  contarControlesPorMes, contarControlesPorVisita,
  type ConteoMes, type ConteoVisita,
} from "@/lib/contadorControles";

interface ContadorControlesProps {
  rawRows: Record<string, unknown>[] | null;
}

export function ContadorControles({ rawRows }: ContadorControlesProps) {
  const [expandido, setExpandido] = useState(false);

  const conteosMes: ConteoMes[] = useMemo(() => {
    if (!rawRows || rawRows.length === 0) return [];
    return contarControlesPorMes(rawRows, 4, 2026);
  }, [rawRows]);

  const conteosVisita: ConteoVisita[] = useMemo(() => {
    if (!rawRows || rawRows.length === 0) return [];
    return contarControlesPorVisita(rawRows, 4);
  }, [rawRows]);

  const conDatos = conteosMes.filter(c => c.conteo > 0);
  const totalMes  = conteosMes.reduce((s, c) => s + c.conteo, 0);
  const totalVis  = conteosVisita.reduce((s, c) => s + c.conteo, 0);

  if (!rawRows) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-xl border border-border">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-xs text-muted-foreground">Controles por mes — cargue el Excel</span>
      </div>
    );
  }

  const maxVisita = Math.max(...conteosVisita.map(v => v.conteo), 1);

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Cabecera con meses */}
      <div
        className="flex flex-wrap items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpandido(e => !e)}
      >
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
            <span className="ml-auto text-[11px] text-muted-foreground font-medium tabular-nums flex items-center gap-1">
              Total: <span className="font-bold text-violet-600">{totalMes.toLocaleString("es-CO")}</span>
              {expandido
                ? <ChevronUp className="w-3 h-3 text-muted-foreground ml-1" />
                : <ChevronDown className="w-3 h-3 text-muted-foreground ml-1" />}
            </span>
          </>
        )}
      </div>

      {/* Detalle por visita RIAS (colapsable) */}
      {expandido && (
        <div className="border-t border-border px-3 py-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Controles por visita RIAS · Valoración Integral
            </p>
            <span className="text-[11px] text-muted-foreground">
              Total visitas: <span className="font-bold text-violet-600">{totalVis.toLocaleString("es-CO")}</span>
            </span>
          </div>

          {/* Leyenda profesional */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-[10px] text-muted-foreground">Medicina</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-muted-foreground">Enfermería</span>
            </div>
          </div>

          <div className="space-y-2">
            {conteosVisita.map(v => {
              const esMed = v.profesional === 'Medicina';
              const color = esMed ? '#3b82f6' : '#10b981';
              const bgColor = esMed ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700';
              const pctAncho = Math.round((v.conteo / maxVisita) * 100);
              return (
                <div key={v.col} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-4 text-right flex-shrink-0 font-mono">{v.numero}</span>
                  <span className="text-[11px] text-foreground w-28 flex-shrink-0 truncate font-medium">{v.rango}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${bgColor}`}>
                    {v.profesional === 'Medicina'
                      ? <span className="flex items-center gap-0.5"><Stethoscope className="w-2.5 h-2.5" /> Med</span>
                      : <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" /> Enf</span>
                    }
                  </span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pctAncho}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-xs font-bold tabular-nums w-14 text-right flex-shrink-0" style={{ color }}>
                    {v.conteo.toLocaleString("es-CO")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
