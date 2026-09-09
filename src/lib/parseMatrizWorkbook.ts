import * as XLSX from "xlsx";

export interface ParsedMatriz {
  /** Filas con encabezados reales (para conteo/preview). */
  rows: Record<string, unknown>[];
  /** Filas con clave = letra de columna Excel (para acceso posicional, ej: row['AM']). */
  rawRows: Record<string, unknown>[];
  sheetName: string;
}

/**
 * Detecta y parsea la hoja de datos de una matriz de seguimiento (xlsx/xls).
 * Las matrices "CONSOLIDADO" oficiales traen los datos reales en la hoja
 * MODIFICADO (la primera hoja, INSTRUCTIVO, solo tiene el instructivo de
 * diligenciamiento). Los archivos simples de una sola hoja siguen
 * funcionando igual (fallback a la primera hoja).
 *
 * Usado tanto por el cargador manual (cliente) como por la sincronización
 * automática con Drive (servidor) para garantizar el mismo comportamiento.
 */
export function parseMatrizWorkbook(buffer: ArrayBuffer | Buffer): ParsedMatriz {
  const workbook = XLSX.read(buffer, { type: buffer instanceof Buffer ? "buffer" : "array" });
  const esMatrizModificado = workbook.SheetNames.includes("MODIFICADO");
  const sheetName = esMatrizModificado ? "MODIFICADO" : workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // En MODIFICADO el encabezado real está en la fila 7 (índice 6); las filas
  // anteriores son títulos y códigos del formato oficial.
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: null,
    range: esMatrizModificado ? 6 : 0,
  });
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { header: "A", defval: null });

  return { rows, rawRows, sheetName };
}
