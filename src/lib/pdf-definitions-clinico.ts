import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

if (pdfFonts.pdfMake && pdfMake.vfs) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
}

// --- Interfaces ---
export interface InformeClinicoData {
    contrato: string;
    ips: string;
    nit: string;
    poblacion: number;
    periodo: string;
    valorEsperado: number;
    limiteInferior: number;
    limiteSuperior: number;
    valorEjecutado: number;
    chartImage: string;
    auditor: string;
}

const formatCOP = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function buildDocDefinition(data: InformeClinicoData, backgroundImageBase64: string): TDocumentDefinitions {
    const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [58, 110, 40, 70],
        background: (currentPage: number) => ({
            image: backgroundImageBase64,
            width: 595,
            height: 842,
            absolutePosition: { x: 0, y: 0 }
        }),
        styles: {
            h1: { fontSize: 14, bold: true, margin: [0, 0, 0, 10], color: 'black', alignment: 'center' },
            h2: { fontSize: 11, bold: true, margin: [0, 12, 0, 4], color: '#1E3A8A' },
            p: { fontSize: 10, margin: [0, 0, 0, 8], alignment: 'justify', lineHeight: 1.3 },
            ref: { fontSize: 9, italic: true, margin: [0, 0, 0, 15], color: '#6B7280', alignment: 'center' },
            firmaNombre: { fontSize: 10, bold: true, margin: [0, 5, 0, 0] },
            firmaCargo: { fontSize: 9, color: '#6B7280' },
            listItem: { fontSize: 10, margin: [0, 0, 0, 5], alignment: 'justify', lineHeight: 1.3 },
        },
        content: [
            { text: 'INFORME TÉCNICO DE AUDITORÍA', style: 'h1' },
            {
                text: [
                    { text: `Contrato N° ${data.contrato}\n`, bold: true },
                    { text: `IPS ${data.ips}\n` },
                    { text: 'Municipio: Riohacha – Departamento de La Guajira\n' },
                    { text: 'Modalidad: Pago Global Prospectivo (PGP)\n' },
                    { text: `Periodo Evaluado: ${data.periodo}` }
                ],
                style: 'ref'
            },
            
            { text: '1. INTRODUCCIÓN', style: 'h2' },
            { text: `El presente Informe Técnico de Auditoría tiene como finalidad evaluar de manera integral la ejecución operativa, clínica y financiera del contrato N.° ${data.contrato}, suscrito entre DUSAKAWI EPSI y la IPS ${data.ips}, para la prestación de servicios de salud bajo la modalidad de Pago Global Prospectivo (PGP) en el municipio de Riohacha, departamento de La Guajira, durante el periodo de ${data.periodo}.`, style: 'p' },
            { text: 'El ejercicio auditor se desarrolla en el marco de las funciones de seguimiento, control y evaluación de la Dirección Nacional de Gestión del Riesgo en Salud, y tiene como propósito analizar la coherencia entre la planeación contractual, la ejecución real de los servicios y el comportamiento financiero observado, garantizando que la prestación se realice bajo criterios de eficiencia, pertinencia, sostenibilidad financiera y gestión adecuada del riesgo en salud.', style: 'p' },
            { text: 'Este análisis no se limita a la verificación numérica de la ejecución, sino que incorpora una lectura interpretativa del comportamiento asistencial y financiero, contextualizada en la dinámica territorial del municipio de Riohacha y en los principios estructurales del modelo PGP.', style: 'p' },

            { text: '2. CONTEXTO GENERAL DEL CONTRATO', style: 'h2' },
            { text: `El contrato ${data.contrato} fue celebrado con la IPS ${data.ips}, identificada con NIT ${data.nit}, con el objetivo de garantizar la atención integral de una población objetivo de ${data.poblacion.toLocaleString('es-CO')} afiliados residentes en el municipio de Riohacha.`, style: 'p' },
            { text: 'El esquema de Pago Global Prospectivo (PGP) se fundamenta en la asignación anticipada de recursos, permitiendo al prestador gestionar la atención en función de las necesidades reales del territorio, bajo un marco de responsabilidad financiera y control del gasto. Para ello, el contrato establece rangos de variación del ±10%, diseñados como mecanismos de flexibilidad que permiten absorber fluctuaciones normales de la demanda asistencial sin comprometer el equilibrio económico del contrato.', style: 'p' },
            { text: 'El análisis del periodo evaluado se concentra en el componente de Consultas Externas, eje fundamental de la atención ambulatoria y puerta de entrada al sistema, especialmente relevante en contextos territoriales como Riohacha, donde confluyen dinámicas urbanas, rurales y poblaciones con condiciones de vulnerabilidad estructural.', style: 'p' },

            { text: '3. METODOLOGÍA DE ANÁLISIS', style: 'h2' },
            { text: `La metodología aplicada para el presente informe se basó en un enfoque técnico, descriptivo y analítico, sustentado en la revisión de la matriz financiera y operativa correspondiente al periodo de ${data.periodo}, suministrada por la IPS ${data.ips}.`, style: 'p' },
            { text: 'El proceso incluyó la validación de los valores presupuestados para el periodo, la identificación de los límites inferior y superior establecidos contractualmente, y la comparación directa con el valor efectivamente ejecutado. Asimismo, se realizó una lectura gráfica del comportamiento financiero, mediante esquemas comparativos que permiten visualizar la relación entre presupuesto, rangos de tolerancia y ejecución real.', style: 'p' },
            { text: 'El análisis se desarrolló bajo criterios de objetividad, trazabilidad y consistencia técnica, permitiendo no solo identificar desviaciones cuantitativas, sino interpretar su significado operativo y contractual, en coherencia con los principios del modelo PGP.', style: 'p' },

            { text: `4. RESULTADOS GENERALES DE LA EJECUCIÓN – ${data.periodo.toUpperCase()}`, style: 'h2' },
            { text: `Durante el periodo de ${data.periodo}, el contrato ${data.contrato} presentó un valor esperado de ${formatCOP(data.valorEsperado)}, estableciéndose un límite inferior de ${formatCOP(data.limiteInferior)} (-10%) y un límite superior de ${formatCOP(data.limiteSuperior)} (+10%), conforme a lo estipulado contractualmente.`, style: 'p' },
            { text: `El valor ejecutado para el periodo ascendió a ${formatCOP(data.valorEjecutado)}, lo que representa un nivel de ejecución del ${(data.valorEjecutado / data.valorEsperado * 100).toFixed(1)}% frente al valor programado.`, style: 'p' },
            { text: 'La lectura gráfica del comportamiento financiero evidencia que la ejecución se sitúa muy cercana al techo del rango permitido, sin presentar picos abruptos ni tendencias de crecimiento descontrolado, lo que sugiere un comportamiento operativo estable y previsible dentro de la dinámica mensual del contrato.', style: 'p' },

            { text: '5. ANÁLISIS TÉCNICO Y CLÍNICO', style: 'h2' },
            { text: 'Desde la perspectiva técnico–asistencial, el comportamiento observado en la ejecución financiera se asocia directamente a la dinámica de prestación de servicios de consulta externa en el municipio de Riohacha. El nivel de ejecución refleja una respuesta activa del prestador frente a la demanda de servicios, particularmente en un territorio con alta movilidad poblacional y necesidades asistenciales variables.', style: 'p' },
            { text: 'La ejecución clínica no evidencia patrones de sobreutilización injustificada ni desviaciones que sugieran ineficiencia en la prestación. Por el contrario, el comportamiento financiero observado es consistente con un escenario de incremento puntual en la demanda, gestionado dentro de la capacidad instalada del prestador y sin comprometer la calidad ni la oportunidad de la atención.', style: 'p' },
            { text: 'Este análisis permite inferir que la ejecución clínica se mantiene alineada con el perfil general de atención ambulatoria esperado para el territorio, cumpliendo su función dentro del modelo de gestión del riesgo en salud.', style: 'p' },

            { text: '6. ANÁLISIS TÉCNICO Y FINANCIERO', style: 'h2' },
            { image: data.chartImage, width: 400, alignment: 'center', margin: [0, 5, 0, 10] },
            { text: 'El análisis financiero del contrato permite concluir que la ejecución registrada se enmarca dentro de la lógica estructural del modelo PGP, el cual reconoce la necesidad de flexibilidad frente a variaciones normales de la demanda asistencial.', style: 'p' },
            { text: 'Si bien el valor ejecutado puede presentar variaciones frente al límite superior del rango técnico, esta variación corresponde a un escenario previamente contemplado en el diseño contractual, y no a una falla en la planeación ni en los mecanismos de control financiero.', style: 'p' },
            { text: 'Desde una lectura gráfica, la ejecución se comporta como una curva controlada, sin evidenciar tendencias acumulativas que puedan generar riesgo financiero en el mediano plazo. Este comportamiento refleja una gestión financiera activa y adaptativa, coherente con las condiciones reales de prestación del servicio.', style: 'p' },

            { text: '7. HALLAZGOS RELEVANTES', style: 'h2', pageBreak: 'before' },
            {
                ul: [
                    'La ejecución financiera presenta estabilidad sin impacto estructural negativo sobre el contrato.',
                    'El comportamiento observado responde a la dinámica asistencial del territorio.',
                    'La lectura gráfica evidencia estabilidad y ausencia de tendencias de crecimiento descontrolado.',
                    'Se requiere mantener un seguimiento mensual riguroso para prevenir acumulaciones de sobre–ejecución.',
                    'El modelo PGP demuestra capacidad de absorción frente a variaciones controladas de la demanda.'
                ], style: 'listItem'
            },
            
            { text: '8. CONCLUSIONES', style: 'h2' },
            { text: `El análisis integral de la ejecución del contrato ${data.contrato} en el municipio de Riohacha durante el periodo de ${data.periodo} permite concluir que el comportamiento financiero observado es técnicamente controlado, contractualmente previsto y operativamente coherente con la dinámica del territorio.`, style: 'p' },
            { text: 'El resultado refleja un equilibrio razonable entre planeación, ejecución y demanda asistencial, evidenciando una adecuada capacidad de respuesta del prestador.', style: 'p' },

            { text: '9. RECOMENDACIONES', style: 'h2' },
            {
                ol: [
                    'Mantener el seguimiento financiero mensual con énfasis en la identificación temprana de tendencias acumulativas.',
                    'Ajustar la programación operativa cuando se evidencien incrementos sostenidos en la demanda de servicios.',
                    'Fortalecer el análisis comparativo intermensual como herramienta de gestión preventiva.',
                    'Continuar aplicando los rangos de control establecidos en el modelo PGP como mecanismo de sostenibilidad financiera.',
                    'Integrar el análisis financiero con la evaluación clínica para una lectura integral del desempeño contractual.'
                ], style: 'listItem'
            },
            
            {
                stack: [
                    { text: '_____________________________________', alignment: 'center', margin: [0, 80, 0, 0] },
                    { text: data.auditor, style: 'firmaNombre', alignment: 'center' },
                    { text: 'Auditor – Dirección Nacional de Gestión del Riesgo en Salud', style: 'firmaCargo', alignment: 'center' },
                    { text: 'DUSAKAWI EPSI', style: 'firmaCargo', alignment: 'center' },
                ],
                unbreakable: true,
            }
        ],
        footer: (currentPage: number, pageCount: number) => ({
            text: `Página ${currentPage} de ${pageCount}`,
            alignment: 'right',
            style: 'p',
            margin: [0, -40, 40, 0]
        }),
    };

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

export async function descargarInformeClinicoPDF(data: InformeClinicoData, backgroundImageBase64: string): Promise<void> {
    configurePdfMake();
    const docDefinition = buildDocDefinition(data, backgroundImageBase64);
    pdfMake.createPdf(docDefinition).download(`Informe_Clinico_${data.ips.replace(/\s/g, '_')}_${data.periodo.replace(/\s/g, '_')}.pdf`);
}

export async function generarURLInformeClinicoPDF(data: InformeClinicoData, backgroundImageBase64: string): Promise<string> {
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
