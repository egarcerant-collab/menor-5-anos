import "server-only";
import { MUNICIPIOS } from "@/components/pi/sampleData";
import { validarNit } from "./nit";
import { actualizarJson, getStore } from "./store";
import { estaBloqueado, hashPassword, limpiarIntentos, registrarFallo, verificarPassword } from "./usuarios";

/**
 * Cuenta de acceso de cada prestador (una por IPS del catálogo del dashboard).
 *  - Las cuentas nacen INACTIVAS y sin NIT: el administrador registra el NIT de la IPS
 *    (con dígito de verificación DIAN) y la habilita. Así nadie puede "reclamar" una IPS
 *    antes de tiempo solo conociendo su nombre.
 *  - Primer ingreso: el prestador escribe el NIT como contraseña inicial y queda OBLIGADO
 *    a crear una contraseña personal antes de ver cualquier dato.
 */
export interface Prestador {
  ips: string;
  nit: string; // sin dígito de verificación
  dv: string;
  hash?: string; // contraseña personal
  activo: boolean;
  nitConfirmado: boolean; // true cuando el administrador registró el NIT
  actualizadoEn: string;
  contacto?: ContactoPrestador;
}

export interface ContactoPrestador {
  responsable: string;
  cargo: string;
  correos: string[];
  whatsapp: string; // celular colombiano de 10 dígitos
  telefono?: string;
  autorizaDatos: boolean; // autorización de tratamiento de datos de contacto (Ley 1581/2012)
  registradoPor: string;
  registradoEn: string;
}

export type PrestadorPublico = Omit<Prestador, "hash"> & { tieneClave: boolean };

const ARCHIVO = "prestadores.json";
const soloDigitos = (v: string) => v.replace(/\D/g, "");
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** IPS que atienden en el territorio, tomadas del catálogo de municipios del dashboard. */
export const IPS_CATALOGO: string[] = [...new Set(MUNICIPIOS.flatMap(m => m.ips_atiende))].sort((a, b) => a.localeCompare(b, "es"));

/** Identificador seguro para nombres de archivo y URLs. */
export const slugIps = (ips: string) =>
  ips
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const aPublico = ({ hash, ...p }: Prestador): PrestadorPublico => ({ ...p, tieneClave: !!hash });

/** Valida y normaliza el pre-registro del prestador. */
export function validarContacto(d: {
  responsable?: string;
  cargo?: string;
  correos?: string;
  whatsapp?: string;
  telefono?: string;
  autoriza?: boolean;
}): Omit<ContactoPrestador, "registradoPor" | "registradoEn"> {
  const responsable = String(d.responsable ?? "").trim().replace(/\s+/g, " ");
  if (responsable.length < 5) throw new Error("Escribe el nombre completo del responsable");
  const correos = [...new Set(String(d.correos ?? "").split(/[,;\s]+/).map(c => c.trim().toLowerCase()).filter(Boolean))];
  if (!correos.length) throw new Error("Registra al menos un correo de la IPS");
  if (correos.length > 5) throw new Error("Máximo 5 correos");
  const malo = correos.find(c => !CORREO.test(c));
  if (malo) throw new Error(`Correo inválido: ${malo}`);
  const whatsapp = String(d.whatsapp ?? "").replace(/\D/g, "").replace(/^57(?=3\d{9}$)/, "");
  if (!/^3\d{9}$/.test(whatsapp)) throw new Error("El WhatsApp debe ser un celular de 10 dígitos que empiece por 3");
  if (!d.autoriza) throw new Error("Debes autorizar el tratamiento de los datos de contacto");
  return {
    responsable: responsable.slice(0, 100),
    cargo: String(d.cargo ?? "").trim().slice(0, 100),
    correos,
    whatsapp,
    telefono: String(d.telefono ?? "").replace(/[^\d+ -]/g, "").slice(0, 20) || undefined,
    autorizaDatos: true,
  };
}

