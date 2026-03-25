// src/lib/informe-ipsi-pdf.ts
// Genera informes PDF por IPSI/IPS y municipio — Primera Infancia
// Usa pdfmake cargado vía CDN (window.pdfMake) igual que el proyecto gestante
// Fondo: membrete oficial Dusakawi EPSI (public/imagenes pdf/IMAGENEN UNIFICADA.jpg)

import type { MunicipioData } from "@/components/pi/types";
import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { contarControlesPorVisita, type ConteoVisita } from "@/lib/contadorControles";

// ─── Metas oficiales RIAS — Resolución 3202/2016 MinSalud ──────────────────
// Meta de cobertura para cada visita de Valoración Integral: ≥ 90%
const META_VISITA_RIAS = 90;

// ─── Helpers de formato ────────────────────────────────────────────────────
const pct = (n: number) => `${n.toFixed(1)}%`;
const num = (n: number) => n.toLocaleString("es-CO");
const meta = (p: number, m: number) => (p >= m ? "✓ CUMPLE" : "✗ NO CUMPLE");
const semaforo = (p: number, m: number) =>
  p >= m ? "#1a7a3c" : p >= m * 0.85 ? "#e07b39" : "#c0392b";

const GRUPOS = ["0-6m", "7-12m", "13-24m", "25-59m"] as const;
const LABELS_GRUPO: Record<string, string> = {
  "0-6m": "0 – 6 meses",
  "7-12m": "7 – 12 meses",
  "13-24m": "13 – 24 meses",
  "25-59m": "25 – 59 meses",
};

