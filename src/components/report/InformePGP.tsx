"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Info, Activity, Stamp, Loader2, DownloadCloud, X, BarChart2, Edit, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { descargarInformePDF, type InformeDatos, generarURLInformePDF, generateStaticAnalysisTexts } from "@/lib/pdf-definitions";
import { generarURLInformeClinicoPDF, descargarInformeClinicoPDF } from '@/lib/pdf-definitions-clinico';
import type { DeviatedCupInfo, UnexpectedCupInfo, AdjustedData, ReportData as ReportDataType, ComparisonSummary } from "@/components/pgp-search/PgPsearchForm";
import { generateReportAnalysis, type ReportAnalysisInput, type ReportAnalysisOutput } from "@/ai/flows/generate-report-analysis-flow";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "../ui/textarea";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";

// ======= Tipos =======
export interface ReportData extends ReportDataType {}

const EditableTextsModal = ({
    open,
    onOpenChange,
    onSave,
    initialConclusions,
    initialRecommendations,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (conclusions: string, recommendations: string) => void;
    initialConclusions: string;
    initialRecommendations: string;
}) => {
    const [conclusions, setConclusions] = useState(initialConclusions);
    const [recommendations, setRecommendations] = useState(initialRecommendations);

    useEffect(() => {
        if(open) {
            setConclusions(initialConclusions);
            setRecommendations(initialRecommendations);
        }
    }, [open, initialConclusions, initialRecommendations]);

    const handleSave = () => {
        onSave(conclusions, recommendations);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Editar Conclusiones y Recomendaciones</DialogTitle>
                    <DialogDescription>
                        Añade o modifica el análisis final que aparecerá en el informe PDF.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="conclusions-text">Conclusiones Adicionales</Label>
                        <Textarea
                            id="conclusions-text"
                            value={conclusions}
                            onChange={(e) => setConclusions(e.target.value)}
                            placeholder="Escribe tus conclusiones finales aquí..."
                            className="min-h-[150px]"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="recommendations-text">Recomendaciones Adicionales</Label>
                        <Textarea
                            id="recommendations-text"
                            value={recommendations}
                            onChange={(e) => setRecommendations(e.target.value)}
                            placeholder="Escribe tus recomendaciones finales aquí..."
                            className="min-h-[150px]"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave}>Guardar Textos</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// ======= Utilidades =======
const formatCOP = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

async function loadImageAsBase64(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Network response was not ok for ${url}`);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn(`Could not load image from ${url}:`, error);
        return "";
    }
}

// ======= Componente Principal =======
export default function InformePGP({ data, comparisonSummary }: { data?: ReportData | null, comparisonSummary: ComparisonSummary | null }) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [reportType, setReportTitle] = useState<'ejecutivo' | 'clinico'>('ejecutivo');
  const { toast } = useToast();
  const [conclusions, setConclusions] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [auditorName, setAuditorName] = useState("Eduardo Garcerant González");

  const financialChartRef = useRef<HTMLDivElement>(null);
  const cupsChartRef = useRef<HTMLDivElement>(null);
  const clinicalLineChartRef = useRef<HTMLDivElement>(null);
  
  const sumaMensual = useMemo(() => data?.months.reduce((acc, m) => acc + m.valueCOP, 0) ?? 0, [data?.months]);
  const totalCups = useMemo(() => data?.months.reduce((a, m) => a + m.cups, 0) ?? 0, [data?.months]);
  const valorNotaTecnica = useMemo(() => data?.notaTecnica?.valor3m || 0, [data]);
  const valorNetoFinalAuditoria = useMemo(() => data?.notaTecnica?.totalPagar ?? 0, [data]);
  const porcentajeEjecucion = useMemo(() => (valorNotaTecnica > 0 ? (valorNetoFinalAuditoria / valorNotaTecnica) * 100 : 0), [valorNetoFinalAuditoria, valorNotaTecnica]);
  const periodoAnalizado = useMemo(() => data?.months.map(m => m.month).join(', ') || 'Periodo Analizado', [data]);

  const handleGeneratePdf = async (type: 'ejecutivo' | 'clinico', action: 'preview' | 'download') => {
    if (!data || !comparisonSummary) return;
    setIsGeneratingPdf(true);
    setReportTitle(type);
    if(action === 'preview') setPdfPreviewUrl(null);

    toast({ title: `Generando Informe ${type === 'ejecutivo' ? 'Ejecutivo' : 'Clínico'}...`, description: 'Procesando datos y gráficos.' });

    try {
        const backgroundImage = await loadImageAsBase64('/imagenes pdf/IMAGENEN UNIFICADA.jpg');
        
        const getChartImage = async (ref: React.RefObject<HTMLDivElement>) => {
            if (ref.current) {
                const canvas = await html2canvas(ref.current, { backgroundColor: '#FFFFFF', scale: 2 });
                return canvas.toDataURL('image/png');
            }
            return '';
        };

        if (type === 'ejecutivo') {
            const analysisInput: ReportAnalysisInput = {
                sumaMensual, valorNotaTecnica, totalCups,
                diffVsNota: valorNetoFinalAuditoria - valorNotaTecnica,
                porcentajeEjecucion: porcentajeEjecucion.toFixed(2),
                unitAvg: totalCups > 0 ? valorNetoFinalAuditoria / totalCups : 0,
                overExecutedCount: data.overExecutedCups?.length ?? 0,
                unexpectedCount: data.unexpectedCups?.length ?? 0,
                valorNetoFinal: valorNetoFinalAuditoria,
                descuentoAplicado: data.notaTecnica?.descuentoAplicado ?? 0,
                additionalConclusions: conclusions,
                additionalRecommendations: recommendations,
                totalValueOverExecuted: comparisonSummary.overExecutedCups.reduce((sum, cup) => sum + cup.deviationValue, 0),
                totalValueUnexpected: comparisonSummary.unexpectedCups.reduce((sum, cup) => sum + cup.totalValue, 0),
                totalValueUnderExecuted: comparisonSummary.underExecutedCups.reduce((sum, cup) => sum + cup.deviationValue, 0),
                totalValueMissing: comparisonSummary.missingCups.reduce((sum, cup) => sum + cup.deviationValue, 0),
            };

            let analysisTexts;
            try {
                analysisTexts = await generateReportAnalysis(analysisInput);
            } catch (e) {
                analysisTexts = generateStaticAnalysisTexts(analysisInput);
            }

            const chartImages = {
                financial: await getChartImage(financialChartRef),
                cups: await getChartImage(cupsChartRef),
            };

            const informeData: InformeDatos = {
                titulo: `INFORME PGP: ${data.header.ipsNombre}`,
                subtitulo: `Auditoría para: ${data.header.empresa}`,
                referencia: `Contrato: ${data.header.contrato} | Periodo: ${periodoAnalizado}`,
                objetivos: ['Evaluar la eficiencia recursos PGP.', 'Analizar comportamiento epidemiológico.', 'Verificar cumplimiento metas.'],
                kpis: [{ label: 'Valor Final a Pagar', value: formatCOP(valorNetoFinalAuditoria), bold: true }],
                analisis: [
                    { title: 'Análisis Financiero', text: analysisTexts.financialAnalysis, chartImage: chartImages.financial },
                    { title: 'Análisis Epidemiológico', text: analysisTexts.epidemiologicalAnalysis, chartImage: chartImages.cups },
                    { title: 'Análisis de Desviaciones', text: analysisTexts.deviationAnalysis }
                ],
                topOverExecuted: data.overExecutedCups.slice(0, 5),
                topUnexpected: data.unexpectedCups.slice(0, 5),
                ciudad: data.header.ciudad || 'Uribia',
                fecha: data.header.fecha || new Date().toLocaleDateString(),
                firmas: [data.header.responsable1 || { nombre: auditorName, cargo: 'Auditor' }],
                auditorConclusions: conclusions,
                auditorRecommendations: recommendations
            };

            if (action === 'preview') setPdfPreviewUrl(await generarURLInformePDF(informeData, backgroundImage));
            else await descargarInformePDF(informeData, backgroundImage);

        } else {
            const chartImage = await getChartImage(clinicalLineChartRef);
            const clinicoData = {
                contrato: data.header.contrato,
                ips: data.header.ipsNombre,
                nit: data.header.ipsNit,
                poblacion: 19561, // Debería venir de selectedPrestador pero usamos el fallback
                periodo: periodoAnalizado,
                valorEsperado: valorNotaTecnica,
                limiteInferior: data.notaTecnica.min90,
                limiteSuperior: data.notaTecnica.max110,
                valorEjecutado: sumaMensual,
                chartImage,
                auditor: auditorName,
            };

            if (action === 'preview') setPdfPreviewUrl(await generarURLInformeClinicoPDF(clinicoData, backgroundImage));
            else await descargarInformeClinicoPDF(clinicoData, backgroundImage);
        }

    } catch (error: any) {
        toast({ title: 'Error al generar PDF', description: error.message, variant: 'destructive' });
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  if (!data) return null;

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-primary/20">
        <CardHeader>
          <CardTitle>Centro de Generación de Informes</CardTitle>
          <CardDescription>Genera los documentos técnicos para la auditoría PGP.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="auditor-name" className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" /> Nombre del Auditor Responsable
                    </Label>
                    <Input 
                        id="auditor-name" 
                        value={auditorName} 
                        onChange={(e) => setAuditorName(e.target.value)} 
                        placeholder="Ej: Eduardo Garcerant"
                    />
                </div>
                <div className="flex items-end">
                    <Button variant="outline" onClick={() => setIsEditModalOpen(true)} className="w-full">
                        <Edit className="h-4 w-4 mr-2" /> Editar Conclusiones
                    </Button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Button variant="default" onClick={() => handleGeneratePdf('ejecutivo', 'preview')} disabled={isGeneratingPdf} className="flex-1">
                    {isGeneratingPdf && reportType === 'ejecutivo' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileText className="mr-2 h-4 w-4"/>}
                    Informe Ejecutivo PDF
                </Button>
                <Button variant="secondary" onClick={() => handleGeneratePdf('clinico', 'preview')} disabled={isGeneratingPdf} className="flex-1">
                    {isGeneratingPdf && reportType === 'clinico' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Activity className="mr-2 h-4 w-4"/>}
                    Informe Clínico Técnico
                </Button>
            </div>
        </CardContent>
      </Card>

      {/* Vista previa Modal */}
      <Dialog open={!!pdfPreviewUrl} onOpenChange={(isOpen) => !isOpen && setPdfPreviewUrl(null)}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Vista Previa: {reportType === 'ejecutivo' ? 'Informe Ejecutivo' : 'Informe Clínico'}</DialogTitle>
          </DialogHeader>
          <div className="flex-grow border rounded-md overflow-hidden bg-muted/20">
            {pdfPreviewUrl && <iframe src={pdfPreviewUrl} className="w-full h-full" title="PDF Preview" />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfPreviewUrl(null)}>Cerrar</Button>
            <Button onClick={() => handleGeneratePdf(reportType, 'download')}>
                <DownloadCloud className="mr-2 h-4 w-4" /> Descargar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditableTextsModal
            open={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            initialConclusions={conclusions}
            initialRecommendations={recommendations}
            onSave={(c, r) => { setConclusions(c); setRecommendations(r); }}
        />

      {/* Gráficos Ocultos para Captura de PDF */}
      <div className="absolute -left-[9999px] top-0 w-[500px] bg-white p-4">
          <div ref={financialChartRef} className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.months}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Bar dataKey="valueCOP" fill="#16a34a" name="Valor Ejecutado" />
                  </BarChart>
              </ResponsiveContainer>
          </div>
          <div ref={cupsChartRef} className="h-60 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.months}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Bar dataKey="cups" fill="#a78bfa" name="Volumen CUPS" />
                  </BarChart>
              </ResponsiveContainer>
          </div>
          <div ref={clinicalLineChartRef} className="h-60 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                      { name: 'Min 90%', val: data.notaTecnica.min90 },
                      { name: 'Presupuesto', val: data.notaTecnica.valor3m },
                      { name: 'Max 110%', val: data.notaTecnica.max110 },
                  ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Line type="monotone" dataKey="val" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 6 }} />
                      <ReferenceLine y={sumaMensual} label="Ejecución Real" stroke="red" strokeDasharray="3 3" />
                  </LineChart>
              </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
}
