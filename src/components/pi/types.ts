export type GrupoEdad = "0-6m" | "7-12m" | "13-24m" | "25-59m";
export type GrupoEdadFiltro = "todos" | GrupoEdad | "60m+";

export interface Indicador {
  nombre: string;
  numero: number;
  porcentaje: number;
  meta: number;
  categoria: "control" | "nutricion" | "tamizaje" | "lactancia" | "consejeria" | "tratamiento" | "t302";
}

export interface GrupoData {
  poblacion: number;
  controles_realizados: number;
  casos_riesgo_nuevos: number;
  casos_dnt_nuevos: number;
  casos_en_tratamiento: number;
  casos_recuperados: number;
  casos_perdida_seguimiento: number;
  indicadores: Indicador[];
}

export interface T302Data {
  ninos_wayuu: number;
  cobertura_dispersa: number;
  seguimiento_nominal: number;
  tiempo_diagnostico_dias: number;
  articulacion_extramural: number;
  continuidad_ola_invernal: number;
}

export interface MunicipioData {
  id: string;
  nombre: string;
  departamento: "La Guajira" | "Cesar" | "Magdalena";
  poblacion_total_0_59m: number;
  grupos: Record<GrupoEdad, GrupoData>;
  t302: T302Data;
  ips_atiende: string[];
}

export interface ExcelRow {
  [key: string]: string | number | null;
}

export interface ResumenMensual {
  periodo: string;
  total_afiliados_0_59m: number;
  controles_por_grupo: Record<GrupoEdad, number>;
  clasificacion_nutricional: {
    adecuado: number;
    riesgo: number;
    dnt_aguda_moderada: number;
    dnt_aguda_severa: number;
    sobrepeso: number;
  };
  casos_nuevos_riesgo: number;
  casos_nuevos_dnt: number;
  casos_en_tratamiento: number;
  casos_recuperados: number;
  casos_perdida: number;
  tiempo_oportunidad_dias: number;
}
