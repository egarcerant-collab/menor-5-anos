/**
 * Persistencia local de los datos del programa Primera Infancia.
 * - localStorage: guarda los indicadores calculados (pequeños, JSON)
 * - IndexedDB: guarda las filas crudas del Excel (grandes) para acumulación
 * - Exporta a CSV / JSON normalizados
 */

import type { GrupoConteoExcel } from "@/lib/gruposEdadExcel";
import type { IndPorGrupo, IndicadoresGrupoExcel } from "@/lib/indicadoresExcel";

// ─── Claves localStorage ──────────────────────────────────────────────────────
const KEY_META       = "pi_excel_meta";
const KEY_GRUPOS     = "pi_grupos_edad";
const KEY_INDICADORES = "pi_indicadores";
const KEY_HISTORIAL  = "pi_historial_cargas";

export interface ExcelMeta {
  filename: string;
  rows: number;
  fecha: string;   // ISO string
  cargadoEn: string; // ISO string — cuándo lo subió el usuario
}

export interface HistorialCarga {
  id: string;
  filename: string;
  rows: number;
  fecha: string;      // fecha del archivo
  cargadoEn: string;  // fecha de carga
}

// ─── Guardar ──────────────────────────────────────────────────────────────────
export function guardarDatos(
  meta: { filename: string; rows: number; fecha: Date },
  grupos: GrupoConteoExcel,
  indicadores: IndPorGrupo,
): void {
  try {
    const metaObj: ExcelMeta = {
      filename:   meta.filename,
      rows:       meta.rows,
      fecha:      meta.fecha instanceof Date ? meta.fecha.toISOString() : String(meta.fecha),
      cargadoEn:  new Date().toISOString(),
    };
    localStorage.setItem(KEY_META,        JSON.stringify(metaObj));
    localStorage.setItem(KEY_GRUPOS,      JSON.stringify(grupos));
    localStorage.setItem(KEY_INDICADORES, JSON.stringify(indicadores));

    // Actualizar historial
    const historial = recuperarHistorial();
    const entrada: HistorialCarga = {
      id:         Date.now().toString(),
      filename:   meta.filename,
      rows:       meta.rows,
      fecha:      metaObj.fecha,
      cargadoEn:  metaObj.cargadoEn,
    };
    // Evitar duplicado exacto por nombre de archivo
    const filtrado = historial.filter(h => h.filename !== meta.filename);
    filtrado.unshift(entrada);
    localStorage.setItem(KEY_HISTORIAL, JSON.stringify(filtrado.slice(0, 20)));
  } catch (e) {
    console.error("[DataStore] Error guardando:", e);
  }
}

// ─── Recuperar ────────────────────────────────────────────────────────────────
export function recuperarDatos(): {
  meta: { filename: string; rows: number; fecha: Date } | null;
  grupos: GrupoConteoExcel | null;
  indicadores: IndPorGrupo | null;
} {
  try {
    const rawMeta = localStorage.getItem(KEY_META);
    const rawGrupos = localStorage.getItem(KEY_GRUPOS);
    const rawIndicadores = localStorage.getItem(KEY_INDICADORES);
    if (!rawMeta || !rawGrupos || !rawIndicadores) return { meta: null, grupos: null, indicadores: null };

    const metaObj: ExcelMeta = JSON.parse(rawMeta);
    return {
      meta: {
        filename: metaObj.filename,
        rows:     metaObj.rows,
        fecha:    new Date(metaObj.fecha),
      },
      grupos:      JSON.parse(rawGrupos),
      indicadores: JSON.parse(rawIndicadores),
    };
  } catch (e) {
    console.error("[DataStore] Error recuperando:", e);
    return { meta: null, grupos: null, indicadores: null };
  }
}

