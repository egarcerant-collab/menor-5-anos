import Link from "next/link";
import { redirect } from "next/navigation";
import { Aviso, Boton, Campo, ERRORES_INGRESO, Pantalla } from "@/components/auth/ui";
import { getSesion, rutaInicio } from "@/lib/auth/sesion";
import { IPS_CATALOGO } from "@/lib/auth/prestadores";
import { iniciarSesion, iniciarSesionPrestador } from "../auth-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ingreso · Primera Infancia" };

export default async function IngresoPage({ searchParams }: { searchParams: Promise<{ modo?: string; error?: string; ok?: string; detalle?: string }> }) {
  const sesion = await getSesion();
  if (sesion && !sesion.debeCambiarClave) redirect(rutaInicio(sesion.rol));

  const { modo: m, error, ok, detalle } = await searchParams;
  const modo = m === "prestador" ? "prestador" : "epsi";
  const textoError = error ? ERRORES_INGRESO[error] ?? "No fue posible ingresar." : null;

  return (
    <Pantalla titulo="Ingreso" subtitulo="Indicadores de Primera Infancia · menores de 5 años">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
        <Link href="/ingreso?modo=epsi" className={`text-center rounded-lg py-2 ${modo === "epsi" ? "bg-white text-violet-700 shadow" : "text-slate-500"}`}>
          Funcionario EPSI
        </Link>
        <Link href="/ingreso?modo=prestador" className={`text-center rounded-lg py-2 ${modo === "prestador" ? "bg-white text-violet-700 shadow" : "text-slate-500"}`}>
          Prestador (IPS)
        </Link>
      </div>

      {ok === "solicitud" && <Aviso tipo="ok">Solicitud enviada. Un administrador debe aprobarla antes de que puedas ingresar.</Aviso>}
      {textoError && (
        <Aviso tipo="error">
          {textoError}
          {error === "sistema" && detalle && <span className="block mt-1 text-xs opacity-80">Detalle técnico: {detalle.slice(0, 300)}</span>}
        </Aviso>
      )}

      {modo === "epsi" ? (
        <form action={iniciarSesion} className="space-y-4">
          <Campo etiqueta="Usuario o correo institucional" nombre="usuario" autoComplete="username" placeholder="nombre.apellido@dusakawiepsi.com" />
          <Campo etiqueta="Contraseña" nombre="password" tipo="password" autoComplete="current-password" />
          <Boton>Ingresar</Boton>
          <p className="text-center text-sm text-slate-500">
            ¿Eres funcionario y aún no tienes cuenta?{" "}
            <Link href="/registro" className="font-semibold text-violet-700 hover:underline">
              Solicita tu registro
            </Link>
          </p>
        </form>
      ) : (
        <form action={iniciarSesionPrestador} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Tu IPS / ESE</span>
            <select
              name="ips"
              required
              defaultValue=""
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            >
              <option value="" disabled>
                Selecciona tu institución…
              </option>
              {IPS_CATALOGO.map(ips => (
                <option key={ips} value={ips}>
                  {ips}
                </option>
              ))}
            </select>
          </label>
          <Campo
            etiqueta="Contraseña"
            nombre="password"
            tipo="password"
            autoComplete="current-password"
            ayuda="Primer ingreso: escribe el NIT de tu IPS. Luego se te pedirá crear una contraseña personal."
          />
          <Boton>Ingresar</Boton>
          <p className="text-xs text-slate-500">
            Si tu IPS no puede ingresar, el administrador de la EPSI debe habilitar su acceso y registrar su NIT.
          </p>
        </form>
      )}
    </Pantalla>
  );
}
