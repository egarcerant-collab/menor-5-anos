import { NextResponse } from "next/server";

const OWNER = "egarcerant-collab";
const REPO = "menor-5-anos";
const WORKFLOW_FILE = "sync-drive.yml";

/**
 * Dispara manualmente el workflow de GitHub Actions que sincroniza los datos
 * de Drive (el mismo que corre solo cada 6 horas), para no depender de
 * entrar a GitHub cada vez que se necesita el dato más reciente ya mismo.
 * Requiere un Personal Access Token de GitHub con permiso de "Actions:
 * Read and write" sobre este repo, guardado como GITHUB_SYNC_TOKEN.
 */
export async function POST() {
  const token = process.env.GITHUB_SYNC_TOKEN;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "GITHUB_SYNC_TOKEN no configurado en el servidor." },
      { status: 500 },
    );
  }

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ ref: "main" }),
  });

  if (!resp.ok) {
    const detalle = await resp.text();
    return NextResponse.json(
      { ok: false, error: `GitHub respondió ${resp.status}: ${detalle}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
