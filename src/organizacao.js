/* O ORGANIZAÇÃO.XLSX, VISTO DO TELEMÓVEL

   No computador o ficheiro é lido do disco que o OneDrive sincroniza. No
   telemóvel não há disco sincronizado: há o Graph. Muda a maneira de o
   alcançar; não muda uma regra sobre o que se pode escrever — quem decide
   isso é «window.PUB», o mesmo adaptador que o Atelier usa, copiado para o
   bundle pelo build. Duas implementações da mesma regra acabariam por
   discordar, e a que discordasse em silêncio seria esta.

   O ficheiro vive na OneDrive do «geral@» e quem entra na app é outra
   conta. Por isso o caminho começa em «/users/{upn}/drive» e por isso é
   preciso «Files.ReadWrite.All» delegado — «os ficheiros a que o
   utilizador já tem acesso», e não mais do que isso.

   A concorrência é tratada onde tem de ser: com o «eTag» que veio na
   leitura. Se alguém gravou entretanto, o Graph recusa com 412 e a app
   diz; não há aqui nenhuma gravação que apague o trabalho de outra pessoa
   por chegar depois. */

/* Quem é o dono da drive e onde está o ficheiro vem do «config.js» da
   instalação, não daqui: um endereço do atelier escrito no bundle era um
   dado do atelier publicado num host estático. Sem configuração, a app
   diz o que falta em vez de adivinhar. */
export function definicoes(config){
  const c = (config && config.organizacao) || {};
  if(!c.utilizador || !c.caminho) return null;
  return {utilizador:c.utilizador, caminho:c.caminho};
}

/* O caminho do Graph para o item, com cada segmento escapado. O «:/» que
   separa o caminho do verbo é sintaxe do Graph e não se escapa. */
function raiz(d){
  return "/users/" + encodeURIComponent(d.utilizador) + "/drive/root:/"
    + String(d.caminho).split("/").map(encodeURIComponent).join("/");
}

export function criarOrganizacao({graph, config}){
  const d = definicoes(config);
  function exigirConfig(){
    if(!d) throw new Error("falta a secção «organizacao» no config.js desta instalação");
  }

  /* A ficha do item: id, eTag e quando foi alterado. É a ficha que diz se
     o que temos em mãos ainda é o que lá está. */
  async function ficha(){
    exigirConfig();
    const item = await graph.get(raiz(d) + ":?$select=id,name,eTag,cTag,size,lastModifiedDateTime,webUrl");
    return {id:item.id, nome:item.name, etag:item.cTag || item.eTag,
            tamanho:item.size, alteradoEm:item.lastModifiedDateTime, url:item.webUrl};
  }

  async function ler(){
    const f = await ficha();
    const bytes = await graph.lerBinario("/users/" + encodeURIComponent(d.utilizador)
      + "/drive/items/" + f.id + "/content");
    if(!window.PUB) throw new Error("o adaptador do calendário não está carregado");
    const modelo = await window.PUB.lerArrayBuffer(bytes, f.nome);
    modelo.ficha = f;
    return modelo;
  }

  /* Escrever uma célula. O caminho é o mesmo do desktop — plano, aplicação
     no XML, ZIP de volta — e só a última parte muda: em vez de um manípulo
     de ficheiro, um PUT com «if-match». */
  async function gravar(alvo, mudancas){
    const fresco = await ler();
    const onde = window.PUB.localizar(fresco, alvo);
    if(onde.estado !== "encontrada")
      return {ok:false, conflito:true, modelo:fresco,
              porque:onde.porque || "a publicação já não está onde estava"};
    const plano = window.PUB.planoDeEdicao(onde.publicacao, mudancas, fresco.livro.cadeia,
                                           (fresco.porMarca || {})[alvo.marca] || []);
    if(!plano.alteracoes.length)
      return {ok:true, semMudanca:true, modelo:fresco, recusas:plano.recusas,
              publicacao:onde.publicacao};
    const bytes = await window.PUB.bytesComAlteracoes(fresco, plano.alteracoes);
    if(!bytes.ok) return {ok:false, modelo:fresco, porque:bytes.porque};
    return escreverEConfirmar(fresco, bytes.bytes, function(depois){
      const outra = window.PUB.localizar(depois, {
        marca:alvo.marca, linha:onde.publicacao.linha, coluna:onde.publicacao.coluna,
        projeto:mudancas.projeto !== undefined ? mudancas.projeto : onde.publicacao.projeto,
        tipo:mudancas.tipo !== undefined ? mudancas.tipo : onde.publicacao.tipo,
        data:mudancas.data !== undefined ? mudancas.data : onde.publicacao.data,
        celulas:onde.publicacao.celulas});
      return outra.estado === "encontrada"
        ? {ok:true, modelo:depois, publicacao:outra.publicacao,
           escritas:plano.alteracoes, recusas:plano.recusas, avisos:plano.avisos}
        : {ok:false, modelo:depois,
           porque:"gravou, mas a releitura não confirmou o valor — verifique o Excel"};
    });
  }

  async function escreverEConfirmar(fresco, bytes, confirmar){
    try{
      await graph.escreverBinario("/users/" + encodeURIComponent(d.utilizador)
        + "/drive/items/" + fresco.ficha.id + "/content", bytes, fresco.ficha.etag);
    }catch(e){
      if(e && e.conflito)
        return {ok:false, conflito:true,
                porque:"o ficheiro foi alterado no OneDrive desde que o li; não gravei por cima"};
      throw e;
    }
    const depois = await ler();
    return confirmar(depois);
  }

  return {definicoes:() => d, ficha, ler, gravar,
    /* Uma publicação nova: a mesma mecânica, com o plano que o adaptador
       monta para a linha nova. */
    async gravarNova(marca, dados){
      const fresco = await ler();
      const plano = window.PUB.planoDeLinhaNova(fresco, marca, dados);
      if(!plano.ok) return {ok:false, modelo:fresco, porque:plano.porque};
      const bytes = await window.PUB.bytesComXml(fresco, plano.xml);
      return escreverEConfirmar(fresco, bytes, function(depois){
        const achada = window.PUB.localizar(depois, {
          marca:marca, linha:plano.sitio.linha, coluna:plano.sitio.coluna + 1,
          projeto:dados.projeto, tipo:dados.tipo, data:dados.data || null,
          celulas:plano.sitio.celulas});
        return achada.estado === "encontrada"
          ? {ok:true, modelo:depois, publicacao:achada.publicacao, linhaNova:!plano.sitio.existe}
          : {ok:false, modelo:depois,
             porque:"escreveu, mas a releitura não confirmou a linha nova"};
      });
    }};
}
