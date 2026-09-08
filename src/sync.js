/* A sincronização vista do telemóvel.

   Três coisas: escrever ações mesmo sem rede, enviá-las quando ela volta, e
   nunca enviar a mesma duas vezes.

   A chave de idempotência é do cliente e viaja com a ação. É ela que faz
   um envio repetido — porque a rede caiu depois de o servidor gravar — não
   criar uma segunda tarefa. */

export function uuid(){
  if(typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  /* Sem crypto.randomUUID a app não pode ficar sem identificadores: um
     fallback com tempo e aleatoriedade chega para não colidir. */
  return "m-" + Date.now().toString(36) + "-"
    + Math.random().toString(36).slice(2, 10);
}

export function criarSync({store, estaOnline, enviar, aoMudarEstado}){
  const avisar = e => { if(typeof aoMudarEstado === "function") aoMudarEstado(e); };

  async function mutate(m){
    const mutationId = m.mutationId || uuid();
    const jaLa = (await store.getAll("outbox")).some(x => x.mutationId === mutationId);
    const registo = {
      id:mutationId, mutationId,
      type:m.type, entity:m.entity, entityId:m.id || null,
      projectId:m.projectId || null, baseVersion:m.baseVersion || null,
      payload:m.payload || {}, status:"pending",
      criadaEm:m.criadaEm || new Date().toISOString(), erro:null
    };
    /* A mesma mutação escrita duas vezes é a mesma intenção: fica uma. */
    if(!jaLa) await store.put("outbox", registo);

    if(estaOnline()){
      try{ await flushOutbox(); }catch(e){ /* fica em fila; a próxima tenta */ }
    }
    return registo;
  }

  async function flushOutbox(){
    if(!estaOnline()) return {enviadas:0, pendentes:(await store.getAll("outbox")).length};
    avisar("a-sincronizar");
    /* Por ordem de escrita: uma tarefa criada antes de ser concluída tem de
       chegar primeiro, senão o servidor recebe uma conclusão de algo que
       ainda não existe. */
    const fila = (await store.getAll("outbox"))
      .filter(m => m.status !== "conflict")
      .sort((a, b) => String(a.criadaEm).localeCompare(String(b.criadaEm)));

    let enviadas = 0;
    for(const m of fila){
      try{
        await enviar(m);
        await store.remove("outbox", m.id);
        enviadas++;
      }catch(e){
        if(e && e.conflito){
          /* Um conflito não se resolve às escondidas nem se deita fora: a
             ação fica, marcada, para uma pessoa decidir. */
          await store.put("outbox", Object.assign({}, m, {
            status:"conflict", erro:String(e.message || e)}));
          continue;
        }
        /* Erro de rede: pára aqui e mantém a ordem para a próxima vez. */
        avisar("erro");
        break;
      }
    }
    const restantes = await store.getAll("outbox");
    avisar(restantes.length ? "erro" : "ok");
    return {enviadas, pendentes:restantes.length};
  }

  async function pendentes(){
    const fila = await store.getAll("outbox");
    return {
      total:fila.length,
      conflitos:fila.filter(m => m.status === "conflict").length
    };
  }

  return {mutate, flushOutbox, pendentes};
}


/* ---------- o arranque ---------------------------------------------------
   Com rede, traz o retrato novo e guarda-o. Sem rede, devolve o último que
   houver — e diz que é velho. Um ecrã vazio por causa de um elevador seria
   a app a mentir sobre a carteira. */
export function criarBootstrap({store, carregar}){
  return async function bootstrap(){
    try{
      const novo = await carregar();
      const agora = new Date().toISOString();
      await Promise.all([
        store.clear("projects").then(() => store.putMany("projects", novo.projects || [])),
        store.clear("clients").then(() => store.putMany("clients", novo.clients || [])),
        store.clear("consultations").then(() => store.putMany("consultations", novo.consultations || [])),
        store.clear("tasks").then(() => store.putMany("tasks", novo.tasks || [])),
        store.clear("quality").then(() => store.putMany("quality", novo.quality || [])),
        store.clear("collaborations").then(() => store.putMany("collaborations", novo.collaborations || [])),
        store.clear("awards").then(() => store.putMany("awards", novo.awards || [])),
        store.clear("notes").then(() => store.putMany("notes", novo.notes || []))
      ]);
      await store.meta("lastSync", agora);
      return Object.assign({stale:false, lastSync:agora}, novo);
    }catch(e){
      const [projects, clients, consultations, tasks, quality,
             collaborations, awards, notes] = await Promise.all([
        store.getAll("projects"), store.getAll("clients"), store.getAll("consultations"),
        store.getAll("tasks"), store.getAll("quality"),
        store.getAll("collaborations"), store.getAll("awards"), store.getAll("notes")
      ]);
      return {stale:true, lastSync:await store.meta("lastSync"),
              projects, clients, consultations, tasks, quality,
              collaborations, awards, notes,
              erro:String(e && e.message || e)};
    }
  };
}
