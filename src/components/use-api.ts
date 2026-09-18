"use client";

import { useEffect, useState } from "react";
import { z } from "zod";

type Estado<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; mensagem: string };

export function useApi<T>(endpoint: string, schema: z.ZodType<T>) {
  const [estado, setEstado] = useState<Estado<T>>({ status: "loading" });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function carregar() {
      try {
        const resposta = await fetch(endpoint, { signal: controller.signal, cache: "no-store" });
        if (!resposta.ok) {
          const mensagem = resposta.status === 429
            ? "Muitas requisições. Aguarde um minuto e tente novamente."
            : resposta.status === 404
              ? "Documento não encontrado ou fonte temporariamente indisponível."
              : "Não foi possível consultar os dados. Tente novamente em instantes.";
          throw new Error(mensagem);
        }
        const envelope = z.object({ data: schema, error: z.null() }).parse(await resposta.json());
        if (!controller.signal.aborted) setEstado({ status: "success", data: envelope.data });
      } catch (erro) {
        if (!controller.signal.aborted) setEstado({ status: "error", mensagem: erro instanceof Error ? erro.message : "Falha de conexão." });
      }
    }
    void carregar();
    return () => controller.abort();
  }, [endpoint, schema, tentativa]);

  function tentarNovamente() {
    setEstado({ status: "loading" });
    setTentativa((valor) => valor + 1);
  }

  return { estado, tentarNovamente };
}
