"use client";
import { useMemo, useState } from "react";
import { Calendar, TrendingUp, Hash, ChevronDown, ChevronUp } from "lucide-react";
import { contarControlesPorMes, COLS_FECHA, type ConteoMes } from "@/lib/contadorControles";

interface ContadorControlesProps {
  rawRows: Record<string, unknown>[] | null;
}

const COLORS = [
  "#7c3aed","#6d28d9","#5b21b6","#4c1d95",
  "#0891b2","#0e7490","#155e75","#164e63",
  "#10b981","#059669","#047857","#065f46",
];

export function ContadorControles({ rawRows }: ContadorControlesProps) {
  const [anio, setAnio] = useState(2026);
  const [startRow, setStartRow] = useState(4); // Excel row 5 = index 4
  const [expandido, setExpandido] = useState(true);

  const conteos: ConteoMes[] = useMemo(() => {
    if (!rawRows || rawRows.length === 0) return [];
    return contarControlesPorMes(rawRows, startRow, anio);
  }, [rawRows, startRow, anio]);

  const total = conteos.reduce((s, c) => s + c.conteo, 0);
  const maxConteo = Math.max(...conteos.map(c => c.conteo), 1);

  if (!rawRows) {
    return (
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/40">
            <Calendar className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Contador de Controles por Período</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Cargue el archivo Excel para ver los controles realizados por mes (columnas AM, AX, BG, BP, CA, CL, CW, DH, DS, ED, EO, EZ).
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Cabecera */}
      <button
        onClick={() => setExpandido(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/40">
            <Calendar className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Controles Realizados por Mes</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Columnas: {COLS_FECHA.join(', ')} · Total {anio}: <span className="font-semibold text-violet-600">{total.toLocaleString('es-CO')}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Controles */}
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <label className="text-xs text-muted-foreground">Año:</label>
            <select
              value={anio}
              onChange={e => setAnio(Number(e.target.value))}
              className="text-xs bg-muted border border-border rounded-lg px-2 py-1 outline-none cursor-pointer"
            >
              <option value={2026}>2026</option>
            </select>
            <label className="text-xs text-muted-foreground">Fila inicio:</label>
            <input
              type="number"
              value={startRow + 1}
              onChange={e => setStartRow(Math.max(1, Number(e.target.value)) - 1)}
              className="text-xs bg-muted border border-border rounded-lg px-2 py-1 w-14 outline-none text-center"
              min={1}
              title="Fila de Excel donde empiezan los datos (ej: 5)"
            />
          </div>
          {expandido ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expandido && (
        <div className="px-5 pb-5 space-y-3">
          {/* Barra de totales */}
          <div className="grid grid-cols-3 gap-3 mb-2">
            <div className="p-3 bg-violet-50 dark:bg-violet-950/20 rounded-xl text-center border border-violet-100 dark:border-violet-900/40">
              <div className="text-lg font-bold text-violet-700 dark:text-violet-400">{total.toLocaleString('es-CO')}</div>
              <div className="text-[10px] text-violet-600/70 dark:text-violet-400/70 font-medium">Total controles {anio}</div>
            </div>
            <div className="p-3 bg-teal-50 dark:bg-teal-950/20 rounded-xl text-center border border-teal-100 dark:border-teal-900/40">
              <div className="text-lg font-bold text-teal-700 dark:text-teal-400">
                {total > 0 ? Math.round(total / 12).toLocaleString('es-CO') : '—'}
              </div>
              <div className="text-[10px] text-teal-600/70 dark:text-teal-400/70 font-medium">Promedio mensual</div>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl text-center border border-emerald-100 dark:border-emerald-900/40">
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {COLS_FECHA.length}
              </div>
              <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-medium">Columnas de fecha</div>
            </div>
          </div>

          {/* Tabla de meses con barras */}
          <div className="space-y-1.5">
            {conteos.map((c, i) => {
              const pct = maxConteo > 0 ? (c.conteo / maxConteo) * 100 : 0;
              const color = COLORS[i % COLORS.length];
              const esMayor = c.conteo === maxConteo && c.conteo > 0;
              return (
                <div
                  key={c.mes}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${esMayor ? 'bg-violet-50 dark:bg-violet-950/20' : 'hover:bg-muted/40'}`}
                >
                  <div className="w-24 text-xs font-semibold text-foreground flex-shrink-0">
                    {c.mes.charAt(0) + c.mes.slice(1).toLowerCase()}
                  </div>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <div className="w-16 text-right text-xs font-bold tabular-nums" style={{ color }}>
                    {c.conteo.toLocaleString('es-CO')}
                  </div>
                  {esMayor && (
                    <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> MAX
                    </span>
                  )}
                  {!esMayor && <span className="w-12" />}
                </div>
              );
            })}
          </div>

          {/* Nota técnica */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/40 text-[10px] text-muted-foreground">
            <Hash className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>
              Equivale a la fórmula: <code className="font-mono bg-muted px-1 rounded">LET(m, COINCIDIR(mes, &#123;ENERO...DICIEMBRE&#125;, 0), y, {anio}, SUMA(SUMAPRODUCTO(MES(AM)=m, AÑO(AM)=y) ... SUMAPRODUCTO(MES(EZ)=m, AÑO(EZ)=y)))</code>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
