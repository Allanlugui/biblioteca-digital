// Bloco L — interpretação determinística de linguagem natural (pt-BR).
// Sem IA, sem rede, sem dependências: extrai período temporal da consulta
// e devolve o tema limpo. Regras transparentes e testáveis.

export type Interpretacao = {
  // Tema sem os trechos temporais.
  consulta: string;
  anoDe?: number;
  anoAte?: number;
  // Texto exibido ao usuário quando algo foi interpretado.
  descricao?: string;
};

function anoValido(ano: number): boolean {
  return Number.isInteger(ano) && ano >= 1900 && ano <= 2100;
}

export function interpretarBusca(q: string): Interpretacao {
  const atual = new Date().getFullYear();
  let consulta = ` ${q} `;
  let anoDe: number | undefined;
  let anoAte: number | undefined;
  const partes: string[] = [];

  const consumir = (padrao: RegExp, aoCasar: (m: RegExpMatchArray) => void) => {
    const m = consulta.match(padrao);
    if (!m) return;
    aoCasar(m);
    consulta = consulta.replace(padrao, " ");
  };

  consumir(/entre\s+(\d{4})\s+e\s+(\d{4})/i, (m) => {
    const de = Number(m[1]);
    const ate = Number(m[2]);
    if (anoValido(de) && anoValido(ate) && de <= ate) {
      anoDe = de;
      anoAte = ate;
      partes.push(`entre ${de} e ${ate}`);
    }
  });
  consumir(/depois\s+de\s+(\d{4})/i, (m) => {
    const ano = Number(m[1]);
    if (anoValido(ano)) {
      anoDe = ano + 1;
      partes.push(`depois de ${ano}`);
    }
  });
  consumir(/desde\s+(\d{4})/i, (m) => {
    const ano = Number(m[1]);
    if (anoValido(ano)) {
      anoDe = ano;
      partes.push(`desde ${ano}`);
    }
  });
  consumir(/antes\s+de\s+(\d{4})/i, (m) => {
    const ano = Number(m[1]);
    if (anoValido(ano)) {
      anoAte = ano - 1;
      partes.push(`antes de ${ano}`);
    }
  });
  consumir(/últimos?\s+(\d+)\s+anos?/i, (m) => {
    const n = Number(m[1]);
    if (Number.isInteger(n) && n >= 1 && n <= 50) {
      anoDe = atual - n + 1;
      anoAte = atual;
      partes.push(`nos últimos ${n} anos`);
    }
  });
  consumir(/no\s+último\s+ano|último\s+ano/i, (m) => {
    void m;
    anoDe = atual - 1;
    anoAte = atual;
    partes.push("no último ano");
  });

  consulta = consulta.replace(/\s+/g, " ").trim();
  if (partes.length === 0 || consulta.length < 2) {
    return { consulta: q.trim() };
  }
  return { consulta, anoDe, anoAte, descricao: `Período detectado: ${partes.join(", ")}.` };
}
