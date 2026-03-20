"use client";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CheckCircle2, AlertTriangle, XCircle, FileSpreadsheet } from "lucide-react";
import type { MunicipioData, GrupoEdad, GrupoEdadFiltro } from "./types";
import { GRUPO_LABELS, GRUPO_COLORS, CATEGORIA_LABELS } from "./sampleData";
import type { IndPorGrupo, IndicadoresGrupoExcel } from "@/lib/indicadoresExcel";

const GRUPOS: GrupoEdad[] = ["0-6m", "7-12m", "13-24m", "25-59m"];

function semaforo(pct: number, meta: number) {
  const ratio = pct / meta;
  if (ratio >= 0.95) return { color: "#10b981", label: "En meta", icon: CheckCircle2 };
  if (ratio >= 0.80) return { color: "#f59e0b", label: "En riesgo", icon: AlertTriangle };
  return { color: "#ef4444", label: "Crítico", icon: XCircle };
}

function IndicadorRow({ nombre, numero, porcentaje, meta, categoria }: {
  nombre: string; numero: number; porcentaje: number; meta: number; categoria: string;
}) {
  const estado = semaforo(porcentaje, meta);
  const Icon = estado.icon;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0 group hover:bg-muted/30 rounded-lg px-2 transition-colors">
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: estado.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate font-medium">{nombre}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[120px]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min((porcentaje / meta) * 100, 100)}%`, backgroundColor: estado.color }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium">Meta: {meta}%</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <span className="text-base font-bold" style={{ color: estado.color }}>{porcentaje.toFixed(1)}%</span>
        <p className="text-xs text-muted-foreground">{numero.toLocaleString("es-CO")} NN</p>
      </div>
    </div>
  );
}

