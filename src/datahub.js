/* O Data Hub, visto do telemóvel.

   Lê as Lists e devolve o modelo canónico — o mesmo contrato que o desktop
   usa — em vez de itens do SharePoint. O «Payload» traz o modelo completo;
   as colunas servem os filtros do lado do servidor.

   Escrever é sempre com uma chave de idempotência: a mesma ação enviada
   duas vezes cria uma coisa só. */

export function criarDataHub({graph, siteId, listas}){
  const base = () => "/sites/" + siteId;

  function idDaLista(nome){
    const id = (listas || {})[nome];
    if(!id) throw new Error("lista desconhecida: " + nome);
    return id;
  }

  function doItem(item){
    const f = (item && item.fields) || {};
    if(f.Payload){
      try{
        const p = JSON.parse(f.Payload);
        /* o id do item SharePoint fica à mão para o PATCH, sem poluir o
           modelo canónico */
        /* o estado da linha não vai no Payload e é preciso: uma exceção
           resolvida não pode voltar a pedir o mesmo trabalho */
        return Object.assign({}, p, {__itemId:item.id, __etag:item["@odata.etag"] || null,
                                     __status:f.Status || null});
      }catch(e){ /* payload ilegível: devolve-se os campos, que são melhores que nada */ }
    }
    return Object.assign({}, f, {__itemId:item.id, __etag:item["@odata.etag"] || null});
  }

  async function list(nome, opcoes){
    opcoes = opcoes || {};
    let caminho = base() + "/lists/" + idDaLista(nome) + "/items?expand=fields";
    if(opcoes.changedSince)
      caminho += "&$filter=fields/UpdatedAt ge '" + encodeURIComponent(opcoes.changedSince) + "'";
    const itens = [];
    let seguinte = caminho;
    while(seguinte){
      const pagina = await graph.get(seguinte);
      (pagina.value || []).forEach(i => itens.push(doItem(i)));
      seguinte = pagina["@odata.nextLink"] || null;
    }
    return itens;
  }

  async function get(nome, entityId){
    const todos = await list(nome);
    return todos.filter(i => i.id === entityId || i.EntityId === entityId)[0] || null;
  }

  async function criar(nome, campos){
    return graph.post(base() + "/lists/" + idDaLista(nome) + "/items", {fields:campos});
  }

  async function atualizar(nome, itemId, campos, etag){
    /* Com ETag, o servidor recusa a escrita se a versão mudou entretanto —
       é o que impede o telemóvel de apagar em silêncio uma alteração feita
       no Mac dois minutos antes. */
    return graph.patch(base() + "/lists/" + idDaLista(nome) + "/items/" + itemId + "/fields",
                       campos, etag ? {"If-Match":etag} : undefined);
  }

  /* Descobrir os ids das Lists uma vez, e guardá-los. */
  async function descobrirListas(nomes){
    const r = await graph.get(base() + "/lists");
    const mapa = {};
    (r.value || []).forEach(l => {
      const nome = l.displayName || l.name;
      if(!nomes || nomes.indexOf(nome) >= 0) mapa[nome] = l.id;
    });
    return mapa;
  }

  return {list, get, criar, atualizar, descobrirListas};
}

/* ---------- a carteira toda, sem tudo ou nada ---------------------------
   Ler as listas com um «Promise.all» fazia uma lista em baixo apagar as
   outras: se as Tarefas falhassem, a app caía na cache e não mostrava
   projeto nenhum. Cada lista é lida por si; o que falha fica dito.

   A exceção é «Projects»: sem carteira não há nada para mostrar, e aí vale
   mais o último retrato em cache do que um ecrã vazio. */
/* «ProjectFinance» não entra aqui: é lida à parte, porque um 403 nela é
   uma resposta legítima e não uma fonte em baixo. */
/* «Collaborations» e «Awards» são recentes: um Data Hub que ainda não as
   tenha responde com erro, e isso é uma fonte em falta como as outras — a
   carteira continua, e o telemóvel diz o que não conseguiu ler. */
