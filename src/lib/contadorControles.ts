/**
 * Lógica equivalente a la fórmula Excel:
 * LET(m, COINCIDIR(mes, {ENERO,...,DICIEMBRE}, 0), y, 2026,
 *   SUMA(SUMAPRODUCTO(...MES=m, AÑO=y) para columnas AM,AX,BG,BP,CA,CL,CW,DH,DS,ED,EO,EZ)
 * )
 * Cuenta las filas donde alguna de las 12 columnas de fecha cae en el mes/año dado.
 */

// Columnas de fecha según la fórmula (letras de columna Excel)
export const COLS_FECHA = ['AM', 'AX', 'BG', 'BP', 'CA', 'CL', 'CW', 'DH', 'DS', 'ED', 'EO', 'EZ'] as const;

export const MESES_ES = [
  'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE',
] as const;

export type MesEs = typeof MESES_ES[number];

export interface ConteoMes {
  mes: MesEs;
  numero: number; // 1-12
  conteo: number;
}

/**
 * Convierte un valor de celda Excel a Date.
 * Equivalente a: SI.ERROR(VALOR(ESPACIOS(LIMPIAR(celda))), 0) → MES() / AÑO()
 */
function parseExcelDate(val: unknown): Date | null {
  if (val == null) return null;

  // Xlsx puede entregar Date directamente para celdas con formato fecha
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  // Número = serial de fecha Excel (igual que VALOR() en la fórmula)
  if (typeof val === 'number' && val > 1) {
    // 25569 = diferencia entre epoch Excel (1/1/1900) y Unix epoch (1/1/1970)
    const ms = Math.round((val - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  // Texto: ESPACIOS(LIMPIAR(texto)) → intenta parsear
  if (typeof val === 'string') {
    const clean = val.replace(/[\x00-\x1F]/g, '').trim().replace(/\s+/g, ' ');
    if (!clean) return null;
    // Intenta como número primero (serial almacenado como texto)
    const num = Number(clean.replace(',', '.'));
    if (!isNaN(num) && num > 1) {
      const ms = Math.round((num - 25569) * 86400 * 1000);
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d;
    }
    // Intenta parse directo de texto de fecha
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * rawRows: filas del Excel con claves = letras de columna (sheet_to_json con {header:'A'})
 * startRowIndex: índice 0-based donde empiezan los datos (fórmula usa AM5, o sea índice 4)
 * anio: año a filtrar (por defecto 2026, igual que la fórmula)
 */
export function contarControlesPorMes(
  rawRows: Record<string, unknown>[],
  startRowIndex = 4,
  anio = 2026,
): ConteoMes[] {
  const resultado: ConteoMes[] = MESES_ES.map((mes, i) => ({
    mes,
    numero: i + 1,
    conteo: 0,
  }));

  for (let r = startRowIndex; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row) continue;

    for (const col of COLS_FECHA) {
      const fecha = parseExcelDate(row[col]);
      if (!fecha) continue;
      if (fecha.getFullYear() === anio) {
        const mesIdx = fecha.getMonth(); // 0-based
        resultado[mesIdx].conteo++;
      }
    }
  }

  return resultado;
}
