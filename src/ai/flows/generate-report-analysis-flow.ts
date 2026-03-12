'use server';
/**
 * @fileOverview Flujo de IA Senior para generar la narrativa del Informe de Gestión Anual PGP.
 * Redacción ejecutiva para Dusakawi EPSI - Territorio La Guajira.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

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
  meses: z.array(MonthlyDataSchema),
  conclusionesAdicionales: z.string().optional(),
  recomendacionesAdicionales: z.string().optional(),
});

const ReportAnalysisOutputSchema = z.object({
  resumenEjecutivo: z.string(),
  analisisT1: z.string(),
  analisisT2: z.string(),
  analisisT3: z.string(),
  analisisT4: z.string(),
  hallazgosClave: z.array(z.string()),
  accionesMejora: z.array(z.string()),
  conclusionesFinales: z.string(),
});

export type ReportAnalysisInput = z.infer<typeof ReportAnalysisInputSchema>;
export type ReportAnalysisOutput = z.infer<typeof ReportAnalysisOutputSchema>;

const seniorReportPrompt = ai.definePrompt({
  name: 'seniorReportPrompt',
  input: { schema: ReportAnalysisInputSchema },
  output: { schema: ReportAnalysisOutputSchema },
  prompt: `
Eres el Director Nacional de Gestión del Riesgo en Salud de Dusakawi EPSI. Debes redactar el Informe de Gestión Anual 2025 para el prestador {{{prestador}}} (NIT: {{{nit}}}).

DATOS CLAVE:
- Meta Anual PGP: {{{metaAnual}}}
- Ejecución Real: {{{ejecucionAnual}}} ({{{porcentajeCumplimiento}}}%)
- Producción Total: {{{totalCups}}} actividades/CUPS.

INSTRUCCIONES DE REDACCIÓN (ESTILO ARIAL PROFESIONAL):
1. Usa un lenguaje contundente, técnico y ejecutivo.
2. Genera análisis narrativos específicos para cada trimestre (T1: Ene-Mar, T2: Abr-Jun, T3: Jul-Sep, T4: Oct-Dic) basándote en los datos de los meses proporcionados.
3. El Resumen Ejecutivo debe destacar la favorabilidad y eficiencia del modelo.
4. Los Hallazgos Clave deben ser puntos directos sobre impacto administrativo y financiero.
5. Las Acciones de Mejora deben ser correctivas y orientadas al control del gasto.
{{#if conclusionesAdicionales}}
6. Integra estas notas del auditor: {{{conclusionesAdicionales}}}
{{/if}}

Divide la respuesta en los campos JSON solicitados. No uses generalidades; menciona cifras y tendencias específicas.
`,
});

export async function generateReportAnalysis(input: ReportAnalysisInput): Promise<ReportAnalysisOutput> {
  try {
    const { output } = await seniorReportPrompt(input);
    if (!output) throw new Error('Error al generar narrativa de informe.');
    return output;
  } catch (error) {
    console.error(`Error en flujo de informe senior:`, error);
    throw new Error(`Servicio de IA no disponible para redacción senior.`);
  }
}
