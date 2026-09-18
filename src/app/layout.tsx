import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SwRegister } from "@/components/sw-register";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const BASE_URL = "https://biblioteca-digital-nine.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Biblioteca Digital",
    template: "%s | Biblioteca Digital",
  },
  description:
    "Busca de publicações científicas abertas, com download direto e leitor integrado.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Biblioteca Digital",
    title: "Biblioteca Digital",
    description: "A sala de leitura da ciência aberta: busca, download e leitura de PDFs.",
  },
  twitter: {
    card: "summary",
    title: "Biblioteca Digital",
    description: "A sala de leitura da ciência aberta: busca, download e leitura de PDFs.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b241c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SwRegister />
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-gilt-400 focus:px-4 focus:py-2 focus:font-semibold focus:text-library-950">
          Pular para o conteúdo
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