/** Catálogo de prestadores: una entrada por IPS del catálogo, creada inactiva si falta. */
export async function listarPrestadores(): Promise<Prestador[]> {
  const guardados = (await getStore().leer<Prestador[]>(ARCHIVO)) ?? [];
  const porIps = new Map(guardados.map(p => [p.ips, p]));
  const faltan = IPS_CATALOGO.filter(ips => !porIps.has(ips));
  if (faltan.length) {
    const lista = await actualizarJson<Prestador[]>(ARCHIVO, () => [], datos => {
      for (const ips of faltan) {
        if (!datos.some(p => p.ips === ips)) {
          datos.push({ ips, nit: "", dv: "", activo: false, nitConfirmado: false, actualizadoEn: new Date().toISOString() });
        }
      }
    });
    return lista.sort((a, b) => a.ips.localeCompare(b.ips, "es"));
  }
  return [...porIps.values()].sort((a, b) => a.ips.localeCompare(b.ips, "es"));
}

export type ResultadoPrestador =
  | { ok: true; prestador: Prestador; debeCambiarClave: boolean }
  | { ok: false; motivo: "credenciales" | "bloqueado" | "inactivo" };

export async function autenticarPrestador(ips: string, password: string): Promise<ResultadoPrestador> {
  const clave = `ips:${ips}`;
  if (estaBloqueado(clave)) return { ok: false, motivo: "bloqueado" };
  const p = (await listarPrestadores()).find(x => x.ips === ips);
  if (!p) return { ok: false, motivo: "credenciales" };
  if (!p.activo || !p.nitConfirmado) return { ok: false, motivo: "inactivo" };

  if (p.hash) {
    if (!verificarPassword(password, p.hash)) return registrarFallo(clave), { ok: false, motivo: "credenciales" };
    limpiarIntentos(clave);
    return { ok: true, prestador: p, debeCambiarClave: false };
  }
  // Primer ingreso: la contraseña inicial es el NIT (con o sin dígito de verificación)
  const d = soloDigitos(password);
  if (!d || ![p.nit, p.nit + p.dv].includes(d)) return registrarFallo(clave), { ok: false, motivo: "credenciales" };
  limpiarIntentos(clave);
  return { ok: true, prestador: p, debeCambiarClave: true };
}

async function guardar(ips: string, cambio: (p: Prestador) => void) {
  await listarPrestadores(); // asegura que el catálogo exista
  await actualizarJson<Prestador[]>(ARCHIVO, () => [], lista => {
    const p = lista.find(x => x.ips === ips);
    if (!p) throw new Error("Prestador no encontrado");
    cambio(p);
    p.actualizadoEn = new Date().toISOString();
  });
}

export async function establecerClavePrestador(ips: string, nueva: string) {
  if (nueva.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");
  const p = (await listarPrestadores()).find(x => x.ips === ips);
  if (!p) throw new Error("Prestador no encontrado");
  if (/^(\d)\1+$/.test(nueva.trim()) || /^(0?123456789?|12345678)$/.test(nueva.trim())) {
    throw new Error("Elige una contraseña que no sea una secuencia");
  }
  if (soloDigitos(nueva).length >= 6 && [p.nit, p.nit + p.dv].includes(soloDigitos(nueva))) {
    throw new Error("La nueva contraseña no puede ser el NIT");
  }
  await guardar(ips, x => (x.hash = hashPassword(nueva)));
}

export async function guardarContactoPrestador(ips: string, datos: Parameters<typeof validarContacto>[0], por: string) {
  const c = validarContacto(datos);
  await guardar(ips, p => {
    p.contacto = { ...c, registradoPor: por, registradoEn: new Date().toISOString() };
  });
}

/** Administrador: registra el NIT, habilita/deshabilita o restablece el acceso (vuelve a pedir el NIT). */
export async function actualizarPrestador(ips: string, cambios: { nit?: string; activo?: boolean; restablecer?: boolean }) {
  await guardar(ips, p => {
    if (cambios.nit !== undefined) {
      const v = validarNit(cambios.nit);
      Object.assign(p, { nit: v.nit, dv: v.dv, nitConfirmado: true });
    }
    if (cambios.activo === true && !(p.nitConfirmado || cambios.nit !== undefined)) {
      throw new Error("Registra primero el NIT de la IPS");
    }
    if (cambios.activo !== undefined) p.activo = cambios.activo;
    if (cambios.restablecer) delete p.hash;
  });
}

/** El prestador debe completar el pre-registro (contacto) antes de usar el módulo. */
export async function faltaPreregistro(ips: string | undefined): Promise<boolean> {
  if (!ips) return false;
  const p = (await listarPrestadores()).find(x => x.ips === ips);
  return !p?.contacto;
}
