/**
 * Calcula la distribución real de grupos de edad
 * leyendo la columna H (col 8 = FECHA DE NACIMIENTO DEL MENOR)
 * del Excel cargado, y comparando con la fecha de hoy.
 */

/** Columna Excel que contiene la fecha de nacimiento (H = 8ª columna) */
export const COLUMNA_FECHA_NAC = 'H';

export interface GrupoConteoExcel {
  "0-6m": number;
  "7-12m": number;
  "13-24m": number;
  "25-59m": number;
  "60m+": number;
  sinFecha: number;
  total: number;
}

/** Convierte un valor de celda Excel a Date (igual que contadorControles.ts) */
function parseExcelDate(val: unknown): Date | null {
  if (val == null) return null;

  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  if (typeof val === 'number' && val > 1) {
    const ms = Math.round((val - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof val === 'string') {
    const clean = val.replace(/[\x00-\x1F]/g, '').trim().replace(/\s+/g, ' ');
    if (!clean) return null;
    const num = Number(clean.replace(',', '.'));
    if (!isNaN(num) && num > 1) {
      const ms = Math.round((num - 25569) * 86400 * 1000);
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Calcula la diferencia en meses completos entre dos fechas.
 * Equivalente a SIFECHA(nacimiento, hoy, "M") en Excel.
 */
function mesesEntre(nacimiento: Date, hoy: Date): number {
  let meses =
    (hoy.getFullYear() - nacimiento.getFullYear()) * 12 +
    (hoy.getMonth() - nacimiento.getMonth());
  // Ajuste si el día del mes de hoy es menor al de nacimiento
  if (hoy.getDate() < nacimiento.getDate()) {
    meses--;
  }
  return meses;
}

/** Clasifica los meses en el grupo correspondiente */
function clasificarGrupo(meses: number): keyof Omit<GrupoConteoExcel, "sinFecha" | "total"> | null {
  if (meses < 0) return null;
  if (meses <= 6)  return "0-6m";
  if (meses <= 12) return "7-12m";
  if (meses <= 24) return "13-24m";
  if (meses <= 59) return "25-59m";
  return "60m+";
}

/**
 * Lee las filas del Excel (con header:'A') desde startRowIndex,
 * toma la columna H como fecha de nacimiento, calcula la edad en meses
 * al día de hoy y cuenta cuántos niños hay en cada grupo de edad.
 */
export function calcularGruposEdadDesdeExcel(
  rawRows: Record<string, unknown>[],
  startRowIndex = 4,
): GrupoConteoExcel {
  const conteo: GrupoConteoExcel = {
    "0-6m": 0,
    "7-12m": 0,
    "13-24m": 0,
    "25-59m": 0,
    "60m+": 0,
    sinFecha: 0,
    total: 0,
  };

  const hoy = new Date();

  for (let r = startRowIndex; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row) continue;

    const fecha = parseExcelDate(row[COLUMNA_FECHA_NAC]);
    if (!fecha) {
      conteo.sinFecha++;
      continue;
    }

    const meses = mesesEntre(fecha, hoy);
    const grupo = clasificarGrupo(meses);
    if (grupo) {
      conteo[grupo]++;
      conteo.total++;
    } else {
      // fecha de nacimiento futura o inválida
      conteo.sinFecha++;
    }
  }

  return conteo;
}
