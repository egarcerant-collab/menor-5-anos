/**
 * Calcula los indicadores RIAS de primera infancia directamente desde
 * las filas del Excel (rawRows con header:'A').
 *
 * Columnas basadas en el formato oficial del programa:
 * H=Fecha nacimiento, Y=Vacunación, AA=Hemoglobina, AH=Hierro,
 * AM/AX/BG/BP/CA/CL/CW/DH/DS/ED/EO/EZ = Fechas de cada control, etc.
 */

// ─── Mapa de columnas del Excel ───────────────────────────────────────────────
const C = {
  // Datos del menor
  FECHA_NAC:        'H',   // 8.  Fecha de nacimiento
  ZONA:             'N',   // 14. Zona (urbana/rural disperso)
  ETNIA:            'P',   // 16. Etnia
  PUEBLO_INDIGENA:  'Q',   // 17. Pueblo indígena (Wayúu, etc.)

  // Intervenciones generales
  VACUNACION:       'Y',   // 25. Esquema vacunación completo (SI/NO)
  FECHA_HEMOGLOB:   'AA',  // 27. Fecha tamizaje hemoglobina
  HIERRO:           'AH',  // 34. Suplemento hierro (tiene valor = sí)
  DESPARASIT:       'AI',  // 35. Desparasitación

  // ── Control 1 mes ─────────────────────────────────────────────────────────
  F_1M:             'AM',  // 39. Fecha atención 1 mes
  PESO_NACER:       'AO',  // 41. Peso al nacer (Kg)
  PESO_1M:          'AP',  // 42. Peso actual
  TALLA_1M:         'AQ',  // 43. Talla
  CLAS_PT_1M:       'AS',  // 45. Clasificación Peso/Talla
  FECHA_LACTANCIA:  'AU',  // 47. Fecha consulta lactancia materna
  MESES_LACTANCIA:  'AV',  // 48. Meses lactancia exclusiva
  DX_1M:            'AW',  // 49. Diagnóstico

  // ── Control 2-3 meses ─────────────────────────────────────────────────────
  F_2_3M:           'AX',  // 50. Fecha atención 2-3m
  PESO_2_3M:        'AZ',  // 52. Peso
  TALLA_2_3M:       'BA',  // 53. Talla
  CLAS_PT_2_3M:     'BC',  // 55. Clasificación P/T
  PC_2_3M:          'BE',  // 57. Perímetro cefálico
  DX_2_3M:          'BF',  // 58. Diagnóstico

  // ── Control 4-5 meses ─────────────────────────────────────────────────────
  F_4_5M:           'BG',  // 59. Fecha atención 4-5m
  PESO_4_5M:        'BI',  // 61. Peso
  TALLA_4_5M:       'BJ',  // 62. Talla
  CLAS_PT_4_5M:     'BL',  // 64. Clasificación P/T
  PC_4_5M:          'BN',  // 66. Perímetro cefálico
  DX_4_5M:          'BO',  // 67. Diagnóstico

  // ── Control 6-8 meses ─────────────────────────────────────────────────────
  F_6_8M:           'BP',  // 68. Fecha atención 6-8m
  PESO_6_8M:        'BR',  // 70. Peso
  TALLA_6_8M:       'BS',  // 71. Talla
  CLAS_PT_6_8M:     'BU',  // 74. Clasificación P/T (nota: usuario saltó col 72)
  PC_6_8M:          'BW',  // 76. Perímetro cefálico
  PBRA_6_8M:        'BX',  // 77. Perímetro braquial
  DX_6_8M:          'BY',  // 78. Diagnóstico

  // ── Control 9-11 meses ────────────────────────────────────────────────────
  F_9_11M:          'CA',  // 80. Fecha atención 9-11m
  PESO_9_11M:       'CC',  // 82. Peso
  TALLA_9_11M:      'CD',  // 83. Talla
  CLAS_PT_9_11M:    'CF',  // 85. Clasificación P/T
  PC_9_11M:         'CH',  // 87. Perímetro cefálico
  PBRA_9_11M:       'CI',  // 88. Perímetro braquial
  DX_9_11M:         'CJ',  // 89. Diagnóstico

  // ── Control 12-18 meses ───────────────────────────────────────────────────
  F_12_18M:         'CL',  // 91. Fecha atención 12-18m
  PESO_12_18M:      'CN',  // 93. Peso
  TALLA_12_18M:     'CO',  // 94. Talla
  CLAS_PT_12_18M:   'CQ',  // 96. Clasificación P/T
  PC_12_18M:        'CS',  // 98. Perímetro cefálico
  PBRA_12_18M:      'CT',  // 99. Perímetro braquial
  DX_12_18M:        'CU',  // 100. Diagnóstico

  // ── Control 19-23 meses ───────────────────────────────────────────────────
  F_19_23M:         'CW',  // 102. Fecha atención 19-23m
  PESO_19_23M:      'CY',  // 104. Peso
  TALLA_19_23M:     'CZ',  // 105. Talla
  CLAS_PT_19_23M:   'DB',  // Clasificación P/T (col 106, usuario duplicó nº 104)
  PC_19_23M:        'DD',  // 108. Perímetro cefálico
  PBRA_19_23M:      'DE',  // 109. Perímetro braquial
  DX_19_23M:        'DF',  // 110. Diagnóstico

  // ── Control 24-29 meses ───────────────────────────────────────────────────
  F_24_29M:         'DH',  // 112. Fecha atención 24-29m
  PESO_24_29M:      'DJ',  // 114. Peso
  TALLA_24_29M:     'DK',  // 115. Talla
  CLAS_PT_24_29M:   'DM',  // 117. Clasificación P/T
  PC_24_29M:        'DO',  // 119. Perímetro cefálico
  PBRA_24_29M:      'DP',  // 120. Perímetro braquial
  DX_24_29M:        'DQ',  // 121. Diagnóstico

  // ── Control 30-35 meses ───────────────────────────────────────────────────
  F_30_35M:         'DS',  // 123. Fecha atención 30-35m
  PESO_30_35M:      'DU',  // 125. Peso
  TALLA_30_35M:     'DV',  // 126. Talla
  CLAS_PT_30_35M:   'DX',  // 128. Clasificación P/T
  PC_30_35M:        'DZ',  // 130. Perímetro cefálico
  PBRA_30_35M:      'EA',  // 131. Perímetro braquial
  DX_30_35M:        'EB',  // 132. Diagnóstico

  // ── Control 3 años (36-47m) ───────────────────────────────────────────────
  F_3A:             'ED',  // 134. Fecha atención 3 años
  PESO_3A:          'EF',  // 136. Peso
  TALLA_3A:         'EG',  // 137. Talla
  CLAS_PT_3A:       'EI',  // 139. Clasificación P/T
  PC_3A:            'EK',  // 141. Perímetro cefálico
  PBRA_3A:          'EL',  // 142. Perímetro braquial
  DX_3A:            'EM',  // 143. Diagnóstico

  // ── Control 4 años (48-59m) ───────────────────────────────────────────────
  F_4A:             'EO',  // 145. Fecha atención 4 años
  PESO_4A:          'EQ',  // 147. Peso
  TALLA_4A:         'ER',  // 148. Talla
  CLAS_PT_4A:       'ET',  // 150. Clasificación P/T
  PC_4A:            'EV',  // 152. Perímetro cefálico
  PBRA_4A:          'EW',  // 153. Perímetro braquial
  DX_4A:            'EX',  // 154. Diagnóstico

  // ── Control 5 años (60m+) ─────────────────────────────────────────────────
  F_5A:             'EZ',  // 156. Fecha atención 5 años
  PESO_5A:          'FB',  // 158. Peso
  TALLA_5A:         'FC',  // 159. Talla
  CLAS_PT_5A:       'FD',  // 160. Clasificación P/T
  PC_5A:            'FF',  // 162. Perímetro cefálico
  PBRA_5A:          'FG',  // 163. Perímetro braquial
  DX_5A:            'FH',  // 164. Diagnóstico
} as const;

