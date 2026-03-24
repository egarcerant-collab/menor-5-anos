"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  Baby, Stethoscope, Apple,
  TrendingUp, TrendingDown, MapPin, Calendar, Star,
  Activity, BarChart2, Filter, Upload,
  AlertCircle, Syringe, Scale, FileSpreadsheet
} from "lucide-react";
import { MunicipioFilter } from "@/components/pi/MunicipioFilter";
import { AgeRangeSelector } from "@/components/pi/AgeRangeSelector";
import { GeneradorInformesIPSI } from "@/components/pi/GeneradorInformesIPSI";
import { RIASSection } from "@/components/pi/RIASSection";
import { ExcelLoader } from "@/components/pi/ExcelLoader";
import { ContadorControles } from "@/components/pi/ContadorControles";
import { MUNICIPIOS, GRUPO_COLORS } from "@/components/pi/sampleData";
import type { GrupoEdadFiltro } from "@/components/pi/types";
import { calcularGruposEdadDesdeExcel, type GrupoConteoExcel } from "@/lib/gruposEdadExcel";
import { calcularIndicadoresDesdeExcel, type IndPorGrupo, type IndicadoresGrupoExcel, COLUMNA_MUNICIPIO } from "@/lib/indicadoresExcel";
import {
  guardarDatos, recuperarDatos, limpiarDatos,
  recuperarHistorial, exportarCSVIndicadores, exportarCSVFilasCrudas, exportarJSON,
  guardarIndPorMunicipio, recuperarIndPorMunicipio,
  type HistorialCarga,
} from "@/lib/dataStore";

// ─── UTILIDADES ───────────────────────────────────────────────────────────────
const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function pct(n: number, total: number) {
  return total > 0 ? parseFloat((n / total * 100).toFixed(1)) : 0;
}

function fmtN(n: number) {
  return n.toLocaleString("es-CO");
}

// ─── HOOK CONTADOR ────────────────────────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const prevTarget = useRef<number | null>(null);
  useEffect(() => {
    if (prevTarget.current === target) return;
    const from = prevTarget.current === null ? 0 : value;
    fromRef.current = from;
    prevTarget.current = target;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setValue(parseFloat((fromRef.current + e * (target - fromRef.current)).toFixed(1)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return value;
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
function KPICard({ kpi, delay = 0 }: { kpi: any; delay?: number }) {
  const Icono = kpi.icono;
  const animated = useAnimatedCounter(kpi.valor, 1200 + delay * 80);
  const display = kpi.unidad === "%" ? animated.toFixed(1) : Math.round(animated).toLocaleString("es-CO");
  const sinDatos = kpi.valor === 0 && !kpi.tieneExcel;
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 ${kpi.bg} border border-white/60 dark:border-white/10 card-hover fade-in-up shadow-sm`} style={{ animationDelay:`${delay * 0.1}s` }}>
      <div className={`absolute -right-5 -top-5 w-20 h-20 rounded-full bg-gradient-to-br ${kpi.color} opacity-10`} />
      <div className="relative flex items-start justify-between">
        <div className={`p-2 rounded-xl ${kpi.iconBg}`}><Icono className={`w-4 h-4 ${kpi.iconColor}`} /></div>
        {!sinDatos && (
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${kpi.cambio>=0?"bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400":"bg-red-100 text-red-700"}`}>
            {kpi.cambio>=0?<TrendingUp className="w-3 h-3"/>:<TrendingDown className="w-3 h-3"/>}
            {kpi.cambio>0?"+":""}{kpi.cambio}%
          </span>
        )}
      </div>
      <div className="relative mt-3">
        {sinDatos ? (
          <div className="text-sm text-muted-foreground mt-1">Cargue el Excel</div>
        ) : (
          <div className="text-xl font-bold text-foreground tabular-nums">{display}{kpi.unidad}</div>
        )}
        <div className="text-xs text-muted-foreground mt-0.5 font-medium">{kpi.titulo}</div>
      </div>
    </div>
  );
}

function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 rounded-lg bg-primary/10"><Icon className="w-4 h-4 text-primary" /></div>
      <h2 className="text-base font-semibold text-foreground">{children}</h2>
    </div>
  );
}

function SinDatos({ mensaje = "Cargue el archivo Excel para ver los datos reales" }: { mensaje?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
      <FileSpreadsheet className="w-10 h-10 opacity-30" />
      <p className="text-sm text-center max-w-xs opacity-70">{mensaje}</p>
    </div>
  );
}

