
'use server';
/**
 * @fileOverview Flujo de IA Senior para generar la narrativa del Informe de Gestión Anual PGP.
 * Redacción ejecutiva de alto nivel para Dusakawi EPSI.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MonthlyDataSchema = z.object({
  month: z.string(),
  cups: z.number(),
  value: z.number(),
});

const ReportAnalysisInputSchema = z.object({
  prestador: z.string(),
  nit: z.string(),
  metaAnual: z.number(),
  ejecucionAnual: z.number(),
  porcentajeCumplimiento: z.number(),
  totalCups: z.number(),
  referenciaMensual: z.number(),
  meses: z.array(MonthlyDataSchema),
  conclusionesAdicionales: z.string().optional(),
});

const ReportAnalysisOutputSchema = z.object({
  resumenEjecutivo: z.string().describe("Narrativa densa y técnica sobre la favorabilidad del modelo."),
  analisisT1: z.string().describe("Análisis detallado mes a mes del Trimestre I."),
  analisisT2: z.string().describe("Análisis detallado mes a mes del Trimestre II."),
  analisisT3: z.string().describe("Análisis detallado mes a mes del Trimestre III."),
  analisisT4: z.string().describe("Análisis detallado mes a mes del Trimestre IV."),
  hallazgosClave: z.array(z.string()).describe("Lista de 5-6 hallazgos financieros y administrativos."),
  accionesMejora: z.array(z.string()).describe("Lista de 3-4 acciones correctivas estratégicas."),
  conclusionesFinales: z.string().describe("Cierre contundente sobre la eficiencia del contrato."),
});

export type ReportAnalysisInput = z.infer<typeof ReportAnalysisInputSchema>;
export type ReportAnalysisOutput = z.infer<typeof ReportAnalysisOutputSchema>;

const seniorReportPrompt = ai.definePrompt({
  name: 'seniorReportPrompt',
  input: { schema: ReportAnalysisInputSchema },
  output: { schema: ReportAnalysisOutputSchema },
  prompt: `
Eres el Director Nacional de Gestión del Riesgo en Salud de Dusakawi EPSI. Debes redactar el INFORME DE GESTIÓN ANUAL — VIGENCIA 2025 para el prestador {{{prestador}}} (NIT: {{{nit}}}).

DATOS CLAVE PARA EL ANÁLISIS:
- Meta Anual 2025: {{{metaAnual}}}
- Ejecución Real Consolidada: {{{ejecucionAnual}}} ({{{porcentajeCumplimiento}}}% de la meta).
- Referencia Mensual (Meta/12): {{{referenciaMensual}}}
- Producción Total: {{{totalCups}}} actividades/CUPS.

INSTRUCCIONES DE REDACCIÓN (ESTILO EJECUTIVO SENIOR):
1. Tono: Institucional, técnico, analítico y con autoridad.
2. Estructura Narrativa: Debe seguir el modelo de 12 páginas, con análisis profundo mes a mes.
3. Resumen Ejecutivo: Menciona explícitamente la favorabilidad del modelo PGP, la trazabilidad trimestral y el cumplimiento porcentual.
4. Análisis Trimestrales: Describe cada mes mencionando actividades, valor ejecutado y costo promedio. Interpreta la variabilidad como estacionalidad de la demanda.
5. Hallazgos Clave: Deben ser contundentes, por ejemplo: "Mes pico en valor detectado en [Mes]", "Cumplimiento del 90-110% verificado".
6. Acciones de Mejora: Orientadas al control del gasto, conciliación anual y validación de soportes en plataforma (Aryuwi Soft).

{{#if conclusionesAdicionales}}
OBSERVACIONES TÉCNICAS DEL AUDITOR A INTEGRAR:
{{{conclusionesAdicionales}}}
{{/if}}

Divide la respuesta exactamente en los campos JSON solicitados. Genera textos largos y descriptivos para cada trimestre.
`,
});

export async function generateReportAnalysis(input: ReportAnalysisInput): Promise<ReportAnalysisOutput> {
  try {
    const { output } = await seniorReportPrompt(input);
    if (!output) throw new Error('La IA no pudo procesar la solicitud.');
    return output;
  } catch (error: any) {
    console.error(`Error crítico en redacción senior:`, error);
    throw new Error(error.message || 'Error desconocido en el servicio de IA.');
  }
}