// ─── Grupos de controles por edad ─────────────────────────────────────────────
/** Controles esperados para cada grupo etario, con su columna de fecha y clasificación */
export const CONTROLES_POR_GRUPO: Record<string, { nombre: string; fCol: string; clasCol: string; pesoCol: string; tallaCol: string }[]> = {
  "0-6m":   [
    { nombre: "1 mes",     fCol: C.F_1M,    clasCol: C.CLAS_PT_1M,    pesoCol: C.PESO_1M,    tallaCol: C.TALLA_1M },
    { nombre: "2-3 meses", fCol: C.F_2_3M,  clasCol: C.CLAS_PT_2_3M,  pesoCol: C.PESO_2_3M,  tallaCol: C.TALLA_2_3M },
  ],
  "7-12m":  [
    { nombre: "6-8 meses", fCol: C.F_6_8M,  clasCol: C.CLAS_PT_6_8M,  pesoCol: C.PESO_6_8M,  tallaCol: C.TALLA_6_8M },
    { nombre: "9-11 meses",fCol: C.F_9_11M, clasCol: C.CLAS_PT_9_11M, pesoCol: C.PESO_9_11M, tallaCol: C.TALLA_9_11M },
  ],
  "13-24m": [
    { nombre: "12-18 meses",fCol: C.F_12_18M, clasCol: C.CLAS_PT_12_18M, pesoCol: C.PESO_12_18M, tallaCol: C.TALLA_12_18M },
    { nombre: "19-23 meses",fCol: C.F_19_23M, clasCol: C.CLAS_PT_19_23M, pesoCol: C.PESO_19_23M, tallaCol: C.TALLA_19_23M },
  ],
  "25-59m": [
    { nombre: "24-29 meses",fCol: C.F_24_29M, clasCol: C.CLAS_PT_24_29M, pesoCol: C.PESO_24_29M, tallaCol: C.TALLA_24_29M },
    { nombre: "30-35 meses",fCol: C.F_30_35M, clasCol: C.CLAS_PT_30_35M, pesoCol: C.PESO_30_35M, tallaCol: C.TALLA_30_35M },
    { nombre: "3 años",     fCol: C.F_3A,    clasCol: C.CLAS_PT_3A,    pesoCol: C.PESO_3A,    tallaCol: C.TALLA_3A },
    { nombre: "4 años",     fCol: C.F_4A,    clasCol: C.CLAS_PT_4A,    pesoCol: C.PESO_4A,    tallaCol: C.TALLA_4A },
  ],
  "60m+":   [
    { nombre: "5 años",     fCol: C.F_5A,    clasCol: C.CLAS_PT_5A,    pesoCol: C.PESO_5A,    tallaCol: C.TALLA_5A },
  ],
};

