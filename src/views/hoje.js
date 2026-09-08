/* HOJE — a fila de ação do dia, no bolso.

   Só entra o que exige uma decisão ou um gesto. Um projeto suspenso é um
   facto; não é uma ação, e não vem para aqui ocupar o polegar. */
import {esc, prazo, vazio, avisoVelho} from "../formato.js";

const RAZAO = {
  task:"tarefa", meeting:"reunião", quality:"dados por resolver",
  "next-action":"próxima ação", billing:"por faturar", collection:"por cobrar"
};

function nomeDoProjeto(item, projetos){
  const p = (projetos || []).filter(x => x.id === item.projectId)[0];
  return p ? (p.name || p.folderRef) : null;
}

export function render(modelo){
  modelo = modelo || {};
  const itens = modelo.itens || [];
  if(!itens.length)
    return (modelo.stale ? avisoVelho(modelo.lastSync) : "")
      + '<h1>Hoje</h1>'
      + vazio("Nada à espera de ninguém.",
              "Quando houver prazo, tarefa ou decisão por dar, aparece aqui.");

  const bloqueantes = itens.filter(i => i.type === "quality").length;

  return (modelo.stale ? avisoVelho(modelo.lastSync) : "")
    + '<h1>Hoje</h1>'
    + '<p class="sub">' + itens.length + " por tratar"
    + (bloqueantes ? " · " + bloqueantes + " bloqueia decisão" : "") + '</p>'
    + '<ul class="lista">' + grupos(itens).map(g =>
        g.itens.map((i, n) => linha(i, g, n, modelo)).join("")).join("") + '</ul>';
}

/* Oito linhas a dizer «Ação CO.RP por definir», uma por projeto, com o nome
   do projeto em letra pequena por baixo: quem lê percorre a mesma frase
   oito vezes para chegar a oito nomes. Os itens do mesmo trabalho ficam
   juntos, a frase passa a ser um cabeçalho com a conta, e cada linha fica
   com o nome do projeto, que é o que muda. Um item sozinho continua como
   estava — um cabeçalho para uma linha só seria arrumação a mais. */
function grupos(itens){
  const por = {}, ordem = [];
  itens.forEach(i => {
    const k = String(i.title || "") + "|" + i.type;
    if(!por[k]){ por[k] = {titulo:i.title, itens:[]}; ordem.push(por[k]); }
    por[k].itens.push(i);
  });
  return ordem;
}

function linha(i, g, n, modelo){
  const p = prazo(i.dueAt, modelo.now);
  const projeto = nomeDoProjeto(i, modelo.projetos);
  const muitos = g.itens.length > 1;
  const cabeca = (muitos && n === 0)
    ? '<li class="sub">' + esc(g.titulo) + ' · ' + g.itens.length + '</li>'
    : '';
  return cabeca
    + '<li><button type="button" class="linha" data-acao="' + esc(i.action) + '"'
    + ' data-item="' + esc(i.id) + '"'
    + (i.projectId ? ' data-projeto="' + esc(i.projectId) + '"' : '') + '>'
    + '<span class="titulo">' + esc(muitos ? (projeto || i.title) : i.title) + '</span>'
    + '<span class="meta">' + esc(muitos ? (RAZAO[i.type] || "")
        : ((projeto || RAZAO[i.type] || "")
           + (projeto && i.type !== "task" ? " · " + (RAZAO[i.type] || "") : "")))
    + '</span>'
    + (p ? '<span class="etiq ' + p.classe + '">' + esc(p.texto) + '</span>'
         : (i.type === "quality"
            ? '<span class="etiq etiq-bloqueio">bloqueia</span>' : ''))
    + '</button></li>';
}
