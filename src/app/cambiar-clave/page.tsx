import { redirect } from "next/navigation";
import { Aviso, Boton, Campo, Pantalla } from "@/components/auth/ui";
import { getSesion } from "@/lib/auth/sesion";
import { cambiarClavePrestador, cerrarSesion } from "../auth-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Crear contraseña · Primera Infancia" };

export default async function CambiarClavePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const s = await getSesion();
  if (!s) redirect("/ingreso?modo=prestador");
  if (s.rol !== "prestador" || !s.debeCambiarClave) redirect("/prestador");
  const { error } = await searchParams;

  return (
    <Pantalla titulo="Crea tu contraseña personal" subtitulo={`${s.nombre} · Por seguridad, el NIT solo sirve para el primer ingreso.`}>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <form action={cambiarClavePrestador} className="space-y-4">
        <Campo etiqueta="Nueva contraseña" nombre="nueva" tipo="password" autoComplete="new-password" ayuda="Mínimo 8 caracteres. No uses el NIT ni secuencias." />
        <Campo etiqueta="Confirmar contraseña" nombre="confirmar" tipo="password" autoComplete="new-password" />
        <Boton>Guardar y continuar</Boton>
      </form>
      <form action={cerrarSesion}>
        <Boton variante="suave">Cancelar y salir</Boton>
      </form>
    </Pantalla>
  );
}
