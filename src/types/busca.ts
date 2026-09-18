import type { Documento } from "./documento";

export type ResultadoBusca = {
  consulta: string;
  total: number;
  documentos: Documento[];
};