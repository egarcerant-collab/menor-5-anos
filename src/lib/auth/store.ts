import "server-only";
import fs from "fs/promises";
import path from "path";
import { crearClienteDrive } from "../googleDrive";

/**
 * Almacenamiento de documentos JSON del módulo de prestadores (usuarios,
 * prestadores, reportes). Mismo patrón que el repo `dnt`:
 *  - DriveStore: JSON en una carpeta PRIVADA de Google Drive (cuenta de servicio como Editor).
 *  - LocalStore: data/app/*.json, solo para desarrollo (data/ está en .gitignore).
 *
 * En producción sin GDRIVE_APP_FOLDER_ID se falla con un error claro: el disco de
 * Vercel es efímero y perder usuarios o reportes en silencio no es aceptable.
 */
export interface JsonStore {
  readonly tipo: "drive" | "local";
  /** `fresco` ignora la copia en memoria (para leer-modificar-escribir). */
  leer<T>(nombre: string, opciones?: { fresco?: boolean }): Promise<T | null>;
  escribir(nombre: string, data: unknown): Promise<void>;
  /** Nombres de los archivos JSON que empiezan por `prefijo` (para consolidar reportes). */
  listar(prefijo: string): Promise<string[]>;
}

const NOMBRE_SEGURO = /^[a-z0-9][a-z0-9._-]{0,120}\.json$/;
const nombreValido = (n: string) => {
  if (!NOMBRE_SEGURO.test(n)) throw new Error("Nombre de archivo inválido");
};

class LocalStore implements JsonStore {
  readonly tipo = "local" as const;
  private dir = process.env.DATA_DIR || path.join(process.cwd(), "data", "app");

  async leer<T>(nombre: string): Promise<T | null> {
    nombreValido(nombre);
    try {
      return JSON.parse(await fs.readFile(path.join(this.dir, nombre), "utf-8")) as T;
    } catch (e: any) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
  }

