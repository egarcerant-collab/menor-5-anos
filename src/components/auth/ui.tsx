import type { ReactNode } from "react";

/** Piezas visuales simples y reutilizables para las pantallas de acceso y administración. */

export function Pantalla({ titulo, subtitulo, children, ancho = "max-w-md" }: { titulo: string; subtitulo?: string; children: ReactNode; ancho?: string }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-600 flex items-center justify-center p-4">
      <div className={`w-full ${ancho} bg-white rounded-2xl shadow-2xl p-6 sm:p-8`}>
        <p className="text-xs font-semibold tracking-wide uppercase text-violet-600">Dusakawi EPSI · Primera Infancia</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{titulo}</h1>
        {subtitulo && <p className="text-sm text-slate-500 mt-1">{subtitulo}</p>}
        <div className="mt-5 space-y-4">{children}</div>
      </div>
    </main>
  );
}

export function Aviso({ tipo, children }: { tipo: "error" | "ok"; children: ReactNode }) {
  const estilo = tipo === "error" ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800";
  return <div className={`text-sm rounded-xl border px-3 py-2 ${estilo}`}>{children}</div>;
}

export function Campo({ etiqueta, nombre, tipo = "text", requerido = true, ayuda, placeholder, autoComplete }: {
  etiqueta: string;
  nombre: string;
  tipo?: string;
  requerido?: boolean;
  ayuda?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{etiqueta}</span>
      <input
        name={nombre}
        type={tipo}
        required={requerido}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
      />
      {ayuda && <span className="text-xs text-slate-500">{ayuda}</span>}
    </label>
  );
}

export function Boton({ children, variante = "primario" }: { children: ReactNode; variante?: "primario" | "suave" }) {
  const estilo = variante === "primario" ? "bg-violet-600 text-white hover:bg-violet-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200";
  return (
    <button type="submit" className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${estilo}`}>
      {children}
    </button>
  );
}

export const ERRORES_INGRESO: Record<string, string> = {
  credenciales: "Usuario o contraseña incorrectos.",
  bloqueado: "Demasiados intentos fallidos. Espera 5 minutos e inténtalo de nuevo.",
  inactivo: "Esta cuenta no está habilitada. Comunícate con el administrador de la EPSI.",
  pendiente: "Tu solicitud de registro está pendiente de aprobación por un administrador.",
};
