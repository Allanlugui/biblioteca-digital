// Normalização única dos metadados que as fontes informam em formatos próprios.
// Nenhuma função aqui inventa dados: entradas ausentes ou malformadas viram null/[].

export function normalizarTitulo(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

const ARXIV_NOVO = /^(\d{4}\.\d{4,5})(v\d+)?$/i;
const ARXIV_ANTIGO = /^([a-z-]+\/\d{7})(v\d+)?$/i;

// Normaliza id do arXiv para a forma canônica sem versão (v1/v2 = mesma obra).
export function normalizarArxivId(valor: string | null | undefined): string | null {
  if (!valor) return null;
  let id = valor.trim();
  const marcador = "/abs/";
  const posicao = id.toLowerCase().lastIndexOf(marcador);
  if (posicao !== -1) id = id.slice(posicao + marcador.length);
  id = id.replace(/\.pdf(\?.*)?$/i, "").trim().toLowerCase();
  const novo = ARXIV_NOVO.exec(id);
  if (novo) return novo[1] ?? null;
  const antigo = ARXIV_ANTIGO.exec(id);
  if (antigo) return antigo[1] ?? null;
  return null;
}
