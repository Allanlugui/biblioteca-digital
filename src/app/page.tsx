import Link from "next/link";
import { SearchBar } from "@/components/search-bar";

const EXEMPLOS = ["computação quântica", "inteligência artificial", "mudanças climáticas", "educação aberta"];

const FONTES = [
  {
    nome: "OpenAlex",
    descricao: "Catálogo aberto com centenas de milhões de obras e links de acesso aberto.",
  },
  {
    nome: "arXiv",
    descricao: "Repositório de preprints em física, matemática, computação e afins.",
  },
  {
    nome: "DOAJ",
    descricao: "Diretório de periódicos de acesso aberto de todo o mundo.",
  },
  {
    nome: "Semantic Scholar",
    descricao: "Base com centenas de milhões de artigos, incluindo editoras fora das demais fontes.",
  },
  {
    nome: "Busca na web",
    descricao: "Varredura de PDFs em toda a web, além dos catálogos acadêmicos.",
  },
];

const PASSOS = [
  {
    numero: "I",
    titulo: "Consulte",
    descricao: "Uma busca varre as cinco fontes em paralelo e reúne os resultados.",
  },
  {
    numero: "II",
    titulo: "Examine",
    descricao: "Abra a ficha de cada obra: autores, data, fonte e página original.",
  },
  {
    numero: "III",
    titulo: "Leia",
    descricao: "Baixe o PDF ou leia no navegador quando a fonte disponibilizar o arquivo.",
  },
];

export default function Home() {
  return (
    <main id="conteudo" className="flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Biblioteca Digital",
            inLanguage: "pt-BR",
            url: "https://biblioteca-digital-nine.vercel.app/",
          }),
        }}
      />
      {/* Hero — salão de leitura */}
      <section className="border-b border-rule bg-library-950 text-parchment">
        <div className="paper-texture mx-auto w-full max-w-6xl px-6 pb-16 pt-14 sm:pb-20 sm:pt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-gilt-400">
            A sala de leitura da ciência aberta
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[1.05] tracking-tight sm:text-7xl">
            Todo o conhecimento aberto, a uma busca de distância.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-parchment/80">
            Milhões de publicações do OpenAlex, arXiv, DOAJ e Semantic Scholar reunidas num só
            catálogo — mais os PDFs de toda a web, com download direto e leitura no navegador.
          </p>
          <div className="mt-10 max-w-3xl rounded-lg bg-vellum p-5 text-ink shadow-[0_18px_50px_rgba(0,0,0,0.35)] sm:p-6">
            <SearchBar grande />
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-ink-soft">Experimente:</span>
              {EXEMPLOS.map((exemplo) => (
                <Link
                  key={exemplo}
                  prefetch={false}
                  href={`/busca?q=${encodeURIComponent(exemplo)}`}
                  className="rounded-full border border-rule bg-parchment px-3 py-1 font-medium text-library-800 hover:border-library-700 hover:underline focus-visible:outline-2 focus-visible:outline-library-700"
                >
                  {exemplo}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* O acervo */}
      <section aria-label="O acervo" className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="flex items-baseline justify-between gap-6">
          <h2 className="font-display text-3xl tracking-tight">Cinco fontes, um só catálogo</h2>
          <span aria-hidden="true" className="hidden font-display text-3xl text-gilt-600 sm:block">❦</span>
        </div>
        <div className="rule-double mt-4" aria-hidden="true" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FONTES.map((fonte) => (
            <article key={fonte.nome} className="rounded-md border border-rule bg-vellum p-6 shadow-[0_1px_0_rgba(34,26,16,0.06),0_10px_24px_rgba(34,26,16,0.06)]">
              <h3 className="font-display text-xl">{fonte.nome}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{fonte.descricao}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section aria-label="Como funciona" className="border-y border-rule bg-vellum">
        <div className="mx-auto w-full max-w-6xl px-6 py-14">
          <h2 className="font-display text-3xl tracking-tight">Da pergunta ao PDF em três passos</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {PASSOS.map((passo) => (
              <li key={passo.numero} className="border-l-2 border-gilt-400 pl-5">
                <p aria-hidden="true" className="font-display text-4xl text-gilt-600">{passo.numero}</p>
                <h3 className="mt-2 font-display text-xl">{passo.titulo}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{passo.descricao}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <Link
              prefetch={false}
              href="/busca"
              className="inline-block rounded-md bg-library-800 px-8 py-4 font-semibold text-parchment shadow-[0_2px_0_rgba(11,36,28,0.9)] hover:bg-library-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-library-700"
            >
              Explorar o acervo
            </Link>
          </div>
        </div>
      </section>

      {/* Nota honesta */}
      <section aria-label="Sobre a disponibilidade" className="mx-auto w-full max-w-6xl px-6 py-12">
        <p className="max-w-3xl border-l-2 border-rule pl-5 text-sm leading-6 text-ink-soft">
          Nem todo registro inclui um arquivo: a disponibilidade de PDF depende de
          cada fonte. Os metadados e arquivos pertencem aos seus publicadores de
          origem — aqui você sempre saberá de onde veio cada documento.
        </p>
      </section>
    </main>
  );
}