  async escribir(nombre: string, data: unknown): Promise<void> {
    nombreValido(nombre);
    await fs.mkdir(this.dir, { recursive: true });
    const destino = path.join(this.dir, nombre);
    const tmp = `${destino}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
    await fs.rename(tmp, destino); // escritura atómica
  }

  async listar(prefijo: string): Promise<string[]> {
    const nombres = await fs.readdir(this.dir).catch(() => [] as string[]);
    return nombres.filter(n => n.startsWith(prefijo) && n.endsWith(".json")).sort();
  }
}

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const SCOPE_ESCRITURA = ["https://www.googleapis.com/auth/drive"];
const TTL_MS = 20_000;

class DriveStore implements JsonStore {
  readonly tipo = "drive" as const;
  private cliente = crearClienteDrive(SCOPE_ESCRITURA);
  private carpetas = new Map<string, Promise<string>>();
  private ids = new Map<string, string>();
  private cache = new Map<string, { hasta: number; valor: unknown }>();

  constructor(private raizId: string) {}

  private async headers(extra?: Record<string, string>) {
    const token = (await this.cliente.getAccessToken()).token;
    if (!token) throw new Error("No se pudo obtener token de Google Drive");
    return { Authorization: `Bearer ${token}`, ...extra };
  }

  private async api(url: string, init?: RequestInit & { extraHeaders?: Record<string, string> }) {
    const res = await fetch(url, { ...init, headers: await this.headers(init?.extraHeaders) });
    return res;
  }

  private static esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  /** Carpeta de destino según el tipo de archivo (se crea si no existe). */
  private carpetaId(nombreCarpeta: string): Promise<string> {
    let p = this.carpetas.get(nombreCarpeta);
    if (!p) {
      p = (async () => {
        const q = encodeURIComponent(
          `'${this.raizId}' in parents and name='${DriveStore.esc(nombreCarpeta)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        );
        const r = await this.api(`${API}/files?q=${q}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`);
        if (!r.ok) throw new Error(`Drive no respondió al buscar la carpeta (${r.status}). ¿La carpeta está compartida como Editor con la cuenta de servicio?`);
        const existente = ((await r.json()) as { files?: { id: string }[] }).files?.[0]?.id;
        if (existente) return existente;
        const c = await this.api(`${API}/files?supportsAllDrives=true&fields=id`, {
          method: "POST",
          extraHeaders: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nombreCarpeta, parents: [this.raizId], mimeType: "application/vnd.google-apps.folder" }),
        });
        if (!c.ok) throw new Error(`No se pudo crear la carpeta en Drive (${c.status})`);
        return ((await c.json()) as { id: string }).id;
      })();
      p.catch(() => this.carpetas.delete(nombreCarpeta));
      this.carpetas.set(nombreCarpeta, p);
    }
    return p;
  }

  private static carpetaPara = (nombre: string) => (nombre.startsWith("reporte-") ? "REPORTES" : "DATOS_APP");

  private async buscarId(nombre: string): Promise<{ id: string | null; carpeta: string }> {
    const carpeta = await this.carpetaId(DriveStore.carpetaPara(nombre));
    const conocido = this.ids.get(nombre);
    if (conocido) return { id: conocido, carpeta };
    const q = encodeURIComponent(`'${carpeta}' in parents and name='${DriveStore.esc(nombre)}' and trashed=false`);
    const r = await this.api(`${API}/files?q=${q}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`);
    if (!r.ok) throw new Error(`Drive no respondió al buscar ${nombre} (${r.status})`);
    const id = ((await r.json()) as { files?: { id: string }[] }).files?.[0]?.id ?? null;
    if (id) this.ids.set(nombre, id);
    return { id, carpeta };
  }

  async leer<T>(nombre: string, opciones?: { fresco?: boolean }): Promise<T | null> {
    nombreValido(nombre);
    const c = this.cache.get(nombre);
    if (!opciones?.fresco && c && c.hasta > Date.now()) return structuredClone(c.valor) as T | null;

    const { id } = await this.buscarId(nombre);
    let valor: T | null = null;
    if (id) {
      const r = await this.api(`${API}/files/${id}?alt=media&supportsAllDrives=true`);
      if (r.status === 404) this.ids.delete(nombre);
      else if (!r.ok) throw new Error(`No se pudo leer ${nombre} de Drive (${r.status})`);
      else valor = JSON.parse(await r.text()) as T;
    }
    this.cache.set(nombre, { hasta: Date.now() + TTL_MS, valor });
    return structuredClone(valor);
  }

  async escribir(nombre: string, data: unknown): Promise<void> {
    nombreValido(nombre);
    const contenido = JSON.stringify(data, null, 2);
    const { id, carpeta } = await this.buscarId(nombre);
    if (id) {
      const r = await this.api(`${UPLOAD}/files/${id}?uploadType=media&supportsAllDrives=true`, {
        method: "PATCH",
        extraHeaders: { "Content-Type": "application/json" },
        body: contenido,
      });
      if (!r.ok) throw new Error(`No se pudo guardar ${nombre} en Drive (${r.status})`);
    } else {
      const frontera = `dnt${Math.random().toString(36).slice(2)}`;
      const cuerpo =
        `--${frontera}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify({ name: nombre, parents: [carpeta], mimeType: "application/json" }) +
        `\r\n--${frontera}\r\nContent-Type: application/json\r\n\r\n${contenido}\r\n--${frontera}--`;
      const r = await this.api(`${UPLOAD}/files?uploadType=multipart&supportsAllDrives=true&fields=id`, {
        method: "POST",
        extraHeaders: { "Content-Type": `multipart/related; boundary=${frontera}` },
        body: cuerpo,
      });
      if (!r.ok) throw new Error(`No se pudo crear ${nombre} en Drive (${r.status})`);
      this.ids.set(nombre, ((await r.json()) as { id: string }).id);
    }
    this.cache.set(nombre, { hasta: Date.now() + TTL_MS, valor: structuredClone(data) });
  }

  async listar(prefijo: string): Promise<string[]> {
    const carpeta = await this.carpetaId(DriveStore.carpetaPara(prefijo));
    const q = encodeURIComponent(`'${carpeta}' in parents and trashed=false and name contains '${DriveStore.esc(prefijo)}'`);
    const nombres: string[] = [];
    let token = "";
    do {
      const r = await this.api(
        `${API}/files?q=${q}&fields=nextPageToken,files(id,name)&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true${token ? `&pageToken=${token}` : ""}`,
      );
      if (!r.ok) throw new Error(`No se pudo listar en Drive (${r.status})`);
      const j = (await r.json()) as { nextPageToken?: string; files?: { id: string; name: string }[] };
      for (const f of j.files ?? []) {
        if (f.name.startsWith(prefijo) && f.name.endsWith(".json")) {
          nombres.push(f.name);
          this.ids.set(f.name, f.id);
        }
      }
      token = j.nextPageToken ?? "";
    } while (token);
    return nombres.sort();
  }
}

let instancia: JsonStore | null = null;

export function getStore(): JsonStore {
  if (instancia) return instancia;
  const raiz = process.env.GDRIVE_APP_FOLDER_ID;
  if (raiz) instancia = new DriveStore(raiz);
  else if (process.env.NODE_ENV === "production") {
    throw new Error("Falta GDRIVE_APP_FOLDER_ID: configure la carpeta privada de Drive para guardar usuarios y reportes (en producción no se usa disco local).");
  } else instancia = new LocalStore();
  return instancia;
}

// ── Escritura serializada por archivo ──────────────────────────────────
// Evita que dos guardados simultáneos en el MISMO proceso se sobrescriban
// (leer-modificar-escribir). Entre instancias distintas de Vercel esto no
// alcanza: por eso cada IPS y período tiene su propio archivo de reporte.
const colas = new Map<string, Promise<unknown>>();

export function actualizarJson<T>(nombre: string, inicial: () => T, cambio: (datos: T) => void | Promise<void>): Promise<T> {
  const previa = colas.get(nombre) ?? Promise.resolve();
  const tarea = previa
    .catch(() => undefined)
    .then(async () => {
      const store = getStore();
      const datos = (await store.leer<T>(nombre, { fresco: true })) ?? inicial();
      await cambio(datos);
      await store.escribir(nombre, datos);
      return datos;
    });
  colas.set(nombre, tarea);
  return tarea;
}
