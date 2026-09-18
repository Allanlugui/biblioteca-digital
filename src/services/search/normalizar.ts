// Normalização única dos metadados que as fontes informam em formatos próprios.
// Nenhuma função aqui inventa dados: entradas ausentes ou malformadas viram null/[].

const DOI_NUCLEO = /^10\.\d{4,9}\/\S+$/i;

export function normalizarDoi(valor: string | null | undefined): string | null {
  if (!valor) return null;
  let doi = valor.trim();
  doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "");
  doi = doi.trim().replace(/\s+/g, "");
  if (!DOI_NUCLEO.test(doi)) return null;
  return doi.toLowerCase();
}

export function normalizarIdioma(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const codigo = valor.trim().toLowerCase().slice(0, 8);
  return /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/.test(codigo) ? codigo : null;
}

export function limparLista(valores: (string | null | undefined)[], maximo = 10): string[] {
  const vistos = new Set<string>();
  const limpos: string[] = [];
  for (const valor of valores) {
    const texto = valor?.replace(/\s+/g, " ").trim();
    if (!texto || vistos.has(texto.toLowerCase())) continue;
    vistos.add(texto.toLowerCase());
    limpos.push(texto);
    if (limpos.length >= maximo) break;
  }
  return limpos;
}

export function normalizarContagem(valor: number | null | undefined): number | null {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 0 ? valor : null;
}
