
'use server';
/**
 * @fileOverview Flujo para generar texto profesional de análisis (financiero, epidemiológico y de desviaciones)
 * en informes PGP, usando IA (Genkit).
 * Autor: Eduardo Garcerant — Dusakawi EPSI
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// =======================
// 🔹 1. Definición de Schemas
// =======================
const ReportAnalysisInputSchema = z.object({
  sumaMensual: z.number().describe("Valor total ejecutado del periodo (vrServicio JSON)."),
  valorNotaTecnica: z.number().describe("Presupuesto establecido en la nota técnica."),
  diffVsNota: z.number().describe("Diferencia entre lo ejecutado y lo presupuestado."),
  porcentajeEjecucion: z.string().describe("Porcentaje de ejecución (como string 'xx.xx%') respecto a la nota técnica."),
  totalCups: z.number().describe("Cantidad total de CUPS ejecutados."),
  unitAvg: z.number().describe("Costo unitario promedio (valor ejecutado / cantidad de CUPS)."),
  overExecutedCount: z.number().describe("CUPS sobre-ejecutados."),
  unexpectedCount: z.number().describe("CUPS no incluidos en la nota técnica."),
  valorNetoFinal: z.number().describe("Valor final a pagar al prestador post auditoría."),
  descuentoAplicado: z.number().describe("Monto total descontado por la auditoría."),
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

// =======================
// 🔹 2. Prompts Definidos
// =======================

const financialAnalysisPrompt = ai.definePrompt({
  name: 'financialAnalysisPrompt',
  input: { schema: ReportAnalysisInputSchema },
  output: { schema: z.object({ financialAnalysis: ReportAnalysisOutputSchema.shape.financialAnalysis }) },
  prompt: `
Eres un analista financiero y médico auditor experto en el sistema de salud colombiano (PGP).
Redacta un texto profesional y conciso (1200–1500 caracteres) para la sección "Análisis de Ejecución Financiera y Presupuestal".

Basado en estos KPIs:
- Presupuesto (Nota Técnica): {{{valorNotaTecnica}}}
- Valor Total a Pagar (Post Auditoría): {{{valorNetoFinal}}}
- Descuento Total Aplicado: {{{descuentoAplicado}}}
- Diferencia vs Presupuesto: {{{diffVsNota}}}
- Porcentaje de Ejecución Final: {{{porcentajeEjecucion}}}

Instrucciones:
- Sé directo y usa lenguaje ejecutivo.
- Explica que el valor a pagar es el resultado final post-auditoría, justificando los ajustes.
- Concluye con las implicaciones financieras para el contrato.
{{#if additionalConclusions}}
- Considera estas conclusiones del auditor: {{{additionalConclusions}}}
{{/if}}
`,
});

const epidemiologicalAnalysisPrompt = ai.definePrompt({
  name: 'epidemiologicalAnalysisPrompt',
  input: { schema: ReportAnalysisInputSchema },
  output: { schema: z.object({ epidemiologicalAnalysis: ReportAnalysisOutputSchema.shape.epidemiologicalAnalysis }) },
  prompt: `
Eres un médico auditor especializado en epidemiología de contratos PGP.
Redacta un texto profesional y conciso (1200–1500 caracteres) para la sección "Análisis del Comportamiento Epidemiológico y de Servicios (CUPS)".

Basado en estos indicadores:
- Total de CUPS Ejecutados: {{{totalCups}}}
- Costo Unitario Promedio: {{{unitAvg}}}
- CUPS Sobre-ejecutados (>111%): {{{overExecutedCount}}}
- CUPS Inesperados (no en NT): {{{unexpectedCount}}}

Instrucciones:
- Analiza el volumen y la coherencia de la prestación.
- Interpreta el costo unitario promedio como un indicador de complejidad de la atención.
- Evalúa la relación entre la demanda, la red de servicios y el comportamiento epidemiológico.
- Finaliza con observaciones sobre la gestión del riesgo y la capacidad de la red.
`,
});

const deviationAnalysisPrompt = ai.definePrompt({
  name: 'deviationAnalysisPrompt',
  input: { schema: ReportAnalysisInputSchema },
  output: { schema: z.object({ deviationAnalysis: ReportAnalysisOutputSchema.shape.deviationAnalysis }) },
  prompt: `
Eres un analista de riesgos y auditor PGP.
Redacta un texto profesional y conciso (1500–2000 caracteres) para la sección "Análisis del Valor de las Desviaciones".

Basado en estas desviaciones:
- Sobre-ejecución: {{{totalValueOverExecuted}}}
- CUPS Inesperados: {{{totalValueUnexpected}}}
- Sub-ejecución: {{{totalValueUnderExecuted}}}
- Faltantes: {{{totalValueMissing}}}

Instrucciones:
- Cuantifica el impacto económico de cada desviación.
- Explica las causas probables (aumento de incidencia, cambios clínicos, etc.).
- Evalúa los riesgos financieros y plantea medidas de mitigación (auditorías, ajustes de red, controles).
{{#if additionalRecommendations}}
- Considera estas recomendaciones del auditor: {{{additionalRecommendations}}}
{{/if}}
`,
});

// =======================
// 🔹 3. Flujo Principal
// =======================

const generateReportAnalysisFlow = ai.defineFlow(
  {
    name: 'generateReportAnalysisFlow',
    inputSchema: ReportAnalysisInputSchema,
    outputSchema: ReportAnalysisOutputSchema,
  },
  async (input) => {
    const validation = ReportAnalysisInputSchema.safeParse(input);
    if (!validation.success) {
      console.error("❌ Datos inválidos para el flujo:", validation.error);
      throw new Error("Entrada inválida para generar el informe PGP.");
    }

    try {
      // Ejecutar prompts en paralelo para más eficiencia
      const [financialResult, epidemiologicalResult, deviationResult] = await Promise.all([
        financialAnalysisPrompt(input),
        epidemiologicalAnalysisPrompt(input),
        deviationAnalysisPrompt(input),
      ]);
      
      const fin = financialResult.output?.financialAnalysis;
      const epi = epidemiologicalResult.output?.epidemiologicalAnalysis;
      const dev = deviationResult.output?.deviationAnalysis;
      
      if (!fin || !epi || !dev) {
        throw new Error("La IA no devolvió todas las secciones esperadas del análisis.");
      }

      return {
        financialAnalysis: fin,
        epidemiologicalAnalysis: epi,
        deviationAnalysis: dev,
      };

    } catch (error) {
      console.error(`🔥 Error durante el flujo de análisis:`, error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      throw new Error(`El servicio de IA no pudo generar el análisis. Detalle: ${errorMessage}`);
    }
  }
);

// =======================
// 🔹 4. Función Exportada Simplificada
// =======================

export async function generateReportAnalysis(input: ReportAnalysisInput): Promise<ReportAnalysisOutput> {
  return generateReportAnalysisFlow(input);
}
