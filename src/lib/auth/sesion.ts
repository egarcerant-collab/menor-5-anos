import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** Sesión firmada con HMAC-SHA256 en cookie httpOnly (mismo esquema que `dnt`). */
export type Rol = "admin" | "epsi" | "prestador";

export interface Sesion {
  id: string;
  usuario: string;
  rol: Rol;
  nombre: string;
  ips?: string; // IPS del prestador
  /** El prestador entró con el NIT: debe crear su contraseña personal antes de continuar. */
  debeCambiarClave?: boolean;
  exp: number; // epoch en segundos
}

export const COOKIE = "pi_sesion";
export const DURACION_SEG = 60 * 60 * 10;

const g = globalThis as { __piSecreto?: string };
function secreto(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production") throw new Error("Falta la variable SESSION_SECRET en el servidor");
  return (g.__piSecreto ??= crypto.randomBytes(32).toString("hex")); // desarrollo: un secreto por proceso
}

const firmar = (valor: string) => crypto.createHmac("sha256", secreto()).update(valor).digest("base64url");

export function codificarSesion(s: Omit<Sesion, "exp">): string {
  const cuerpo = Buffer.from(JSON.stringify({ ...s, exp: Math.floor(Date.now() / 1000) + DURACION_SEG })).toString("base64url");
  return `${cuerpo}.${firmar(cuerpo)}`;
}

export function decodificarSesion(token: string | undefined): Sesion | null {
  if (!token) return null;
  const [cuerpo, firma] = token.split(".");
  if (!cuerpo || !firma) return null;
  const esperada = firmar(cuerpo);
  if (firma.length !== esperada.length || !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null;
  try {
    const s = JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf-8")) as Sesion;
    if (!s.id || !["admin", "epsi", "prestador"].includes(s.rol)) return null;
    if (!s.exp || s.exp < Date.now() / 1000) return null;
    return s;
  } catch {
    return null;
  }
}

export async function getSesion(): Promise<Sesion | null> {
  return decodificarSesion((await cookies()).get(COOKIE)?.value);
}

export const esEpsi = (rol: Rol) => rol === "epsi" || rol === "admin";
/** Página inicial de cada rol. */
export const rutaInicio = (rol: Rol) => (rol === "prestador" ? "/prestador" : "/");

/**
 * Exige sesión (y opcionalmente un rol) en una página del servidor; si no, redirige al ingreso.
 * Un prestador que aún debe crear su contraseña solo puede ver /cambiar-clave.
 */
export async function requerirSesion(roles?: Rol[]): Promise<Sesion> {
  const s = await getSesion();
  if (!s) redirect("/ingreso");
  if (s.debeCambiarClave) redirect("/cambiar-clave");
  if (roles && !roles.includes(s.rol)) redirect(rutaInicio(s.rol));
  return s;
}