// ─── Cargar membrete como base64 ────────────────────────────────────────────
export async function cargarMembrete(): Promise<string | null> {
  try {
    const resp = await fetch("/imagenes%20pdf/IMAGENEN%20UNIFICADA.jpg");
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Interfaz de datos del informe ─────────────────────────────────────────
export interface InformeIPSI {
  ips: string;            // nombre de la IPS/IPSI
  municipio: string;
  departamento: string;
  fecha: string;          // p.ej. "Enero 2026"
  vigencia: string;       // p.ej. "2026"
  entidadEvaluadora?: string;
  firmante?: { nombre: string; cargo: string };
  municipioData: MunicipioData;
  controlesVisita?: ConteoVisita[];  // 12 visitas RIAS desde el Excel
  totalNinosMunicipio?: number;      // total niños del municipio (para calcular cobertura)
}

// ─── Constructor del documento PDF ─────────────────────────────────────────
export function buildIPSIDoc(inf: InformeIPSI, membreteBase64?: string | null): TDocumentDefinitions {
  const m = inf.municipioData;

  const h1 = (t: string, pageBreak?: boolean) => ({
    text: t, bold: true, fontSize: 11,
    margin: [0, pageBreak ? 0 : 10, 0, 4] as [number,number,number,number],
    ...(pageBreak ? { pageBreak: "before" as const } : {}),
    color: "#0a3d62",
    decoration: "underline" as const,
  });
  const cell = (t: string | number, bold = false, color = "black", align: string = "left") =>
    ({ text: String(t), fontSize: 9, bold, color, alignment: align, margin: [2,2,2,2] as [number,number,number,number] });
  const hCell = (t: string) =>
    ({ text: t, fontSize: 9, bold: true, color: "white", fillColor: "#0a3d62", alignment: "center" as const, margin: [2,3,2,3] as [number,number,number,number] });

  // ── Resumen total ──────────────────────────────────────────────────────
  const totalPob  = Object.values(m.grupos).reduce((s, g) => s + g.poblacion, 0);
  const totalCtrl = Object.values(m.grupos).reduce((s, g) => s + g.controles_realizados, 0);
  const totalRiesgo = Object.values(m.grupos).reduce((s, g) => s + g.casos_riesgo_nuevos, 0);
  const totalDNT  = Object.values(m.grupos).reduce((s, g) => s + g.casos_dnt_nuevos, 0);
  const totalTrat = Object.values(m.grupos).reduce((s, g) => s + g.casos_en_tratamiento, 0);
  const totalRec  = Object.values(m.grupos).reduce((s, g) => s + g.casos_recuperados, 0);

  // ── Tabla de cobertura por grupo ───────────────────────────────────────
  const tablaGrupos = {
    table: {
      headerRows: 1,
      widths: ["*", "auto", "auto", "auto", "auto", "auto", "auto"],
      body: [
        [
          hCell("Grupo Etario"),
          hCell("Población"),
          hCell("Controles"),
          hCell("% Cobert."),
          hCell("Riesgo Nuevo"),
          hCell("DNT Nuevo"),
          hCell("En Tto."),
        ],
        ...GRUPOS.map(g => {
          const gd = m.grupos[g];
          const pcg = gd.poblacion > 0 ? (gd.controles_realizados / gd.poblacion) * 100 : 0;
          return [
            cell(LABELS_GRUPO[g], true),
            cell(num(gd.poblacion), false, "black", "center"),
            cell(num(gd.controles_realizados), false, "black", "center"),
            cell(pct(pcg), true, semaforo(pcg, 90), "center"),
            cell(num(gd.casos_riesgo_nuevos), false, "black", "center"),
            cell(num(gd.casos_dnt_nuevos), false, "#c0392b", "center"),
            cell(num(gd.casos_en_tratamiento), false, "black", "center"),
          ];
        }),
        [
          cell("TOTAL", true, "#0a3d62"),
          cell(num(totalPob), true, "#0a3d62", "center"),
          cell(num(totalCtrl), true, "#0a3d62", "center"),
          cell(pct(totalPob > 0 ? (totalCtrl / totalPob) * 100 : 0), true, "#0a3d62", "center"),
          cell(num(totalRiesgo), true, "#0a3d62", "center"),
          cell(num(totalDNT), true, "#c0392b", "center"),
          cell(num(totalTrat), true, "#0a3d62", "center"),
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#d0d7de",
      vLineColor: () => "#d0d7de",
    },
    margin: [0, 0, 0, 10] as [number,number,number,number],
  };

  // ── Indicadores por grupo ──────────────────────────────────────────────
  const seccionIndicadores: any[] = [];
  GRUPOS.forEach(g => {
    const gd = m.grupos[g];
    if (!gd.indicadores || gd.indicadores.length === 0) return;
    seccionIndicadores.push({
      text: `Indicadores — ${LABELS_GRUPO[g]}`,
      bold: true, fontSize: 10, color: "#0a3d62",
      margin: [0, 8, 0, 3] as [number,number,number,number],
    });
    seccionIndicadores.push({
      table: {
        headerRows: 1,
        widths: ["*", "auto", "auto", "auto", "auto"],
        body: [
          [hCell("Indicador"), hCell("Nro."), hCell("% Real"), hCell("Meta"), hCell("Estado")],
          ...gd.indicadores.map(ind => [
            cell(ind.nombre),
            cell(num(ind.numero), false, "black", "center"),
            cell(pct(ind.porcentaje), true, semaforo(ind.porcentaje, ind.meta), "center"),
            cell(pct(ind.meta), false, "black", "center"),
            cell(meta(ind.porcentaje, ind.meta), true,
              ind.porcentaje >= ind.meta ? "#1a7a3c" : "#c0392b", "center"),
          ]),
        ],
      },
      layout: {
        hLineWidth: () => 0.4,
        vLineWidth: () => 0.4,
        hLineColor: () => "#d0d7de",
        vLineColor: () => "#d0d7de",
      },
      margin: [0, 0, 0, 6] as [number,number,number,number],
    });
  });

  // ── Visitas RIAS (12 controles Valoración Integral) ───────────────────
  const seccionVisitas: any[] = [];
  if (inf.controlesVisita && inf.controlesVisita.length > 0) {
    const totalNinos = inf.totalNinosMunicipio ?? 1;
    const totalVisitas = inf.controlesVisita.reduce((s, v) => s + v.conteo, 0);

    seccionVisitas.push(
      h1("Controles RIAS · Valoración Integral por Visita", true),
      {
        text: [
          { text: "Fuente: ", bold: true, fontSize: 8 },
          { text: "Columnas AM, AX, BG, BP, CA, CL, CW, DH, DS, ED, EO, EZ del Excel. ", fontSize: 8, color: "#555" },
          { text: "Meta: ≥90% según Resolución 3202/2016 MinSalud. ", fontSize: 8, color: "#555" },
          { text: `Total visitas registradas: ${num(totalVisitas)}`, fontSize: 8, bold: true, color: "#0a3d62" },
        ],
        margin: [0, 0, 0, 6] as [number,number,number,number],
      },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "*", "auto", "auto", "auto", "auto"],
          body: [
            [
              hCell("#"),
              hCell("Rango de edad · Visita"),
              hCell("Profesional"),
              hCell("Realizados"),
              hCell(`Meta (≥${META_VISITA_RIAS}%)`),
              hCell("Estado"),
            ],
            ...inf.controlesVisita.map(v => {
              const pcV = totalNinos > 0 ? (v.conteo / totalNinos) * 100 : 0;
              const esMed = v.profesional === 'Medicina';
              return [
                cell(String(v.numero), true, "#0a3d62", "center"),
                cell(v.rango),
                {
                  text: v.profesional,
                  fontSize: 9,
                  bold: true,
                  color: esMed ? "#1d4ed8" : "#065f46",
                  margin: [2,2,2,2] as [number,number,number,number],
                },
                cell(num(v.conteo), true, "black", "center"),
                cell(`${META_VISITA_RIAS}%`, false, "black", "center"),
                cell(
                  v.conteo > 0 ? (pcV >= META_VISITA_RIAS ? "✓ CUMPLE" : "✗ BAJO") : "SIN DATO",
                  true,
                  v.conteo === 0 ? "#9ca3af" : pcV >= META_VISITA_RIAS ? "#1a7a3c" : "#c0392b",
                  "center"
                ),
              ];
            }),
            // Fila total
            [
              cell("", false, "black", "center"),
              cell("TOTAL VISITAS REGISTRADAS", true, "#0a3d62"),
              cell("", false, "black", "center"),
              cell(num(totalVisitas), true, "#0a3d62", "center"),
              cell("—", false, "black", "center"),
              cell("", false, "black", "center"),
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.4,
          vLineWidth: () => 0.4,
          hLineColor: () => "#d0d7de",
          vLineColor: () => "#d0d7de",
        },
        margin: [0, 0, 0, 10] as [number,number,number,number],
      }
    );
  }

  // ── Sentencia T-302 ────────────────────────────────────────────────────
  const t302Seccion: any[] = [];
  if (m.t302 && m.t302.ninos_wayuu > 0) {
    const t = m.t302;
    t302Seccion.push(
      h1("Indicadores Sentencia T-302 — Niños Wayuu", true),
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto"],
          body: [
            [hCell("Indicador"), hCell("Valor"), hCell("Referencia")],
            [cell("Niños Wayuu en seguimiento"), cell(num(t.ninos_wayuu), true, "black", "center"), cell("—", false, "black", "center")],
            [cell("Cobertura en zona dispersa"), cell(pct(t.cobertura_dispersa), true, semaforo(t.cobertura_dispersa, 80), "center"), cell("≥ 80%", false, "black", "center")],
            [cell("Seguimiento nominal"), cell(pct(t.seguimiento_nominal), true, semaforo(t.seguimiento_nominal, 90), "center"), cell("≥ 90%", false, "black", "center")],
            [cell("Tiempo diagnóstico (días)"), cell(t.tiempo_diagnostico_dias.toFixed(1), true, t.tiempo_diagnostico_dias <= 7 ? "#1a7a3c" : "#c0392b", "center"), cell("≤ 7 días", false, "black", "center")],
            [cell("Articulación extramural"), cell(pct(t.articulacion_extramural), true, semaforo(t.articulacion_extramural, 85), "center"), cell("≥ 85%", false, "black", "center")],
            [cell("Continuidad ola invernal"), cell(pct(t.continuidad_ola_invernal), true, semaforo(t.continuidad_ola_invernal, 80), "center"), cell("≥ 80%", false, "black", "center")],
          ],
        },
        layout: {
          hLineWidth: () => 0.4,
          vLineWidth: () => 0.4,
          hLineColor: () => "#d0d7de",
          vLineColor: () => "#d0d7de",
        },
        margin: [0, 0, 0, 10] as [number,number,number,number],
      }
    );
  }

  // ── Firma ──────────────────────────────────────────────────────────────
  const firmaBloque: any[] = inf.firmante
    ? [
        { text: "", margin: [0, 30, 0, 0] as [number,number,number,number] },
        { canvas: [{ type: "line" as const, x1: 100, y1: 0, x2: 380, y2: 0, lineWidth: 1 }], margin: [0, 20, 0, 4] as [number,number,number,number] },
        { text: inf.firmante.nombre, alignment: "center" as const, bold: true, fontSize: 10 },
        { text: inf.firmante.cargo, alignment: "center" as const, fontSize: 9, color: "#555555" },
      ]
    : [];

  // ── Con membrete: márgenes ajustados al área blanca del membrete ───────
  // El membrete ocupa: arriba ~105pt (header logo+código), abajo ~90pt (footer dirección),
  // izq ~38pt (triángulo + borde greca), der ~22pt (borde greca)
  const conMembrete = !!membreteBase64;
  const pageMargins: [number, number, number, number] = conMembrete
    ? [48, 108, 28, 88]
    : [55, 80, 55, 65];

  // ── Documento final ───────────────────────────────────────────────────
  const doc: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins,
    info: {
      title: `Informe IPSI — ${inf.ips} · ${inf.municipio}`,
      author: inf.entidadEvaluadora ?? "Dusakawi EPSI · Primera Infancia",
      subject: "Indicadores RIAS · Primera Infancia",
    },

    // ── Fondo: membrete en todas las páginas ──────────────────────────
    background: conMembrete
      ? () => ({
          image: membreteBase64!,
          width: 595.28,
          height: 841.89,
          absolutePosition: { x: 0, y: 0 },
        })
      : undefined,

    // ── Header: solo número de página (el logo está en el membrete) ───
    header: conMembrete
      ? (page: number, pages: number) => ({
          text: `Pág. ${page}/${pages}`,
          alignment: "right" as const,
          fontSize: 7,
          color: "#666666",
          margin: [0, 10, 30, 0],
        })
      : (page: number, pages: number) => ({
          columns: [
            {
              stack: [
                { text: "INDICADORES PRIMERA INFANCIA", bold: true, fontSize: 9, color: "#0a3d62" },
                { text: `RIAS Nutrición · Sentencia T-302 · ${inf.fecha}`, fontSize: 8, color: "#555" },
              ],
              margin: [55, 18, 0, 0],
            },
            {
              stack: [
                { text: inf.ips, bold: true, fontSize: 8, color: "#0a3d62", alignment: "right" as const },
                { text: `${inf.municipio} · ${inf.departamento}`, fontSize: 8, color: "#555", alignment: "right" as const },
              ],
              margin: [0, 18, 55, 0],
            },
          ],
        }),

    // ── Footer: nada (el membrete ya tiene dirección y eslogan) ──────
    footer: conMembrete
      ? undefined
      : (page: number, pages: number) => ({
          columns: [
            { text: inf.entidadEvaluadora ?? "Dusakawi EPSI · Primera Infancia", fontSize: 8, color: "#888", margin: [55, 0, 0, 0] },
            { text: `Pág. ${page} de ${pages}`, fontSize: 8, color: "#888", alignment: "right" as const, margin: [0, 0, 55, 0] },
          ],
          margin: [0, 10, 0, 0],
        }),

    defaultStyle: { fontSize: 10, lineHeight: 1.3, font: "Roboto" },
    styles: {
      titulo:    { fontSize: 13, bold: true, color: "#0a3d62", alignment: "center" },
      subtitulo: { fontSize: 10, bold: true, color: "#0a3d62", alignment: "center" },
      periodo:   { fontSize: 12, bold: true, color: "#c0392b", alignment: "center" },
    },

    content: [
      // ── Portada ──────────────────────────────────────────────────────
      { text: "\n" },
      { text: "INFORME DE INDICADORES", style: "titulo", margin: [0, 0, 0, 2] as [number,number,number,number] },
      { text: "PRIMERA INFANCIA · RIAS NUTRICIÓN", style: "subtitulo", margin: [0, 0, 0, 4] as [number,number,number,number] },

      // ── MES Y AÑO destacado ──────────────────────────────────────────
      { text: inf.fecha.toUpperCase(), style: "periodo", margin: [0, 0, 0, 6] as [number,number,number,number] },

      { canvas: [{ type: "rect" as const, x: 0, y: 0, w: 505, h: 2, r: 1, color: "#0a3d62" }], margin: [0, 2, 0, 12] as [number,number,number,number] },

      // ── Datos identificación ─────────────────────────────────────────
      {
        table: {
          widths: ["auto", "*"],
          body: [
            [{ text: "IPS / IPSI:", bold: true, fontSize: 10 }, { text: inf.ips, fontSize: 10 }],
            [{ text: "Municipio:", bold: true, fontSize: 10 }, { text: inf.municipio, fontSize: 10 }],
            [{ text: "Departamento:", bold: true, fontSize: 10 }, { text: inf.departamento, fontSize: 10 }],
            [{ text: "Período evaluado:", bold: true, fontSize: 10 }, { text: `${inf.fecha} — Vigencia ${inf.vigencia}`, fontSize: 10, color: "#c0392b", bold: true }],
            [{ text: "Entidad:", bold: true, fontSize: 10 }, { text: inf.entidadEvaluadora ?? "Dusakawi EPSI — Primera Infancia", fontSize: 10 }],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 12] as [number,number,number,number],
      },

      // ── 1. Cobertura por grupo etario ────────────────────────────────
      h1("1. Cobertura por Grupo Etario"),
      tablaGrupos,

      // ── 2. Resumen de casos ──────────────────────────────────────────
      h1("2. Resumen de Casos Nutricionales"),
      {
        columns: [
          {
            table: {
              widths: ["*", "auto"],
              body: [
                [{ text: "Total niños registrados 0–59m", bold: true, fontSize: 9 }, { text: num(m.poblacion_total_0_59m), fontSize: 9, alignment: "right" }],
                [{ text: "Total controles realizados", bold: true, fontSize: 9 }, { text: num(totalCtrl), fontSize: 9, alignment: "right" }],
                [{ text: "Cobertura global de controles", bold: true, fontSize: 9 }, { text: pct(m.poblacion_total_0_59m > 0 ? (totalCtrl / m.poblacion_total_0_59m) * 100 : 0), fontSize: 9, alignment: "right" }],
              ],
            },
            layout: "lightHorizontalLines",
          },
          {
            table: {
              widths: ["*", "auto"],
              body: [
                [{ text: "Casos nuevos en riesgo nutricional", bold: true, fontSize: 9 }, { text: num(totalRiesgo), fontSize: 9, alignment: "right", color: "#e07b39" }],
                [{ text: "Casos nuevos desnutrición aguda (DNT)", bold: true, fontSize: 9 }, { text: num(totalDNT), fontSize: 9, alignment: "right", color: "#c0392b" }],
                [{ text: "Casos en tratamiento activo", bold: true, fontSize: 9 }, { text: num(totalTrat), fontSize: 9, alignment: "right" }],
                [{ text: "Casos recuperados", bold: true, fontSize: 9 }, { text: num(totalRec), fontSize: 9, alignment: "right", color: "#1a7a3c" }],
              ],
            },
            layout: "lightHorizontalLines",
          },
        ],
        columnGap: 16,
        margin: [0, 0, 0, 10] as [number,number,number,number],
      },

      // ── 3. Visitas RIAS · Valoración Integral (datos reales Excel) ───
      ...seccionVisitas,

      // ── 4. Indicadores RIAS por grupo etario ─────────────────────────
      h1("4. Indicadores RIAS por Grupo Etario"),
      ...seccionIndicadores,

      // ── 5. T-302 ─────────────────────────────────────────────────────
      ...t302Seccion,

      // ── Firma ────────────────────────────────────────────────────────
      ...firmaBloque,
    ],
  };

  return doc;
}

// ─── Generar UN solo PDF ────────────────────────────────────────────────────
export async function generarInformeIPSI(
  inf: InformeIPSI,
  nombre?: string,
  membreteBase64?: string | null
): Promise<void> {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) throw new Error("pdfMake no disponible. Recarga la página.");
  const doc = buildIPSIDoc(inf, membreteBase64);
  const archivo = nombre ?? `Informe_${inf.ips.replace(/[^a-zA-Z0-9]/g, "_")}_${inf.municipio}_${inf.fecha.replace(/\s/g,"_")}.pdf`;
  pdfMake.createPdf(doc).download(archivo);
}

