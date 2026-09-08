/* PESQUISA — um campo só, sobre o que está em cache.

   Procurar tem de funcionar sem rede: é a única coisa que se faz com pressa
   e a rede é o que falta quando se tem pressa. */
import {esc, vazio} from "../formato.js";

const TIPO = {projeto:"projeto", cliente:"cliente", consulta:"consulta", documento:"documento"};

export function render(modelo){
  modelo = modelo || {};
  const q = modelo.consulta || "";
  const r = modelo.resultados || [];

  return '<h1>Pesquisa</h1>'
    + '<label for="q">Projeto, cliente, código, local</label>'
    + '<input type="search" id="q" data-campo="pesquisa" value="' + esc(q)
    + '" placeholder="Rogil, CORP-P080, Setúbal…" autocomplete="off" enterkeyhint="search">'
    + (!q
        ? vazio("Procure o que precisa.", "Funciona sem rede, sobre o que já está no telemóvel.")
        : (r.length
            ? '<ul class="lista">' + r.map(x =>
                '<li><button type="button" class="linha" data-acao="abrir-' + esc(x.tipo) + '"'
                + ' data-item="' + esc(x.id) + '">'
                + '<span class="titulo">' + esc(x.rotulo || "") + '</span>'
                + '<span class="meta">' + esc(TIPO[x.tipo] || x.tipo)
                + (x.detalhe ? " · " + esc(x.detalhe) : "") + '</span>'
                + '</button></li>').join("") + '</ul>'
            : vazio("Nada encontrado para «" + q + "».",
                    "Talvez esteja escrito de outra maneira, ou ainda não tenha sincronizado.")));
}
