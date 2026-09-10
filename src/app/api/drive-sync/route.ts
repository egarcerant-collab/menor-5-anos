import { NextResponse } from "next/server";
import { isDriveConfigured, getLatestMatrizFromDrive } from "@/lib/googleDrive";
import { parseMatrizWorkbook } from "@/lib/parseMatrizWorkbook";
import { detectarColumnaMunicipio } from "@/lib/municipioDetect";
import { calcularGruposEdadDesdeExcel } from "@/lib/gruposEdadExcel";
import { calcularIndicadoresDesdeExcel } from "@/lib/indicadoresExcel";
import { contarControlesPorMes } from "@/lib/contadorControles";
import { MUNICIPIOS } from "@/components/pi/sampleData";

// Siempre buscar el archivo más reciente en Drive, nunca servir una respuesta cacheada.
export const dynamic = "force-dynamic";

const START_ROW = 4;

/**
 * Sincroniza automáticamente con la carpeta de Drive: descarga la matriz
 * CONSOLIDADO más reciente y calcula los indicadores agregados en el
 * servidor. Nunca devuelve filas crudas (nombres, documentos, direcciones o
 * teléfonos de los menores/madres) — solo los conteos e indicadores ya
 * agregados que el dashboard necesita, igual que al restaurar desde
 * localStorage tras una carga manual.
 */
export async function GET() {
  if (!isDriveConfigured()) {
    return NextResponse.json({ configured: false });
  }

  try {
    const matriz = await getLatestMatrizFromDrive();
    if (!matriz) {
      return NextResponse.json({ configured: true, found: false });
    }

    const { rawRows } = parseMatrizWorkbook(matriz.buffer);
    const colMunicipio = detectarColumnaMunicipio(rawRows, START_ROW, MUNICIPIOS);

    const grupos = calcularGruposEdadDesdeExcel(rawRows, START_ROW);
    const indicadores = calcularIndicadoresDesdeExcel(rawRows, START_ROW, undefined, colMunicipio);

    const indPorMunicipio: Record<string, ReturnType<typeof calcularIndicadoresDesdeExcel>> = {};
    for (const mun of MUNICIPIOS) {
      const nombreNorm = mun.nombre.toUpperCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
      indPorMunicipio[mun.id] = calcularIndicadoresDesdeExcel(rawRows, START_ROW, [nombreNorm], colMunicipio);
    }

    const conteosMes = contarControlesPorMes(rawRows, START_ROW, new Date().getFullYear());
    const mejorMes = conteosMes.reduce((a, b) => (b.conteo > a.conteo ? b : a), conteosMes[0]);
    const mesPrincipal = mejorMes && mejorMes.conteo > 0
      ? mejorMes.mes.charAt(0) + mejorMes.mes.slice(1).toLowerCase()
      : null;

    return NextResponse.json({
      configured: true,
      found: true,
      filename: matriz.file.name,
      modifiedTime: matriz.file.modifiedTime,
      rowsCount: rawRows.length - START_ROW,
      colMunicipio,
      grupos,
      indicadores,
      indPorMunicipio,
      mesPrincipal,
    });
  } catch (error: any) {
    console.error("[drive-sync] Error:", error);
    return NextResponse.json(
      {
        configured: true,
        found: false,
        error: error?.message ?? "Error desconocido",
        // Diagnóstico temporal, sin exponer la clave real: solo forma/longitud.
        keyDebug: diagnosticoClavePrivada(),
      },
      { status: 500 },
    );
  }
}

/** Diagnóstico no sensible de GOOGLE_DRIVE_PRIVATE_KEY para depurar el formato guardado en Vercel. */
function diagnosticoClavePrivada() {
  const raw = process.env.GOOGLE_DRIVE_PRIVATE_KEY || "";
  return {
    length: raw.length,
    startsWith: raw.slice(0, 15),
    endsWith: raw.slice(-15),
    tieneBackslashN: raw.includes("\\n"),
    tieneNewlineReal: raw.includes("\n"),
    cantidadBackslashN: (raw.match(/\\n/g) || []).length,
    cantidadNewlineReal: (raw.match(/\n/g) || []).length,
  };
}
