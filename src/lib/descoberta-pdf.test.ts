import { describe, expect, it } from "vitest";
import { extrairCandidatosPdf } from "@/lib/descoberta-pdf";

const BASE = "https://revista.exemplo.org/artigo/123";

describe("extrairCandidatosPdf", () => {
  it("prioriza citation_pdf_url (name e property)", () => {
    const html = `<html><head>
      <meta name="citation_pdf_url" content="https://cdn.exemplo.org/a.pdf">
      <meta property="citation_pdf_url" content="https://cdn.exemplo.org/b.pdf">
    </head></html>`;
    expect(extrairCandidatosPdf(html, BASE)).toEqual([
      "https://cdn.exemplo.org/a.pdf",
      "https://cdn.exemplo.org/b.pdf",
    ]);
  });

  it("resolve âncoras relativas e ignora http", () => {
    const html = `<a href="/arquivos/c.pdf">PDF</a><a href="http://x.org/d.pdf">x</a><a href="/sobre">sobre</a>`;
    expect(extrairCandidatosPdf(html, BASE)).toEqual(["https://revista.exemplo.org/arquivos/c.pdf"]);
  });

  it("aceita rotas /download/ (OJS) e texto PDF", () => {
    const html = `<a href="/artigo/download/1/2/3">Baixar o PDF</a><a href="/artigo/view/1/2">Ver</a>`;
    expect(extrairCandidatosPdf(html, "https://revista.exemplo.org/artigo/view/1/2")).toEqual([
      "https://revista.exemplo.org/artigo/download/1/2/3",
    ]);
  });

  it("remove duplicados e retorna vazio sem PDF", () => {
    const html = `<meta name="citation_pdf_url" content="https://cdn.exemplo.org/a.pdf"><a href="https://cdn.exemplo.org/a.pdf">x</a>`;
    expect(extrairCandidatosPdf(html, BASE)).toEqual(["https://cdn.exemplo.org/a.pdf"]);
    expect(extrairCandidatosPdf("<html><body>oi</body></html>", BASE)).toEqual([]);
  });
});
