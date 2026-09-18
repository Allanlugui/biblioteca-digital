"use client";

import { useEffect, useRef, useState } from "react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export function PdfViewer({ urlPdf }: { urlPdf: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [estado, setEstado] = useState<"loading" | "ready" | "error">("loading");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    const canvasAtual = containerRef.current;
    if (!canvasAtual) return;
    let cancelado = false;
    const renderTasks: { cancel: () => void }[] = [];
    const tasks: { destroy: () => Promise<void> }[] = [];

    (async () => {
      try {
        const proxied = `/api/proxy?url=${encodeURIComponent(urlPdf)}`;
        const task = getDocument({ url: proxied, withCredentials: false });
        tasks.push(task);
        const doc = await task.promise;
        if (cancelado) return;
        for (let num = 1; num <= Math.min(doc.numPages, 20); num++) {
          if (cancelado) return;
          const page = await doc.getPage(num);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "mx-auto block max-w-full rounded-lg shadow";
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          const taskRender = page.render({ canvasContext: ctx, canvas, viewport });
          renderTasks.push(taskRender);
          await taskRender.promise;
          if (cancelado) return;
          canvasAtual.appendChild(canvas);
        }
        if (!cancelado) setEstado("ready");
      } catch (error) {
        if (!cancelado) {
          setEstado("error");
          setMensagem(error instanceof Error ? error.message : "Falha ao carregar o PDF.");
        }
      }
    })();

    return () => {
      cancelado = true;
      renderTasks.forEach((t) => t.cancel());
      tasks.forEach((t) => void t.destroy().catch(() => undefined));
      if (canvasAtual) canvasAtual.textContent = "";
    };
  }, [urlPdf]);

  if (estado === "error") {
    return (
      <p role="alert" className="mt-4 rounded-md border border-red-300 bg-[#fdf3ef] p-4 text-sm font-medium text-red-800">
        Não foi possível exibir o leitor: {mensagem}
      </p>
    );
  }

  return (
    <section aria-label="Leitor de PDF" className="mt-6">
      <p className="mb-3 text-sm italic text-ink-soft">
        Pré-visualização das primeiras páginas (máximo 20).{" "}
        {estado === "loading" && <span aria-live="polite">Carregando…</span>}
      </p>
      <div ref={containerRef} className="space-y-4 rounded-md border border-rule bg-parchment p-4 sm:p-6" />
    </section>
  );
}
