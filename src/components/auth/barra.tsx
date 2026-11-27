import Link from "next/link";
import type { Sesion } from "@/lib/auth/sesion";
import { cerrarSesion } from "@/app/auth-actions";

const ROL: Record<Sesion["rol"], string> = { admin: "Administrador", epsi: "Funcionario EPSI", prestador: "Prestador" };

/** Franja superior con la persona en sesión, accesos según su rol y botón de salida. */
export function BarraSesion({ sesion, actual }: { sesion: Sesion; actual?: "dashboard" | "admin" }) {
  const enlace = (href: string, texto: string, activo: boolean) => (
    <Link href={href} className={`px-3 py-1 rounded-lg text-xs font-semibold ${activo ? "bg-white text-violet-700" : "text-white/85 hover:bg-white/15"}`}>
      {texto}
    </Link>
  );
  return (
    <div className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {enlace("/", "Dashboard", actual === "dashboard")}
          {sesion.rol === "admin" && enlace("/admin", "Administración", actual === "admin")}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-white/70">
            {sesion.nombre} · <span className="font-semibold text-white">{ROL[sesion.rol]}</span>
          </span>
          <form action={cerrarSesion}>
            <button className="rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1 font-semibold">Salir</button>
          </form>
        </div>
      </div>
    </div>
  );
}
