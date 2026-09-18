import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Biblioteca Digital",
    short_name: "Biblioteca",
    description: "Busca de publicações científicas abertas, com download e leitor integrado.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f0e3",
    theme_color: "#0b241c",
    lang: "pt-BR",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