/* «NotesDecisions» era escrita e nunca lida: uma nota escrita no telemóvel
   desaparecia do ecrã na recarga seguinte, e nenhuma nota do computador
   chegava cá. Escrever num sítio que ninguém lê é a pior das duas metades. */
const LISTAS = ["Projects", "Clients", "Tasks", "Consultations", "Conflicts",
                "Collaborations", "Awards", "NotesDecisions", "AppMeta"];

/* Todas as Lists de que a app precisa, dita por quem as lê e escreve. O
   «config.js» tinha a lista à mão e ficou para trás: faltavam-lhe
   «ProjectFinance», «Collaborations» e «Awards», e o resultado não era um
   erro — era uma carteira inteira sem honorários, sem faturado e sem por
   faturar, com o ar de quem ainda não os tinha preenchido. Uma lista que o
   código sabe de cor não se repete numa configuração. */
export const LISTAS_NECESSARIAS = LISTAS.concat(
  ["ProjectFinance", "NotesDecisions", "Commands", "Users", "AuditLog",
   "Aliases", "SyncRuns"]);
const CHAVE = {Projects:"projects", Clients:"clients", Tasks:"tasks",
               Consultations:"consultations", Conflicts:"quality",
               Collaborations:"collaborations", Awards:"awards",
               NotesDecisions:"notes", AppMeta:"meta"};

/* O dinheiro vive na List «ProjectFinance», que pode ter permissões
   próprias. Quem não lhe chega recebe um 403 — e isso não é uma fonte em
   falta, é a resposta certa: a carteira continua, sem valores. */
async function juntarFinanceiro(hub, projetos){
  let finance = null;
  try{
    finance = await hub.list("ProjectFinance");
  }catch(e){
    /* Sem acesso, ou sem a List: o projeto fica como veio, sem números. */
    return {projetos, semAcesso:true};
  }
  const porId = {};
  (finance || []).forEach(f => { if(f && f.id) porId[f.id] = f; });

  return {
    projetos: (projetos || []).map(p => {
      const meu = porId[p.id];
      if(!meu) return p;
      return Object.assign({}, p, {
        finance: Object.assign({}, p.finance || {}, meu.finance || {}),
        health: (p.health || []).concat(
          (meu.health || []).filter(h => (p.health || []).indexOf(h) < 0))
      });
    }),
    semAcesso:false
  };
}

export async function carregarCarteira(hub){
  const carteira = {projects:[], clients:[], tasks:[], consultations:[], quality:[],
                    collaborations:[], awards:[], notes:[], meta:[], fontesEmFalta:[]};

  const projetos = await hub.list("Projects");
  const comDinheiro = await juntarFinanceiro(hub, projetos || []);
  carteira.projects = comDinheiro.projetos;
  carteira.semFinanceiro = comDinheiro.semAcesso;

  for(const nome of LISTAS){
    if(nome === "Projects") continue;
    try{
      const itens = (await hub.list(nome)) || [];
      carteira[CHAVE[nome]] = (nome === "Conflicts")
        ? itens.filter(i => (i.__status || "aberto") !== "resolvido")
        : itens;
    }catch(e){
      carteira.fontesEmFalta.push(nome);
    }
  }

  /* A saúde das fontes é publicada pelo Sync Agent; o telemóvel lê-a, não a
     recalcula — não tem como saber se o Moloni foi lido no Mac. */
  const health = (carteira.meta || []).filter(
    m => (m.Key || m.key) === "health")[0];
  if(health){
    try{ carteira.fontes = JSON.parse(health.Value || health.value || "[]"); }
    catch(e){ carteira.fontes = []; }
  }
  delete carteira.meta;
  return carteira;
}

/* Onde fica o site, a partir do hostname e do caminho. */
export async function descobrirSite(graph, hostname, sitePath){
  const r = await graph.get("/sites/" + hostname + ":" + sitePath);
  return r.id;
}
