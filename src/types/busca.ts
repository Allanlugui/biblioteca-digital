import type { Documento } from "./documento";
import type { SearchProviderId } from "@/services/search/types";

export type OrdemBusca = "relevancia" | "recentes" | "citados";

export type FiltrosBusca = {
  fontes?: SearchProviderId[];
  anoDe?: number;
  anoAte?: number;
  tipo?: string;
  soPdf?: boolean;
  ordem?: OrdemBusca;
};

export type ResultadoBusca = {
  consulta: string;
  total: number;
  documentos: Documento[];
  pagina: number;
  porPagina: number;
  temMais: boolean;
  fontesConsultadas: SearchProviderId[];
  fontesIndisponiveis: SearchProviderId[];
};
