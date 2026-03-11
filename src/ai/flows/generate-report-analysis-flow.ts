'use server';
/**
 * @fileOverview Flujo para generar texto profesional de análisis (financiero, epidemiológico y de desviaciones)
 * en informes PGP, usando IA (Genkit) con un enfoque ejecutivo senior para Dusakawi EPSI en La Guajira.
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
Eres el Director de Auditoría Médica y Financiera de Dusakawi EPSI. Tu especialidad es el modelo de Pago Global Prospectivo (PGP) en territorios complejos como La Guajira.
Redacta un análisis técnico-financiero de alto nivel para la sección "Evaluación de Ejecución Presupuestal y Sostenibilidad Contractual".

Datos Clave para el Análisis:
- Presupuesto Programado (Nota Técnica): {{{valorNotaTecnica}}}
- Ejecución Bruta (Sin Auditoría): {{{sumaMensual}}}
- Glosas/Descuentos Aplicados: {{{descuentoAplicado}}}
- Valor Neto Liquidado (Post-Auditoría): {{{valorNetoFinal}}}
- Índice de Ejecución Final: {{{porcentajeEjecucion}}}%

Instrucciones de Redacción:
1. Usa un lenguaje **altamente ejecutivo, analítico y contundente**. Evita generalidades.
2. Resalta en **negrilla** las cifras, porcentajes y términos técnicos críticos.
3. Analiza si la ejecución final se mantiene dentro del rango de tolerancia técnica (90-111%).
4. Justifica el impacto de las glosas aplicadas como un mecanismo necesario para el control del gasto y la preservación del equilibrio económico del contrato.
5. Contextualiza la importancia de este control para asegurar la continuidad de la prestación de servicios en la red de La Guajira.
{{#if additionalConclusions}}
6. Integra con fluidez técnica estas observaciones adicionales del auditor: {{{additionalConclusions}}}
{{/if}}

El resultado debe ser un texto cohesivo de 2 o 3 párrafos que demuestre una supervisión rigurosa y técnica.
`,
});

const epidemiologicalAnalysisPrompt = ai.definePrompt({
  name: 'epidemiologicalAnalysisPrompt',
  input: { schema: ReportAnalysisInputSchema },
  output: { schema: z.object({ epidemiologicalAnalysis: z.string() }) },
  prompt: `
Eres un Médico Auditor con especialización en Epidemiología y Gestión del Riesgo en Salud para Dusakawi EPSI.
Redacta un análisis profesional para la sección "Comportamiento Clínico-Epidemiológico y Dinámica de Prestación (CUPS)".

Indicadores Operativos:
- Volumen Total de CUPS Ejecutados: {{{totalCups}}}
- Costo Unitario Promedio (CUP): {{{unitAvg}}}
- Ítems con Desviación de Frecuencia (Sobre-ejecución): {{{overExecutedCount}}}
- Servicios Fuera de Nota Técnica (Inesperados): {{{unexpectedCount}}}

Instrucciones de Redacción:
1. Analiza la **pertinencia clínica** del volumen de servicios frente al perfil de morbilidad esperado en el departamento de La Guajira.
2. Interpreta el **Costo Unitario Promedio** como un indicador de la complejidad asistencial gestionada por el prestador durante el periodo.
3. Menciona la relación entre la frecuencia de los CUPS y la capacidad resolutiva de la red.
4. Usa terminología médica y de gestión del riesgo (ej. morbilidad trazadora, demanda inducida, frecuencia de uso).
5. Resalta en **negrilla** los indicadores clave.

El análisis debe proyectar una imagen de control médico-científico sobre la prestación de los servicios.
`,
});

const deviationAnalysisPrompt = ai.definePrompt({
  name: 'deviationAnalysisPrompt',
  input: { schema: ReportAnalysisInputSchema },
  output: { schema: z.object({ deviationAnalysis: z.string() }) },
  prompt: `
Eres el Analista Senior de Riesgos Contractuales de Dusakawi EPSI. Tu misión es blindar la estabilidad financiera de la EPSI.
Redacta un análisis crítico y propositivo para la sección "Análisis de Desviaciones Críticas y Gestión del Riesgo Financiero".

Cuantificación del Impacto de Desviaciones:
- Impacto por Sobre-ejecución de Frecuencias: {{{totalValueOverExecuted}}}
- Impacto por Servicios Inesperados (Fuera de NT): {{{totalValueUnexpected}}}
- Impacto por Sub-ejecución (Ahorro/Sub-prestación): {{{totalValueUnderExecuted}}}
- Impacto por Servicios Faltantes (Incumplimiento de Metas): {{{totalValueMissing}}}

Instrucciones de Redacción:
1. Sé **crítico y directo**. Cuantifica el impacto económico total de las desviaciones.
2. Diferencia claramente entre desviaciones por **frecuencia** y desviaciones por **severidad/costo**.
3. Analiza los "Servicios Inesperados" como una falla potencial en la planeación contractual o una distorsión en el registro de RIPS.
4. Propón medidas de mitigación concretas (ej. ajustes a la Nota Técnica, mesas de conciliación técnica, fortalecimiento de la auditoría de cuentas).
5. Resalta en **negrilla** los valores y los tipos de desviación identificados.
{{#if additionalRecommendations}}
6. Incorpora con autoridad técnica estas recomendaciones: {{{additionalRecommendations}}}
{{/if}}

El texto debe servir como base para la toma de decisiones gerenciales y la negociación con el prestador.
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
      financialAnalysis: fin.output?.financialAnalysis || "Error al generar análisis financiero detallado.",
      epidemiologicalAnalysis: epi.output?.epidemiologicalAnalysis || "Error al generar análisis clínico-epidemiológico.",
      deviationAnalysis: dev.output?.deviationAnalysis || "Error al generar análisis de desviaciones críticas.",
    };
  } catch (error) {
    console.error(`Error en flujo de IA senior:`, error);
    throw new Error(`El servicio de IA no pudo completar el análisis técnico de alto nivel.`);
  }
}
