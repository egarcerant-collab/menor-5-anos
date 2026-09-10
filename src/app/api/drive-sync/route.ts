import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

/**
 * Sirve los indicadores ya calculados por el job periódico de GitHub Actions
 * (scripts/sync-drive-data.ts), que descarga la matriz más reciente de Drive
 * y los deja en src/data/drive-sync-latest.json.
 *
 * A propósito NO se hace el fetch a Drive ni el parseo aquí: ese trabajo
 * (~35MB + ~44,000 filas) supera el límite de 60s de las funciones
 * serverless del plan Hobby de Vercel. Leer un JSON ya calculado es
 * instantáneo y no tiene ese riesgo.
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "src", "data", "drive-sync-latest.json");
    const raw = await fs.readFile(filePath, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch (error: any) {
    console.error("[drive-sync] Error leyendo el cache local:", error);
    return NextResponse.json({ configured: false }, { status: 200 });
  }
}
