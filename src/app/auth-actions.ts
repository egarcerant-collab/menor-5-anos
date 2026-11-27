"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, DURACION_SEG, codificarSesion, getSesion, rutaInicio, type Sesion } from "@/lib/auth/sesion";
import { actualizarUsuario, autenticar, registrarSolicitud, resolverSolicitud, type RolUsuario } from "@/lib/auth/usuarios";
import { actualizarPrestador, autenticarPrestador, establecerClavePrestador, guardarContactoPrestador } from "@/lib/auth/prestadores";

async function guardarSesion(datos: Omit<Sesion, "exp">) {
  (await cookies()).set(COOKIE, codificarSesion(datos), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: DURACION_SEG,
    path: "/",
  });
}

const msg = (e: unknown) => encodeURIComponent((e as Error).message ?? "Error");

/**
 * Falla de infraestructura (Drive sin acceso, variables de entorno sin configurar):
 * se registra completa en los logs del servidor y se muestra al usuario un motivo
 * claro en la pantalla de ingreso en vez de la página de error genérica.
 */
function errorSistema(modo: "epsi" | "prestador", e: unknown): never {
  console.error("[auth] Error de sistema en el ingreso:", e);
  redirect(`/ingreso?modo=${modo}&error=sistema&detalle=${msg(e)}`);
}
const campo = (form: FormData, nombre: string) => String(form.get(nombre) ?? "");

// ── Ingreso ────────────────────────────────────────────────────────────

/** Funcionarios EPSI y administradores: usuario (o correo institucional) + contraseña. */
export async function iniciarSesion(form: FormData) {
  const usuario = campo(form, "usuario");
  const password = campo(form, "password");
  if (!usuario || !password) redirect("/ingreso?modo=epsi&error=credenciales");

  let destino: string;
  try {
    const r = await autenticar(usuario, password);
    if (!r.ok) destino = `/ingreso?modo=epsi&error=${r.motivo}`;
    else {
      const u = r.usuario;
      await guardarSesion({ id: u.id, usuario: u.usuario, rol: u.rol, nombre: u.nombre });
      destino = rutaInicio(u.rol);
    }
  } catch (e) {
    errorSistema("epsi", e);
  }
  redirect(destino);
}

/** Prestadores: eligen su IPS y entran con el NIT (primer ingreso) o su contraseña personal. */
export async function iniciarSesionPrestador(form: FormData) {
  const ips = campo(form, "ips");
  const password = campo(form, "password");
  if (!ips || !password) redirect("/ingreso?modo=prestador&error=credenciales");

  let destino: string;
  try {
    const r = await autenticarPrestador(ips, password);
    if (!r.ok) destino = `/ingreso?modo=prestador&error=${r.motivo}`;
    else {
      await guardarSesion({
        id: `ips:${r.prestador.ips}`,
        usuario: r.prestador.nit,
        rol: "prestador",
        nombre: r.prestador.ips,
        ips: r.prestador.ips,
        debeCambiarClave: r.debeCambiarClave || undefined,
      });
      destino = r.debeCambiarClave ? "/cambiar-clave" : "/prestador";
    }
  } catch (e) {
    errorSistema("prestador", e);
  }
  redirect(destino);
}

export async function cambiarClavePrestador(form: FormData) {
  const s = await getSesion();
  if (s?.rol !== "prestador" || !s.ips) redirect("/ingreso?modo=prestador");
  const nueva = campo(form, "nueva");
  if (nueva !== campo(form, "confirmar")) redirect(`/cambiar-clave?error=${encodeURIComponent("Las contraseñas no coinciden")}`);
  try {
    await establecerClavePrestador(s.ips!, nueva);
  } catch (e) {
    redirect(`/cambiar-clave?error=${msg(e)}`);
  }
  const { exp: _exp, debeCambiarClave: _d, ...resto } = s;
  await guardarSesion(resto);
  redirect("/prestador");
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE);
  redirect("/ingreso");
}

// ── Registro de funcionarios EPSI ──────────────────────────────────────

export async function registrarse(form: FormData) {
  if (campo(form, "password") !== campo(form, "confirmar")) redirect(`/registro?error=${encodeURIComponent("Las contraseñas no coinciden")}`);
  try {
    await registrarSolicitud({
      correo: campo(form, "correo"),
      nombre: campo(form, "nombre"),
      cargo: campo(form, "cargo"),
      password: campo(form, "password"),
    });
  } catch (e) {
    redirect(`/registro?error=${msg(e)}`);
  }
  redirect("/ingreso?modo=epsi&ok=solicitud");
}

// ── Pre-registro del prestador ─────────────────────────────────────────

export async function guardarContacto(form: FormData) {
  const s = await getSesion();
  if (s?.rol !== "prestador" || !s.ips || s.debeCambiarClave) redirect("/ingreso?modo=prestador");
  try {
    await guardarContactoPrestador(
      s.ips!,
      {
        responsable: campo(form, "responsable"),
        cargo: campo(form, "cargo"),
        correos: campo(form, "correos"),
        whatsapp: campo(form, "whatsapp"),
        telefono: campo(form, "telefono"),
        autoriza: form.get("autoriza") === "on",
      },
      s.usuario,
    );
  } catch (e) {
    redirect(`/prestador?error=${msg(e)}`);
  }
  redirect("/prestador?ok=contacto");
}

// ── Administración (solo administradores) ──────────────────────────────

async function exigirAdmin() {
  const s = await getSesion();
  if (!s || s.debeCambiarClave || s.rol !== "admin") redirect("/ingreso?modo=epsi");
  return s;
}

const volverAdmin = (parametros: string) => redirect(`/admin?${parametros}`);

export async function accionResolverSolicitud(form: FormData) {
  const s = await exigirAdmin();
  const aprobar = campo(form, "decision") === "aprobar";
  const rol = campo(form, "rol") === "admin" ? "admin" : "epsi";
  try {
    await resolverSolicitud(campo(form, "id"), aprobar ? { aprobar: true, rol: rol as RolUsuario } : { aprobar: false }, s.usuario);
  } catch (e) {
    volverAdmin(`error=${msg(e)}`);
  }
  volverAdmin(`ok=${aprobar ? "aprobada" : "rechazada"}`);
}

export async function accionActualizarUsuario(form: FormData) {
  const s = await exigirAdmin();
  const cambios: { activo?: boolean; rol?: RolUsuario } = {};
  if (form.has("activo")) cambios.activo = campo(form, "activo") === "1";
  if (form.has("rol")) cambios.rol = campo(form, "rol") === "admin" ? "admin" : "epsi";
  try {
    await actualizarUsuario(campo(form, "id"), cambios, s.usuario);
  } catch (e) {
    volverAdmin(`error=${msg(e)}`);
  }
  volverAdmin("ok=usuario");
}

export async function accionActualizarPrestador(form: FormData) {
  await exigirAdmin();
  const cambios: { nit?: string; activo?: boolean; restablecer?: boolean } = {};
  if (form.has("nit")) cambios.nit = campo(form, "nit");
  if (form.has("activo")) cambios.activo = campo(form, "activo") === "1";
  if (form.has("restablecer")) cambios.restablecer = true;
  try {
    await actualizarPrestador(campo(form, "ips"), cambios);
  } catch (e) {
    volverAdmin(`error=${msg(e)}&pestana=prestadores`);
  }
  volverAdmin("ok=prestador&pestana=prestadores");
}

