import type { Documento } from "@/types";
import { normalizarTitulo } from "./search/agregador";
import { buscarDocumentoPorId } from "./documentos";
import { executarBusca } from "./search/agregador";

const MAX_RELACIONADOS = 6;

// Deriva uma consulta de similaridade: assuntos + palavras significativas do título.
export function consultaRelacionada(doc: Documento): string {
  const termos = new Set<string>();
  for (const assunto of doc.assuntos.slice(0, 3)) {
    for (const palavra of normalizarTitulo(assunto).split(" ")) {
      if (palavra.length > 3) termos.add(palavra);
    }
  }
  for (const palavra of normalizarTitulo(doc.titulo).split(" ")) {
    if (palavra.length > 4 && termos.size < 8) termos.add(palavra);
  }
  return [...termos].join(" ");
}

// Trabalhos relacionados = nova busca agregada por similaridade, sem o próprio documento.
// Reutiliza providers, dedup, ranking e isolamento de falhas (sem endpoints extras frágeis).
export async function buscarRelacionados(id: string, limite = MAX_RELACIONADOS): Promise<Documento[] | null> {
  const doc = await buscarDocumentoPorId(id).catch(() => null);
  if (!doc) return null;
  const consulta = consultaRelacionada(doc);
  if (consulta.length < 4) return [];
  const resultado = await executarBusca(consulta, 20, 1, {
    fontes: undefined,
    ordem: "relevancia",
  });
  return resultado.documentos.filter((d) => d.id !== id).slice(0, limite);
}
