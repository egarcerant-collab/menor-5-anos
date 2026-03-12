import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { Content, TDocumentDefinitions, Column } from 'pdfmake/interfaces';

if (pdfFonts.pdfMake && pdfMake.vfs) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
}

const formatCOP = (n: number) => {
    return new Intl.NumberFormat("es-CO", { 
        style: "currency", 
        currency: "COP", 
        maximumFractionDigits: 2,
        minimumFractionDigits: 2 
    }).format(n);
};

const formatNumber = (n: number) => new Intl.NumberFormat("es-CO").format(n);

export interface MonthlyRow {
    month: string;
    cups: number;
    value: number;
    avgCost: number;
    accumulated: number;
    percVsMeta: number;
    percVsRef: number;
}

export interface QuarterlyRow {
    quarter: string;
    cups: number;
    value: number;
    reference: number;
    percVsRef: number;
    status: string;
}

export interface InformeDatosSenior {
    header: {
        prestador: string;
        nit: string;
        periodo: string;
        fechaRadicacion: string;
        responsable: string;
        cargo: string;
    };
    metaAnual: number;
    ejecucionAnual: number;
    totalCups: number;
    meses: MonthlyRow[];
    trimestres: QuarterlyRow[];
    narrativa: {
        resumenEjecutivo: string;
        analisisT1: string;
        analisisT2: string;
        analisisT3: string;
        analisisT4: string;
        hallazgosClave: string[];
        accionesMejora: string[];
        conclusiones: string;
    };
}

