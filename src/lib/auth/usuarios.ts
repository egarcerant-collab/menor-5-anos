import "server-only";
import crypto from "crypto";
import { actualizarJson, getStore } from "./store";

/** Funcionarios de la EPSI y administradores. Los prestadores (IPS) se manejan en prestadores.ts. */
export type RolUsuario = "admin" | "epsi";

export interface Usuario {
  id: string;
  usuario: string;
  nombre: string;
  rol: RolUsuario;
  hash: string;
  activo: boolean;
  creadoEn: string;
  /** Registro hecho por el propio funcionario, pendiente de aprobación del administrador. */
  pendiente?: boolean;
  correo?: string;
  cargo?: string;
}

export type UsuarioPublico = Omit<Usuario, "hash">;

const ARCHIVO = "usuarios.json";
const ITERACIONES = 210_000; // PBKDF2-SHA512, recomendación OWASP
const DOMINIO = "@dusakawiepsi.com";
const MAX_PENDIENTES = 50;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, ITERACIONES, 64, "sha512").toString("hex");
  return `pbkdf2$${ITERACIONES}$${salt}$${hash}`;
}

export function verificarPassword(password: string, almacenado: string): boolean {
  const [alg, iter, salt, hash] = almacenado.split("$");
  if (alg !== "pbkdf2" || !salt || !hash) return false;
  const intento = crypto.pbkdf2Sync(password, salt, Number(iter), 64, "sha512");
  const esperado = Buffer.from(hash, "hex");
  return intento.length === esperado.length && crypto.timingSafeEqual(intento, esperado);
}

/** Acepta 'usuario' o 'usuario@dusakawiepsi.com'. */
export const normalizarUsuario = (u: string) => u.trim().toLowerCase().replace(/@dusakawiepsi\.com$/, "");

/** Superusuario: la cuenta definida en ADMIN_USUARIO. No se puede desactivar ni degradar. */
export const esSuperusuario = (usuario: string) => {
  const su = process.env.ADMIN_USUARIO;
  return !!su && normalizarUsuario(usuario) === normalizarUsuario(su);
};

/**
 * Carga usuarios. Si no existe ningún administrador activo, crea el inicial desde
 * ADMIN_USUARIO / ADMIN_PASSWORD (variables de entorno, nunca en el código).
 */
export async function listarUsuarios(): Promise<Usuario[]> {
  const store = getStore();
  const usuarios = (await store.leer<Usuario[]>(ARCHIVO)) ?? [];
  const hayAdmin = usuarios.some(u => u.rol === "admin" && !u.pendiente);
  const adminUsuario = process.env.ADMIN_USUARIO;
  if (!hayAdmin && adminUsuario && process.env.ADMIN_PASSWORD) {
    const usuario = normalizarUsuario(adminUsuario);
    // Una solicitud pendiente con el mismo usuario no puede bloquear al administrador
    const i = usuarios.findIndex(u => u.usuario === usuario);
    if (i >= 0) usuarios.splice(i, 1);
    usuarios.push({
      id: crypto.randomUUID(),
      usuario,
      nombre: process.env.ADMIN_NOMBRE || usuario,
      rol: "admin",
      hash: hashPassword(process.env.ADMIN_PASSWORD),
      activo: true,
      creadoEn: new Date().toISOString(),
    });
    await store.escribir(ARCHIVO, usuarios);
  }
  return usuarios;
}

export const sinHash = ({ hash: _hash, ...u }: Usuario): UsuarioPublico => u;

// ── Bloqueo por intentos fallidos (en memoria del proceso) ─────────────
// Limitación conocida: en serverless cada instancia lleva su propia cuenta.
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 5 * 60_000;
const g = globalThis as { __piIntentos?: Map<string, { n: number; hasta: number }> };
const intentos = (g.__piIntentos ??= new Map());

export const estaBloqueado = (clave: string) => (intentos.get(clave)?.hasta ?? 0) > Date.now();
export function registrarFallo(clave: string) {
  const n = (intentos.get(clave)?.n ?? 0) + 1;
  intentos.set(clave, { n, hasta: n >= MAX_INTENTOS ? Date.now() + BLOQUEO_MS : 0 });
}
export const limpiarIntentos = (clave: string) => intentos.delete(clave);

export type ResultadoLogin = { ok: true; usuario: Usuario } | { ok: false; motivo: "credenciales" | "bloqueado" | "inactivo" | "pendiente" };

