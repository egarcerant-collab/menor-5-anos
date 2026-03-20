"use client";
import type { GrupoEdadFiltro } from "./types";
import { GRUPO_COLORS } from "./sampleData";
import type { GrupoConteoExcel } from "@/lib/gruposEdadExcel";

const OPCIONES: { id: GrupoEdadFiltro; label: string; emoji: string; desc: string; color: string }[] = [
  { id: "todos",   label: "Todos",        emoji: "👶🧒", desc: "0–60m+",       color: "#7c3aed" },
  { id: "0-6m",    label: "0–6 meses",    emoji: "🍼",   desc: "Lactante menor",color: GRUPO_COLORS["0-6m"] },
  { id: "7-12m",   label: "7–12 meses",   emoji: "🥣",   desc: "Alim. complementaria", color: GRUPO_COLORS["7-12m"] },
  { id: "13-24m",  label: "13–24 meses",  emoji: "🚶",   desc: "Seguimiento antrop.", color: GRUPO_COLORS["13-24m"] },
  { id: "25-59m",  label: "25–59 meses",  emoji: "🎒",   desc: "Preescolar",   color: GRUPO_COLORS["25-59m"] },
  { id: "60m+",    label: "≥60 meses",    emoji: "🎓",   desc: "Mayores de 59m",color: "#64748b" },
];

interface Props {
  valor: GrupoEdadFiltro;
  onChange: (v: GrupoEdadFiltro) => void;
  /** Conteos reales desde el Excel. Si es null, muestra descripciones estáticas. */
  conteos?: GrupoConteoExcel | null;
}

function fmtN(n: number) {
  return n.toLocaleString("es-CO");
}

export function AgeRangeSelector({ valor, onChange, conteos }: Props) {
  // Total real = todos los grupos incluido 60m+
  const totalExcel = conteos
    ? conteos["0-6m"] + conteos["7-12m"] + conteos["13-24m"] + conteos["25-59m"] + conteos["60m+"]
    : 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">📊</span>
          <span className="text-sm font-semibold text-foreground">Grupo de Edad</span>
        </div>
        {conteos && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Conteos reales del Excel · Total: {fmtN(totalExcel)} niños
            {conteos.sinFecha > 0 && (
              <span className="text-amber-600 dark:text-amber-400 ml-1">· {fmtN(conteos.sinFecha)} sin fecha</span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {OPCIONES.map(op => {
          const activo = valor === op.id;
          const { color } = op;

          // Conteo real para este grupo
          let conteoGrupo: number | null = null;
          if (conteos) {
            if (op.id === "todos") conteoGrupo = totalExcel; // suma de todos los grupos
            else conteoGrupo = conteos[op.id as keyof GrupoConteoExcel] as number;
          }

          // Porcentaje de cada grupo sobre el total general (incluye 60m+)
          const pct = totalExcel > 0 && conteoGrupo !== null && op.id !== "todos"
            ? Math.round((conteoGrupo / totalExcel) * 100)
            : null;

          return (
            <button
              key={op.id}
              onClick={() => onChange(op.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-3 rounded-xl text-center transition-all border ${
                activo
                  ? "border-transparent shadow-lg scale-105"
                  : "border-border bg-muted/40 hover:bg-primary/5 hover:border-primary/30"
              }`}
              style={activo ? { backgroundColor: `${color}15`, borderColor: color, boxShadow: `0 4px 20px ${color}30` } : {}}
            >
              <span className="text-xl leading-none">{op.emoji}</span>
              <span
                className="text-xs font-bold leading-tight mt-0.5"
                style={activo ? { color } : {}}
              >
                {op.label}
              </span>

              {/* Conteo real desde Excel */}
              {conteoGrupo !== null ? (
                <span
                  className="text-[11px] font-extrabold tabular-nums leading-none mt-0.5"
                  style={{ color: activo ? color : "#6b7280" }}
                >
                  {fmtN(conteoGrupo)}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">
                  {op.desc}
                </span>
              )}

              {/* Barra de porcentaje bajo el número */}
              {pct !== null && (
                <div className="w-full h-1 rounded-full bg-muted mt-1 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
