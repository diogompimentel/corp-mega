/* PROJETOS — a carteira, em cartões.

   As colunas do desktop não cabem aqui, e encolhê-las daria uma tabela
   ilegível. O que fica é o que se precisa de saber de pé: em que fase está,
   quem tem a bola e quanto falta faturar. */
import {esc, euros, fase, vazio, avisoVelho} from "../formato.js";

function financeiroCurto(f){
  if(!f) return "";
  const partes = [];
  if(typeof f.fees === "number") partes.push(euros(f.fees) + " honorários");
  if(typeof f.toInvoice === "number" && f.toInvoice > 0)
    partes.push(euros(f.toInvoice) + " por faturar");
  else if(typeof f.invoiced === "number") partes.push(euros(f.invoiced) + " faturado");
  return partes.join(" · ");
}

function achatar(s){
  return String(s == null ? "" : s).toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function render(modelo){
  modelo = modelo || {};
  const todos = modelo.projetos || [];
  const q = String(modelo.filtro || "").trim();
  /* Quarenta e seis linhas quase iguais — «fase por saber · Ação CO.RP» —
     não se percorrem com o polegar. Filtrar é o que torna a lista usável. */
  const alvo = achatar(q);
  const projetos = alvo
    ? todos.filter(p => [p.name, p.folderRef, p.code, p.location, p.operationalState]
        .some(v => achatar(v).indexOf(alvo) >= 0))
    : todos;

  if(!todos.length)
    return '<h1>Projetos</h1>'
      + vazio("Ainda não há carteira.",
              "Sincronize no Perfil para trazer os projetos do Data Hub.");

  const campo = '<input type="search" data-campo="filtro" value="' + esc(q)
    + '" placeholder="filtrar por nome, código ou local" autocomplete="off"'
    + ' enterkeyhint="search" aria-label="Filtrar projetos">';

  return (modelo.stale ? avisoVelho(modelo.lastSync) : "")
    + '<h1>Projetos</h1>'
    + '<p class="sub">' + (q ? projetos.length + " de " + todos.length
                             : todos.length + " projeto(s)") + '</p>'
    + campo
    + (q && !projetos.length
        ? vazio("Nada casa com «" + q + "».",
                "Talvez esteja escrito de outra maneira.")
        : "")
    + '<ul class="lista">' + projetos.map(p => {
        const conflito = (p.health || []).indexOf("fees-review") >= 0;
        return '<li><button type="button" class="linha" data-acao="abrir-projeto"'
          + ' data-projeto="' + esc(p.id) + '">'
          + '<span class="titulo">' + esc(p.name || p.folderRef || "sem nome") + '</span>'
          + '<span class="meta">' + esc(fase(p.phase, p.phaseLabel) || "fase por saber")
          + (p.operationalState ? " · " + esc(p.operationalState) : "") + '</span>'
          + (modelo.semFinanceiro ? ''
              : (conflito
                  ? '<span class="etiq etiq-bloqueio">honorários a rever</span>'
                  : '<span class="meta">' + esc(financeiroCurto(p.finance)) + '</span>'))
          + '</button></li>';
      }).join("") + '</ul>';
}
