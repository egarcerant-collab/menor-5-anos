/**
 * Detecta automáticamente qué columna del Excel (rawRows con header:'A')
 * contiene el nombre del municipio, comparando valores contra la lista
 * oficial de municipios atendidos. Compartido entre el cliente (ExcelLoader)
 * y el endpoint de sincronización con Drive, para que ambos detecten la
 * misma columna sobre el mismo archivo.
 */

export interface MunicipioComoNombre {
  nombre: string;
}

const normalizar = (s: string) => s.toUpperCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

export function detectarColumnaMunicipio(
  rawRows: Record<string, unknown>[],
  startIdx: number,
  municipios: MunicipioComoNombre[],
): string {
  // Revisamos varias columnas (hasta la S) para cubrir diferentes estructuras de Excel
  const cols = ['B','C','D','E','F','G','H','A','I','J','K','L','M','N','O','P','Q','R','S'];
  const nombresNorm = municipios.map(m => normalizar(m.nombre));
  let bestCol = 'B';
  let bestScore = 0;
  const sampleSize = Math.min(500, rawRows.length - startIdx);

  for (const col of cols) {
    const valoresUnicos = new Set<string>();
    let score = 0;
    for (let r = startIdx; r < startIdx + sampleSize; r++) {
      const val = normalizar(String(rawRows[r]?.[col] ?? '').trim());
      if (!val || val.length < 3) continue;
      const matched = nombresNorm.some(n => n.length >= 4 && (val === n || val.includes(n)));
      if (matched) {
        score++;
        valoresUnicos.add(val);
      }
    }
    const diversidad = valoresUnicos.size;
    const scoreAjustado = score * (diversidad > 1 ? diversidad : 0.1);
    if (scoreAjustado > bestScore) { bestScore = scoreAjustado; bestCol = col; }
  }

  return bestCol;
}