// ─── Interfaces de resultado ───────────────────────────────────────────────────
export interface ClasifNutricional {
  adecuado:     number;  // NORMAL / ADECUADO / NORMOPESO
  riesgo:       number;  // RIESGO DE DESNUTRICIÓN / RIESGO NUTRICIONAL
  dnt_moderada: number;  // DESNUTRICIÓN AGUDA MODERADA / DAM
  dnt_severa:   number;  // DESNUTRICIÓN AGUDA SEVERA / DAS
  sobrepeso:    number;  // SOBREPESO / OBESIDAD / RIESGO DE SOBREPESO
  sin_dato:     number;  // Sin clasificación registrada
}

export interface ControlRealizado {
  nombre: string;    // "1 mes", "6-8 meses", etc.
  col: string;       // Columna de fecha
  realizados: number;
  con_peso_talla: number;  // Peso Y talla registrados en ese control
}

export interface IndicadoresGrupoExcel {
  total: number;

  // Controles por visita
  controles: ControlRealizado[];
  total_controles: number;   // Σ visitas con fecha en cualquier control del grupo

  // Clasificación nutricional (última visita con clasificación)
  clasif: ClasifNutricional;

  // Intervenciones
  vacunacion_completa: number;    // col Y = "SI" (case-insensitive)
  tamizaje_hemoglobina: number;   // col AA tiene fecha
  hierro: number;                 // col AH tiene valor
  desparasitacion: number;        // col AI tiene valor
  consejeria_lactancia: number;   // col AU tiene fecha
  lactancia_exclusiva_6m: number; // col AV = 6 o valor ≥ 6 (para 0-6m)
  bajo_peso_nacer: number;        // col AO < 2.5 kg

  // T-302
  ninos_wayuu: number;            // col Q contiene "WAYUU" o "WAYUU"
  zona_rural_dispersa: number;    // col N ≠ "URBANA" y contiene "RURAL" o "DISPERSO"
}

export type IndPorGrupo = {
  "0-6m": IndicadoresGrupoExcel;
  "7-12m": IndicadoresGrupoExcel;
  "13-24m": IndicadoresGrupoExcel;
  "25-59m": IndicadoresGrupoExcel;
  "60m+": IndicadoresGrupoExcel;
  "todos": IndicadoresGrupoExcel;
};

// ─── Utilidades internas ───────────────────────────────────────────────────────

function hasDate(val: unknown): boolean {
  if (val == null) return false;
  if (val instanceof Date) return !isNaN(val.getTime());
  if (typeof val === 'number') return val > 1;
  if (typeof val === 'string') {
    const s = val.trim();
    return s.length > 0 && s !== '0';
  }
  return false;
}

