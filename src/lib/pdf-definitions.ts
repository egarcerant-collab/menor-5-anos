import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { Content, StyleDictionary, TDocumentDefinitions } from 'pdfmake/interfaces';

// Registra las fuentes necesarias para pdfmake.
if (pdfFonts.pdfMake && pdfMake.vfs) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
}

// --- Interfaces de Datos ---
export interface DeviatedCupInfo {
    cup: string;
    description?: string;
    activityDescription?: string;
    expectedFrequency: number;
    realFrequency: number;
    deviation: number;
    deviationValue: number;
    totalValue: number;
}
export interface InformeDatos {
    titulo: string;
    subtitulo: string;
    referencia: string;
    objetivos: string[];
    kpis: { label: string; value: string; color?: string; bold?: boolean; }[];
    analisis: { 
        title: string; 
        text: string;
        chartImage?: string; 
    }[];
    topOverExecuted: DeviatedCupInfo[];
    topUnexpected: { cup: string, realFrequency: number, totalValue: number, description?: string }[];
    ajustesGlosas?: {
        cup: string;
        description: string;
        originalQty: number;
        validatedQty: number;
        adjustmentValue: number;
        comment: string;
    }[];
    auditorConclusions?: string;
    auditorRecommendations?: string;
    ciudad: string;
    fecha: string;
    firmas: { nombre: string; cargo: string; }[];
}

const formatCurrency = (value: number) => {
  if (isNaN(value)) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
};

// Función para generar los textos de análisis estáticamente (Fallback profesional)
export function generateStaticAnalysisTexts(input: any) {
  const {
    valorNetoFinal,
    valorNotaTecnica,
    descuentoAplicado,
    porcentajeEjecucion,
    totalCups,
    unitAvg,
    totalValueOverExecuted,
    totalValueUnexpected,
    additionalConclusions,
    additionalRecommendations,
  } = input;

  const financialAnalysis = `
La ejecución financiera del periodo evaluado, tras el riguroso proceso de auditoría médica y conciliación técnica, arroja un **Valor Neto Final Liquidado de ${formatCurrency(valorNetoFinal)}**. 
Este resultado consolida un índice de ejecución del **${porcentajeEjecucion}%** respecto al presupuesto de la Nota Técnica programada (${formatCurrency(valorNotaTecnica)}). 
Es imperativo resaltar que el ajuste por glosas aplicadas asciende a **${formatCurrency(descuentoAplicado)}**, cifra que representa la contención del gasto obtenida mediante la validación de servicios con desviaciones críticas o ausencia de soporte contractual. 
La liquidación final se sitúa en un marco de sostenibilidad, garantizando el cumplimiento de los techos financieros pactados bajo el modelo PGP.
${additionalConclusions || ''}
  `.trim();

  const epidemiologicalAnalysis = `
Desde la perspectiva de gestión del riesgo asistencial, se registró una operatividad total de **${totalCups.toLocaleString('es-CO')} CUPS**, con un **Costo Unitario Promedio (CUP) de ${formatCurrency(unitAvg)}**. 
Este indicador refleja una intensidad en la prestación coherente con la complejidad de la red de servicios en el territorio de La Guajira. 
El análisis de frecuencias identifica patrones de utilización que responden a la demanda real de los afiliados, aunque se observan desviaciones puntuales en servicios específicos que requieren un monitoreo continuo para evitar la fragmentación de la atención. 
La respuesta de la red ha sido técnica y operativamente resolutiva dentro de los estándares de calidad esperados por Dusakawi EPSI.
  `.trim();

  const deviationAnalysis = `
Se han identificado desviaciones financieras significativas que impactan el equilibrio del contrato. El costo derivado de la **Sobre-ejecución de frecuencias asciende a ${formatCurrency(totalValueOverExecuted)}**, mientras que los **Servicios Inesperados (fuera de Nota Técnica) representan un impacto de ${formatCurrency(totalValueUnexpected)}**. 
Estas variaciones sugieren la necesidad de un ajuste fino en la planificación presupuestaria o un fortalecimiento en los mecanismos de autorización previa. 
La gestión del riesgo financiero debe priorizar la mitigación de estos excedentes mediante mesas técnicas de conciliación, asegurando que cada servicio prestado esté estrictamente alineado con el perfil epidemiológico contratado.
${additionalRecommendations || ''}
`.trim();

  return {
    financialAnalysis,
    epidemiologicalAnalysis,
    deviationAnalysis,
  };
}