const RADIAN = Math.PI / 180;
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.07) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize:"11px", fontWeight:700 }}>{`${(percent*100).toFixed(1)}%`}</text>;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-border rounded-xl shadow-xl p-3 text-xs">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((item: any) => (
        <div key={item.dataKey} className="flex items-center gap-2 mt-1">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor:item.color }} />
          <span className="text-muted-foreground">{item.name}:</span>
          <span className="font-semibold text-foreground">{typeof item.value==="number"&&item.value%1!==0?item.value.toFixed(1):item.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
type Pestana = "resumen"|"rias"|"vacunacion"|"desarrollo"|"datos";

export default function PrimeraInfanciaDashboard() {
  const [periodo, setPeriodo] = useState("2026");
  const [mesSel, setMesSel] = useState("Todos");
  const [pestana, setPestana] = useState<Pestana>("resumen");
  const [municipiosSel, setMunicipiosSel] = useState<string[]>(MUNICIPIOS.map(m => m.id));
  const [ipsSel, setIpsSel] = useState<string[]>([]);
  const [grupoEdad, setGrupoEdad] = useState<GrupoEdadFiltro>("todos");
  const [excelCargado, setExcelCargado] = useState<{ filename: string; rows: number; fecha: Date }|null>(null);
  const [rawExcelRows, setRawExcelRows] = useState<Record<string, unknown>[] | null>(null);
  const [gruposEdadExcel, setGruposEdadExcel] = useState<GrupoConteoExcel | null>(null);
  const [indicadoresExcel, setIndicadoresExcel] = useState<IndPorGrupo | null>(null);
  const [historial, setHistorial] = useState<HistorialCarga[]>([]);
  const [datosRestaurados, setDatosRestaurados] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [indPorMunicipio, setIndPorMunicipio] = useState<Record<string, IndPorGrupo> | null>(null);
  const [colMunicipio, setColMunicipio] = useState<string>('B');

  // ── Detecta la columna del Excel que contiene el municipio ───────────────
  function detectarColumnaMunicipio(rawRows: Record<string, unknown>[], startIdx: number): string {
    const cols = ['B','A','C','D','E','F','G'];
    const nombresNorm = MUNICIPIOS.map(m =>
      m.nombre.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    );
    let bestCol = 'B';
    let bestScore = 0;
    for (const col of cols) {
      let score = 0;
      for (let r = startIdx; r < Math.min(startIdx + 200, rawRows.length); r++) {
        const val = String(rawRows[r]?.[col] ?? '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
        if (val && nombresNorm.some(n => val.includes(n) || n.includes(val))) score++;
      }
      if (score > bestScore) { bestScore = score; bestCol = col; }
    }
    return bestCol;
  }

  // ── Computa y guarda indicadores pre-segmentados por municipio ───────────
  function computarYGuardarPorMunicipio(rawRows: Record<string, unknown>[], colMun: string) {
    const result: Record<string, IndPorGrupo> = {};
    for (const mun of MUNICIPIOS) {
      const nombreNorm = mun.nombre.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
      result[mun.id] = calcularIndicadoresDesdeExcel(rawRows, 4, [nombreNorm], colMun);
    }
    setIndPorMunicipio(result);
    guardarIndPorMunicipio(result, colMun);
  }

  // Restaurar desde localStorage al montar
  useEffect(() => {
    const { meta, grupos, indicadores } = recuperarDatos();
    if (meta && grupos && indicadores) {
      setExcelCargado(meta);
      setGruposEdadExcel(grupos);
      setIndicadoresExcel(indicadores);
      setDatosRestaurados(true);
    }
    const { indPorMun, colMunicipio: col } = recuperarIndPorMunicipio();
    if (indPorMun) setIndPorMunicipio(indPorMun);
    if (col) setColMunicipio(col);
    setHistorial(recuperarHistorial());
    setMounted(true);
  }, []);

  // Guardar automáticamente cuando cambian los datos
  useEffect(() => {
    if (indicadoresExcel && gruposEdadExcel && excelCargado) {
      guardarDatos(excelCargado, gruposEdadExcel, indicadoresExcel);
      setHistorial(recuperarHistorial());
    }
  }, [indicadoresExcel, gruposEdadExcel, excelCargado]);

  const municipiosFiltrados = MUNICIPIOS.filter(m => {
    if (!municipiosSel.includes(m.id)) return false;
    if (ipsSel.length === 0) return true;
    return ipsSel.some(ips => m.ips_atiende.includes(ips));
  });

  // ── Nombres normalizados de municipios seleccionados (para filtro Excel) ────
  const municipiosNombresNorm = useMemo(() =>
    MUNICIPIOS
      .filter(m => municipiosSel.includes(m.id))
      .map(m => m.nombre.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
  , [municipiosSel]);

  // ── Indicadores filtrados por municipio (recalcula cuando cambia el filtro) ─
  const indicadoresFiltrados = useMemo(() => {
    const todosSeleccionados = municipiosSel.length === MUNICIPIOS.length;

    // Si tenemos rawRows en sesión: calcular dinámicamente con la columna detectada
    if (rawExcelRows) {
      if (todosSeleccionados) return calcularIndicadoresDesdeExcel(rawExcelRows, 4, undefined, colMunicipio);
      return calcularIndicadoresDesdeExcel(rawExcelRows, 4, municipiosNombresNorm, colMunicipio);
    }

    // Sin rawRows: usar pre-computados por municipio (guardados al cargar Excel)
    if (indPorMunicipio) {
      if (todosSeleccionados) return indicadoresExcel;
      // Sumar los municipios seleccionados desde los pre-computados
      const grupos = municipiosSel
        .map(id => indPorMunicipio[id])
        .filter(Boolean) as IndPorGrupo[];
      if (grupos.length === 0) return indicadoresExcel;
      // Agregar cada grupo etario sumando los municipios seleccionados
      const gruposEtarios = ["0-6m","7-12m","13-24m","25-59m","60m+","todos"] as const;
      const result = {} as IndPorGrupo;
      for (const ge of gruposEtarios) {
        const partes = grupos.map(g => g[ge]).filter(Boolean);
        if (partes.length === 0) continue;
        // Deep copy para no mutar el objeto guardado en indPorMunicipio
        const base = {
          ...partes[0],
          clasif: { ...partes[0].clasif },
          controles: partes[0].controles.map(c => ({ ...c })),
        };
        for (let i = 1; i < partes.length; i++) {
          const p = partes[i];
          base.total               += p.total;
          base.total_controles     += p.total_controles;
          base.vacunacion_completa += p.vacunacion_completa;
          base.tamizaje_hemoglobina+= p.tamizaje_hemoglobina;
          base.hierro              += p.hierro;
          base.desparasitacion     += p.desparasitacion;
          base.consejeria_lactancia+= p.consejeria_lactancia;
          base.lactancia_exclusiva_6m += p.lactancia_exclusiva_6m;
          base.bajo_peso_nacer     += p.bajo_peso_nacer;
          base.ninos_wayuu         += p.ninos_wayuu;
          base.zona_rural_dispersa += p.zona_rural_dispersa;
          base.clasif.adecuado     += p.clasif.adecuado;
          base.clasif.riesgo       += p.clasif.riesgo;
          base.clasif.dnt_moderada += p.clasif.dnt_moderada;
          base.clasif.dnt_severa   += p.clasif.dnt_severa;
          base.clasif.sobrepeso    += p.clasif.sobrepeso;
          base.clasif.sin_dato     += p.clasif.sin_dato;
          // Sumar controles por visita si coinciden
          p.controles.forEach((ctrl, idx) => {
            if (base.controles[idx]) {
              base.controles[idx].realizados      += ctrl.realizados;
              base.controles[idx].con_peso_talla  += ctrl.con_peso_talla;
            }
          });
        }
        result[ge] = base;
      }
      return result;
    }

    return indicadoresExcel; // fallback: datos completos sin filtrar
  }, [rawExcelRows, municipiosSel, municipiosNombresNorm, indicadoresExcel, indPorMunicipio, colMunicipio]);

  // ── Grupos de edad filtrados por municipio ───────────────────────────────
  const gruposEdadFiltrados = useMemo(() => {
    if (!rawExcelRows) return gruposEdadExcel;
    const todosSeleccionados = municipiosSel.length === MUNICIPIOS.length;
    if (todosSeleccionados) return calcularGruposEdadDesdeExcel(rawExcelRows, 4);
    // Filtrar rawRows por municipio y recalcular
    const filtradas = rawExcelRows.filter((row, i) => {
      if (i < 4) return false;
      const munVal = String(row[COLUMNA_MUNICIPIO] ?? '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return municipiosNombresNorm.some(m => munVal.includes(m) || m.includes(munVal));
    });
    return calcularGruposEdadDesdeExcel([...rawExcelRows.slice(0, 4), ...filtradas.slice()], 4);
  }, [rawExcelRows, municipiosSel, municipiosNombresNorm, gruposEdadExcel]);

  // ── Indicadores del grupo seleccionado (desde Excel) ─────────────────────
  const indExcel: IndicadoresGrupoExcel | null = indicadoresFiltrados
    ? (indicadoresFiltrados[grupoEdad as keyof IndPorGrupo] ?? indicadoresFiltrados["todos"])
    : null;

  const tieneExcel = !!indicadoresExcel;

  // ── KPIs calculados desde Excel ──────────────────────────────────────────
  // Niños registrados = siempre la población del territorio (datos MUNICIPIOS)
  // filtrada por municipios y grupo de edad seleccionados
  const ninosRegistrados: number = (() => {
    const pobTotal = municipiosFiltrados.reduce((s, m) => s + m.poblacion_total_0_59m, 0);
    if (grupoEdad === "todos") return pobTotal;
    // Para grupo específico: usar Excel si hay datos filtrados, sino estimación proporcional
    if (gruposEdadFiltrados) {
      const v = gruposEdadFiltrados[grupoEdad as keyof typeof gruposEdadFiltrados];
      return typeof v === "number" ? v : 0;
    }
    return 0;
  })();

  const coberturaVacunacion = indExcel ? pct(indExcel.vacunacion_completa, indExcel.total) : 0;

  // Nutrición: excluir sin_dato del denominador para no penalizar falta de registro
  const nutTotal = indExcel ? indExcel.total - indExcel.clasif.sin_dato : 0;
  const estadoNutricionalOk = indExcel ? pct(indExcel.clasif.adecuado, nutTotal) : 0;

  const totalControlesReal = indExcel?.total_controles ?? 0;

  const casosDNT = indExcel
    ? indExcel.clasif.dnt_moderada + indExcel.clasif.dnt_severa
    : 0;

  // ── Datos para gráficas — todos usan indicadoresFiltrados ────────────────
  // Barra controles por grupo
  const controlesBarData = indicadoresFiltrados ? [
    { grupo:"0–6m",   realizados: indicadoresFiltrados["0-6m"].total_controles,   color: GRUPO_COLORS["0-6m"] },
    { grupo:"7–12m",  realizados: indicadoresFiltrados["7-12m"].total_controles,  color: GRUPO_COLORS["7-12m"] },
    { grupo:"13–24m", realizados: indicadoresFiltrados["13-24m"].total_controles, color: GRUPO_COLORS["13-24m"] },
    { grupo:"25–59m", realizados: indicadoresFiltrados["25-59m"].total_controles, color: GRUPO_COLORS["25-59m"] },
  ] : null;

  // Pie clasificación nutricional
  const nutPieData = indExcel && indExcel.total > 0 ? [
    { name:"Adecuado/Normal",    value: indExcel.clasif.adecuado,     color:"#10b981" },
    { name:"Riesgo nutricional", value: indExcel.clasif.riesgo,       color:"#f59e0b" },
    { name:"DNT moderada",       value: indExcel.clasif.dnt_moderada, color:"#ef4444" },
    { name:"DNT severa",         value: indExcel.clasif.dnt_severa,   color:"#dc2626" },
    { name:"Sobrepeso",          value: indExcel.clasif.sobrepeso,    color:"#8b5cf6" },
  ].filter(d => d.value > 0) : null;

  // Barra vacunación por grupo
  const vacBarData = indicadoresFiltrados ? (["0-6m","7-12m","13-24m","25-59m"] as const).map(g => ({
    grupo: g,
    vacunados:    indicadoresFiltrados[g].vacunacion_completa,
    noVacunados:  indicadoresFiltrados[g].total - indicadoresFiltrados[g].vacunacion_completa,
    pct:          pct(indicadoresFiltrados[g].vacunacion_completa, indicadoresFiltrados[g].total),
  })) : null;

  // Controles por visita del grupo seleccionado
  const visitasData = indExcel && indExcel.controles.length > 0
    ? indExcel.controles.map(c => ({
        visita: c.nombre,
        realizados: c.realizados,
        conPesoTalla: c.con_peso_talla,
      }))
    : null;

  // Radar: solo indicadores medibles desde Excel
  const radarData = [
    { indicador:"Vacunación",  valor: Math.round(coberturaVacunacion) },
    { indicador:"Nutrición",   valor: Math.round(estadoNutricionalOk) },
    { indicador:"Hemoglobina", valor: indExcel ? Math.round(pct(indExcel.tamizaje_hemoglobina, indExcel.total)) : 0 },
    { indicador:"Hierro",      valor: indExcel ? Math.round(pct(indExcel.hierro, indExcel.total)) : 0 },
    { indicador:"Desparasit.", valor: indExcel ? Math.round(pct(indExcel.desparasitacion, indExcel.total)) : 0 },
  ];

  const kpis = [
    { titulo:"Niños Registrados",    valor:ninosRegistrados,       unidad:"",  cambio:+6.4, icono:Baby,       color:"from-violet-500 to-purple-600", bg:"bg-violet-50 dark:bg-violet-950/30",    iconBg:"bg-violet-100 dark:bg-violet-900/50",    iconColor:"text-violet-600 dark:text-violet-400",   tieneExcel },
    { titulo:"Vacunación Completa",  valor:coberturaVacunacion,    unidad:"%", cambio:+1.8, icono:Syringe,    color:"from-teal-500 to-cyan-600",     bg:"bg-teal-50 dark:bg-teal-950/30",       iconBg:"bg-teal-100 dark:bg-teal-900/50",       iconColor:"text-teal-600 dark:text-teal-400",       tieneExcel },
    { titulo:"Nutrición Adecuada",   valor:estadoNutricionalOk,    unidad:"%", cambio:+2.1, icono:Scale,      color:"from-emerald-500 to-green-600",  bg:"bg-emerald-50 dark:bg-emerald-950/30", iconBg:"bg-emerald-100 dark:bg-emerald-900/50",  iconColor:"text-emerald-600 dark:text-emerald-400", tieneExcel },
    { titulo:"Controles Realizados", valor:totalControlesReal,     unidad:"",  cambio:+4.3, icono:Stethoscope,color:"from-sky-500 to-blue-600",      bg:"bg-sky-50 dark:bg-sky-950/30",        iconBg:"bg-sky-100 dark:bg-sky-900/50",        iconColor:"text-sky-600 dark:text-sky-400",         tieneExcel },
    { titulo:"Casos DNT Activos",    valor:casosDNT,               unidad:"",  cambio:-2.1, icono:AlertCircle,color:"from-rose-500 to-pink-600",     bg:"bg-rose-50 dark:bg-rose-950/30",      iconBg:"bg-rose-100 dark:bg-rose-900/50",      iconColor:"text-rose-600 dark:text-rose-400",       tieneExcel },
  ];

  if (!mounted) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm">Cargando indicadores...</p>
      </div>
    </div>
  );

  const tabStyle = (tab: string) => `px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
    pestana===tab ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted"
  }`;

  return (
    <div className="min-h-screen bg-background">

      {/* ═══ HERO ════════════════════════════════════════════════════════════ */}
      <header className="gradient-hero text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-white/5 spin-slow" />
          <div className="absolute -bottom-32 -right-20 w-[500px] h-[500px] rounded-full bg-white/5" />
          {["🍼","⭐","🎈","🌟","💚","🎀","🌈","✨"].map((e,i) => (
            <div key={i} className="absolute text-2xl opacity-20 fade-in-up" style={{ left:`${8+i*12}%`, top:`${20+(i%3)*25}%`, animationDelay:`${i*0.15}s` }}>{e}</div>
          ))}
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="fade-in-up">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-xl glass"><Baby className="w-6 h-6" /></div>
                <span className="text-white/80 text-sm font-medium tracking-wide uppercase">Sistema de Monitoreo</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Primera Infancia</h1>
              <p className="text-white/75 mt-1.5 text-sm max-w-lg">
                RIAS · Nutrición · Vacunación · Desarrollo · Sentencia T-302 — La Guajira
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 fade-in-up fade-delay-2">
              {[{ label:"Municipios", value:`${municipiosFiltrados.length}/${MUNICIPIOS.length}`, icon:MapPin },{ label:"Período", value:periodo, icon:Calendar },{ label:"Base de datos", value:excelCargado ? `${fmtN(excelCargado.rows)} filas` : "Sin datos", icon:Activity }].map(({ label, value, icon:Icon }) => (
                <div key={label} className="glass rounded-xl px-3 py-3 text-center">
                  <Icon className="w-4 h-4 mx-auto mb-1 text-white/70" />
                  <div className="text-base font-bold">{value}</div>
                  <div className="text-white/65 text-xs">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Filtros */}
          <div className="mt-5 flex flex-wrap items-center gap-2 fade-in-up fade-delay-3">
            <div className="flex items-center gap-1.5 glass rounded-xl px-3 py-2 text-sm">
              <Filter className="w-3.5 h-3.5 text-white/70" />
              <select value={periodo} onChange={e=>setPeriodo(e.target.value)} className="bg-transparent text-white text-sm outline-none cursor-pointer">
                <option value="2026" className="text-gray-900">2026</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5 glass rounded-xl px-3 py-2 text-sm">
              <Calendar className="w-3.5 h-3.5 text-white/70" />
              <select value={mesSel} onChange={e=>setMesSel(e.target.value)} className="bg-transparent text-white text-sm outline-none cursor-pointer">
                {["Todos",...meses].map(m=><option key={m} value={m} className="text-gray-900">{m}</option>)}
              </select>
            </div>
            {excelCargado && (
              <div className="flex items-center gap-1.5 glass rounded-xl px-3 py-1.5 text-xs text-white/90">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
                <span className="text-emerald-200 font-medium">{fmtN(excelCargado.rows)} filas · {excelCargado.filename}</span>
              </div>
            )}
            <button
              onClick={() => setPestana("datos")}
              className="flex items-center gap-1.5 glass rounded-xl px-3 py-2 text-sm text-white/90 hover:bg-white/20 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              {excelCargado ? "Actualizar Base" : "Cargar Excel"}
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 40" className="w-full fill-background" preserveAspectRatio="none">
            <path d="M0,40 C360,0 1080,40 1440,0 L1440,40 Z" />
          </svg>
        </div>
      </header>

      {/* ═══ NAVEGACIÓN ══════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {([
              { id:"resumen",    label:"Resumen",        icon:BarChart2 },
              { id:"rias",       label:"RIAS Nutrición", icon:Apple },
              { id:"vacunacion", label:"Vacunación",     icon:Syringe },
              { id:"desarrollo", label:"C&D",            icon:Stethoscope },
              { id:"datos",      label:"Cargar Datos",   icon:Upload },
            ] as const).map(({ id, label, icon:Icon }) => (
              <button key={id} onClick={() => setPestana(id)} className={tabStyle(id)}>
                <Icon className="w-3.5 h-3.5" />
                {label}
                {id==="datos" && excelCargado && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ CONTENIDO ════════════════════════════════════════════════════════ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">

        {/* FILTROS PERSISTENTES */}
        {pestana !== "datos" && (
          <div className="space-y-4 fade-in-up">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <MunicipioFilter seleccionados={municipiosSel} onChange={setMunicipiosSel} ipsSel={ipsSel} onIpsChange={setIpsSel} />
              <div className="space-y-4">
                <AgeRangeSelector valor={grupoEdad} onChange={setGrupoEdad} conteos={gruposEdadFiltrados} />
                <ContadorControles rawRows={rawExcelRows} />
              </div>
            </div>
            <GeneradorInformesIPSI municipios={municipiosFiltrados} fecha={`${mesSel === "Todos" ? "2026" : mesSel + " 2026"}`} vigencia={periodo} />
          </div>
        )}

        {/* KPIs */}
        {pestana !== "datos" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {kpis.map((k,i) => <KPICard key={k.titulo} kpi={k} delay={i} />)}
          </div>
        )}

        {/* Sin Excel — aviso general */}
        {pestana !== "datos" && !tieneExcel && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl text-sm text-amber-800 dark:text-amber-300">
            <FileSpreadsheet className="w-5 h-5 flex-shrink-0" />
            <span>Los indicadores se calculan desde el archivo Excel. <button onClick={() => setPestana("datos")} className="underline font-semibold">Cargue la base de datos</button> para ver los datos reales.</span>
          </div>
        )}

        {/* ─── RESUMEN ──────────────────────────────────────────────────────── */}
        {pestana==="resumen" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Radar — indicadores desde Excel */}
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm card-hover fade-in-up">
                <SectionTitle icon={Star}>Índice Global de Indicadores</SectionTitle>
                {tieneExcel ? (
                  <>
                    <ResponsiveContainer width="100%" height={260}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="indicador" tick={{ fill:"hsl(var(--muted-foreground))", fontSize:11, fontWeight:500 }} />
                        <Radar name="Cobertura %" dataKey="valor" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} strokeWidth={2} />
                        <Tooltip content={<CustomTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {radarData.map(d => (
                        <div key={d.indicador} className="flex items-center gap-1.5 text-xs bg-muted rounded-lg px-2.5 py-1.5">
                          <span className="font-semibold text-primary">{d.valor}%</span>
                          <span className="text-muted-foreground">{d.indicador}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      Calculado desde columnas H, Y, AA, AH, AI del Excel
                    </p>
                  </>
                ) : (
                  <SinDatos />
                )}
              </div>

              {/* Clasificación nutricional */}
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm card-hover fade-in-up fade-delay-1">
                <SectionTitle icon={Scale}>Clasificación Nutricional</SectionTitle>
                {nutPieData ? (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={nutPieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" labelLine={false} label={CustomLabel}>
                          {nutPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v:any) => [fmtN(v), ""]} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:"11px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      Desde clasificación P/T del último control · {fmtN(indExcel?.clasif.sin_dato ?? 0)} sin dato
                    </p>
                  </>
                ) : (
                  <SinDatos />
                )}
              </div>
            </div>

            {/* Controles por grupo + Intervenciones */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm card-hover fade-in-up fade-delay-2">
                <SectionTitle icon={BarChart2}>Controles Realizados por Grupo</SectionTitle>
                {controlesBarData ? (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={controlesBarData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="grupo" tick={{ fill:"hsl(var(--muted-foreground))", fontSize:11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill:"hsl(var(--muted-foreground))", fontSize:11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="realizados" name="Controles" radius={[6,6,0,0]}>
                          {controlesBarData.map((d,i) => <Cell key={i} fill={d.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      Controles con fecha registrada en columnas AM, AX, BG, BP, CA, CL, CW, DH, DS, ED, EO, EZ
                    </p>
                  </>
                ) : (
                  <SinDatos />
                )}
              </div>

              {/* Intervenciones (resumen rápido) */}
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm card-hover fade-in-up fade-delay-3">
                <SectionTitle icon={Activity}>Intervenciones (grupo seleccionado)</SectionTitle>
                {indExcel && indExcel.total > 0 ? (
                  <div className="space-y-2.5">
                    {[
                      { label:"Vacunación completa (col Y)",       n: indExcel.vacunacion_completa,    color:"#7c3aed" },
                      { label:"Tamizaje hemoglobina (col AA)",     n: indExcel.tamizaje_hemoglobina,   color:"#ef4444" },
                      { label:"Suplemento hierro (col AH)",        n: indExcel.hierro,                 color:"#f59e0b" },
                      { label:"Desparasitación (col AI)",          n: indExcel.desparasitacion,        color:"#10b981" },
                      { label:"Consejería lactancia (col AU)",     n: indExcel.consejeria_lactancia,   color:"#0891b2" },
                      { label:"Lactancia exclusiva ≥6m (col AV)", n: indExcel.lactancia_exclusiva_6m, color:"#8b5cf6" },
                    ].map(({ label, n, color }) => {
                      const p = pct(n, indExcel.total);
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-semibold tabular-nums" style={{ color }}>{fmtN(n)} ({p}%)</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width:`${p}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-[10px] text-muted-foreground mt-2">Total niños grupo: {fmtN(indExcel.total)}</p>
                  </div>
                ) : (
                  <SinDatos />
                )}
              </div>
            </div>

            {/* T-302 */}
            {indExcel && (
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm fade-in-up">
                <SectionTitle icon={TrendingUp}>Sentencia T-302 — Datos del Excel</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label:"Niños Wayúu (col Q)",      v: fmtN(indExcel.ninos_wayuu),       color:"#7c3aed" },
                    { label:"Zona rural/dispersa (col N)", v: fmtN(indExcel.zona_rural_dispersa), color:"#0891b2" },
                    { label:"Bajo peso al nacer (col AO)", v: fmtN(indExcel.bajo_peso_nacer),    color:"#ef4444" },
                    { label:"Sin clasificación nutric.",  v: fmtN(indExcel.clasif.sin_dato),   color:"#6b7280" },
                  ].map(({ label, v, color }) => (
                    <div key={label} className="p-3 bg-muted/40 rounded-xl text-center">
                      <div className="text-2xl font-bold" style={{ color }}>{v}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Controles por mes — solo cuando hay rawRows cargados en sesión */}
            {rawExcelRows && (
              <ContadorControles rawRows={rawExcelRows} />
            )}
          </div>
        )}

        {/* ─── RIAS NUTRICIÓN ───────────────────────────────────────────────── */}
        {pestana==="rias" && (
          <RIASSection municipios={municipiosFiltrados} grupoFiltro={grupoEdad} indicadoresExcel={indicadoresFiltrados} />
        )}

        {/* ─── VACUNACIÓN ────────────────────────────────────────────────────── */}
        {pestana==="vacunacion" && (
          <div className="space-y-5 fade-in-up">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 text-sm text-amber-800 dark:text-amber-300">
              <strong>Nota:</strong> El Excel contiene la columna Y (Esquema vacunación completo: SI/NO). No incluye datos por biológico (BCG, Pentavalente, Triple Viral, Polio). Solo se muestra lo medible desde el archivo.
            </div>

            {vacBarData ? (
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm card-hover">
                <SectionTitle icon={Syringe}>Vacunación Completa por Grupo de Edad (col Y)</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                  {vacBarData.map(d => (
                    <div key={d.grupo} className="bg-muted/40 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{d.pct.toFixed(1)}%</div>
                      <div className="text-xs font-semibold text-foreground mt-0.5">{d.grupo}</div>
                      <div className="text-[10px] text-muted-foreground">{fmtN(d.vacunados)} de {fmtN(d.vacunados + d.noVacunados)}</div>
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width:`${d.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={vacBarData} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="grupo" tick={{ fill:"hsl(var(--muted-foreground))", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:"hsl(var(--muted-foreground))", fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:"11px" }} />
                    <Bar dataKey="vacunados" name="Con vacunación completa" fill="#0891b2" radius={[4,4,0,0]} />
                    <Bar dataKey="noVacunados" name="Sin vacunación completa" fill="#e2e8f0" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Fuente: columna Y del Excel — Esquema de vacunación completo (SI/NO)
                </p>
              </div>
            ) : (
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                <SectionTitle icon={Syringe}>Vacunación Completa por Grupo de Edad</SectionTitle>
                <SinDatos />
              </div>
            )}
          </div>
        )}

        {/* ─── C&D ───────────────────────────────────────────────────────────── */}
        {pestana==="desarrollo" && (
          <div className="space-y-5 fade-in-up">

            {visitasData ? (
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm card-hover">
                <SectionTitle icon={Stethoscope}>Controles por Visita — {grupoEdad === "todos" ? "Todos los grupos" : grupoEdad}</SectionTitle>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={visitasData} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="visita" tick={{ fill:"hsl(var(--muted-foreground))", fontSize:10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:"hsl(var(--muted-foreground))", fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:"11px" }} />
                    <Bar dataKey="realizados" name="Controles con fecha" fill="#7c3aed" radius={[4,4,0,0]} />
                    <Bar dataKey="conPesoTalla" name="Con peso y talla" fill="#10b981" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Cada barra = controles con fecha registrada en la columna correspondiente
                </p>
              </div>
            ) : (
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                <SectionTitle icon={Stethoscope}>Controles por Visita</SectionTitle>
                <SinDatos />
              </div>
            )}

            {controlesBarData && (
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm card-hover">
                <SectionTitle icon={BarChart2}>Total Controles por Grupo de Edad</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={controlesBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="grupo" tick={{ fill:"hsl(var(--muted-foreground))", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:"hsl(var(--muted-foreground))", fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="realizados" name="Controles" radius={[6,6,0,0]}>
                      {controlesBarData.map((d,i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ─── CARGAR DATOS ─────────────────────────────────────────────────── */}
        {pestana==="datos" && (
          <div className="space-y-5 fade-in-up max-w-4xl mx-auto">

            {/* Cargar Excel */}
            <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
              <SectionTitle icon={FileSpreadsheet}>Cargar Base de Datos Mensual</SectionTitle>

              {datosRestaurados && excelCargado && !rawExcelRows && (
                <div className="mb-4 flex items-start gap-2.5 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-700 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                  <span className="text-base">💾</span>
                  <div>
                    <span className="font-semibold">Datos guardados restaurados automáticamente</span>
                    <br />
                    <span className="opacity-80">{excelCargado.filename} · {fmtN(excelCargado.rows)} registros</span>
                    <br />
                    <span className="opacity-70">Cargue un nuevo archivo para actualizar, o use los botones de exportación.</span>
                  </div>
                </div>
              )}

              <ExcelLoader
                onDataLoaded={(rows, filename, fecha, rawRows) => {
                  setExcelCargado({ filename, rows: rows.length, fecha });
                  setRawExcelRows(rawRows);
                  setGruposEdadExcel(calcularGruposEdadDesdeExcel(rawRows, 4));
                  setIndicadoresExcel(calcularIndicadoresDesdeExcel(rawRows, 4));
                  setDatosRestaurados(false);
                  // Detectar columna municipio y pre-computar por municipio
                  const colMun = detectarColumnaMunicipio(rawRows, 4);
                  setColMunicipio(colMun);
                  computarYGuardarPorMunicipio(rawRows, colMun);
                }}
                onGuardar={() => {
                  if (excelCargado && gruposEdadExcel && indicadoresExcel) {
                    guardarDatos(excelCargado, gruposEdadExcel, indicadoresExcel);
                    setHistorial(recuperarHistorial());
                  }
                }}
              />
            </div>

            {/* Exportar / Base de datos */}
            {indicadoresExcel && gruposEdadExcel && excelCargado && (
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                <SectionTitle icon={Activity}>Exportar Datos — Formato Base de Datos</SectionTitle>
                <p className="text-xs text-muted-foreground mb-4">
                  Descarga los datos transformados en formatos amigables para Excel, Power BI, Google Sheets o cualquier sistema de base de datos.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  <button
                    onClick={() => exportarCSVIndicadores(indicadoresExcel, gruposEdadExcel, excelCargado.filename)}
                    className="flex flex-col items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-700 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors text-center"
                  >
                    <span className="text-2xl">📊</span>
                    <div>
                      <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">CSV Indicadores</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Una fila por grupo etario · Listo para Power BI / Google Sheets</div>
                    </div>
                  </button>

                  {rawExcelRows && (
                    <button
                      onClick={() => exportarCSVFilasCrudas(rawExcelRows, excelCargado.filename)}
                      className="flex flex-col items-center gap-2 p-4 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-700 rounded-xl hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors text-center"
                    >
                      <span className="text-2xl">📋</span>
                      <div>
                        <div className="text-sm font-semibold text-sky-800 dark:text-sky-300">CSV Datos Completos</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{fmtN(excelCargado.rows)} registros · Columnas no vacías solamente</div>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => exportarJSON(indicadoresExcel, gruposEdadExcel, excelCargado)}
                    className="flex flex-col items-center gap-2 p-4 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-700 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors text-center"
                  >
                    <span className="text-2xl">🗃️</span>
                    <div>
                      <div className="text-sm font-semibold text-violet-800 dark:text-violet-300">JSON Estructurado</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Para APIs e integración con sistemas externos</div>
                    </div>
                  </button>
                </div>

                {/* Info de columnas */}
                <div className="bg-muted/40 rounded-xl p-3 text-[10px] text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground text-xs mb-2">¿Qué incluye el CSV de Indicadores?</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                    <span>• grupo_edad / total_ninos</span>
                    <span>• vacunados_col_Y / pct_vacunacion</span>
                    <span>• clasif_adecuado / riesgo / dnt</span>
                    <span>• tamizaje_hemoglobina_col_AA</span>
                    <span>• hierro_col_AH / desparasitacion_col_AI</span>
                    <span>• consejeria_lactancia_col_AU</span>
                    <span>• lactancia_exclusiva_6m_col_AV</span>
                    <span>• ninos_wayuu_col_Q / zona_rural_col_N</span>
                    <span>• bajo_peso_nacer_col_AO</span>
                    <span>• controles_detalle (por visita)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Historial de cargas */}
            {historial.length > 0 && (
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <SectionTitle icon={Calendar}>Historial de Archivos Cargados</SectionTitle>
                  <button
                    onClick={() => { limpiarDatos(); setExcelCargado(null); setGruposEdadExcel(null); setIndicadoresExcel(null); setRawExcelRows(null); setHistorial([]); }}
                    className="text-xs text-red-500 hover:text-red-700 underline"
                  >
                    Limpiar todo
                  </button>
                </div>
                <div className="space-y-2">
                  {historial.map((h, i) => (
                    <div key={h.id} className={`flex items-center gap-3 p-3 rounded-xl text-xs ${i === 0 ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-700" : "bg-muted/40"}`}>
                      <span className="text-base">{i === 0 ? "✅" : "📁"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground truncate">{h.filename}</div>
                        <div className="text-muted-foreground">{fmtN(h.rows)} registros · Cargado: {new Date(h.cargadoEn).toLocaleString("es-CO")}</div>
                      </div>
                      {i === 0 && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">ACTIVO</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-6 text-xs text-muted-foreground border-t border-border mt-4">
          <p className="font-medium">Dashboard de Indicadores — Primera Infancia · {periodo}</p>
          <p className="mt-1 opacity-70">
            RIAS Nutrición · Sentencia T-302 · {municipiosSel.length} de {MUNICIPIOS.length} municipios
            {excelCargado && ` · Base de datos: ${excelCargado.filename}`}
          </p>
          <p className="mt-1 opacity-50 text-[10px]">Todos los indicadores calculados desde las 165 columnas del Excel oficial del programa</p>
        </footer>
      </main>
    </div>
  );
}