export function recuperarHistorial(): HistorialCarga[] {
  try {
    const raw = localStorage.getItem(KEY_HISTORIAL);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function hayDatosGuardados(): boolean {
  return !!localStorage.getItem(KEY_META);
}

// ─── Limpiar ──────────────────────────────────────────────────────────────────
export function limpiarDatos(): void {
  localStorage.removeItem(KEY_META);
  localStorage.removeItem(KEY_GRUPOS);
  localStorage.removeItem(KEY_INDICADORES);
}

export function limpiarHistorial(): void {
  localStorage.removeItem(KEY_HISTORIAL);
}

// ─── Exportar CSV ─────────────────────────────────────────────────────────────
/**
 * Genera CSV normalizado con una fila por grupo etario y todos los indicadores.
 * Formato "tidy data" listo para importar a Excel, Power BI, Google Sheets, etc.
 */
export function exportarCSVIndicadores(
  indicadores: IndPorGrupo,
  grupos: GrupoConteoExcel,
  filename: string,
): void {
  const GRUPOS = ["todos","0-6m","7-12m","13-24m","25-59m","60m+"] as const;
  const LABELS: Record<string, string> = {
    "todos":   "Todos (0-60m+)",
    "0-6m":    "0-6 meses",
    "7-12m":   "7-12 meses",
    "13-24m":  "13-24 meses",
    "25-59m":  "25-59 meses",
    "60m+":    "≥60 meses",
  };

  const pct = (n: number, d: number) => d > 0 ? +(n / d * 100).toFixed(2) : 0;

  const headers = [
    "grupo_edad",
    "label",
    "total_ninos",
    "total_controles",
    // Vacunación
    "vacunados_col_Y",
    "pct_vacunacion",
    // Nutrición
    "clasif_adecuado",
    "clasif_riesgo",
    "clasif_dnt_moderada",
    "clasif_dnt_severa",
    "clasif_sobrepeso",
    "clasif_sin_dato",
    "pct_nutricion_adecuada",
    // Intervenciones
    "tamizaje_hemoglobina_col_AA",
    "pct_hemoglobina",
    "hierro_col_AH",
    "pct_hierro",
    "desparasitacion_col_AI",
    "pct_desparasitacion",
    "consejeria_lactancia_col_AU",
    "pct_consejeria_lactancia",
    "lactancia_exclusiva_6m_col_AV",
    "pct_lactancia_exclusiva",
    // T-302
    "ninos_wayuu_col_Q",
    "zona_rural_dispersa_col_N",
    "bajo_peso_nacer_col_AO",
    // Controles por visita
    "controles_detalle",
  ];

  const rows: string[][] = GRUPOS.map(g => {
    const ind: IndicadoresGrupoExcel = indicadores[g];
    if (!ind) return [];
    const total = ind.total;
    const nutDen = total - ind.clasif.sin_dato;
    const detalleVisitas = ind.controles
      .map(c => `${c.nombre}:${c.realizados}`)
      .join("|");

    return [
      g,
      LABELS[g] ?? g,
      String(total),
      String(ind.total_controles),
      // Vacunación
      String(ind.vacunacion_completa),
      String(pct(ind.vacunacion_completa, total)),
      // Nutrición
      String(ind.clasif.adecuado),
      String(ind.clasif.riesgo),
      String(ind.clasif.dnt_moderada),
      String(ind.clasif.dnt_severa),
      String(ind.clasif.sobrepeso),
      String(ind.clasif.sin_dato),
      String(pct(ind.clasif.adecuado, nutDen)),
      // Intervenciones
      String(ind.tamizaje_hemoglobina),
      String(pct(ind.tamizaje_hemoglobina, total)),
      String(ind.hierro),
      String(pct(ind.hierro, total)),
      String(ind.desparasitacion),
      String(pct(ind.desparasitacion, total)),
      String(ind.consejeria_lactancia),
      String(pct(ind.consejeria_lactancia, total)),
      String(ind.lactancia_exclusiva_6m),
      String(pct(ind.lactancia_exclusiva_6m, total)),
      // T-302
      String(ind.ninos_wayuu),
      String(ind.zona_rural_dispersa),
      String(ind.bajo_peso_nacer),
      // Detalle visitas
      detalleVisitas,
    ];
  }).filter(r => r.length > 0);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\r\n");

  // BOM para compatibilidad con Excel en español
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const ts   = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `primera_infancia_indicadores_${ts}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exporta las filas crudas del Excel como CSV normalizado y limpio.
 * Solo exporta columnas con datos reconocidos (elimina columnas vacías).
 */
export function exportarCSVFilasCrudas(
  rawRows: Record<string, unknown>[],
  filename: string,
): void {
  if (!rawRows || rawRows.length === 0) return;

  // Tomar encabezados de la primera fila que sea el encabezado real (row 4 = index 0 si startRowIndex=4)
  // rawRows ya vienen sin las filas de encabezado
  const allCols = Object.keys(rawRows[0] ?? {});

  // Filtrar columnas que tienen al menos un valor no vacío
  const colsConDatos = allCols.filter(col =>
    rawRows.some(row => {
      const v = row[col];
      return v != null && String(v).trim() !== "" && String(v).trim() !== "0";
    })
  );

  const csvContent = [
    colsConDatos.join(","),
    ...rawRows.map(row =>
      colsConDatos.map(col => {
        const v = row[col];
        const s = v instanceof Date
          ? v.toLocaleDateString("es-CO")
          : String(v ?? "").replace(/"/g, '""');
        return `"${s}"`;
      }).join(",")
    )
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const ts   = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `primera_infancia_datos_${ts}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exporta los indicadores como JSON para integración con sistemas externos.
 */
export function exportarJSON(
  indicadores: IndPorGrupo,
  grupos: GrupoConteoExcel,
  meta: { filename: string; rows: number; fecha: Date },
): void {
  const payload = {
    exportado_en: new Date().toISOString(),
    fuente: meta.filename,
    total_registros: meta.rows,
    fecha_datos: meta.fecha instanceof Date ? meta.fecha.toISOString() : meta.fecha,
    grupos_edad: grupos,
    indicadores,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const ts   = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `primera_infancia_${ts}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
