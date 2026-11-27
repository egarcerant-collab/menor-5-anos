import Link from "next/link";
import { Aviso, Boton, Campo, Pantalla } from "@/components/auth/ui";
import { registrarse } from "../auth-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Registro de funcionarios · Primera Infancia" };

export default async function RegistroPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <Pantalla titulo="Solicitar registro" subtitulo="Solo funcionarios con correo institucional @dusakawiepsi.com. Un administrador aprobará tu cuenta.">
      {error && <Aviso tipo="error">{error}</Aviso>}
      <form action={registrarse} className="space-y-4">
        <Campo etiqueta="Correo institucional" nombre="correo" tipo="email" autoComplete="email" placeholder="nombre.apellido@dusakawiepsi.com" />
        <Campo etiqueta="Nombre completo" nombre="nombre" autoComplete="name" />
        <Campo etiqueta="Cargo" nombre="cargo" requerido={false} />
        <Campo etiqueta="Contraseña" nombre="password" tipo="password" autoComplete="new-password" ayuda="Mínimo 8 caracteres." />
        <Campo etiqueta="Confirmar contraseña" nombre="confirmar" tipo="password" autoComplete="new-password" />
        <Boton>Enviar solicitud</Boton>
      </form>
      <p className="text-center text-sm text-slate-500">
        <Link href="/ingreso?modo=epsi" className="font-semibold text-violet-700 hover:underline">
          Volver al ingreso
        </Link>
      </p>
    </Pantalla>
  );
}