function buildDocDefinition(data: InformeDatosSenior, backgroundImageBase64: string): TDocumentDefinitions {
    const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [50, 100, 50, 80],
        background: (currentPage: number) => ({
            image: backgroundImageBase64,
            width: 595,
            height: 842,
            absolutePosition: { x: 0, y: 0 }
        }),
        defaultStyle: {
            font: 'Roboto',
            fontSize: 10,
            lineHeight: 1.2
        },
        styles: {
            h1: { fontSize: 13, bold: true, margin: [0, 5, 0, 5], alignment: 'center' },
            h2: { fontSize: 11, bold: true, margin: [0, 10, 0, 5], color: '#000000' },
            h3: { fontSize: 10, bold: true, margin: [0, 8, 0, 3] },
            p: { fontSize: 10, margin: [0, 0, 0, 8], alignment: 'justify' },
            tableHeader: { bold: true, fontSize: 9, fillColor: '#f3f4f6', margin: [0, 3, 0, 3] },
            tableCell: { fontSize: 8.5, margin: [0, 2, 0, 2] },
            footer: { fontSize: 8, italic: true, color: '#666666' }
        },
        content: [
            { text: 'DUSAKAWI EPSI', style: 'h1' },
            { text: 'COORDINACIÓN DE ATENCIÓN DOMICILIARIA DIRECCIÓN NACIONAL DE GESTIÓN DEL RIESGO EN SALUD', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 15] },
            
            { text: 'INFORME DE GESTIÓN ANUAL — VIGENCIA 2025', style: 'h2', alignment: 'center' },
            { text: 'SEGUIMIENTO A EJECUCIÓN PGP — FINANZAS RIOHACHA (LA GUAJIRA)', fontSize: 10, bold: true, alignment: 'center', margin: [0, 0, 0, 15] },

            {
                columns: [
                    {
                        width: '*',
                        stack: [
                            { text: `Prestador: ${data.header.prestador}`, bold: true },
                            { text: `NIT: ${data.header.nit}` },
                            { text: `Territorio: Riohacha — La Guajira` }
                        ]
                    },
                    {
                        width: 'auto',
                        stack: [
                            { text: `Periodo: ${data.header.periodo}`, alignment: 'right' },
                            { text: `Radicación: ${data.header.fechaRadicacion}`, alignment: 'right' }
                        ]
                    }
                ],
                margin: [0, 0, 0, 20]
            },

            { text: '1. RESUMEN EJECUTIVO', style: 'h2' },
            { text: data.narrativa.resumenEjecutivo, style: 'p' },
            {
                ul: [
                    { text: `Meta anual 2025: ${formatCOP(data.metaAnual)}`, bold: true },
                    { text: `Ejecución anual consolidada: ${formatCOP(data.ejecucionAnual)} (${(data.ejecucionAnual / data.metaAnual * 100).toFixed(2)}% de la meta).` },
                    { text: `Producción anual consolidada: ${formatNumber(data.totalCups)} actividades/CUPS.`, bold: true }
                ],
                margin: [10, 0, 0, 15]
            },

            { text: '2. OBJETIVO, ALCANCE Y METODOLOGÍA', style: 'h2' },
            { text: '2.1 Objetivo', style: 'h3' },
            { text: 'Evaluar la ejecución del Acuerdo PGP durante la vigencia 2025 en Riohacha, consolidando mensualmente el volumen y valor ejecutado para sustentar decisiones institucionales de control del gasto y cierre verificable.', style: 'p' },
            { text: '2.2 Alcance', style: 'h3' },
            { text: 'Consolidado anual (enero–diciembre). Se concentra en resultados, indicadores e impacto administrativo/financiero.', style: 'p' },
            
            { text: '3. PARÁMETROS DEL PGP Y CONTROL DE GESTIÓN', style: 'h2' },
            { text: 'Se contempla una banda de control del 90% al 110% sobre la meta trimestral programada.', style: 'p' },
            { text: '3.1 Resumen trimestral vs referencia técnica', style: 'h3' },
            {
                table: {
                    headerRows: 1,
                    widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
                    body: [
                        [
                            { text: 'Trimestre', style: 'tableHeader' },
                            { text: 'CUPS', style: 'tableHeader', alignment: 'center' },
                            { text: 'Valor ($)', style: 'tableHeader', alignment: 'right' },
                            { text: 'Ref ($)', style: 'tableHeader', alignment: 'right' },
                            { text: '% vs Ref', style: 'tableHeader', alignment: 'center' },
                            { text: 'Lectura', style: 'tableHeader' }
                        ],
                        ...data.trimestres.map(t => [
                            { text: t.quarter, style: 'tableCell' },
                            { text: formatNumber(t.cups), style: 'tableCell', alignment: 'center' },
                            { text: formatCOP(t.value), style: 'tableCell', alignment: 'right' },
                            { text: formatCOP(t.reference), style: 'tableCell', alignment: 'right' },
                            { text: `${t.percVsRef.toFixed(2)}%`, style: 'tableCell', alignment: 'center', bold: true },
                            { text: t.status, style: 'tableCell' }
                        ])
                    ]
                },
                layout: 'lightHorizontalLines'
            },

            { text: '4. EJECUCIÓN MENSUAL CONSOLIDADA (TABLA VERIFICABLE)', style: 'h2', pageBreak: 'before' },
            {
                table: {
                    headerRows: 1,
                    widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
                    body: [
                        [
                            { text: 'Mes', style: 'tableHeader' },
                            { text: 'CUPS', style: 'tableHeader', alignment: 'center' },
                            { text: 'Valor ($)', style: 'tableHeader', alignment: 'right' },
                            { text: 'Costo Prom.', style: 'tableHeader', alignment: 'right' },
                            { text: 'Acumulado ($)', style: 'tableHeader', alignment: 'right' },
                            { text: '% vs Meta', style: 'tableHeader', alignment: 'center' },
                            { text: '% vs Ref', style: 'tableHeader', alignment: 'center' }
                        ],
                        ...data.meses.map(m => [
                            { text: m.month, style: 'tableCell' },
                            { text: formatNumber(m.cups), style: 'tableCell', alignment: 'center' },
                            { text: formatCOP(m.value), style: 'tableCell', alignment: 'right' },
                            { text: formatCOP(m.avgCost), style: 'tableCell', alignment: 'right' },
                            { text: formatCOP(m.accumulated), style: 'tableCell', alignment: 'right' },
                            { text: `${m.percVsMeta.toFixed(2)}%`, style: 'tableCell', alignment: 'center' },
                            { text: `${m.percVsRef.toFixed(2)}%`, style: 'tableCell', alignment: 'center', bold: true }
                        ])
                    ]
                },
                layout: 'lightHorizontalLines'
            },

            { text: '7. ANÁLISIS NARRATIVO — TRIMESTRE I (ENE, FEB, MAR)', style: 'h2', pageBreak: 'before' },
            { text: data.narrativa.analisisT1, style: 'p' },

            { text: '8. ANÁLISIS NARRATIVO — TRIMESTRE II (ABR, MAY, JUN)', style: 'h2' },
            { text: data.narrativa.analisisT2, style: 'p' },

            { text: '9. ANÁLISIS NARRATIVO — TRIMESTRE III (JUL, AGO, SEP)', style: 'h2' },
            { text: data.narrativa.analisisT3, style: 'p' },

            { text: '10. ANÁLISIS NARRATIVO — TRIMESTRE IV (OCT, NOV, DIC)', style: 'h2' },
            { text: data.narrativa.analisisT4, style: 'p' },

            { text: '10.1 Hallazgos clave (Impacto administrativo y financiero)', style: 'h3' },
            { ul: data.narrativa.hallazgosClave.map(h => ({ text: h, style: 'p' })), margin: [10, 0, 0, 10] },

            { text: '10.2 Desviaciones y acciones de mejora', style: 'h3' },
            { ul: data.narrativa.accionesMejora.map(a => ({ text: a, style: 'p' })), margin: [10, 0, 0, 10] },

            { text: '11. CONCLUSIONES Y RECOMENDACIONES', style: 'h2' },
            { text: data.narrativa.conclusiones, style: 'p' },

            {
                stack: [
                    { text: '_____________________________________', alignment: 'center', margin: [0, 60, 0, 0] },
                    { text: data.header.responsable, bold: true, alignment: 'center' },
                    { text: data.header.cargo, alignment: 'center' },
                    { text: 'DUSAKAWI EPSI', alignment: 'center' }
                ],
                unbreakable: true,
            }
        ],
        footer: (currentPage: number, pageCount: number) => ({
            columns: [
                { text: '"Trabajamos por la salud de los pueblos indígenas"', style: 'footer', alignment: 'left', margin: [50, 20] },
                { text: `Página ${currentPage} de ${pageCount}`, style: 'footer', alignment: 'right', margin: [0, 20, 50, 0] }
            ]
        })
    };

    return docDefinition;
}

export async function descargarInformeSeniorPDF(data: InformeDatosSenior, backgroundImage: string) {
    const docDef = buildDocDefinition(data, backgroundImage);
    pdfMake.createPdf(docDef).download(`Informe_Anual_PGP_${data.header.prestador.replace(/\s/g, '_')}.pdf`);
}

export async function generarURLInformeSeniorPDF(data: InformeDatosSenior, backgroundImage: string): Promise<string> {
    const docDef = buildDocDefinition(data, backgroundImage);
    return new Promise((resolve) => {
        pdfMake.createPdf(docDef).getDataUrl((url) => resolve(url));
    });
}
