import { JWT } from "google-auth-library";

const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || "12wtavmNU_CKeHT2Xy1Nn08oXCwzttfkB";
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

export interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime: string;
}

export interface DriveMatriz {
  buffer: ArrayBuffer;
  file: DriveFileInfo;
}

/** true si las credenciales de la cuenta de servicio están configuradas. */
export function isDriveConfigured(): boolean {
  return Boolean(process.env.GOOGLE_DRIVE_CLIENT_EMAIL && process.env.GOOGLE_DRIVE_PRIVATE_KEY);
}

const stripQuotes = (s: string) => s.trim().replace(/^["']|["']$/g, "");

/**
 * Si en la variable de entorno quedó pegado el archivo .json completo de la
 * cuenta de servicio (en vez de solo el campo que corresponde), lo detecta y
 * extrae el campo pedido. Así no depende de que el copy-paste manual sea exacto.
 */
function extraerCampo(raw: string, campo: "private_key" | "client_email"): string {
  const value = stripQuotes(raw);
  if (value.startsWith("{")) {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed[campo] === "string") return parsed[campo];
    } catch {
      // No era JSON válido, se sigue tratando como el valor directo.
    }
  }
  return value;
}

function getClient(): JWT {
  const emailRaw = process.env.GOOGLE_DRIVE_CLIENT_EMAIL || "";
  const keyRaw = process.env.GOOGLE_DRIVE_PRIVATE_KEY || "";

  const email = extraerCampo(emailRaw, "client_email") || extraerCampo(keyRaw, "client_email");
  // Vercel/Next no preservan saltos de línea reales en variables de entorno;
  // se guardan como "\n" literal y hay que convertirlos de vuelta.
  const key = extraerCampo(keyRaw, "private_key").replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error("Credenciales de Google Drive no configuradas (GOOGLE_DRIVE_CLIENT_EMAIL / GOOGLE_DRIVE_PRIVATE_KEY).");
  }
  return new JWT({ email, key, scopes: SCOPES });
}

/**
 * Busca en la carpeta de Drive el archivo .xlsx "CONSOLIDADO" modificado más
 * recientemente, y descarga su contenido binario.
 * Requiere que la carpeta haya sido compartida (como lector) con el email de
 * la cuenta de servicio.
 */
export async function getLatestMatrizFromDrive(): Promise<DriveMatriz | null> {
  const client = getClient();
  const accessToken = (await client.getAccessToken()).token;
  if (!accessToken) throw new Error("No se pudo obtener token de acceso de Google Drive.");

  const headers = { Authorization: `Bearer ${accessToken}` };

  const q = encodeURIComponent(
    `'${DRIVE_FOLDER_ID}' in parents and trashed = false and mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'`,
  );
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime desc&pageSize=1&fields=files(id,name,modifiedTime)`;
  const listResp = await fetch(listUrl, { headers });
  if (!listResp.ok) {
    throw new Error(`Drive files.list falló: ${listResp.status} ${await listResp.text()}`);
  }
  const listJson = (await listResp.json()) as { files?: DriveFileInfo[] };
  const file = listJson.files?.[0];
  if (!file) return null;

  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
  const downloadResp = await fetch(downloadUrl, { headers });
  if (!downloadResp.ok) {
    throw new Error(`Drive files.get falló: ${downloadResp.status} ${await downloadResp.text()}`);
  }
  const buffer = await downloadResp.arrayBuffer();

  return { buffer, file };
}
