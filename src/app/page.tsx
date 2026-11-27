import { BarraSesion } from "@/components/auth/barra";
import { requerirSesion } from "@/lib/auth/sesion";
import Dashboard from "./dashboard-client";

export const dynamic = "force-dynamic";

/** El dashboard de indicadores solo es visible para funcionarios de la EPSI y administradores. */
export default async function Page() {
  const sesion = await requerirSesion(["admin", "epsi"]);
  return (
    <>
      <BarraSesion sesion={sesion} actual="dashboard" />
      <Dashboard />
    </>
  );
}