// ─── Generar PAQUETE ZIP con todos los informes ─────────────────────────────
export async function generarPaqueteIPSI(
  municipios: MunicipioData[],
  fecha: string,
  vigencia: string,
  entidadEvaluadora?: string,
  firmante?: { nombre: string; cargo: string },
  onProgress?: (actual: number, total: number, nombre: string) => void,
  controlesVisita?: ConteoVisita[],
  totalNinos?: number,
): Promise<void> {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) throw new Error("pdfMake no disponible. Recarga la página.");

  // Cargar membrete una vez para reutilizar en todos los PDFs
  const membrete = await cargarMembrete();

  const combos: { ips: string; muni: MunicipioData }[] = [];
  municipios.forEach(m => {
    m.ips_atiende.forEach(ips => combos.push({ ips, muni: m }));
  });

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const total = combos.length;

  for (let i = 0; i < combos.length; i++) {
    const { ips, muni } = combos[i];
    onProgress?.(i + 1, total, `${ips} · ${muni.nombre}`);

    const inf: InformeIPSI = {
      ips,
      municipio:    muni.nombre,
      departamento: muni.departamento,
      fecha,
      vigencia,
      entidadEvaluadora,
      firmante,
      municipioData: muni,
      controlesVisita,
      totalNinosMunicipio: totalNinos ?? muni.poblacion_total_0_59m,
    };
    const doc = buildIPSIDoc(inf, membrete);

    const blob: Blob = await new Promise(resolve =>
      pdfMake.createPdf(doc).getBlob((b: Blob) => resolve(b))
    );

    const carpeta = `${muni.departamento}/${muni.nombre}`;
    const archivo = `${ips.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚüÜñÑ\s]/g, "_").trim()}_${fecha.replace(/\s/g,"_")}.pdf`;
    zip.folder(carpeta)?.file(archivo, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Informes_IPSI_PrimeraInfancia_${fecha.replace(/\s/g,"_")}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
