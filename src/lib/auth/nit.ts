/** Utilidades del NIT colombiano (se usan en el formulario y en el servidor). */

/** Dígito de verificación del NIT (algoritmo DIAN, módulo 11). */
export function digitoVerificacion(nit: string): string {
  const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  const suma = [...nit].reverse().reduce((t, d, i) => t + Number(d) * pesos[i], 0) % 11;
  return String(suma >= 2 ? 11 - suma : suma);
}

/**
 * Separa NIT y DV de lo que escriba el usuario: "901660868", "901.660.868-1" o "901660868 1".
 * Si trae guion, lo que va después es el DV.
 */
export function separarNit(texto: string): { nit: string; dv: string } {
  const [base, dv = ""] = String(texto ?? "").split("-");
  return { nit: base.replace(/\D/g, ""), dv: dv.replace(/\D/g, "") };
}

/**
 * Valida el NIT. Acepta puntos y guion; el DV es opcional: si no se escribe se
 * calcula con el algoritmo DIAN; si se escribe, debe coincidir.
 */
export function validarNit(nit: string, dv = ""): { nit: string; dv: string } {
  const s = separarNit(nit);
  const escrito = dv.replace(/\D/g, "") || s.dv;
  if (!/^\d{6,10}$/.test(s.nit)) throw new Error("El NIT debe tener entre 6 y 10 dígitos");
  const d = digitoVerificacion(s.nit);
  if (escrito && escrito !== d) throw new Error(`El dígito de verificación no corresponde: para el NIT ${s.nit} el DV es ${d}`);
  return { nit: s.nit, dv: d };
}
