/* O Microsoft Graph, visto do browser.

   Uma camada fina: junta o token, segue a paginação e normaliza os erros.
   Não sabe o que é um projeto — isso é do Data Hub. */

export function criarGraph({token}){
  const BASE = "https://graph.microsoft.com/v1.0";

  async function pedir(metodo, caminho, corpo, cabecalhos){
    const url = caminho.startsWith("http") ? caminho : BASE + caminho;
    const t = await token();
    const r = await fetch(url, {
      method:metodo,
      headers:Object.assign({
        "Authorization":"Bearer " + t,
        "Accept":"application/json"
      }, corpo ? {"Content-Type":"application/json"} : {}, cabecalhos || {}),
      body:corpo ? JSON.stringify(corpo) : undefined
    });

    if(r.status === 204) return {};
    const texto = await r.text();
    const dados = texto ? JSON.parse(texto) : {};

    if(!r.ok){
      const erro = new Error((dados.error && dados.error.message) || ("Graph " + r.status));
      erro.status = r.status;
      erro.code = dados.error && dados.error.code;
      /* Uma escrita rejeitada por versão desatualizada é um conflito, não
         um erro de rede: quem chamou tem de o poder distinguir. */
      erro.conflito = (r.status === 409 || r.status === 412);
      throw erro;
    }
    return dados;
  }

  /* Ficheiros não são JSON. Estas duas não passam pelo «pedir» porque o
     corpo é binário nos dois sentidos — e porque a gravação leva um
     «if-match»: sem ele, duas pessoas a gravar o mesmo livro ficavam com a
     última a apagar a primeira, em silêncio. */
  async function lerBinario(caminho){
    const t = await token();
    const r = await fetch(caminho.startsWith("http") ? caminho : BASE + caminho,
      {headers:{"Authorization":"Bearer " + t}});
    if(!r.ok){
      const erro = new Error("Graph " + r.status + " ao ler o ficheiro");
      erro.status = r.status; throw erro;
    }
    return await r.arrayBuffer();
  }
  async function escreverBinario(caminho, bytes, etag){
    const t = await token();
    const r = await fetch(caminho.startsWith("http") ? caminho : BASE + caminho, {
      method:"PUT",
      headers:Object.assign({
        "Authorization":"Bearer " + t,
        "Content-Type":"application/octet-stream"
      }, etag ? {"if-match":etag} : {}),
      body:bytes
    });
    const texto = await r.text();
    const dados = texto ? JSON.parse(texto) : {};
    if(!r.ok){
      const erro = new Error((dados.error && dados.error.message) || ("Graph " + r.status));
      erro.status = r.status;
      erro.code = dados.error && dados.error.code;
      erro.conflito = (r.status === 409 || r.status === 412);
      throw erro;
    }
    return dados;
  }

  return {
    get:(caminho, cabecalhos) => pedir("GET", caminho, null, cabecalhos),
    post:(caminho, corpo) => pedir("POST", caminho, corpo),
    patch:(caminho, corpo, cabecalhos) => pedir("PATCH", caminho, corpo, cabecalhos),
    lerBinario, escreverBinario
  };
}
