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
    + '<ul class="lista">' + itens.map(i => {
        const p = prazo(i.dueAt, modelo.now);
        const projeto = nomeDoProjeto(i, modelo.projetos);
        return '<li><button type="button" class="linha" data-acao="' + esc(i.action) + '"'
          + ' data-item="' + esc(i.id) + '"'
          + (i.projectId ? ' data-projeto="' + esc(i.projectId) + '"' : '') + '>'
          + '<span class="titulo">' + esc(i.title) + '</span>'
          + '<span class="meta">' + esc(projeto || RAZAO[i.type] || "")
          + (projeto && i.type !== "task" ? " · " + esc(RAZAO[i.type] || "") : "")
          + '</span>'
          + (p ? '<span class="etiq ' + p.classe + '">' + esc(p.texto) + '</span>'
               : (i.type === "quality"
                  ? '<span class="etiq etiq-bloqueio">bloqueia</span>' : ''))
          + '</button></li>';
      }).join("") + '</ul>';
}
