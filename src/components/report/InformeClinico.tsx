
"use client";

import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, DownloadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import { type ReportData, type SummaryData, type Prestador } from '../pgp-search/PgPsearchForm';
import { generarURLInformeClinicoPDF, descargarInformeClinicoPDF } from '@/lib/pdf-definitions-clinico';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

interface InformeClinicoProps {
    reportData: ReportData;
    globalSummary: SummaryData;
    totalRealEjecutadoJson: number;
    selectedPrestador: Prestador;
}

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

export default function InformeClinico({ reportData, globalSummary, totalRealEjecutadoJson, selectedPrestador }: InformeClinicoProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [auditorName, setAuditorName] = useState("Eduardo Garcerant González");
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const { toast } = useToast();
    const financialChartRef = useRef<HTMLDivElement>(null);

    const chartData = [
        { name: 'Límite inferior', value: globalSummary.costoMinimoPeriodo },
        { name: 'Presupuesto', value: globalSummary.totalPeriodo },
        { name: 'Límite superior', value: globalSummary.costoMaximoPeriodo },
    ];
    
    const periodoEvaluado = reportData.months.map(m => m.month).join(', ');

    const handleGeneratePdf = async (action: 'preview' | 'download') => {
        setIsGenerating(true);
        if (action === 'preview') setPdfPreviewUrl(null);
        toast({ title: 'Generando Informe Clínico...', description: 'Este proceso puede tardar unos segundos.' });

        try {
            const getChartImage = async (ref: React.RefObject<HTMLDivElement>) => {
                if (ref.current) {
                    const canvas = await html2canvas(ref.current, { backgroundColor: '#FFFFFF', scale: 2 });
                    return canvas.toDataURL('image/png');
                }
                return '';
            };

            const chartImage = await getChartImage(financialChartRef);

            const informeData = {
                contrato: selectedPrestador.CONTRATO || 'N/A',
                ips: selectedPrestador.PRESTADOR,
                nit: selectedPrestador.NIT,
                poblacion: selectedPrestador.POBLACION || 0,
                periodo: periodoEvaluado,
                valorEsperado: globalSummary.totalPeriodo,
                limiteInferior: globalSummary.costoMinimoPeriodo,
                limiteSuperior: globalSummary.costoMaximoPeriodo,
                valorEjecutado: totalRealEjecutadoJson,
                chartImage,
                auditor: auditorName,
            };

            const backgroundImage = await loadImageAsBase64('/imagenes pdf/IMAGENEN UNIFICADA.jpg');

            if (action === 'preview') {
                const url = await generarURLInformeClinicoPDF(informeData, backgroundImage);
                setPdfPreviewUrl(url);
            } else {
                await descargarInformeClinicoPDF(informeData, backgroundImage);
            }

        } catch (error: any) {
            console.error("Error generating PDF:", error);
            toast({ title: 'Error al generar el informe', description: error.message, variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Generación de Informe Clínico</CardTitle>
                    <CardDescription>
                        Genera un informe técnico detallado con análisis clínico y financiero.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="auditor-name">Nombre del Auditor</Label>
                        <Input
                            id="auditor-name"
                            value={auditorName}
                            onChange={(e) => setAuditorName(e.target.value)}
                            placeholder="Ej: Dr. Juan Pérez"
                        />
                    </div>
                    <Button 
                        id="generate-clinical-report-button"
                        onClick={() => handleGeneratePdf('preview')} 
                        disabled={isGenerating}
                    >
                        {isGenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
                        Generar Informe Clínico
                    </Button>
                </CardContent>
            </Card>

            <Dialog open={!!pdfPreviewUrl} onOpenChange={(isOpen) => !isOpen && setPdfPreviewUrl(null)}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Vista Previa del Informe Clínico</DialogTitle>
                    </DialogHeader>
                    <div className="flex-grow border rounded-md overflow-hidden">
                        {pdfPreviewUrl && (
                            <iframe src={pdfPreviewUrl} className="w-full h-full" title="Vista previa del PDF" />
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPdfPreviewUrl(null)}>Cerrar</Button>
                        <Button onClick={() => handleGeneratePdf('download')} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <DownloadCloud className="h-4 w-4 mr-1" />}
                            Descargar PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="absolute -left-[9999px] top-0 w-[550px] space-y-6 bg-white p-4">
                <section ref={financialChartRef}>
                    <h3 className="text-center font-bold text-sm mb-2">
                        Control financiero - Modelo PGP <br/>
                        Municipio de Riohacha - {periodoEvaluado}
                    </h3>
                    <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" fontSize={11} />
                                <YAxis 
                                    domain={['dataMin - 10000000', 'dataMax + 10000000']} 
                                    tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value as number)}
                                    fontSize={11}
                                />
                                <Tooltip formatter={(value) => formatCOP(value as number)}/>
                                <Legend />
                                <Line type="monotone" dataKey="value" name="Rango financiero esperado" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                                <ReferenceLine y={totalRealEjecutadoJson} label={{ value: `Ejecución real (${formatCOP(totalRealEjecutadoJson)})`, position: 'insideTopLeft', fill: '#059669' }} stroke="#059669" strokeDasharray="5 5" strokeWidth={2}/>
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            </div>
        </>
    );
}
