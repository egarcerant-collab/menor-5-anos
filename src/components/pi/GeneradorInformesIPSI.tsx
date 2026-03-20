"use client";
import { useState } from "react";
import { FileText, Download, Loader2, CheckCircle2, Package, ChevronDown, ChevronUp } from "lucide-react";
import type { MunicipioData } from "./types";
import { generarInformeIPSI, generarPaqueteIPSI, cargarMembrete } from "@/lib/informe-ipsi-pdf";

interface Props {
  municipios: MunicipioData[];   // municipios actualmente filtrados
  fecha: string;                  // p.ej. "Marzo 2026"
  vigencia: string;               // p.ej. "2026"
}

export function GeneradorInformesIPSI({ municipios, fecha, vigencia }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0, nombre: "" });
  const [listo, setListo] = useState(false);

  // Combos únicos IPS × municipio
  const combos = municipios.flatMap(m =>
    m.ips_atiende.map(ips => ({ ips, muni: m }))
  );

  // Agrupar por departamento para visualizar
  const porDept: Record<string, typeof combos> = {};
  combos.forEach(c => {
    const d = c.muni.departamento;
    if (!porDept[d]) porDept[d] = [];
    porDept[d].push(c);
  });

  const handleIndividual = async (ips: string, muni: MunicipioData) => {
    try {
      setGenerando(true);
      const membrete = await cargarMembrete();
      await generarInformeIPSI(
        { ips, municipio: muni.nombre, departamento: muni.departamento, fecha, vigencia, municipioData: muni },
        undefined,
        membrete
      );
      setListo(true);
      setTimeout(() => setListo(false), 3000);
    } catch (e) {
      alert("Error al generar PDF: " + (e as Error).message);
    } finally {
      setGenerando(false);
    }
  };

  const handlePaquete = async () => {
    if (combos.length === 0) return;
    try {
      setGenerando(true);
      setListo(false);
      await generarPaqueteIPSI(
        municipios, fecha, vigencia,
        "Primera Infancia — Caribe Colombiano",
        undefined,
        (actual, total, nombre) => setProgreso({ actual, total, nombre })
      );
      setListo(true);
      setTimeout(() => setListo(false), 4000);
    } catch (e) {
      alert("Error al generar paquete: " + (e as Error).message);
    } finally {
      setGenerando(false);
      setProgreso({ actual: 0, total: 0, nombre: "" });
    }
  };

  const DEPT_COLORS: Record<string, string> = {
    "La Guajira": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
    "Cesar":      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    "Magdalena":  "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setAbierto(v => !v)}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Informes PDF por IPS/IPSI</span>
          <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">
            {combos.length} informes
          </span>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {/* Botón paquete ZIP */}
          <button
            onClick={handlePaquete}
            disabled={generando || combos.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm"
          >
            {generando ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : listo ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Package className="w-3.5 h-3.5" />
            )}
            {generando
              ? `${progreso.actual}/${progreso.total}`
              : listo
              ? "¡Descargado!"
              : "Descargar todo (.zip)"}
          </button>
          {abierto
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* ── Barra de progreso ────────────────────────────────────────────── */}
      {generando && progreso.total > 0 && (
        <div className="px-4 pb-2">
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(progreso.actual / progreso.total) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 truncate">
            Generando: {progreso.nombre}
          </p>
        </div>
      )}

      {/* ── Lista desplegable ────────────────────────────────────────────── */}
      {abierto && (
        <div className="border-t border-border">
          {combos.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              No hay municipios seleccionados con IPS registradas.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {Object.entries(porDept).map(([dept, items]) => (
                <div key={dept}>
                  {/* Dept header */}
                  <div className="px-4 py-2 bg-muted/40 flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${DEPT_COLORS[dept] ?? ""}`}>
                      {dept}
                    </span>
                    <span className="text-xs text-muted-foreground">{items.length} informes</span>
                  </div>
                  {/* Rows */}
                  {items.map(({ ips, muni }, idx) => (
                    <div
                      key={`${muni.id}-${ips}-${idx}`}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{ips}</p>
                        <p className="text-[10px] text-muted-foreground">{muni.nombre} · {muni.poblacion_total_0_59m.toLocaleString("es-CO")} niños</p>
                      </div>
                      <button
                        onClick={() => handleIndividual(ips, muni)}
                        disabled={generando}
                        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-40 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Download className="w-3 h-3" />
                        PDF
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
