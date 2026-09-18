import type { NextRequest } from "next/server";
import { API_ERROR_CODES, fail, formatZodErrors, ok } from "@/lib/api";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { usuarioDaSessao } from "@/lib/supabase/sessao";
import { progressoGetSchema, progressoPutSchema } from "@/schemas";
import { garantirDocumento } from "@/services/acervo";

export const dynamic = "force-dynamic";

// GET /api/progresso?documento={id} → { pagina, total } ou 404 (nunca leu).
export async function GET(request: NextRequest) {
  const user = await usuarioDaSessao();
  if (!user) {
    return fail(API_ERROR_CODES.UNAUTHENTICATED, "Entre para ver seu progresso.", 401);
  }
  const parsed = progressoGetSchema.safeParse({ documento: new URL(request.url).searchParams.get("documento") });
  if (!parsed.success) {
    return fail(API_ERROR_CODES.VALIDATION_ERROR, "Identificador inválido.", 400, formatZodErrors(parsed.error));
  }
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("progresso_leitura")
    .select("pagina, total_paginas")
    .eq("user_id", user.id)
    .eq("documento_id", parsed.data.documento)
    .maybeSingle();
  if (!data) {
    return fail(API_ERROR_CODES.NOT_FOUND, "Leitura ainda não iniciada.", 404);
  }
  return ok({ pagina: data.pagina, total: data.total_paginas });
}

// PUT /api/progresso { documento, pagina, total } → registra a página exata.
export async function PUT(request: NextRequest) {
  const user = await usuarioDaSessao();
  if (!user) {
    return fail(API_ERROR_CODES.UNAUTHENTICATED, "Entre para guardar seu progresso.", 401);
  }
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return fail(API_ERROR_CODES.VALIDATION_ERROR, "Corpo inválido.", 400);
  }
  const parsed = progressoPutSchema.safeParse(corpo);
  if (!parsed.success) {
    return fail(API_ERROR_CODES.VALIDATION_ERROR, "Dados de progresso inválidos.", 400, formatZodErrors(parsed.error));
  }
  if (!(await garantirDocumento(parsed.data.documento))) {
    return fail(API_ERROR_CODES.NOT_FOUND, "Documento não encontrado.", 404);
  }
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("progresso_leitura").upsert(
    {
      user_id: user.id,
      documento_id: parsed.data.documento,
      pagina: parsed.data.pagina,
      total_paginas: parsed.data.total ?? null,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "user_id,documento_id" },
  );
  if (error) {
    return fail(API_ERROR_CODES.INTERNAL_ERROR, "Não foi possível guardar o progresso.", 500);
  }
  return ok({ pagina: parsed.data.pagina });
}
