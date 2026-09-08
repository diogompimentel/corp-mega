/* PESQUISA — encontrar como se escreve à pressa.

   Um índice local sobre o que está em cache: sem rede, procurar continua a
   funcionar. Sem acentos e sem maiúsculas, porque «Setubal» tem de
   encontrar «Setúbal».

   Não se indexa o corpo dos emails nesta versão: encheria o índice e
   atrasaria a única coisa que se faz com pressa. */

function achatar(s){
  return String(s == null ? "" : s).toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function tokens(...partes){
  return achatar(partes.filter(Boolean).join(" ")).split(" ").filter(Boolean);
}

export function construir(dados){
  dados = dados || {};
  const entradas = [];

  (dados.projetos || []).forEach(p => entradas.push({
    id:p.id, tipo:"projeto", rotulo:p.name || p.folderRef,
    detalhe:[p.code, p.location].filter(Boolean).join(" · "),
    tokens:tokens(p.name, p.code, p.folderRef, p.location, p.canonicalName)
  }));

  (dados.clientes || []).forEach(c => entradas.push({
    id:c.id, tipo:"cliente", rotulo:c.name,
    detalhe:c.nif || "",
    tokens:tokens(c.name, c.nif, (c.aliases || []).join(" "))
  }));

  (dados.consultas || []).forEach(q => entradas.push({
    id:q.id, tipo:"consulta", rotulo:q.workName || q.reference,
    detalhe:q.reference || "",
    tokens:tokens(q.workName, q.reference)
  }));

  (dados.documentos || []).forEach(d => entradas.push({
    id:d.id, tipo:"documento", rotulo:d.titulo || d.nome,
    detalhe:d.referencia || "",
    tokens:tokens(d.titulo, d.nome, d.referencia)
  }));

  return entradas;
}

export function procurar(indice, consulta, limite){
  const q = tokens(consulta);
  if(!q.length) return [];

  const resultados = [];
  (indice || []).forEach(e => {
    /* Todos os termos têm de casar: escrever mais devia estreitar, não
       alargar. Um termo casa por prefixo, que é como se escreve a meio. */
    let pontos = 0;
    const todos = q.every(t => {
      const exato = e.tokens.indexOf(t) >= 0;
      const prefixo = !exato && e.tokens.some(x => x.indexOf(t) === 0);
      if(exato) pontos += 3;
      else if(prefixo) pontos += 1;
      return exato || prefixo;
    });
    if(todos) resultados.push({id:e.id, tipo:e.tipo, rotulo:e.rotulo,
                               detalhe:e.detalhe, pontos});
  });

  const ORDEM = {projeto:0, cliente:1, consulta:2, documento:3};
  resultados.sort((a, b) => (b.pontos - a.pontos)
    || ((ORDEM[a.tipo] || 9) - (ORDEM[b.tipo] || 9))
    || String(a.rotulo).localeCompare(String(b.rotulo), "pt"));
  return typeof limite === "number" ? resultados.slice(0, limite) : resultados;
}