function hasValue(val: unknown): boolean {
  if (val == null) return false;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') return val.trim().length > 0;
  return true;
}

function numVal(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = parseFloat(val.replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function parseExcelDate(val: unknown): Date | null {
  if (val == null) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number' && val > 1) {
    const ms = Math.round((val - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const clean = val.replace(/[\x00-\x1F]/g, '').trim();
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

function mesesEntre(nacimiento: Date, hoy: Date): number {
  let m = (hoy.getFullYear() - nacimiento.getFullYear()) * 12
         + (hoy.getMonth() - nacimiento.getMonth());
  if (hoy.getDate() < nacimiento.getDate()) m--;
  return m;
}

function grupoFromMeses(m: number): string | null {
  if (m < 0)   return null;
  if (m <= 6)  return "0-6m";
  if (m <= 12) return "7-12m";
  if (m <= 24) return "13-24m";
  if (m <= 59) return "25-59m";
  return "60m+";
}

/** Clasifica texto de diagnóstico/clasificación nutricional */
function clasificarTexto(txt: unknown): keyof ClasifNutricional | null {
  if (!txt) return null;
  const s = String(txt).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!s.trim()) return null;

  if (s.includes("SEVERA") || s === "DAS") return "dnt_severa";
  if (s.includes("MODERADA") || s.includes("DESNUTRI") || s === "DAM") return "dnt_moderada";
  if (s.includes("RIESGO DE SOBREPESO") || s.includes("OBESIDAD")) return "sobrepeso";
  if (s.includes("SOBREPESO")) return "sobrepeso";
  if (s.includes("RIESGO")) return "riesgo";
  if (s.includes("NORMAL") || s.includes("ADECUADO") || s.includes("NORMOPESO")) return "adecuado";
  return null;
}

function emptyGrupo(): IndicadoresGrupoExcel {
  return {
    total: 0,
    controles: [],
    total_controles: 0,
    clasif: { adecuado: 0, riesgo: 0, dnt_moderada: 0, dnt_severa: 0, sobrepeso: 0, sin_dato: 0 },
    vacunacion_completa: 0,
    tamizaje_hemoglobina: 0,
    hierro: 0,
    desparasitacion: 0,
    consejeria_lactancia: 0,
    lactancia_exclusiva_6m: 0,
    bajo_peso_nacer: 0,
    ninos_wayuu: 0,
    zona_rural_dispersa: 0,
  };
}

function sumGrupos(gs: IndicadoresGrupoExcel[]): IndicadoresGrupoExcel {
  if (gs.length === 0) return emptyGrupo();
  const base = emptyGrupo();
  for (const g of gs) {
    base.total += g.total;
    base.total_controles += g.total_controles;
    base.clasif.adecuado     += g.clasif.adecuado;
    base.clasif.riesgo       += g.clasif.riesgo;
    base.clasif.dnt_moderada += g.clasif.dnt_moderada;
    base.clasif.dnt_severa   += g.clasif.dnt_severa;
    base.clasif.sobrepeso    += g.clasif.sobrepeso;
    base.clasif.sin_dato     += g.clasif.sin_dato;
    base.vacunacion_completa    += g.vacunacion_completa;
    base.tamizaje_hemoglobina   += g.tamizaje_hemoglobina;
    base.hierro                 += g.hierro;
    base.desparasitacion        += g.desparasitacion;
    base.consejeria_lactancia   += g.consejeria_lactancia;
    base.lactancia_exclusiva_6m += g.lactancia_exclusiva_6m;
    base.bajo_peso_nacer        += g.bajo_peso_nacer;
    base.ninos_wayuu            += g.ninos_wayuu;
    base.zona_rural_dispersa    += g.zona_rural_dispersa;
  }
  // Merge controles (same name → sum)
  const ctrlMap: Map<string, ControlRealizado> = new Map();
  for (const g of gs) {
    for (const ctrl of g.controles) {
      const existing = ctrlMap.get(ctrl.nombre);
      if (existing) {
        existing.realizados    += ctrl.realizados;
        existing.con_peso_talla += ctrl.con_peso_talla;
      } else {
        ctrlMap.set(ctrl.nombre, { ...ctrl });
      }
    }
  }
  base.controles = Array.from(ctrlMap.values());
  return base;
}

// ─── Función principal ─────────────────────────────────────────────────────────

/**
 * Recorre todas las filas del Excel y calcula los indicadores RIAS
 * agrupados por rango de edad (calculado desde la columna H = fecha de nacimiento).
 */
export function calcularIndicadoresDesdeExcel(
  rawRows: Record<string, unknown>[],
  startRowIndex = 4,
): IndPorGrupo {
  const hoy = new Date();

  // Inicializar acumuladores
  const acc: Record<string, IndicadoresGrupoExcel> = {
    "0-6m":   emptyGrupo(),
    "7-12m":  emptyGrupo(),
    "13-24m": emptyGrupo(),
    "25-59m": emptyGrupo(),
    "60m+":   emptyGrupo(),
  };

  // Inicializar controles por grupo
  for (const [grpKey, ctrlsDef] of Object.entries(CONTROLES_POR_GRUPO)) {
    acc[grpKey].controles = ctrlsDef.map(c => ({
      nombre: c.nombre, col: c.fCol, realizados: 0, con_peso_talla: 0,
    }));
  }

  for (let r = startRowIndex; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row) continue;

    // Calcular edad y grupo
    const fechaNac = parseExcelDate(row[C.FECHA_NAC]);
    if (!fechaNac) continue;
    const meses = mesesEntre(fechaNac, hoy);
    const grpKey = grupoFromMeses(meses);
    if (!grpKey) continue;

    const grp = acc[grpKey];
    const ctrlsDef = CONTROLES_POR_GRUPO[grpKey] ?? [];

    grp.total++;

    // ── Controles realizados ─────────────────────────────────────────────────
    for (let ci = 0; ci < ctrlsDef.length; ci++) {
      const def = ctrlsDef[ci];
      const ctrl = grp.controles[ci];
      if (hasDate(row[def.fCol])) {
        ctrl.realizados++;
        grp.total_controles++;
        // Peso Y talla registrados en esa visita
        if (hasValue(row[def.pesoCol]) && hasValue(row[def.tallaCol])) {
          ctrl.con_peso_talla++;
        }
      }
    }

    // ── Clasificación nutricional (busca la más reciente con dato) ──────────
    // Recorre los controles del grupo en orden inverso para tomar el último
    let clsKey: keyof ClasifNutricional | null = null;
    for (let ci = ctrlsDef.length - 1; ci >= 0; ci--) {
      clsKey = clasificarTexto(row[ctrlsDef[ci].clasCol]);
      if (clsKey) break;
    }
    if (clsKey) grp.clasif[clsKey]++;
    else grp.clasif.sin_dato++;

    // ── Intervenciones generales ─────────────────────────────────────────────
    const vacStr = String(row[C.VACUNACION] ?? '').toUpperCase().trim();
    if (vacStr === 'SI' || vacStr === 'SÍ' || vacStr === 'S') grp.vacunacion_completa++;

    if (hasDate(row[C.FECHA_HEMOGLOB]))  grp.tamizaje_hemoglobina++;
    if (hasValue(row[C.HIERRO]))         grp.hierro++;
    if (hasValue(row[C.DESPARASIT]))     grp.desparasitacion++;
    if (hasDate(row[C.FECHA_LACTANCIA])) grp.consejeria_lactancia++;

    // Lactancia exclusiva ≥ 6 meses (relevante para 0-6m pero se registra en todos)
    const mesesLac = numVal(row[C.MESES_LACTANCIA]);
    if (mesesLac >= 6) grp.lactancia_exclusiva_6m++;

    // Bajo peso al nacer (< 2.5 kg)
    const pesoNacer = numVal(row[C.PESO_NACER]);
    if (pesoNacer > 0 && pesoNacer < 2.5) grp.bajo_peso_nacer++;

    // ── T-302 ────────────────────────────────────────────────────────────────
    const pueblo = String(row[C.PUEBLO_INDIGENA] ?? '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (pueblo.includes("WAYUU")) grp.ninos_wayuu++;

    const zona = String(row[C.ZONA] ?? '').toUpperCase();
    if (zona.includes("RURAL") || zona.includes("DISPERSO")) grp.zona_rural_dispersa++;
  }

  // Calcular "todos" como suma de todos los grupos
  const todos = sumGrupos(Object.values(acc));

  return {
    "0-6m":   acc["0-6m"],
    "7-12m":  acc["7-12m"],
    "13-24m": acc["13-24m"],
    "25-59m": acc["25-59m"],
    "60m+":   acc["60m+"],
    "todos":  todos,
  };
}
