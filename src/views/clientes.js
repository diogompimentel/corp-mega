/* CLIENTES — o essencial para ligar ou escrever, agora.

   Um cliente das duas marcas aparece uma vez, com as duas. */
import {esc, vazio} from "../formato.js";

export function render(modelo){
  modelo = modelo || {};
  const clientes = modelo.clientes || [];
  if(!clientes.length)
    return '<h1>Clientes</h1>' + vazio("Ainda não há clientes.",
      "Sincronize no Perfil para os trazer do Data Hub.");

  const projetosDe = id => (modelo.projetos || []).filter(p => p.clientId === id).length;

  /* Quem chega aqui da pesquisa vem à procura de um cliente, não da lista:
     esse fica à cabeça e marcado. Sem destaque, a ordem é a que veio. */
  const destaque = modelo.destaque || null;
  const ordenados = destaque
    ? clientes.filter(c => c.id === destaque).concat(clientes.filter(c => c.id !== destaque))
    : clientes;

  return '<h1>Clientes</h1>'
    + '<p class="sub">' + clientes.length + ' cliente(s)</p>'
    + '<ul class="lista">' + ordenados.map(c => {
        const tel = (c.phones || [])[0];
        const mail = (c.emails || [])[0];
        const n = projetosDe(c.id);
        return '<li class="linha' + (c.id === destaque ? " destacado" : "") + '">'
          + '<span class="titulo">' + esc(c.name || "sem nome") + '</span>'
          + '<span class="meta">' + (c.brands || []).map(b =>
              b === "opere" ? "OPERE" : "CO.RP").join(" · ")
          + (n ? " · " + n + " projeto(s)" : "") + '</span>'
          + '<span class="meta">'
          + (tel ? '<a href="tel:' + esc(tel) + '">telefonar</a>' : '')
          + (tel && mail ? " · " : "")
          + (mail ? '<a href="mailto:' + esc(mail) + '">email</a>' : '')
          + '</span></li>';
      }).join("") + '</ul>';
}
