"use client";
import { useState, useRef, useCallback } from "react";
import { Upload, FileSpreadsheet, RefreshCw, CheckCircle2, AlertCircle, X, Table, Database, Info } from "lucide-react";
import type { ExcelRow } from "./types";

interface ExcelLoaderProps {
  onDataLoaded?: (rows: ExcelRow[], filename: string, fecha: Date, rawRows: Record<string, unknown>[]) => void;
  onGuardar?: () => void;
}

interface FileInfo {
  nombre: string;
  filas: number;
  columnas: string[];
  fecha: Date;
  rows: ExcelRow[];
}

function ResumenTabla({ rows, columnas }: { rows: ExcelRow[]; columnas: string[] }) {
  const [pagina, setPagina] = useState(0);
  const POR_PAGINA = 8;
  const total = rows.length;
  const inicio = pagina * POR_PAGINA;
  const fin = Math.min(inicio + POR_PAGINA, total);
  const visibles = rows.slice(inicio, fin);

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="py-2 px-3 text-left text-muted-foreground font-semibold w-8">#</th>
              {columnas.slice(0, 8).map(col => (
                <th key={col} className="py-2 px-3 text-left text-muted-foreground font-semibold whitespace-nowrap max-w-[120px] truncate">
                  {col}
                </th>
              ))}
              {columnas.length > 8 && (
                <th className="py-2 px-3 text-muted-foreground">+{columnas.length - 8} más</th>
              )}
            </tr>
          </thead>
          <tbody>
            {visibles.map((row, i) => (
              <tr key={inicio + i} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${(inicio + i) % 2 === 0 ? "" : "bg-muted/10"}`}>
                <td className="py-2 px-3 text-muted-foreground font-medium">{inicio + i + 1}</td>
                {columnas.slice(0, 8).map(col => (
                  <td key={col} className="py-2 px-3 text-foreground max-w-[120px] truncate">
                    {row[col] == null ? <span className="text-muted-foreground/50 italic">—</span> : String(row[col])}
                  </td>
                ))}
                {columnas.length > 8 && <td className="py-2 px-3 text-muted-foreground">…</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Paginación */}
      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <span>Mostrando {inicio + 1}–{fin} de {total} filas</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => setPagina(p => Math.max(0, p - 1))}
            disabled={pagina === 0}
            className="px-2.5 py-1 rounded-lg bg-muted hover:bg-primary/10 disabled:opacity-40 font-medium transition-colors"
          >
            ← Anterior
          </button>
          <button
            onClick={() => setPagina(p => (fin < total ? p + 1 : p))}
            disabled={fin >= total}
            className="px-2.5 py-1 rounded-lg bg-muted hover:bg-primary/10 disabled:opacity-40 font-medium transition-colors"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}

export function ExcelLoader({ onDataLoaded, onGuardar }: ExcelLoaderProps) {
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mostrarTabla, setMostrarTabla] = useState(true);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError("Formato no soportado. Use archivos .xlsx, .xls o .csv");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });
      // rawRows con clave = letra de columna Excel (para acceso por posición, ej: row['AM'])
      const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { header: 'A', defval: null });

      if (rows.length === 0) {
        setError("El archivo no contiene datos.");
        setLoading(false);
        return;
      }

      const columnas = Object.keys(rows[0]);
      const info: FileInfo = {
        nombre: file.name,
        filas: rows.length,
        columnas,
        fecha: new Date(),
        rows,
      };
      setFileInfo(info);
      onDataLoaded?.(rows, file.name, new Date(), rawRows);
    } catch (e) {
      setError("No se pudo leer el archivo. Verifique que sea un Excel válido.");
    } finally {
      setLoading(false);
    }
  }, [onDataLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4">
      {/* Banner info */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-800 dark:text-blue-300">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-0.5">Actualización mensual de datos</p>
          <p className="text-blue-700/80 dark:text-blue-400/80">
            Cargue aquí el archivo Excel actualizado. Se acepta la ruta:{" "}
            <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded text-[10px] font-mono">
              C:\Users\EDUARDO\Documents\base de datos -05 2026.xlsx
            </code>
          </p>
        </div>
      </div>

      {/* Drop zone */}
      {!fileInfo ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            dragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-primary/3"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleInput}
          />
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm font-medium text-foreground">Procesando archivo...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FileSpreadsheet className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Haga clic o arrastre el archivo aquí</p>
                <p className="text-xs text-muted-foreground mt-1">Soporta .xlsx, .xls, .csv · El archivo se procesa localmente</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                <Upload className="w-4 h-4" />
                Seleccionar archivo
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* File status */}
          <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm truncate max-w-[280px]">{fileInfo.nombre}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="font-medium text-emerald-600">{fileInfo.filas.toLocaleString("es-CO")}</span> filas ·{" "}
                  <span className="font-medium text-primary">{fileInfo.columnas.length}</span> columnas · Cargado: {formatDate(fileInfo.fecha)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMostrarTabla(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-card border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <Table className="w-3.5 h-3.5" />
                {mostrarTabla ? "Ocultar" : "Ver datos"}
              </button>
              <button
                onClick={() => { setFileInfo(null); setError(null); }}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-colors"
                title="Remover archivo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Columnas detectadas */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Columnas detectadas ({fileInfo.columnas.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {fileInfo.columnas.map(col => (
                <span key={col} className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-lg font-medium">
                  {col}
                </span>
              ))}
            </div>
          </div>

          {/* Vista previa */}
          {mostrarTabla && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Vista previa de datos</p>
              <ResumenTabla rows={fileInfo.rows} columnas={fileInfo.columnas} />
            </div>
          )}

          {/* Botones acción */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {onGuardar && (
              <button
                onClick={() => {
                  onGuardar();
                  setGuardadoOk(true);
                  setTimeout(() => setGuardadoOk(false), 3000);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  guardadoOk
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                }`}
              >
                {guardadoOk ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Database className="w-3.5 h-3.5" />}
                {guardadoOk ? "Guardado en base de datos" : "Cargar"}
              </button>
            )}
            <button
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground border border-border rounded-xl text-xs font-semibold hover:bg-muted/70 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Nueva versión
            </button>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleInput} />
            <span className="text-xs text-muted-foreground">Los datos anteriores serán reemplazados</span>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}
