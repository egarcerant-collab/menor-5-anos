'use server';
/**
 * @fileOverview Flujo de IA Senior para generar la narrativa del Informe de Gestión Anual PGP.
 * Usa Claude (Anthropic) para redacción ejecutiva de alto nivel para Dusakawi EPSI.
 */

import Anthropic from '@anthropic-ai/sdk';

export interface ReportAnalysisInput {
  prestador: string;
  nit: string;
  metaAnual: number;
  ejecucionAnual: number;
  porcentajeCumplimiento: number;
  totalCups: number;
  referenciaMensual: number;
  meses: { month: string; cups: number; value: number }[];
  conclusionesAdicionales?: string;
  apiKey?: string;
}

export interface ReportAnalysisOutput {
  resumenEjecutivo: string;
  contextoContractual: string;
  analisisFinanciero: string;
  analisisT1: string;
  analisisT2: string;
  analisisT3: string;
  analisisT4: string;
  analisisRiesgo: string;
  hallazgosClave: string[];
  accionesMejora: string[];
  conclusionesFinales: string;
}

function buildPrompt(input: ReportAnalysisInput): string {
  const mesesTexto = input.meses
    .map(m => `- ${m.month}: ${m.cups.toLocaleString('es-CO')} CUPS — Valor ejecutado: $${m.value.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`)
    .join('\n');

  return `Eres el Director Nacional de Gestión del Riesgo en Salud de DUSAKAWI EPSI, con más de 15 años de experiencia en auditoría de contratos PGP (Pago Global Prospectivo) en el sistema de salud colombiano indígena. Debes redactar el INFORME DE GESTIÓN ANUAL — VIGENCIA 2025 para el prestador ${input.prestador} (NIT: ${input.nit}).

DATOS FINANCIEROS CLAVE (usa estos datos exactos en todo el informe):
- Meta Anual 2025: $${input.metaAnual.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
- Ejecución Anual Consolidada: $${input.ejecucionAnual.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
- Porcentaje de Cumplimiento: ${input.porcentajeCumplimiento.toFixed(2)}%
- Total CUPS ejecutadas: ${input.totalCups.toLocaleString('es-CO')} actividades
- Referencia mensual (meta/12): $${input.referenciaMensual.toLocaleString('es-CO', { minimumFractionDigits: 2 })}

DATOS MENSUALES DETALLADOS:
${mesesTexto}

${input.conclusionesAdicionales ? `OBSERVACIONES ADICIONALES DEL AUDITOR:\n${input.conclusionesAdicionales}\n` : ''}

INSTRUCCIÓN CRÍTICA: Responde ÚNICAMENTE con un objeto JSON válido, sin markdown, sin texto adicional. El JSON debe tener exactamente estas claves:

{
  "resumenEjecutivo": "...",
  "contextoContractual": "...",
  "analisisFinanciero": "...",
  "analisisT1": "...",
  "analisisT2": "...",
  "analisisT3": "...",
  "analisisT4": "...",
  "analisisRiesgo": "...",
  "hallazgosClave": ["hallazgo1", "hallazgo2", "hallazgo3", "hallazgo4", "hallazgo5", "hallazgo6", "hallazgo7", "hallazgo8"],
  "accionesMejora": ["accion1", "accion2", "accion3", "accion4", "accion5", "accion6"],
  "conclusionesFinales": "..."
}

REQUISITOS DE CONTENIDO POR SECCIÓN:

resumenEjecutivo: Mínimo 5 párrafos densos. Menciona la ejecución consolidada de $${input.ejecucionAnual.toLocaleString('es-CO', { minimumFractionDigits: 2 })} que representa el ${input.porcentajeCumplimiento.toFixed(2)}% de la meta anual de $${input.metaAnual.toLocaleString('es-CO', { minimumFractionDigits: 2 })}. Resalta la producción de ${input.totalCups.toLocaleString('es-CO')} CUPS. Usa terminología: "convergencia contractual", "trazabilidad financiera", "sostenibilidad del modelo prospectivo", "verificabilidad documental".

contextoContractual: Mínimo 4 párrafos. Describe el marco del contrato PGP entre Dusakawi EPSI y ${input.prestador} en Riohacha, La Guajira. Explica el modelo de compensación prospectiva, la naturaleza del PGP como herramienta de gestión del riesgo en poblaciones indígenas, el marco normativo (Resoluciones del Ministerio de Salud, normativa EPSI), y los objetivos del seguimiento anual.

analisisFinanciero: Mínimo 5 párrafos. Analiza: desviación absoluta entre ejecución y meta, distribución trimestral del gasto, costo promedio por CUPS, variabilidad mensual (máximo vs mínimo), meses de mayor y menor ejecución, presión del gasto unitario, y cómo la mezcla de procedimientos impactó el cierre. Curva de acumulación anual.

analisisT1: MÍNIMO 700 PALABRAS. Analiza enero, febrero y marzo mes a mes con cifras exactas de los datos proporcionados. Para cada mes: comportamiento de la demanda, mezcla de procedimientos, costo promedio, comparación vs referencia mensual ($${input.referenciaMensual.toLocaleString('es-CO', { minimumFractionDigits: 2 })}), alertas. Factores estacionales de inicio de año en La Guajira. Usa conceptos: "curva de activación de demanda", "efecto inicio de vigencia", "estacionalidad epidemiológica".

analisisT2: MÍNIMO 700 PALABRAS. Analiza abril, mayo y junio mes a mes. Comportamiento post-primer trimestre, tendencias de consolidación, morbilidades en La Guajira, mezcla de procedimientos de mediana complejidad, costo promedio vs T1. Acumulado a junio vs meta semestral. Señales de sub o sobre-ejecución sostenida.

analisisT3: MÍNIMO 700 PALABRAS. Analiza julio, agosto y septiembre. Semestre cerrado (T1+T2) y proyección de cierre anual. Impacto vacacional en julio, reactivación agosto-septiembre, morbilidad trazadora (desnutrición, enfermedades tropicales, atención materno-infantil indígena). Acumulado a septiembre y brecha con meta anual. Alertas tempranas de cierre.

analisisT4: MÍNIMO 700 PALABRAS. Analiza octubre, noviembre y diciembre. Cierre del año, pico histórico de octubre, consolidación noviembre, cierre administrativo diciembre. Estrategias de compensación ejecutadas. Brecha final, % cumplimiento e implicaciones contractuales. Viabilidad del cierre verificable y conciliable.

analisisRiesgo: Mínimo 4 párrafos. Riesgos financieros (sub-ejecución crónica, sobre-ejecución no sustentada), riesgos asistenciales (barreras de acceso comunidades indígenas), riesgos administrativos (oportunidad radicación soportes, calidad registros). Impacto en sostenibilidad del modelo PGP. Indicadores de alerta temprana.

hallazgosClave: Array de 8 strings. Cada hallazgo debe tener mínimo 100 palabras con cifras concretas del informe, mes/trimestre de referencia y lectura técnica institucional.

accionesMejora: Array de 6 strings. Cada acción debe incluir: descripción de la acción, responsable sugerido, plazo en meses, indicador de seguimiento y resultado esperado. Mínimo 100 palabras por acción.

conclusionesFinales: Mínimo 5 párrafos. Valoración global del desempeño, recomendaciones de conciliación contractual, proyección para vigencia 2026, recomendaciones de mejora del modelo PGP en La Guajira, declaración de verificabilidad. Tono ejecutivo senior de máxima autoridad técnica.

TONO: Altamente institucional, analítico, contundente y con máxima autoridad técnica senior. Vocabulario especializado en salud pública, gestión del riesgo, modelos de contratación prospectiva y auditoría EPSI. El informe debe proyectar la densidad de un documento oficial de 15+ páginas.`;
}

export async function generateReportAnalysis(input: ReportAnalysisInput): Promise<ReportAnalysisOutput> {
  try {
    const keyToUse = input.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!keyToUse) throw new Error('Se requiere una API Key de Anthropic (Claude).');

    const client = new Anthropic({ apiKey: keyToUse, dangerouslyAllowBrowser: false });

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: buildPrompt(input),
        },
      ],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extraer JSON de la respuesta (puede venir con markdown)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('La IA no devolvió un JSON válido. Respuesta: ' + rawText.substring(0, 200));

    const parsed = JSON.parse(jsonMatch[0]) as ReportAnalysisOutput;

    // Validar campos obligatorios
    const required = ['resumenEjecutivo', 'analisisT1', 'analisisT2', 'analisisT3', 'analisisT4', 'conclusionesFinales'];
    for (const field of required) {
      if (!parsed[field as keyof ReportAnalysisOutput]) {
        throw new Error(`Campo requerido "${field}" faltante en la respuesta de IA.`);
      }
    }

    return parsed;
  } catch (error: any) {
    console.error('Error crítico en redacción senior:', error);
    throw new Error(`Error en la generación: ${error?.message || 'Fallo de conexión con Claude'}`);
  }
}