function buildDocDefinition(data: InformeDatos, backgroundImageBase64: string): TDocumentDefinitions {
    const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [58, 110, 40, 70],
        background: function (currentPage: number) {
            if (!backgroundImageBase64) return null;
            return {
                image: backgroundImageBase64,
                width: 595,
                height: 842,
                absolutePosition: { x: 0, y: 0 }
            };
        },
        styles: {
            h1: { fontSize: 16, bold: true, margin: [0, 0, 0, 10], color: 'black' },
            h2: { fontSize: 12, bold: true, margin: [0, 15, 0, 5], color: '#1E3A8A' },
            p: { fontSize: 10, margin: [0, 0, 0, 8], alignment: 'justify', lineHeight: 1.3 },
            ref: { fontSize: 9, italic: true, margin: [0, 0, 0, 20], color: '#4B5563' },
            kpiLabel: { fontSize: 10, color: '#374151' },
            kpiValue: { fontSize: 10, bold: true, color: '#111827', alignment: 'right' },
            firmaNombre: { fontSize: 10, bold: true, margin: [0, 5, 0, 0] },
            firmaCargo: { fontSize: 9, color: '#6B7280' },
            tableHeader: { bold: true, fontSize: 9, color: 'white', fillColor: '#1E3A8A', margin: [0, 5, 0, 5] },
            tableCell: { fontSize: 8, margin: [0, 5, 0, 5] },
            tableCellComment: { fontSize: 8, margin: [0, 5, 0, 5], italics: true, color: '#374151' },
        },
        content: [
            { text: data.titulo, style: 'h1', alignment: 'center' },
            { text: data.subtitulo, style: 'p', alignment: 'center' },
            { text: data.referencia, style: 'ref', alignment: 'center' },

            { text: '1. OBJETIVOS DE LA AUDITORÍA TÉCNICA', style: 'h2' },
            { ul: data.objetivos.map(o => ({ text: o, style: 'p' })) },
            
            { text: '2. INDICADORES CLAVE DE DESEMPEÑO (KPIs)', style: 'h2' },
            {
                table: {
                    widths: ['*', 'auto'],
                    body: data.kpis.map(kpi => [
                        { text: kpi.label, style: 'kpiLabel', border: [false, false, false, true], borderColor: ['#E5E7EB', '#E5E7EB', '#E5E7EB', '#E5E7EB'] },
                        { text: kpi.value, style: 'kpiValue', color: kpi.color || '#111827', border: [false, false, false, true], borderColor: ['#E5E7EB', '#E5E7EB', '#E5E7EB', '#E5E7EB'] }
                    ])
                },
                layout: 'noBorders'
            },
            
            ...data.analisis.flatMap((item): Content[] => {
                const contentBlock: Content[] = [];
                contentBlock.push({ text: item.title, style: 'h2' });
                
                if (item.chartImage) {
                    contentBlock.push({
                        image: item.chartImage,
                        width: 420,
                        alignment: 'center',
                        margin: [0, 5, 0, 10],
                    });
                }
                
                if (item.text) {
                    // Convertir el texto con negrillas markdown a formato pdfmake
                    const parts = item.text.split(/(\*\*.*?\*\*)/g);
                    const formattedText = parts.map(part => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return { text: part.slice(2, -2), bold: true };
                        }
                        return part;
                    });
                    contentBlock.push({ text: formattedText, style: 'p' });
                }
                return contentBlock;
            }),
        ],
        footer: (currentPage: number, pageCount: number) => ({
            text: `Página ${currentPage} de ${pageCount}`,
            alignment: 'right',
            style: 'p',
            margin: [0, -40, 40, 0]
        }),
    };
    
    // TABLA DE SOBRE-EJECUTADOS
    if (data.topOverExecuted && data.topOverExecuted.length > 0) {
        (docDefinition.content as Content[]).push({
            text: '3. DETALLE DE CUPS CON SOBRE-EJECUCIÓN CRÍTICA',
            style: 'h2',
            margin: [0, 15, 0, 5],
        });
        (docDefinition.content as Content[]).push({
            table: {
                headerRows: 1,
                widths: ['auto', '*', 'auto', 'auto', 'auto'],
                body: [
                    [
                        { text: 'CUPS', style: 'tableHeader' },
                        { text: 'Descripción del Servicio', style: 'tableHeader' },
                        { text: 'Cant. Esp.', style: 'tableHeader', alignment: 'center' },
                        { text: 'Cant. Real', style: 'tableHeader', alignment: 'center' },
                        { text: 'Impacto ($)', style: 'tableHeader', alignment: 'right' },
                    ],
                    ...data.topOverExecuted.map(c => [
                        { text: c.cup, style: 'tableCell' },
                        { text: c.description || 'N/A', style: 'tableCell' },
                        { text: c.expectedFrequency.toFixed(0), style: 'tableCell', alignment: 'center' },
                        { text: c.realFrequency, style: 'tableCell', alignment: 'center' },
                        { text: formatCurrency(c.deviationValue), style: 'tableCell', alignment: 'right', bold: true, color: '#B91C1C' },
                    ]),
                ]
            },
            layout: 'lightHorizontalLines'
        });
    }

    // TABLA DE INESPERADOS
    if (data.topUnexpected && data.topUnexpected.length > 0) {
        (docDefinition.content as Content[]).push({
            text: '4. DETALLE DE SERVICIOS INESPERADOS (FUERA DE NT)',
            style: 'h2',
            margin: [0, 15, 0, 5],
        });
        (docDefinition.content as Content[]).push({
            table: {
                headerRows: 1,
                widths: ['auto', '*', 'auto', 'auto'],
                body: [
                     [
                        { text: 'CUPS', style: 'tableHeader' },
                        { text: 'Descripción del Servicio', style: 'tableHeader' },
                        { text: 'Frec. Real', style: 'tableHeader', alignment: 'center' },
                        { text: 'Valor Total ($)', style: 'tableHeader', alignment: 'right' },
                    ],
                    ...data.topUnexpected.map(c => [
                        { text: c.cup, style: 'tableCell' },
                        { text: c.description || 'N/A', style: 'tableCell' },
                        { text: c.realFrequency, style: 'tableCell', alignment: 'center' },
                        { text: formatCurrency(c.totalValue), style: 'tableCell', alignment: 'right', bold: true },
                    ]),
                ]
            },
            layout: 'lightHorizontalLines'
        });
    }

    // TABLA DE GLOSAS Y AJUSTES
    if (data.ajustesGlosas && data.ajustesGlosas.length > 0) {
        (docDefinition.content as Content[]).push({
            text: '5. RESUMEN DE GLOSAS Y AJUSTES DE AUDITORÍA',
            style: 'h2',
            margin: [0, 15, 0, 5],
            pageBreak: 'before',
        });
        (docDefinition.content as Content[]).push({
            table: {
                headerRows: 1,
                widths: ['auto', '*', 'auto', 'auto', 'auto', '*'],
                body: [
                     [
                        { text: 'CUPS', style: 'tableHeader' },
                        { text: 'Descripción', style: 'tableHeader' },
                        { text: 'Cant. Orig.', style: 'tableHeader', alignment: 'center' },
                        { text: 'Cant. Val.', style: 'tableHeader', alignment: 'center' },
                        { text: 'Glosa ($)', style: 'tableHeader', alignment: 'right' },
                        { text: 'Motivo Técnico de Glosa', style: 'tableHeader' },
                    ],
                    ...data.ajustesGlosas.map(item => [
                        { text: item.cup, style: 'tableCell' },
                        { text: item.description, style: 'tableCell' },
                        { text: item.originalQty, style: 'tableCell', alignment: 'center' },
                        { text: item.validatedQty, style: 'tableCell', alignment: 'center', bold: true },
                        { text: formatCurrency(item.adjustmentValue), style: 'tableCell', alignment: 'right', bold: true, color: '#B91C1C' },
                        { text: item.comment, style: 'tableCellComment' },
                    ]),
                ]
            },
            layout: 'lightHorizontalLines'
        });
    }

    // CONCLUSIONES Y RECOMENDACIONES DEL AUDITOR
    if (data.auditorConclusions || data.auditorRecommendations) {
        const contentToInsert: Content[] = [
            {
                text: '6. CONCLUSIONES Y RECOMENDACIONES FINALES',
                style: 'h2',
                pageBreak: 'before',
            }
        ];

        if (data.auditorConclusions) {
            contentToInsert.push({ text: 'Conclusiones Técnicas', style: 'h2', fontSize: 11, margin: [0, 5, 0, 5] });
            contentToInsert.push({ text: data.auditorConclusions, style: 'p' });
        }
        if (data.auditorRecommendations) {
            contentToInsert.push({ text: 'Recomendaciones Estratégicas', style: 'h2', fontSize: 11, margin: [0, 10, 0, 5] });
            contentToInsert.push({ text: data.auditorRecommendations, style: 'p' });
        }

        (docDefinition.content as Content[]).push(...contentToInsert);
    }

    // Añadir sección de firmas
    (docDefinition.content as Content[]).push({
        id: 'firmas_section',
        stack: [
            { text: 'FIRMAS RESPONSABLES', style: 'h2', margin: [0, 50, 0, 20] },
            {
                columns: data.firmas.map(firma => ({
                    stack: [
                        { text: '_____________________________________', alignment: 'center' },
                        { text: firma.nombre, style: 'firmaNombre', alignment: 'center' },
                        { text: firma.cargo, style: 'firmaCargo', alignment: 'center' },
                    ],
                    width: '*',
                })),
                columnGap: 20
            }
        ],
        unbreakable: true,
    });

    return docDefinition;
}

const configurePdfMake = () => {
     pdfMake.fonts = {
        Roboto: {
            normal: 'Roboto-Regular.ttf',
            bold: 'Roboto-Medium.ttf',
            italics: 'Roboto-Italic.ttf',
            bolditalics: 'Roboto-MediumItalic.ttf'
        }
    };
}

export async function descargarInformePDF(data: InformeDatos, backgroundImageBase64: string): Promise<void> {
    configurePdfMake();
    const docDefinition = buildDocDefinition(data, backgroundImageBase64);
    pdfMake.createPdf(docDefinition).download(`Informe_Ejecutivo_PGP_${data.header?.ipsNombre?.replace(/\s/g, '_') || 'Dusakawi'}.pdf`);
}

export async function generarURLInformePDF(data: InformeDatos, backgroundImageBase64: string): Promise<string> {
    configurePdfMake();
    const docDefinition = buildDocDefinition(data, backgroundImageBase64);
    return new Promise((resolve, reject) => {
        pdfMake.createPdf(docDefinition).getDataUrl((dataUrl: string) => {
            resolve(dataUrl);
        }, (error: any) => {
            reject(error);
        });
    });
}
