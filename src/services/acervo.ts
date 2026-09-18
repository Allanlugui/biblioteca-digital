import { criarClienteAdmin } from "@/lib/supabase/admin";
import { buscarDocumentoPorId } from "@/services/documentos";

// Garante a linha do documento no acervo (metadados mínimos, sem arquivo).
// Necessário antes de salvar na estante ou registrar progresso (FK).
export async function garantirDocumento(id: string): Promise<boolean> {
  const admin = criarClienteAdmin();
  if (!admin) return false;
  const existe = await admin.from("documentos").select("id").eq("id", id).maybeSingle();
  if (existe.data) return true;
  let documento;
  try {
    documento = await buscarDocumentoPorId(id);
  } catch {
    return false;
  }
  if (!documento) return false;
  const { error } = await admin.from("documentos").insert({
    id: documento.id,
    fonte: documento.fonte,
    titulo: documento.titulo,
    autores: documento.autores,
    descricao: documento.descricao,
    data_publicacao: documento.dataPublicacao,
    url_origem: documento.urlPdf ?? "",
    url_pagina: documento.urlPagina,
    doi: documento.doi,
    citacoes: documento.citacoes,
    assuntos: documento.assuntos,
    idioma: documento.idioma,
    tipo: documento.tipo,
  });
  return !error;
}
