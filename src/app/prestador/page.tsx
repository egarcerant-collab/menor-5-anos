import { Aviso, Boton, Campo } from "@/components/auth/ui";
import { listarPrestadores } from "@/lib/auth/prestadores";
import { requerirSesion } from "@/lib/auth/sesion";
import { cerrarSesion, guardarContacto } from "../auth-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mi IPS · Primera Infancia" };

export default async function PrestadorPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const s = await requerirSesion(["prestador"]);
  const { error, ok } = await searchParams;
  const prestador = (await listarPrestadores()).find(p => p.ips === s.ips);
  const contacto = prestador?.contacto;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/70">Prestador · Primera Infancia</p>
            <h1 className="text-xl font-bold">{s.nombre}</h1>
          </div>
          <form action={cerrarSesion}>
            <button className="rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 text-sm font-medium">Salir</button>
          </form>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {ok === "contacto" && <Aviso tipo="ok">Datos de contacto guardados.</Aviso>}
        {error && <Aviso tipo="error">{error}</Aviso>}

        {!contacto ? (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Pre-registro de la IPS</h2>
            <p className="text-sm text-slate-500 mt-1">
              Antes de continuar, registra los datos de contacto de tu institución. Los usaremos para notificaciones y solicitudes de información.
            </p>
            <form action={guardarContacto} className="mt-5 grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Responsable (nombre completo)" nombre="responsable" />
              <Campo etiqueta="Cargo" nombre="cargo" requerido={false} />
              <div className="sm:col-span-2">
                <Campo etiqueta="Correos de la IPS" nombre="correos" ayuda="Hasta 5, separados por coma." />
              </div>
              <Campo etiqueta="WhatsApp (celular)" nombre="whatsapp" placeholder="3001234567" />
              <Campo etiqueta="Teléfono fijo (opcional)" nombre="telefono" requerido={false} />
              <label className="sm:col-span-2 flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" name="autoriza" className="mt-1" />
                <span>Autorizo el tratamiento de estos datos de contacto para fines de gestión del programa (Ley 1581 de 2012).</span>
              </label>
              <div className="sm:col-span-2">
                <Boton>Guardar pre-registro</Boton>
              </div>
            </form>
          </section>
        ) : (
          <>
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">Datos de contacto</h2>
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-500">Responsable</dt><dd className="font-medium text-slate-900">{contacto.responsable}</dd></div>
                <div><dt className="text-slate-500">Cargo</dt><dd className="font-medium text-slate-900">{contacto.cargo || "—"}</dd></div>
                <div><dt className="text-slate-500">Correos</dt><dd className="font-medium text-slate-900">{contacto.correos.join(", ")}</dd></div>
                <div><dt className="text-slate-500">WhatsApp</dt><dd className="font-medium text-slate-900">{contacto.whatsapp}</dd></div>
                <div><dt className="text-slate-500">NIT</dt><dd className="font-medium text-slate-900">{prestador?.nit}-{prestador?.dv}</dd></div>
              </dl>
            </section>

            <section className="bg-white rounded-2xl border border-dashed border-violet-300 p-5 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">Reporte mensual</h2>
              <p className="text-sm text-slate-500 mt-1">El formulario para cargar tu información mensual estará disponible aquí.</p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
