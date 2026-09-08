/* COLABORAÇÕES E PRÉMIOS — o trabalho que não é projeto nosso.

   Colaborações são trabalho feito para outro atelier: a numeração é do
   cliente, não nossa, e procurá-la nas nossas pastas dá sempre nada.

   Prémios são concursos ganhos. O que o júri atribuiu e o que já entrou em
   fatura são duas coisas.

   Os totais contam só o que se sabe, e dizem quantos ficaram de fora. Um
   trabalho sem honorários não é um de zero euros. */
import {esc, euros, dinheiro, vazio} from "../formato.js";

/* Somar só o que é número. O resto conta-se, não se soma. */
function somar(linhas, campo){
  const sabidos = linhas.map(campo).filter(v => typeof v === "number" && isFinite(v));
  return {total: sabidos.length ? sabidos.reduce((a, b) => a + b, 0) : null,
          porSaber: linhas.length - sabidos.length};
}

/* A ressalva ao lado do total, para ninguém ler o total como se fosse
   tudo o que há. */
function totalDito(s){
  /* Sem nenhum valor conhecido não há total nem ressalva a fazer: dizer
     «por saber · 8 por saber» era dizer o mesmo duas vezes. */
  if(s.total === null) return "por saber";
  return esc(euros(s.total))
    + (s.porSaber ? ' <span class="porsaber">· ' + s.porSaber
                    + ' por saber</span>' : "");
}

export function render(modelo){
  modelo = modelo || {};
  const cols = modelo.colaboracoes || [];
  const prem = modelo.premios || [];
  const clientes = modelo.clientes || [];

  if(!cols.length && !prem.length)
    return '<h1>Colaborações</h1>' + vazio("Ainda não há colaborações nem prémios.",
      "Sincronize no Perfil para os trazer do Data Hub.");

  /* O identificador de um cliente é o NIF com prefixo. Mostrar isso é
     mostrar o encanamento: quem lê quer o nome. Sem correspondência fica o
     número, que ao menos diz por onde procurar. */
  const nomeDe = id => {
    if(!id) return "—";
    const c = clientes.filter(x => x.id === id)[0];
    return c && c.name ? c.name : String(id).replace(/^nif:/i, "NIF ");
  };

  const rc = {honorarios: somar(cols, c => (c.finance || {}).fees),
              faturado: somar(cols, c => (c.finance || {}).invoiced)};
  const rp = {atribuido: somar(prem, p => p.amount),
              faturado: somar(prem, p => p.invoiced)};

  let h = '<h1>Colaborações</h1>';

  if(cols.length){
    h += '<p class="sub">' + cols.length + ' colaboração(ões)</p>'
      + '<p class="sub">honorários ' + totalDito(rc.honorarios)
      + ' · faturado ' + totalDito(rc.faturado) + '</p>'
      + '<ul class="lista">' + cols.map(c => {
          const f = c.finance || {};
          return '<li class="linha">'
            + '<span class="titulo">' + esc(c.clientRef || c.name || "sem referência")
            + '</span>'
            + '<span class="meta">' + esc(nomeDe(c.clientId)) + '</span>'
            + '<span class="meta">honorários ' + dinheiro(f.fees)
            + ' · faturado ' + dinheiro(f.invoiced) + '</span>'
            + '</li>';
        }).join("") + '</ul>';
  }

  if(prem.length){
    h += '<h2>Prémios</h2>'
      + '<p class="sub">' + prem.length + ' prémio(s) · atribuído '
      + totalDito(rp.atribuido) + '</p>'
      + '<ul class="lista">' + prem.map(p =>
          '<li class="linha">'
          + '<span class="titulo">' + esc(p.name || "sem nome") + '</span>'
          + '<span class="meta">' + esc(p.entity || "sem entidade")
          + (typeof p.year === "number" ? " · " + p.year : "") + '</span>'
          + '<span class="meta">atribuído ' + dinheiro(p.amount)
          + ' · faturado ' + dinheiro(p.invoiced) + '</span>'
          + '</li>').join("") + '</ul>';
  }

  return h;
}
