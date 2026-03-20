"use client";
import { useState, useMemo } from "react";
import { MapPin, Building2, ChevronDown, ChevronUp, X } from "lucide-react";
import { MUNICIPIOS } from "./sampleData";

// ── Colores por departamento ───────────────────────────────────────────────
const DEPT_CONFIG = {
  "La Guajira": { color: "bg-violet-600", light: "bg-violet-50 dark:bg-violet-950/40", border: "border-violet-200 dark:border-violet-800", pill: "bg-violet-600 text-white", pillOff: "bg-white dark:bg-violet-950/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/30" },
  "Cesar":      { color: "bg-amber-500",  light: "bg-amber-50 dark:bg-amber-950/40",  border: "border-amber-200 dark:border-amber-800",  pill: "bg-amber-500 text-white",  pillOff: "bg-white dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30" },
  "Magdalena":  { color: "bg-teal-600",   light: "bg-teal-50 dark:bg-teal-950/40",   border: "border-teal-200 dark:border-teal-800",   pill: "bg-teal-600 text-white",   pillOff: "bg-white dark:bg-teal-950/20 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/30" },
} as const;

type Dept = keyof typeof DEPT_CONFIG;

interface Props {
  seleccionados: string[];
  onChange: (ids: string[]) => void;
  ipsSel: string[];
  onIpsChange: (ips: string[]) => void;
}

export function MunicipioFilter({ seleccionados, onChange, ipsSel, onIpsChange }: Props) {
  const [showIps, setShowIps] = useState(false);

  // Agrupar municipios por departamento
  const byDept = useMemo(() => {
    const map: Record<string, typeof MUNICIPIOS> = {};
    MUNICIPIOS.forEach(m => {
      if (!map[m.departamento]) map[m.departamento] = [];
      map[m.departamento].push(m);
    });
    return map;
  }, []);

  // Lista única de todas las IPS
  const todasIps = useMemo(() => {
    const set = new Set<string>();
    MUNICIPIOS.forEach(m => m.ips_atiende.forEach(ips => set.add(ips)));
    return Array.from(set).sort();
  }, []);

  const total = MUNICIPIOS.length;
  const todosSeleccionados = seleccionados.length === total;

  // Toggle municipio individual
  const toggleMunicipio = (id: string) => {
    if (seleccionados.includes(id)) {
      onChange(seleccionados.filter(m => m !== id));
    } else {
      onChange([...seleccionados, id]);
    }
  };

  // Toggle departamento completo
  const toggleDept = (dept: string) => {
    const ids = byDept[dept].map(m => m.id);
    const todosDeptSel = ids.every(id => seleccionados.includes(id));
    if (todosDeptSel) {
      onChange(seleccionados.filter(id => !ids.includes(id)));
    } else {
      const next = Array.from(new Set([...seleccionados, ...ids]));
      onChange(next);
    }
  };

  // Toggle todos
  const toggleTodos = () => {
    onChange(todosSeleccionados ? [] : MUNICIPIOS.map(m => m.id));
  };

  // Toggle IPS
  const toggleIps = (ips: string) => {
    if (ipsSel.includes(ips)) {
      onIpsChange(ipsSel.filter(i => i !== ips));
    } else {
      onIpsChange([...ipsSel, ips]);
    }
  };

  const clearIps = () => onIpsChange([]);

  return (
    <div className="space-y-3">

      {/* ── MUNICIPIOS ────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Municipios</span>
            <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium tabular-nums">
              {seleccionados.length}/{total}
            </span>
          </div>
          <button
            onClick={toggleTodos}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
              todosSeleccionados
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
            }`}
          >
            {todosSeleccionados ? "✓ Todos" : "Seleccionar todos"}
          </button>
        </div>

        {/* Secciones por departamento */}
        <div className="p-3 space-y-3">
          {(Object.keys(DEPT_CONFIG) as Dept[]).map(dept => {
            const cfg = DEPT_CONFIG[dept];
            const munis = byDept[dept] ?? [];
            const ids = munis.map(m => m.id);
            const deptSel = ids.filter(id => seleccionados.includes(id)).length;
            const allDeptSel = deptSel === ids.length;

            return (
              <div key={dept} className={`rounded-xl border ${cfg.border} overflow-hidden`}>
                {/* Dept header — clickable para toggle todos */}
                <button
                  onClick={() => toggleDept(dept)}
                  className={`w-full flex items-center justify-between px-3 py-2 ${cfg.light} transition-colors hover:opacity-90`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.color}`} />
                    <span className="text-xs font-bold text-foreground tracking-wide uppercase">{dept}</span>
                    <span className="text-xs text-muted-foreground font-medium">{deptSel}/{ids.length}</span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md transition-all ${
                    allDeptSel ? `${cfg.color} text-white` : "bg-muted text-muted-foreground"
                  }`}>
                    {allDeptSel ? "✓ Todos" : "Seleccionar"}
                  </span>
                </button>

                {/* Pills de municipios */}
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-card">
                  {munis.map(m => {
                    const activo = seleccionados.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleMunicipio(m.id)}
                        title={`${m.nombre} · ${m.poblacion_total_0_59m.toLocaleString("es-CO")} niños`}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          activo ? cfg.pill : cfg.pillOff
                        }`}
                      >
                        {activo && <span className="text-[10px]">✓</span>}
                        {m.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── IPS / ESE ─────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setShowIps(v => !v)}
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Filtrar por IPS / ESE</span>
            {ipsSel.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">
                {ipsSel.length} activas
              </span>
            )}
          </div>
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            {ipsSel.length > 0 && (
              <button
                onClick={clearIps}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-destructive/10 transition-colors"
              >
                <X className="w-3 h-3" /> Limpiar
              </button>
            )}
            {showIps ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>

        {showIps && (
          <div className="border-t border-border p-3">
            <p className="text-[11px] text-muted-foreground mb-2 px-1">
              Selecciona una o varias IPS para filtrar municipios por institución
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
              {todasIps.map(ips => {
                const activa = ipsSel.includes(ips);
                return (
                  <button
                    key={ips}
                    onClick={() => toggleIps(ips)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                      activa
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/60 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground hover:bg-primary/5"
                    }`}
                  >
                    {activa && "✓ "}{ips}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
