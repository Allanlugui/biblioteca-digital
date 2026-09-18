import type { MetadataRoute } from "next";

const BASE_URL = "https://biblioteca-digital-nine.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  // Só páginas estáveis: documentos e buscas são dinâmicos e não entram em massa.
  const paginas = ["/", "/busca", "/entrar", "/estante"];
  return paginas.map((rota) => ({ url: `${BASE_URL}${rota}`, lastModified: new Date() }));
}
