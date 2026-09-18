/**
 * Job periódico (GitHub Actions) que descarga TODAS las matrices CONSOLIDADO
 * de Drive (una por mes), calcula los indicadores agregados de cada una y
 * escribe el resultado en src/data/drive-sync-latest.json, organizado por
 * mes.
 *
 * Se ejecuta FUERA de Vercel a propósito: descargar cada archivo (~35MB) y
 * parsear ~44,000 filas supera el límite de 60s de las funciones serverless
 * del plan Hobby. Aquí no hay ese límite. El endpoint /api/drive-sync en la
 * app solo lee este JSON ya calculado (rápido, sin riesgo de timeout).
 *
 * Nunca escribe filas crudas (nombres, documentos, direcciones, teléfonos):
 * solo los conteos e indicadores ya agregados que el dashboard necesita.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { procesarTodasLasMatrices, isDriveConfigured, type DriveFileConFecha } from "../src/lib/googleDrive";
import { parseMatrizRawRowsOnly } from "../src/lib/parseMatrizWorkbook";
import { detectarColumnaMunicipio } from "../src/lib/municipioDetect";
import { calcularGruposEdadDesdeExcel } from "../src/lib/gruposEdadExcel";
import { calcularIndicadoresDesdeExcel } from "../src/lib/indicadoresExcel";
import { contarControlesPorMes } from "../src/lib/contadorControles";
import { MUNICIPIOS } from "../src/components/pi/sampleData";

const START_ROW = 4;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "src", "data", "drive-sync-latest.json");

function procesarArchivo(buffer: ArrayBuffer) {
  const { rawRows } = parseMatrizRawRowsOnly(buffer);
  const colMunicipio = detectarColumnaMunicipio(rawRows, START_ROW, MUNICIPIOS);
  const grupos = calcularGruposEdadDesdeExcel(rawRows, START_ROW);
  const indicadores = calcularIndicadoresDesdeExcel(rawRows, START_ROW, undefined, colMunicipio);

  const conteosMes = contarControlesPorMes(rawRows, START_ROW, new Date().getFullYear());
  const mejorMes = conteosMes.reduce((a, b) => (b.conteo > a.conteo ? b : a), conteosMes[0]);
  const mesPrincipal = mejorMes && mejorMes.conteo > 0
    ? mejorMes.mes.charAt(0) + mejorMes.mes.slice(1).toLowerCase()
    : null;

  return { rowsCount: rawRows.length - START_ROW, colMunicipio, grupos, indicadores, mesPrincipal };
}

async function main() {
  if (!isDriveConfigured()) {
    console.error("GOOGLE_DRIVE_CLIENT_EMAIL / GOOGLE_DRIVE_PRIVATE_KEY no configuradas. Abortando.");
    process.exit(1);
  }

  const meses: Record<string, any> = {};
  const orden: string[] = [];
  let huboError = false;

  await procesarTodasLasMatrices(async (info: DriveFileConFecha, buffer: ArrayBuffer) => {
    const mesNombre = info.mesNombre!;
    console.log(`Procesando ${info.file.name} (${mesNombre})...`);
    const t0 = Date.now();
    try {
      const datos = procesarArchivo(buffer);
      meses[mesNombre] = {
        filename: info.file.name,
        modifiedTime: info.file.modifiedTime,
        generadoEn: new Date().toISOString(),
        ...datos,
      };
      orden.push(mesNombre);
      console.log(`  -> ${datos.rowsCount} filas en ${Date.now() - t0}ms`);
    } catch (err) {
      huboError = true;
      console.error(`  -> Error procesando ${info.file.name}:`, err);
    }
  });

  if (orden.length === 0) {
    console.log("No se encontró ninguna matriz reconocible en Drive.");
    fs.writeFileSync(OUT_PATH, JSON.stringify({ configured: true, found: false }, null, 2));
    if (huboError) process.exit(1);
    return;
  }

  const resultado = {
    configured: true,
    found: true,
    // orden ya viene del mas reciente al mas antiguo (ver listMatricesEnDrive)
    ordenMeses: orden,
    ultimoMes: orden[0],
    meses,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(resultado, null, 2));
  console.log(`Listo: ${orden.length} meses -> ${OUT_PATH}`);
  if (huboError) process.exit(1);
}

main().catch(err => {
  console.error("[sync-drive-data] Error:", err);
  process.exit(1);
});
