/* O router: hash, porque uma PWA estática não tem servidor a reescrever
   caminhos — e porque assim recarregar dentro de um projeto volta ao mesmo
   projeto. */

export function criarRouter(rotas, aoMudar){
  function actual(){
    const h = (typeof location !== "undefined" ? location.hash : "") || "#/hoje";
    const partes = h.replace(/^#\/?/, "").split("/");
    const nome = partes[0] || "hoje";
    return {nome:rotas.indexOf(nome) >= 0 ? nome : "hoje", parametro:partes[1] || null};
  }
  function ir(nome, parametro){
    location.hash = "#/" + nome + (parametro ? "/" + parametro : "");
  }
  function arrancar(){
    window.addEventListener("hashchange", () => aoMudar(actual()));
    aoMudar(actual());
  }
  return {actual, ir, arrancar};
}