function CasosSummary({ data, color }: { data: { casos_riesgo_nuevos: number; casos_dnt_nuevos: number; casos_en_tratamiento: number; casos_recuperados: number; casos_perdida_seguimiento: number }; color: string }) {
  const items = [
    { label: "Nuevos riesgo", value: data.casos_riesgo_nuevos, bg: `${color}15` },
    { label: "Nuevos DNT", value: data.casos_dnt_nuevos, bg: "#ef444415" },
    { label: "En tratamiento", value: data.casos_en_tratamiento, bg: "#f59e0b15" },
    { label: "Recuperados", value: data.casos_recuperados, bg: "#10b98115" },
    { label: "Pérdida seguimiento", value: data.casos_perdida_seguimiento, bg: "#6b728015" },
  ];
  return (
    <div className="grid grid-cols-5 gap-2 mb-4">
      {items.map(({ label, value, bg }) => (
        <div key={label} className="text-center p-2.5 rounded-xl" style={{ backgroundColor: bg }}>
          <div className="text-xl font-bold text-foreground">{value}</div>
          <div className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  );
}

/** Panel de indicadores reales calculados desde el Excel */
function PanelExcel({ ind, color, total }: { ind: IndicadoresGrupoExcel; color: string; total: number }) {
  const pct = (n: number) => total > 0 ? parseFloat(((n / total) * 100).toFixed(1)) : 0;

  // Clasificación nutricional
  const clasifItems = [
    { label: "Adecuado / Normal",       valor: ind.clasif.adecuado,     color: "#10b981" },
    { label: "Riesgo nutricional",       valor: ind.clasif.riesgo,       color: "#f59e0b" },
    { label: "DNT aguda moderada",       valor: ind.clasif.dnt_moderada, color: "#ef4444" },
    { label: "DNT aguda severa",         valor: ind.clasif.dnt_severa,   color: "#7f1d1d" },
    { label: "Sobrepeso/Obesidad",       valor: ind.clasif.sobrepeso,    color: "#8b5cf6" },
    { label: "Sin clasificación",        valor: ind.clasif.sin_dato,     color: "#9ca3af" },
  ];

  const intervItems = [
    { label: "Vacunación completa (SI)", valor: ind.vacunacion_completa,  icon: "💉" },
    { label: "Tamizaje hemoglobina",     valor: ind.tamizaje_hemoglobina, icon: "🩸" },
    { label: "Suplemento hierro",        valor: ind.hierro,               icon: "🔴" },
    { label: "Desparasitación",          valor: ind.desparasitacion,      icon: "💊" },
    { label: "Consejería lactancia",     valor: ind.consejeria_lactancia, icon: "🍼" },
    ...(ind.bajo_peso_nacer > 0 ? [{ label: "Bajo peso al nacer (<2.5 kg)", valor: ind.bajo_peso_nacer, icon: "⚠️" }] : []),
  ];

  return (
    <div className="space-y-4">
      {/* Controles realizados por visita */}
      {ind.controles.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Controles realizados por visita
          </p>
          <div className="space-y-1.5">
            {ind.controles.map(ctrl => {
              const pctCtrl = pct(ctrl.realizados);
              const est = semaforo(pctCtrl, 80);
              return (
                <div key={ctrl.nombre} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{ctrl.nombre}</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(pctCtrl, 100)}%`, backgroundColor: est.color }}
                    />
                  </div>
                  <span className="text-xs font-bold tabular-nums w-10 text-right" style={{ color: est.color }}>
                    {ctrl.realizados.toLocaleString("es-CO")}
                  </span>
                  <span className="text-[10px] text-muted-foreground w-10 text-right">{pctCtrl}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clasificación nutricional */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Clasificación nutricional (última visita)
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {clasifItems.filter(c => c.valor > 0).map(({ label, valor, color: c }) => (
            <div key={label} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
              <span className="text-[11px] text-foreground font-medium leading-tight truncate pr-1">{label}</span>
              <div className="text-right flex-shrink-0">
                <span className="text-sm font-bold" style={{ color: c }}>{valor.toLocaleString("es-CO")}</span>
                <span className="text-[10px] text-muted-foreground ml-1">({pct(valor)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Intervenciones */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Intervenciones realizadas
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {intervItems.map(({ label, valor, icon }) => (
            <div key={label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
              <span className="text-base leading-none">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground truncate">{label}</p>
                <p className="text-sm font-bold text-foreground">
                  {valor.toLocaleString("es-CO")}
                  <span className="text-[10px] font-normal text-muted-foreground ml-1">({pct(valor)}%)</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* T-302 extras */}
      {(ind.ninos_wayuu > 0 || ind.zona_rural_dispersa > 0) && (
        <div className="flex gap-3">
          {ind.ninos_wayuu > 0 && (
            <div className="flex-1 p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-800/40 text-center">
              <div className="text-sm font-bold text-violet-700 dark:text-violet-400">{ind.ninos_wayuu.toLocaleString("es-CO")}</div>
              <div className="text-[10px] text-violet-600/70">Niños Wayúu</div>
            </div>
          )}
          {ind.zona_rural_dispersa > 0 && (
            <div className="flex-1 p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-800/40 text-center">
              <div className="text-sm font-bold text-teal-700 dark:text-teal-400">{ind.zona_rural_dispersa.toLocaleString("es-CO")}</div>
              <div className="text-[10px] text-teal-600/70">Zona rural/dispersa</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GrupoCard({
  grupo, municipios, indExcel,
}: {
  grupo: GrupoEdad | "60m+";
  municipios: MunicipioData[];
  indExcel?: IndicadoresGrupoExcel;
}) {
  const color = GRUPO_COLORS[grupo] ?? "#64748b";
  const label = GRUPO_LABELS[grupo as GrupoEdad] ?? "≥ 60 meses";
  const emojis: Record<string, string> = { "0-6m": "🍼", "7-12m": "🥣", "13-24m": "🚶", "25-59m": "🎒", "60m+": "🎓" };

  // Cuando hay Excel, mostrar datos reales; si no, usar datos estáticos (solo para grupos 0-59m)
  const isStaticGroup = (["0-6m","7-12m","13-24m","25-59m"] as string[]).includes(grupo);

  const aggGrupo = isStaticGroup ? {
    poblacion: municipios.reduce((s, m) => s + (m.grupos[grupo as GrupoEdad]?.poblacion ?? 0), 0),
    controles_realizados: municipios.reduce((s, m) => s + (m.grupos[grupo as GrupoEdad]?.controles_realizados ?? 0), 0),
    casos_riesgo_nuevos: municipios.reduce((s, m) => s + (m.grupos[grupo as GrupoEdad]?.casos_riesgo_nuevos ?? 0), 0),
    casos_dnt_nuevos: municipios.reduce((s, m) => s + (m.grupos[grupo as GrupoEdad]?.casos_dnt_nuevos ?? 0), 0),
    casos_en_tratamiento: municipios.reduce((s, m) => s + (m.grupos[grupo as GrupoEdad]?.casos_en_tratamiento ?? 0), 0),
    casos_recuperados: municipios.reduce((s, m) => s + (m.grupos[grupo as GrupoEdad]?.casos_recuperados ?? 0), 0),
    casos_perdida_seguimiento: municipios.reduce((s, m) => s + (m.grupos[grupo as GrupoEdad]?.casos_perdida_seguimiento ?? 0), 0),
  } : null;

  const totalParaPct = indExcel?.total ?? aggGrupo?.poblacion ?? 0;
  const cobertura = totalParaPct > 0
    ? parseFloat((((indExcel?.total_controles ?? aggGrupo?.controles_realizados ?? 0) / totalParaPct) * 100).toFixed(1))
    : 0;

  const allIndicadores = isStaticGroup ? (municipios[0]?.grupos[grupo as GrupoEdad]?.indicadores ?? []) : [];
  const aggregated = allIndicadores.map(ind => {
    const total = municipios.reduce((s, m) => {
      const found = m.grupos[grupo as GrupoEdad]?.indicadores.find(i => i.nombre === ind.nombre);
      return s + (found?.numero ?? 0);
    }, 0);
    const pob = aggGrupo?.poblacion ?? 1;
    const pct = pob > 0 ? parseFloat(((total / pob) * 100).toFixed(1)) : 0;
    return { ...ind, numero: total, porcentaje: pct };
  });

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm card-hover">
      {/* Header */}
      <div className="p-4 border-b border-border" style={{ background: `linear-gradient(135deg, ${color}15, ${color}05)` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{emojis[grupo]}</div>
            <div>
              <h3 className="font-bold text-foreground text-base">{label}</h3>
              <p className="text-xs text-muted-foreground">RIAS – Menores de 5 años</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color }}>{cobertura}%</div>
            <div className="text-xs text-muted-foreground">Cobertura controles</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="text-center bg-white/50 dark:bg-black/20 rounded-xl p-2.5">
            <div className="text-lg font-bold text-foreground">
              {(indExcel?.total ?? aggGrupo?.poblacion ?? 0).toLocaleString("es-CO")}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {indExcel ? "Niños en Excel" : "Población (estimada)"}
            </div>
          </div>
          <div className="text-center bg-white/50 dark:bg-black/20 rounded-xl p-2.5">
            <div className="text-lg font-bold text-foreground">
              {(indExcel?.total_controles ?? aggGrupo?.controles_realizados ?? 0).toLocaleString("es-CO")}
            </div>
            <div className="text-[10px] text-muted-foreground">Controles realizados</div>
          </div>
          <div className="text-center bg-white/50 dark:bg-black/20 rounded-xl p-2.5">
            <div className="text-lg font-bold" style={{ color: "#ef4444" }}>
              {(indExcel
                ? indExcel.clasif.dnt_moderada + indExcel.clasif.dnt_severa
                : aggGrupo?.casos_dnt_nuevos ?? 0).toLocaleString("es-CO")}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {indExcel ? "Casos DNT (Excel)" : "Nuevos DNT"}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {indExcel ? (
          /* ── Datos reales del Excel ── */
          <>
            <div className="flex items-center gap-2 mb-3 px-1">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] font-semibold text-emerald-600">Datos calculados desde el Excel</span>
            </div>
            <PanelExcel ind={indExcel} color={color} total={indExcel.total} />
          </>
        ) : (
          /* ── Datos estáticos de muestra ── */
          isStaticGroup && aggGrupo ? (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Casos activos (datos de muestra)</p>
              <CasosSummary data={aggGrupo} color={color} />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Indicadores de seguimiento</p>
              <div>
                {aggregated.map(ind => (
                  <IndicadorRow key={ind.nombre} {...ind} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <div className="text-3xl mb-2">📁</div>
              <p className="text-sm font-medium">Cargue el Excel para ver indicadores reales</p>
              <p className="text-xs mt-1">Los datos se calcularán desde la columna H (fecha de nacimiento) y las columnas de atención</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function T302Card({ municipios, indExcel }: { municipios: MunicipioData[]; indExcel?: IndPorGrupo | null }) {
  const agg = municipios.length > 0 ? {
    ninos_wayuu: municipios.reduce((s, m) => s + m.t302.ninos_wayuu, 0),
    cobertura_dispersa: parseFloat((municipios.reduce((s, m) => s + m.t302.cobertura_dispersa, 0) / municipios.length).toFixed(1)),
    seguimiento_nominal: parseFloat((municipios.reduce((s, m) => s + m.t302.seguimiento_nominal, 0) / municipios.length).toFixed(1)),
    tiempo_diagnostico_dias: parseFloat((municipios.reduce((s, m) => s + m.t302.tiempo_diagnostico_dias, 0) / municipios.length).toFixed(1)),
    articulacion_extramural: parseFloat((municipios.reduce((s, m) => s + m.t302.articulacion_extramural, 0) / municipios.length).toFixed(1)),
    continuidad_ola_invernal: parseFloat((municipios.reduce((s, m) => s + m.t302.continuidad_ola_invernal, 0) / municipios.length).toFixed(1)),
  } : { ninos_wayuu: 0, cobertura_dispersa: 0, seguimiento_nominal: 0, tiempo_diagnostico_dias: 0, articulacion_extramural: 0, continuidad_ola_invernal: 0 };

  // Si hay Excel, los datos reales de Wayúu y zona dispersa anulan los estáticos
  const wayuuReal = indExcel?.todos.ninos_wayuu ?? null;
  const dispersaReal = indExcel?.todos.zona_rural_dispersa ?? null;

  const indicadores = [
    { label: "Niños Wayúu atendidos", valor: (wayuuReal ?? agg.ninos_wayuu).toLocaleString("es-CO"), unidad: "", color: "#7c3aed", meta: null, fromExcel: wayuuReal !== null },
    { label: "Cobertura comunidades dispersas", valor: dispersaReal !== null ? dispersaReal.toLocaleString("es-CO") : `${agg.cobertura_dispersa}%`, unidad: dispersaReal !== null ? " niños" : "", color: agg.cobertura_dispersa >= 65 ? "#10b981" : "#ef4444", meta: "≥65%", fromExcel: dispersaReal !== null },
    { label: "Seguimiento nominal activo", valor: `${agg.seguimiento_nominal}`, unidad: "%", color: agg.seguimiento_nominal >= 80 ? "#10b981" : "#f59e0b", meta: "≥80%", fromExcel: false },
    { label: "Tiempo diagnóstico-tratamiento", valor: `${agg.tiempo_diagnostico_dias}`, unidad: " días", color: agg.tiempo_diagnostico_dias <= 5 ? "#10b981" : "#f59e0b", meta: "≤5 días", fromExcel: false },
    { label: "Articulación equipos extramurales", valor: `${agg.articulacion_extramural}`, unidad: "%", color: agg.articulacion_extramural >= 85 ? "#10b981" : "#f59e0b", meta: "≥85%", fromExcel: false },
    { label: "Continuidad en ola invernal", valor: `${agg.continuidad_ola_invernal}`, unidad: "%", color: agg.continuidad_ola_invernal >= 70 ? "#10b981" : "#ef4444", meta: "≥70%", fromExcel: false },
  ];

  const barData = municipios.map(m => ({
    municipio: m.nombre.split(" ")[0],
    wayuu: m.t302.ninos_wayuu,
    cobertura: m.t302.cobertura_dispersa,
  }));

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30">
        <div className="flex items-center gap-3">
          <div className="text-2xl">⚖️</div>
          <div>
            <h3 className="font-bold text-foreground text-base">Sentencia T-302 de 2017</h3>
            <p className="text-xs text-muted-foreground">Datos adicionales — Comunidades Wayúu y zonas dispersas</p>
          </div>
          <div className="ml-auto">
            <span className="text-xs font-semibold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-3 py-1.5 rounded-full border border-violet-200 dark:border-violet-700">
              Obligatorio EPS
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Indicadores de obligatorio reporte</p>
          <div className="space-y-3">
            {indicadores.map(({ label, valor, unidad, color, meta, fromExcel }) => (
              <div key={label} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{label}</p>
                  {meta && <p className="text-xs text-muted-foreground">Meta: {meta}</p>}
                  {fromExcel && <p className="text-[10px] text-emerald-600 font-semibold">📊 Desde Excel</p>}
                </div>
                <span className="text-lg font-bold ml-3 flex-shrink-0" style={{ color }}>
                  {valor}{unidad}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Niños Wayúu atendidos por municipio</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="municipio" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} width={56} />
              <Tooltip
                formatter={(v: number, name: string) => [
                  name === "wayuu" ? `${v.toLocaleString("es-CO")} niños` : `${v}%`,
                  name === "wayuu" ? "Niños Wayúu" : "Cobertura dispersa"
                ]}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "11px" }}
              />
              <Bar dataKey="wayuu" name="Niños Wayúu" radius={[0, 4, 4, 0]}>
                {barData.map((_, i) => <Cell key={i} fill={`hsl(${265 + i * 8} 83% ${50 + i * 3}%)`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

interface RIASSectionProps {
  municipios: MunicipioData[];
  grupoFiltro: GrupoEdadFiltro;
  indicadoresExcel?: IndPorGrupo | null;
}

export function RIASSection({ municipios, grupoFiltro, indicadoresExcel }: RIASSectionProps) {
  const grupos: (GrupoEdad | "60m+")[] = grupoFiltro === "todos"
    ? GRUPOS
    : [grupoFiltro as GrupoEdad | "60m+"];

  return (
    <div className="space-y-5 fade-in-up">
      {/* Banner RIAS */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-violet-50 via-blue-50 to-teal-50 dark:from-violet-950/20 dark:via-blue-950/20 dark:to-teal-950/20 border border-violet-200/50 dark:border-violet-800/30">
        <div className="text-2xl">📋</div>
        <div>
          <p className="font-bold text-foreground text-sm">Atenciones en Salud (Nutrición) RIAS – Menores de 5 años</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Indicadores estructurados por grupos de edad según lineamientos técnicos (Resolución 2350/2020)
            {municipios.length < 12 && ` · ${municipios.length} municipio${municipios.length !== 1 ? "s" : ""} seleccionado${municipios.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="ml-auto text-right hidden sm:block">
          <div className="text-xl font-bold text-primary">
            {(indicadoresExcel?.todos.total ?? municipios.reduce((s, m) => s + m.poblacion_total_0_59m, 0)).toLocaleString("es-CO")}
          </div>
          <div className="text-xs text-muted-foreground">
            {indicadoresExcel ? "Niños en Excel (con fecha nac.)" : "Total afiliados 0–59m"}
          </div>
        </div>
      </div>

      {/* Cards por grupo */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {grupos.map(g => (
          <GrupoCard
            key={g}
            grupo={g}
            municipios={municipios}
            indExcel={indicadoresExcel?.[g as keyof IndPorGrupo]}
          />
        ))}
      </div>

      {/* T-302 */}
      <T302Card municipios={municipios} indExcel={indicadoresExcel} />
    </div>
  );
}
