/* TAREFAS — todas as tarefas abertas, do atelier inteiro.

   Ordenadas por prazo, porque é a única ordem que ajuda a decidir o que se
   faz a seguir. Uma tarefa concluída sai da lista. */
import {esc, prazo, vazio} from "../formato.js";

export function render(modelo){
  modelo = modelo || {};
  const tarefas = (modelo.tarefas || []).filter(t => t.status !== "concluida" && !t.completedAt);
  if(!tarefas.length)
    return '<h1>Tarefas</h1>' + vazio("Nenhuma tarefa aberta.",
      "As tarefas criadas aqui e no desktop aparecem nesta lista.");

  const nome = id => {
    const p = (modelo.projetos || []).filter(x => x.id === id)[0];
    return p ? (p.name || p.folderRef) : null;
  };

  return '<h1>Tarefas</h1>'
    + '<p class="sub">' + tarefas.length + ' aberta(s)</p>'
    + '<div class="acoes"><button type="button" class="acao acao-forte" '
    + 'data-acao="nova-tarefa">Nova tarefa</button></div>'
    + '<ul class="lista">' + tarefas.map(t => {
        const p = prazo(t.dueAt, modelo.now);
        return '<li><button type="button" class="linha" data-acao="concluir-tarefa"'
          + ' data-item="' + esc(t.id) + '">'
          + '<span class="titulo">' + esc(t.title || t.titulo || "tarefa") + '</span>'
          + '<span class="meta">' + esc(nome(t.projectId) || "sem projeto")
          + (t.pendente ? " · por sincronizar" : "") + '</span>'
          + (p ? '<span class="etiq ' + p.classe + '">' + esc(p.texto) + '</span>' : '')
          + '</button></li>';
      }).join("") + '</ul>';
}
