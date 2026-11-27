import Link from "next/link";
import { Aviso } from "@/components/auth/ui";
import { BarraSesion } from "@/components/auth/barra";
import { requerirSesion } from "@/lib/auth/sesion";
import { esSuperusuario, listarUsuarios, sinHash } from "@/lib/auth/usuarios";
import { aPublico, listarPrestadores } from "@/lib/auth/prestadores";
import { accionActualizarPrestador, accionActualizarUsuario, accionResolverSolicitud } from "../auth-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administración · Primera Infancia" };

const OK: Record<string, string> = {
  aprobada: "Solicitud aprobada.",
  rechazada: "Solicitud rechazada.",
  usuario: "Usuario actualizado.",
  prestador: "Prestador actualizado.",
};

const btn = "rounded-lg px-2.5 py-1 text-xs font-semibold";
const btnPrimario = `${btn} bg-violet-600 text-white hover:bg-violet-700`;
const btnSuave = `${btn} bg-slate-100 text-slate-700 hover:bg-slate-200`;
const btnPeligro = `${btn} bg-red-50 text-red-700 hover:bg-red-100`;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ pestana?: string; ok?: string; error?: string }> }) {
  const sesion = await requerirSesion(["admin"]);
  const { pestana, ok, error } = await searchParams;
  const tab = pestana === "prestadores" ? "prestadores" : "usuarios";
  const soySuper = esSuperusuario(sesion.usuario);

  const [usuarios, prestadores] = await Promise.all([listarUsuarios().then(u => u.map(sinHash)), listarPrestadores().then(l => l.map(aPublico))]);
  const pendientes = usuarios.filter(u => u.pendiente);
  const activos = usuarios.filter(u => !u.pendiente);

  return (
    <main className="min-h-screen bg-slate-50">
      <BarraSesion sesion={sesion} actual="admin" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <h1 className="text-2xl font-bold text-slate-900">Administración</h1>

        <div className="inline-flex gap-1 rounded-xl bg-slate-200/70 p-1 text-sm font-semibold">
          <Link href="/admin?pestana=usuarios" className={`rounded-lg px-4 py-1.5 ${tab === "usuarios" ? "bg-white text-violet-700 shadow" : "text-slate-600"}`}>
            Usuarios EPSI {pendientes.length > 0 && <span className="ml-1 rounded-full bg-amber-500 px-1.5 text-xs text-white">{pendientes.length}</span>}
          </Link>
          <Link href="/admin?pestana=prestadores" className={`rounded-lg px-4 py-1.5 ${tab === "prestadores" ? "bg-white text-violet-700 shadow" : "text-slate-600"}`}>
            Prestadores (IPS)
          </Link>
        </div>

        {ok && OK[ok] && <Aviso tipo="ok">{OK[ok]}</Aviso>}
        {error && <Aviso tipo="error">{error}</Aviso>}

        {tab === "usuarios" ? (
          <>
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="font-bold text-slate-900">Solicitudes de registro pendientes</h2>
              {pendientes.length === 0 ? (
                <p className="text-sm text-slate-500 mt-2">No hay solicitudes pendientes.</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {pendientes.map(u => (
                    <li key={u.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm">
                        <p className="font-semibold text-slate-900">{u.nombre}</p>
                        <p className="text-slate-500">{u.correo}{u.cargo ? ` · ${u.cargo}` : ""}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <form action={accionResolverSolicitud}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="decision" value="aprobar" />
                          <input type="hidden" name="rol" value="epsi" />
                          <button className={btnPrimario}>Aprobar como funcionario</button>
                        </form>
                        {soySuper && (
                          <form action={accionResolverSolicitud}>
                            <input type="hidden" name="id" value={u.id} />
                            <input type="hidden" name="decision" value="aprobar" />
                            <input type="hidden" name="rol" value="admin" />
                            <button className={btnSuave}>Aprobar como administrador</button>
                          </form>
                        )}
                        <form action={accionResolverSolicitud}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="decision" value="rechazar" />
                          <button className={btnPeligro}>Rechazar</button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-x-auto">
              <h2 className="font-bold text-slate-900">Usuarios</h2>
              <table className="mt-3 w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="py-2">Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th className="text-right">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activos.map(u => (
                    <tr key={u.id}>
                      <td className="py-2 font-mono text-xs">{u.usuario}</td>
                      <td>{u.nombre}</td>
                      <td>{u.rol === "admin" ? "Administrador" : "Funcionario"}</td>
                      <td>{u.activo ? <span className="text-emerald-700">Activo</span> : <span className="text-slate-400">Inactivo</span>}</td>
                      <td className="text-right">
                        <div className="inline-flex gap-2">
                          <form action={accionActualizarUsuario}>
                            <input type="hidden" name="id" value={u.id} />
                            <input type="hidden" name="activo" value={u.activo ? "0" : "1"} />
                            <button className={u.activo ? btnPeligro : btnPrimario}>{u.activo ? "Desactivar" : "Activar"}</button>
                          </form>
                          {soySuper && (
                            <form action={accionActualizarUsuario}>
                              <input type="hidden" name="id" value={u.id} />
                              <input type="hidden" name="rol" value={u.rol === "admin" ? "epsi" : "admin"} />
                              <button className={btnSuave}>{u.rol === "admin" ? "Pasar a funcionario" : "Pasar a administrador"}</button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        ) : (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-x-auto">
            <h2 className="font-bold text-slate-900">Prestadores del territorio ({prestadores.length})</h2>
            <p className="text-sm text-slate-500 mt-1">
              Para que una IPS pueda ingresar, registra su NIT (con dígito de verificación) y habilítala. Su primer ingreso es con el NIT y debe crear contraseña personal.
            </p>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="py-2">IPS</th><th>NIT</th><th>Estado</th><th>Pre-registro</th><th className="text-right">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prestadores.map(p => (
                  <tr key={p.ips} className="align-top">
                    <td className="py-2 pr-3 font-medium text-slate-900">{p.ips}</td>
                    <td className="pr-3">
                      <form action={accionActualizarPrestador} className="flex items-center gap-1.5">
                        <input type="hidden" name="ips" value={p.ips} />
                        <input
                          name="nit"
                          defaultValue={p.nit ? `${p.nit}-${p.dv}` : ""}
                          placeholder="901660868-1"
                          className="w-32 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                        />
                        <button className={btnSuave}>Guardar NIT</button>
                      </form>
                    </td>
                    <td className="pr-3">
                      {p.activo ? <span className="text-emerald-700">Habilitada</span> : <span className="text-slate-400">Inactiva</span>}
                      <span className="block text-xs text-slate-500">{p.tieneClave ? "Con contraseña personal" : "Primer ingreso pendiente"}</span>
                    </td>
                    <td className="pr-3">{p.contacto ? <span className="text-emerald-700">Completo</span> : <span className="text-amber-600">Pendiente</span>}</td>
                    <td className="text-right">
                      <div className="inline-flex gap-2">
                        <form action={accionActualizarPrestador}>
                          <input type="hidden" name="ips" value={p.ips} />
                          <input type="hidden" name="activo" value={p.activo ? "0" : "1"} />
                          <button className={p.activo ? btnPeligro : btnPrimario}>{p.activo ? "Deshabilitar" : "Habilitar"}</button>
                        </form>
                        {p.tieneClave && (
                          <form action={accionActualizarPrestador}>
                            <input type="hidden" name="ips" value={p.ips} />
                            <input type="hidden" name="restablecer" value="1" />
                            <button className={btnSuave}>Restablecer acceso</button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  );
}
