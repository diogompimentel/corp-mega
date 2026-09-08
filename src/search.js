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

/* Cada entrada diz para onde leva, e há entradas que não levam a lado
   nenhum: uma consulta não tem ecrã próprio no telemóvel. Essas aparecem na
   mesma — saber que existe é metade da resposta — mas sem botão. Um botão
   que não faz nada é a pior das respostas, e era o que havia. */
export function construir(dados){
  dados = dados || {};
  const entradas = [];

  (dados.projetos || []).forEach(p => entradas.push({
    id:p.id, tipo:"projeto", rotulo:p.name || p.folderRef,
    detalhe:[p.code, p.location].filter(Boolean).join(" · "),
    acao:"abrir-projeto", alvo:p.id,
    tokens:tokens(p.name, p.code, p.folderRef, p.location, p.canonicalName)
  }));

  (dados.clientes || []).forEach(c => entradas.push({
    id:c.id, tipo:"cliente", rotulo:c.name,
    detalhe:c.nif || "",
    acao:"abrir-cliente", alvo:c.id,
    tokens:tokens(c.name, c.nif, (c.aliases || []).join(" "))
  }));

  /* As tarefas passaram a viajar no contrato: procurá-las é procurar
     trabalho, e o sítio onde se trata é o projeto. Abrir a tarefa a partir
     da pesquisa dava-lhe o gesto de a concluir — que não é o que quem
     procura quer. */
  (dados.tarefas || []).forEach(t => {
    if(!t || (t.status && t.status !== "aberta") || t.completedAt) return;
    entradas.push({
      id:t.id, tipo:"tarefa", rotulo:t.title || t.titulo,
      detalhe:t.dueAt || "",
      acao:t.projectId ? "abrir-projeto" : null, alvo:t.projectId || null,
      tokens:tokens(t.title, t.titulo, t.folderRef)
    });
  });

  (dados.consultas || []).forEach(q => entradas.push({
    id:q.id, tipo:"consulta", rotulo:q.workName || q.reference,
    detalhe:q.reference || "",
    /* Uma consulta adjudicada já é um projeto, e é para lá que se vai. Sem
       projeto, não há para onde ir — e diz-se, em vez de se fingir. */
    acao:q.projectId ? "abrir-projeto" : null, alvo:q.projectId || null,
    tokens:tokens(q.workName, q.reference)
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
                               detalhe:e.detalhe, acao:e.acao || null,
                               alvo:e.alvo || null, pontos});
  });

  const ORDEM = {projeto:0, tarefa:1, cliente:2, consulta:3};
  resultados.sort((a, b) => (b.pontos - a.pontos)
    || ((ORDEM[a.tipo] || 9) - (ORDEM[b.tipo] || 9))
    || String(a.rotulo).localeCompare(String(b.rotulo), "pt"));
  return typeof limite === "number" ? resultados.slice(0, limite) : resultados;
}
