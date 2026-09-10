import * as XLSX from "xlsx";

export interface ParsedMatriz {
  /** Filas con encabezados reales (para conteo/preview). */
  rows: Record<string, unknown>[];
  /** Filas con clave = letra de columna Excel (para acceso posicional, ej: row['AM']). */
  rawRows: Record<string, unknown>[];
  sheetName: string;
}

/**
 * Las matrices reales traen columnas con formato aplicado hasta el límite de
 * Excel (fila 1,048,576), así que la hoja reporta un rango "usado" de más de
 * un millón de filas aunque los datos reales terminen en la ~44,000. Parsear
 * ese rango completo es 20x+ más lento de lo necesario (y puede agotar la
 * memoria). Se busca por bisección la última fila que realmente tiene dato
 * en una columna siempre poblada (fecha de nacimiento, columna H) y se acota
 * el parseo a ese rango real.
 */
function findLastRealRow(worksheet: XLSX.WorkSheet, reportedLastRow: number, checkCol = "H"): number {
  const hasData = (r: number) => worksheet[checkCol + (r + 1)] != null;
  let lo = 0;
  let hi = reportedLastRow;
  if (!hasData(hi)) {
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (hasData(mid)) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }
  return hi;
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
  const type = buffer instanceof Buffer ? "buffer" : "array";
  const workbook = XLSX.read(buffer, { type });
  const esMatrizModificado = workbook.SheetNames.includes("MODIFICADO");
  const sheetName = esMatrizModificado ? "MODIFICADO" : workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const fullRange = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  const lastRow = findLastRealRow(worksheet, fullRange.e.r);
  const bounded = { s: { r: 0, c: 0 }, e: { r: lastRow, c: fullRange.e.c } };

  // En MODIFICADO el encabezado real está en la fila 7 (índice 6); las filas
  // anteriores son títulos y códigos del formato oficial.
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: null,
    range: { s: { r: esMatrizModificado ? 6 : 0, c: 0 }, e: bounded.e },
  });
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
    header: "A",
    defval: null,
    range: bounded,
  });

  return { rows, rawRows, sheetName };
}

/**
 * Variante liviana para el servidor: solo produce rawRows (lo único que usan
 * los cálculos de indicadores), y le pide a xlsx que solo decodifique la hoja
 * de datos en vez del libro completo (6 hojas, varias grandes).
 */
export function parseMatrizRawRowsOnly(buffer: ArrayBuffer | Buffer): { rawRows: Record<string, unknown>[]; sheetName: string } {
  const type = buffer instanceof Buffer ? "buffer" : "array";
  // Primera pasada barata: solo nombres de hojas, sin decodificar celdas.
  const namesOnly = XLSX.read(buffer, { type, bookSheets: true });
  const esMatrizModificado = namesOnly.SheetNames.includes("MODIFICADO");
  const sheetName = esMatrizModificado ? "MODIFICADO" : namesOnly.SheetNames[0];

  // Segunda pasada: decodifica únicamente la hoja de datos, no las otras 5.
  const workbook = XLSX.read(buffer, { type, sheets: [sheetName] });
  const worksheet = workbook.Sheets[sheetName];

  const fullRange = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  const lastRow = findLastRealRow(worksheet, fullRange.e.r);

  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
    header: "A",
    defval: null,
    range: { s: { r: 0, c: 0 }, e: { r: lastRow, c: fullRange.e.c } },
  });

  return { rawRows, sheetName };
}
