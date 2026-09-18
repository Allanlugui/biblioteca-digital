import type { Documento } from "@/types";

export const formatosCitacao = ["abnt", "apa", "mla", "chicago", "bibtex", "ris"] as const;
export type FormatoCitacao = (typeof formatosCitacao)[number];

export const rotulosFormatos: Record<FormatoCitacao, string> = {
  abnt: "ABNT",
  apa: "APA",
  mla: "MLA",
  chicago: "Chicago",
  bibtex: "BibTeX",
  ris: "RIS",
};

type Nome = { sobrenome: string; prenomes: string };

function dividirNome(nome: string): Nome {
  const partes = nome.replace(/\s+/g, " ").trim().split(" ");
  const sobrenome = partes.pop() ?? "";
  return { sobrenome, prenomes: partes.join(" ") };
}

function iniciais(prenomes: string): string {
  return prenomes
    .split(" ")
    .filter(Boolean)
    .map((p) => `${p[0]?.toUpperCase()}.`)
    .join(" ");
}

function anoDe(doc: Documento): string {
  const ano = doc.dataPublicacao ? /^\d{4}/.exec(doc.dataPublicacao)?.[0] : undefined;
  return ano ?? "s.d.";
}

function acessoHoje(): string {
  const agora = new Date();
  const dia = String(agora.getDate()).padStart(2, "0");
  const mesNome = ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."][agora.getMonth()];
  return `${dia} ${mesNome} ${agora.getFullYear()}`;
}

function elo(doc: Documento): string {
  if (doc.doi) return `https://doi.org/${doc.doi}`;
  return doc.urlPagina ?? doc.urlPdf ?? "";
}

export function gerarCitacao(doc: Documento, formato: FormatoCitacao): string {
  const autores = doc.autores.map(dividirNome).filter((a) => a.sobrenome);
  const ano = anoDe(doc);
  const titulo = doc.titulo.trim();
  const link = elo(doc);

  switch (formato) {
    case "abnt": {
      const autoria = autores.length
        ? autores.map((a) => `${a.sobrenome.toUpperCase()}${a.prenomes ? `, ${a.prenomes}` : ""}`).join("; ")
        : titulo.toUpperCase();
      const corpo = autores.length ? `${autoria}. ${titulo}.` : `${autoria}.`;
      return link ? `${corpo} ${ano}. Disponível em: ${link}. Acesso em: ${acessoHoje()}.` : `${corpo} ${ano}.`;
    }
    case "apa": {
      const autoria = autores.length
        ? autores.map((a) => `${a.sobrenome}, ${iniciais(a.prenomes)}`.trim()).join(", ")
        : titulo;
      return link ? `${autoria} (${ano}). ${titulo}. ${link}` : `${autoria} (${ano}). ${titulo}.`;
    }
    case "mla": {
      const autoria = autores.length
        ? autores.map((a) => `${a.sobrenome}, ${a.prenomes}`.trim().replace(/, $/, "")).join(", ")
        : titulo;
      return link ? `${autoria}. “${titulo}.” ${ano}, ${link}.` : `${autoria}. “${titulo}.” ${ano}.`;
    }
    case "chicago": {
      const autoria = autores.length
        ? autores.map((a) => `${a.sobrenome}, ${a.prenomes}`.trim().replace(/, $/, "")).join(", ")
        : titulo;
      return link ? `${autoria}. ${ano}. “${titulo}.” ${link}.` : `${autoria}. ${ano}. “${titulo}.”`;
    }
    case "bibtex": {
      const chave = `${(autores[0]?.sobrenome ?? "doc").toLowerCase().replace(/[^a-z]/g, "")}${ano === "s.d." ? "sd" : ano}`;
      const author = autores.map((a) => `${a.sobrenome}, ${a.prenomes}`.trim().replace(/, $/, "")).join(" and ");
      const linhas = [`@misc{${chave},`, `  title = {${titulo}},`];
      if (author) linhas.push(`  author = {${author}},`);
      if (ano !== "s.d.") linhas.push(`  year = {${ano}},`);
      if (doc.doi) linhas.push(`  doi = {${doc.doi}},`);
      if (link) linhas.push(`  url = {${link}},`);
      linhas.push(`  note = {Acesso em ${acessoHoje()}}`, `}`);
      return linhas.join("\n");
    }
    case "ris": {
      const linhas = [`TY  - ${doc.tipo === "article" ? "JOUR" : "GEN"}`];
      for (const a of autores) linhas.push(`AU  - ${a.sobrenome}, ${a.prenomes}`.trim());
      linhas.push(`TI  - ${titulo}`);
      if (ano !== "s.d.") linhas.push(`PY  - ${ano}`);
      if (doc.doi) linhas.push(`DO  - ${doc.doi}`);
      if (link) linhas.push(`UR  - ${link}`);
      linhas.push("ER  - ");
      return linhas.join("\n");
    }
  }
}
