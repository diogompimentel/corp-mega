/* O armazém local: IndexedDB, com uma porta pequena.

   Guarda o último retrato do Data Hub e as ações escritas offline. A cache
   é o que faz a app abrir num elevador sem rede — e a fila de saída é o que
   faz uma tarefa escrita ali não se perder.

   A API é a mesma que os testes usam com um armazém em memória: se o
   IndexedDB não estiver disponível — modo privado, por exemplo — a app
   continua a funcionar na sessão, e diz que não persiste. */

const BD = "corp-mega-app";
const VERSAO = 1;
const LOJAS = ["projects", "clients", "consultations", "tasks", "notes",
               "quality", "collaborations", "awards", "outbox", "meta"];

function abrir(){
  return new Promise((resolve, reject) => {
    if(typeof indexedDB === "undefined"){ reject(new Error("sem IndexedDB")); return; }
    const p = indexedDB.open(BD, VERSAO);
    p.onupgradeneeded = () => {
      const db = p.result;
      LOJAS.forEach(l => {
        if(!db.objectStoreNames.contains(l))
          db.createObjectStore(l, {keyPath:l === "meta" ? "chave" : "id"});
      });
    };
    p.onsuccess = () => resolve(p.result);
    p.onerror = () => reject(p.error);
  });
}

function transacao(db, loja, modo, fn){
  return new Promise((resolve, reject) => {
    const t = db.transaction(loja, modo);
    const s = t.objectStore(loja);
    let r;
    try{ r = fn(s); }catch(e){ reject(e); return; }
    t.oncomplete = () => resolve(r && r.result !== undefined ? r.result : r);
    t.onerror = () => reject(t.error);
  });
}

/* Uma memória volátil com a mesma porta: sem IndexedDB a app funciona na
   sessão em vez de não funcionar de todo. */
export function criarMemoria(){
  const dados = {}, meta = {};
  return {
    persistente:false,
    async putMany(loja, itens){
      dados[loja] = (dados[loja] || []).filter(x => !itens.some(i => i.id === x.id)).concat(itens);
      return itens.length;
    },
    async put(loja, item){ return this.putMany(loja, [item]); },
    async getAll(loja){ return (dados[loja] || []).slice(); },
    async get(loja, id){ return (dados[loja] || []).filter(x => x.id === id)[0] || null; },
    async remove(loja, id){
      dados[loja] = (dados[loja] || []).filter(x => x.id !== id);
      return true;
    },
    async clear(loja){ dados[loja] = []; return true; },
    async meta(chave, valor){
      if(valor !== undefined){ meta[chave] = valor; return valor; }
      return meta[chave] === undefined ? null : meta[chave];
    }
  };
}

export async function criarStore(){
  let db = null;
  try{ db = await abrir(); }
  catch(e){ return criarMemoria(); }

  return {
    persistente:true,
    async putMany(loja, itens){
      if(!itens || !itens.length) return 0;
      await transacao(db, loja, "readwrite", s => { itens.forEach(i => s.put(i)); });
      return itens.length;
    },
    async put(loja, item){ return this.putMany(loja, [item]); },
    async getAll(loja){
      return new Promise((resolve, reject) => {
        const t = db.transaction(loja, "readonly");
        const r = t.objectStore(loja).getAll();
        r.onsuccess = () => resolve(r.result || []);
        r.onerror = () => reject(r.error);
      });
    },
    async get(loja, id){
      return new Promise((resolve, reject) => {
        const t = db.transaction(loja, "readonly");
        const r = t.objectStore(loja).get(id);
        r.onsuccess = () => resolve(r.result || null);
        r.onerror = () => reject(r.error);
      });
    },
    async remove(loja, id){
      await transacao(db, loja, "readwrite", s => { s.delete(id); });
      return true;
    },
    async clear(loja){
      await transacao(db, loja, "readwrite", s => { s.clear(); });
      return true;
    },
    async meta(chave, valor){
      if(valor !== undefined){
        await transacao(db, "meta", "readwrite", s => { s.put({chave, valor}); });
        return valor;
      }
      const r = await this.get("meta", chave);
      return r ? r.valor : null;
    }
  };
}
