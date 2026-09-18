"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { MapPin, Building2, ChevronDown, X } from "lucide-react";
import { MUNICIPIOS } from "./sampleData";

// ── Colores por departamento ───────────────────────────────────────────────
const DEPT_CONFIG = {
  "La Guajira": { color: "bg-violet-600", light: "bg-violet-50 dark:bg-violet-950/40", border: "border-violet-200 dark:border-violet-800", check: "accent-violet-600" },
  "Cesar":      { color: "bg-amber-500",  light: "bg-amber-50 dark:bg-amber-950/40",  border: "border-amber-200 dark:border-amber-800",  check: "accent-amber-500" },
  "Magdalena":  { color: "bg-teal-600",   light: "bg-teal-50 dark:bg-teal-950/40",   border: "border-teal-200 dark:border-teal-800",   check: "accent-teal-600" },
} as const;

type Dept = keyof typeof DEPT_CONFIG;

interface Props {
  seleccionados: string[];
  onChange: (ids: string[]) => void;
  ipsSel: string[];
  onIpsChange: (ips: string[]) => void;
}

/** Dropdown genérico: botón que abre/cierra un panel, y se cierra solo al hacer clic afuera. */
function useDropdown() {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const onClickFuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, [abierto]);
  return { abierto, setAbierto, ref };
}

function DeptDropdown({ dept, munis, seleccionados, onChange }: {
  dept: Dept;
  munis: typeof MUNICIPIOS;
  seleccionados: string[];
  onChange: (ids: string[]) => void;
}) {
  const cfg = DEPT_CONFIG[dept];
  const { abierto, setAbierto, ref } = useDropdown();
  const ids = munis.map(m => m.id);
  const deptSel = ids.filter(id => seleccionados.includes(id)).length;
  const allDeptSel = deptSel === ids.length;

  const toggleMunicipio = (id: string) => {
    onChange(seleccionados.includes(id) ? seleccionados.filter(m => m !== id) : [...seleccionados, id]);
  };
  const toggleDept = () => {
    onChange(allDeptSel ? seleccionados.filter(id => !ids.includes(id)) : Array.from(new Set([...seleccionados, ...ids])));
  };

  return (
    <div ref={ref} className="relative flex-1 min-w-[180px]">
      <button
        onClick={() => setAbierto(v => !v)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border ${cfg.border} ${cfg.light} text-sm font-medium transition-colors`}
      >
        <span className="flex items-center gap-2 truncate">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.color}`} />
          <span className="truncate">{dept}</span>
          <span className="text-xs text-muted-foreground font-normal flex-shrink-0">{deptSel}/{ids.length}</span>
        </span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && (
        <div className="absolute z-20 mt-1 w-full min-w-[220px] bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <button
            onClick={toggleDept}
            className="w-full text-left px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5 border-b border-border transition-colors"
          >
            {allDeptSel ? "✕ Quitar todos" : "✓ Seleccionar todos"}
          </button>
          <div className="max-h-64 overflow-y-auto p-1.5">
            {munis.map(m => {
              const activo = seleccionados.includes(m.id);
              return (
                <label
                  key={m.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer hover:bg-muted/60 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={() => toggleMunicipio(m.id)}
                    className={`w-3.5 h-3.5 ${cfg.check}`}
                  />
                  <span className="flex-1 truncate">{m.nombre}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{m.poblacion_total_0_59m.toLocaleString("es-CO")}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function MunicipioFilter({ seleccionados, onChange, ipsSel, onIpsChange }: Props) {
  const ipsDropdown = useDropdown();

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

  const toggleTodos = () => {
    onChange(todosSeleccionados ? [] : MUNICIPIOS.map(m => m.id));
  };

  const toggleIps = (ips: string) => {
    onIpsChange(ipsSel.includes(ips) ? ipsSel.filter(i => i !== ips) : [...ipsSel, ips]);
  };

  const clearIps = () => onIpsChange([]);

  return (
    <div className="space-y-3">

      {/* ── MUNICIPIOS ────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-visible shadow-sm">
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

        {/* Un desplegable por departamento */}
        <div className="flex flex-wrap gap-2 p-3">
          {(Object.keys(DEPT_CONFIG) as Dept[]).map(dept => (
            <DeptDropdown
              key={dept}
              dept={dept}
              munis={byDept[dept] ?? []}
              seleccionados={seleccionados}
              onChange={onChange}
            />
          ))}
        </div>
      </div>

      {/* ── IPS / ESE ─────────────────────────────────────────────────────── */}
      <div ref={ipsDropdown.ref} className="relative bg-card border border-border rounded-2xl overflow-visible shadow-sm">
        <button
          onClick={() => ipsDropdown.setAbierto(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
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
          <div className="flex items-center gap-2">
            {ipsSel.length > 0 && (
              <span
                role="button"
                onClick={e => { e.stopPropagation(); clearIps(); }}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-destructive/10 transition-colors"
              >
                <X className="w-3 h-3" /> Limpiar
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${ipsDropdown.abierto ? "rotate-180" : ""}`} />
          </div>
        </button>

        {ipsDropdown.abierto && (
          <div className="absolute z-20 mt-0 w-full bg-card border border-t-0 border-border rounded-b-2xl shadow-lg p-3">
            <p className="text-[11px] text-muted-foreground mb-2 px-1">
              Selecciona una o varias IPS para filtrar municipios por institución
            </p>
            <div className="max-h-48 overflow-y-auto pr-1 space-y-0.5">
              {todasIps.map(ips => {
                const activa = ipsSel.includes(ips);
                return (
                  <label
                    key={ips}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer hover:bg-muted/60 transition-colors"
                  >
                    <input type="checkbox" checked={activa} onChange={() => toggleIps(ips)} className="w-3.5 h-3.5 accent-primary" />
                    <span className="truncate">{ips}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
