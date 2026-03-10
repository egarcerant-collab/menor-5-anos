
'use server';
/**
 * @fileOverview Flujo para generar texto profesional de análisis (financiero, epidemiológico y de desviaciones)
 * en informes PGP, usando IA (Genkit) con un enfoque ejecutivo para La Guajira.
 * Autor: Eduardo Garcerant — Dusakawi EPSI
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ReportAnalysisInputSchema = z.object({
  sumaMensual: z.number(),
  valorNotaTecnica: z.number(),
  diffVsNota: z.number(),
  porcentajeEjecucion: z.string(),
  totalCups: z.number(),
  unitAvg: z.number(),
  overExecutedCount: z.number(),
  unexpectedCount: z.number(),
  valorNetoFinal: z.number(),
  descuentoAplicado: z.number(),
  additionalConclusions: z.string().optional(),
  additionalRecommendations: z.string().optional(),
  totalValueOverExecuted: z.number(),
  totalValueUnexpected: z.number(),
  totalValueUnderExecuted: z.number(),
  totalValueMissing: z.number(),
});

const ReportAnalysisOutputSchema = z.object({
  financialAnalysis: z.string(),
  epidemiologicalAnalysis: z.string(),
  deviationAnalysis: z.string(),
});

export type ReportAnalysisInput = z.infer<typeof ReportAnalysisInputSchema>;
export type ReportAnalysisOutput = z.infer<typeof ReportAnalysisOutputSchema>;

const financialAnalysisPrompt = ai.definePrompt({
  name: 'financialAnalysisPrompt',
  input: { schema: ReportAnalysisInputSchema },
  output: { schema: z.object({ financialAnalysis: z.string() }) },
  prompt: `
Eres un Analista Financiero Senior y Médico Auditor de Dusakawi EPSI, experto en el modelo PGP en el departamento de La Guajira.
Redacta un análisis profesional y contundente para la sección "Análisis de Ejecución Financiera y Presupuestal".

KPIs para el análisis:
- Presupuesto (Nota Técnica): {{{valorNotaTecnica}}}
- Valor Final a Pagar (Post-Auditoría): {{{valorNetoFinal}}}
- Descuento Total Aplicado: {{{descuentoAplicado}}}
- Diferencia vs Presupuesto: {{{diffVsNota}}}
- Porcentaje de Ejecución: {{{porcentajeEjecucion}}}

Instrucciones:
- Usa un lenguaje altamente ejecutivo y directo.
- Resalta en **negrilla** las cifras y términos clave.
- Contextualiza la importancia de la sostenibilidad financiera en la red de servicios de La Guajira.
- Explica que el valor final es el resultado de una auditoría rigurosa.
- Si hay un ahorro o sobre-costo, justifica su impacto en el equilibrio contractual.
{{#if additionalConclusions}}
- Integra estas conclusiones del auditor: {{{additionalConclusions}}}
{{/if}}
`,
});

const epidemiologicalAnalysisPrompt = ai.definePrompt({
  name: 'epidemiologicalAnalysisPrompt',
  input: { schema: ReportAnalysisInputSchema },
  output: { schema: z.object({ epidemiologicalAnalysis: z.string() }) },
  prompt: `
Eres un Médico Auditor especializado en Epidemiología para Dusakawi EPSI en La Guajira.
Redacta un análisis técnico sobre el "Comportamiento Epidemiológico y de Servicios (CUPS)".

KPIs para el análisis:
- Total de CUPS Ejecutados: {{{totalCups}}}
- Costo Unitario Promedio: {{{unitAvg}}}
- CUPS Sobre-ejecutados: {{{overExecutedCount}}}
- CUPS Inesperados: {{{unexpectedCount}}}

Instrucciones:
- Analiza la coherencia de la prestación frente al perfil de morbilidad esperado en el territorio.
- Resalta en **negrilla** los indicadores clave.
- Interpreta el costo unitario promedio como un reflejo de la complejidad asistencial.
- Menciona cómo la red de servicios está respondiendo a la demanda real de los afiliados.
`,
});

const deviationAnalysisPrompt = ai.definePrompt({
  name: 'deviationAnalysisPrompt',
  input: { schema: ReportAnalysisInputSchema },
  output: { schema: z.object({ deviationAnalysis: z.string() }) },
  prompt: `
Eres un Analista de Riesgos y Auditor PGP para Dusakawi EPSI.
Redacta un análisis profundo para la sección "Análisis de Desviaciones Críticas".

Impacto de las Desviaciones:
- Sobre-ejecución: {{{totalValueOverExecuted}}}
- CUPS Inesperados: {{{totalValueUnexpected}}}
- Sub-ejecución: {{{totalValueUnderExecuted}}}
- Faltantes: {{{totalValueMissing}}}

Instrucciones:
- Sé crítico y profesional. Cuantifica el impacto económico de las desviaciones.
- Resalta en **negrilla** los valores y los tipos de desviación.
- Explica posibles causas (mala planificación, incremento de incidencia, problemas de registro).
- Propón medidas de mitigación para blindar el contrato ante riesgos financieros futuros.
{{#if additionalRecommendations}}
- Incorpora estas recomendaciones: {{{additionalRecommendations}}}
{{/if}}
`,
});

export async function generateReportAnalysis(input: ReportAnalysisInput): Promise<ReportAnalysisOutput> {
  try {
    const [fin, epi, dev] = await Promise.all([
      financialAnalysisPrompt(input),
      epidemiologicalAnalysisPrompt(input),
      deviationAnalysisPrompt(input),
    ]);
    
    return {
      financialAnalysis: fin.output?.financialAnalysis || "Error al generar análisis financiero.",
      epidemiologicalAnalysis: epi.output?.epidemiologicalAnalysis || "Error al generar análisis epidemiológico.",
      deviationAnalysis: dev.output?.deviationAnalysis || "Error al generar análisis de desviaciones.",
    };
  } catch (error) {
    console.error(`Error en flujo de IA:`, error);
    throw new Error(`El servicio de IA no pudo completar el análisis.`);
  }
}