export async function autenticar(usuario: string, password: string): Promise<ResultadoLogin> {
  const clave = normalizarUsuario(usuario);
  if (estaBloqueado(clave)) return { ok: false, motivo: "bloqueado" };

  const u = (await listarUsuarios()).find(x => x.usuario === clave);
  // Se verifica siempre un hash para no revelar si el usuario existe por el tiempo de respuesta
  const valido = verificarPassword(password, u?.hash ?? "pbkdf2$210000$00$00");
  if (!u || !valido) {
    registrarFallo(clave);
    return { ok: false, motivo: "credenciales" };
  }
  limpiarIntentos(clave);
  if (u.pendiente) return { ok: false, motivo: "pendiente" };
  if (!u.activo) return { ok: false, motivo: "inactivo" };
  return { ok: true, usuario: u };
}

/**
 * Autorregistro de funcionarios EPSI: solo correo institucional. La cuenta queda inactiva
 * y pendiente hasta que un administrador la apruebe.
 */
export async function registrarSolicitud(datos: { correo: string; nombre: string; cargo: string; password: string }) {
  const correo = datos.correo.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}@dusakawiepsi\.com$/.test(correo)) throw new Error(`Usa tu correo institucional ${DOMINIO}`);
  const nombre = datos.nombre.trim().replace(/\s+/g, " ");
  if (nombre.length < 5 || nombre.length > 100) throw new Error("Escribe tu nombre completo");
  if (datos.password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");

  const usuario = normalizarUsuario(correo);
  await actualizarJson<Usuario[]>(ARCHIVO, () => [], usuarios => {
    // Mensaje genérico para no revelar qué correos ya tienen cuenta
    if (usuarios.some(u => u.usuario === usuario)) throw new Error("No fue posible registrar la solicitud con ese correo");
    if (usuarios.filter(u => u.pendiente).length >= MAX_PENDIENTES) throw new Error("Hay demasiadas solicitudes pendientes. Intenta más tarde.");
    usuarios.push({
      id: crypto.randomUUID(),
      usuario,
      nombre,
      rol: "epsi",
      hash: hashPassword(datos.password),
      activo: false,
      pendiente: true,
      correo,
      cargo: datos.cargo.trim().slice(0, 100),
      creadoEn: new Date().toISOString(),
    });
  });
}

/** Administrador: aprueba (con rol) o rechaza (elimina) una solicitud de registro. */
export async function resolverSolicitud(id: string, decision: { aprobar: true; rol: RolUsuario } | { aprobar: false }, actor: string) {
  if (decision.aprobar && decision.rol === "admin" && !esSuperusuario(actor)) {
    throw new Error("Solo el superusuario puede aprobar administradores");
  }
  await actualizarJson<Usuario[]>(ARCHIVO, () => [], usuarios => {
    const i = usuarios.findIndex(u => u.id === id && u.pendiente);
    if (i < 0) throw new Error("Solicitud no encontrada");
    if (!decision.aprobar) {
      usuarios.splice(i, 1);
      return;
    }
    Object.assign(usuarios[i], { pendiente: false, activo: true, rol: decision.rol });
  });
}

/**
 * Cambios sobre un usuario hechos por `actor`:
 *  - El superusuario no puede ser desactivado ni degradado.
 *  - Solo el superusuario cambia roles o modifica a otros administradores.
 */
export async function actualizarUsuario(id: string, cambios: { activo?: boolean; rol?: RolUsuario }, actor: string) {
  const actorEsSuper = esSuperusuario(actor);
  await actualizarJson<Usuario[]>(ARCHIVO, () => [], usuarios => {
    const u = usuarios.find(x => x.id === id);
    if (!u) throw new Error("Usuario no encontrado");
    const objetivoEsSuper = esSuperusuario(u.usuario);
    if (objetivoEsSuper && (cambios.activo === false || (cambios.rol && cambios.rol !== "admin"))) {
      throw new Error("El superusuario no se puede desactivar ni cambiar de rol");
    }
    if (u.rol === "admin" && !objetivoEsSuper && !actorEsSuper) throw new Error("Solo el superusuario puede modificar a otros administradores");
    if (cambios.rol && !actorEsSuper) throw new Error("Solo el superusuario puede cambiar roles");
    if (cambios.activo !== undefined) u.activo = cambios.activo;
    if (cambios.rol) u.rol = cambios.rol;
  });
}
