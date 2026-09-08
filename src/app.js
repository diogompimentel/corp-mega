/* A app: liga o modelo às vistas e as vistas ao dedo.

   É a única parte que conhece o DOM. Tudo o que decide alguma coisa vive
   nos módulos ao lado — e é por isso que se pode provar sem browser.
   ======================================================================= */
import {criarRouter} from "./router.js";
import {criarStore} from "./store.js";
import {criarSync, criarBootstrap, uuid} from "./sync.js";
import {criarGraph} from "./graph.js";
import {criarDataHub, descobrirSite, carregarCarteira, LISTAS_NECESSARIAS} from "./datahub.js";
import {construir, procurar} from "./search.js";
import {podeVerFinanceiro, filtrar} from "./permissoes.js";
import * as auth from "./auth.js";

import {render as verHoje} from "./views/hoje.js";
import {render as verProjetos} from "./views/projetos.js";
import {render as verProjeto} from "./views/projeto.js";
import {render as verTarefas} from "./views/tarefas.js";
import {render as verClientes} from "./views/clientes.js";
import {render as verColaboracoes} from "./views/colaboracoes.js";
import {render as verFinanceiro} from "./views/financeiro.js";
import {render as verPerfil} from "./views/perfil.js";
import {render as verPesquisa} from "./views/pesquisa.js";
import {render as verPublicacoes} from "./views/publicacoes.js";
import {criarOrganizacao} from "./organizacao.js";

const ROTAS = ["hoje", "projetos", "projeto", "tarefas", "clientes", "financeiro",
               "colaboracoes", "publicacoes", "pesquisa", "perfil"];

const estado = {
  projetos:[], clientes:[], consultas:[], tarefas:[], qualidade:[], notas:[],
  colaboracoes:[], premios:[],
  stale:false, lastSync:null, indice:[], consulta:"", filtro:"",
  utilizador:null, sync:"ok", erro:null, marca:"corp", clienteEmFoco:null,
  /* O calendário editorial não vem do Data Hub: é lido do Organização.xlsx
     pelo Graph, a pedido, e por isso tem estado próprio. Não se guarda —
     um calendário velho em cache seria pior do que nenhum. */
  calendario:null, calendarioLidoEm:null, calendarioALer:false,
  calendarioAGravar:false, calendarioMensagem:null, publicacaoEditando:null,
  /* Por omissão não se vê o financeiro: o silêncio fecha a porta, não a
     abre. Só uma leitura da List «Users» a abre. */
  financeiro:false
};

let store = null, sync = null, hub = null, router = null, organizacao = null;
const palco = () => document.getElementById("palco");

/* ---------- o modelo de cada ecrã --------------------------------------- */
/* O rótulo da fase vem do Core que o build copia — o mesmo que o desktop
   usa. Assim «execucao» não aparece cru no telemóvel. */
function comRotulos(projetos){
  const N = window.NUC;
  if(!N || typeof N.rotuloDaFase !== "function") return projetos;
  return projetos.map(p => {
    if(!p.phase) return p;
    const linha = p.brand === "opere" ? "opere" : "corp";
    let rotulo = null;
    try{ rotulo = N.rotuloDaFase(linha, p.phase); }catch(e){ rotulo = null; }
    return (rotulo && rotulo !== p.phase) ? Object.assign({}, p, {phaseLabel:rotulo}) : p;
  });
}

function ordenarCarteira(lista){
  return (window.NUC && typeof window.NUC.ordenarProjetos === "function")
    ? window.NUC.ordenarProjetos(lista) : (lista || []);
}
/* A List guarda o texto em «Payload»; o telemóvel escreve-o em «text». As
   duas formas leem-se aqui, uma vez, em vez de em cada sítio que as mostra. */
function notaCanonica(n){
  if(!n) return n;
  let texto = n.text || n.texto || null;
  if(!texto && n.Payload){
    try{ texto = (JSON.parse(n.Payload) || {}).text || null; }catch(e){ texto = null; }
  }
  return Object.assign({}, n, {
    id:n.id || n.EntityId, projectId:n.projectId || n.ProjectId || null,
    text:texto || n.Title || "", createdAt:n.createdAt || n.CreatedAt || null});
}
function projetoPorId(id){
  return estado.projetos.filter(p => p.id === id)[0] || null;
}
function itensDeHoje(){
  /* O Core do desktop é copiado para «dist/core» pelo build e exposto em
     «window.NUC»: a fila de Hoje é a mesma nos dois sítios. Sem ele — em
     desenvolvimento — cai-se numa ordenação simples pelo prazo. */
  if(window.NUC && typeof window.NUC.itensDeHoje === "function"){
    return window.NUC.itensDeHoje({
      projects:estado.projetos, tasks:estado.tarefas, meetings:[],
      quality:estado.qualidade, now:new Date().toISOString()
    });
  }
  return estado.tarefas
    .filter(t => t.status !== "concluida" && !t.completedAt)
    .sort((a, b) => String(a.dueAt || "9999").localeCompare(String(b.dueAt || "9999")))
    .map(t => ({id:t.id, type:"task", projectId:t.projectId, title:t.title,
                dueAt:t.dueAt, action:"abrir-tarefa"}));
}

function pintar(){
  const r = router.actual();
  /* Os valores são retirados do modelo antes de chegarem às vistas: esconder
     o separador e deixar os números na ficha não esconde nada. */
  /* A ordem da carteira é a da casa — do número mais alto para o mais
     baixo — e vem do Core, a mesma regra que o desktop aplica. O Data Hub
     devolve os projetos pela ordem em que os escreveu, que não é ordem
     nenhuma. */
  const projetos = ordenarCarteira(filtrar(estado.projetos, estado.financeiro));
  const comum = {stale:estado.stale, lastSync:estado.lastSync, now:new Date().toISOString(),
                 projetos, semFinanceiro:!estado.financeiro};
  let html = "";

  if(estado.erro) html += '<div class="erro" role="alert">' + estado.erro + '</div>';

  if(r.nome === "hoje") html += verHoje(Object.assign({itens:itensDeHoje()}, comum));
  else if(r.nome === "projetos")
    html += verProjetos(Object.assign({filtro:estado.filtro}, comum));
  else if(r.nome === "projeto"){
    const p = projetos.filter(x => x.id === r.parametro)[0] || null;
    html += verProjeto({
      projeto:p, semFinanceiro:!estado.financeiro,
      cliente:p ? estado.clientes.filter(c => c.id === p.clientId)[0] : null,
      tarefas:estado.tarefas.filter(t => t.projectId === (p && p.id)
        && t.status !== "concluida" && !t.completedAt),
      notas:estado.notas.filter(n => n.projectId === (p && p.id)),
      documentos:p && p.documentsUrl,
      licenciamento:p && p.licensing
    });
  }
  else if(r.nome === "tarefas") html += verTarefas(Object.assign({tarefas:estado.tarefas}, comum));
  else if(r.nome === "clientes")
    html += verClientes(Object.assign({clientes:estado.clientes,
                                       destaque:estado.clienteEmFoco}, comum));
  else if(r.nome === "colaboracoes")
    html += verColaboracoes(Object.assign({colaboracoes:estado.colaboracoes,
                                           premios:estado.premios,
                                           clientes:estado.clientes}, comum));
  else if(r.nome === "financeiro"){
    html += estado.financeiro
      ? verFinanceiro(comum)
      : '<h1>Financeiro</h1><div class="vazio"><b>Esta área não está disponível '
        + 'para a sua conta.</b><span>Fale com o Diogo ou o João se precisar '
        + 'destes números.</span></div>';
  }
  else if(r.nome === "publicacoes")
    html += verPublicacoes({calendario:estado.calendario, marca:estado.marca,
                            lidoEm:estado.calendarioLidoEm, aLer:estado.calendarioALer,
                            aGravar:estado.calendarioAGravar,
                            mensagem:estado.calendarioMensagem,
                            editando:estado.publicacaoEditando,
                            hoje:new Date().toISOString().slice(0, 10),
                            semRede:typeof navigator !== "undefined" && navigator.onLine === false});
  else if(r.nome === "pesquisa")
    html += verPesquisa({consulta:estado.consulta,
                         resultados:procurar(estado.indice, estado.consulta, 30)});
  else if(r.nome === "perfil"){
    html += verPerfil({utilizador:estado.utilizador, estado:estado.sync,
                       lastSync:estado.lastSync,
                       pendentes:estado.pendentes, conflitos:estado.conflitos,
                       fontes:estado.fontes, fontesEmFalta:estado.fontesEmFalta});
  }

  palco().innerHTML = html;
  marcarNavegacao(r.nome);
  ligarGestos();
}

function marcarNavegacao(rota){
  document.querySelectorAll(".fundo a").forEach(a => {
    const minha = a.getAttribute("data-rota");
    if(minha === rota || (rota === "projeto" && minha === "projetos"))
      a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  const s = document.getElementById("estadoSync");
  if(s){
    /* «offline» é falta de rede. Uma sessão por iniciar não é offline — e
       dizer-lhe offline manda a pessoa procurar rede que já tem. */
    const semSessao = !estado.utilizador;
    const estadoReal = semSessao ? "erro" : (estado.stale ? "offline" : estado.sync);
    s.setAttribute("data-estado", estadoReal);
    s.textContent = semSessao ? "sem sessão"
      : (estado.stale ? "offline"
        : (estado.pendentes ? estado.pendentes + " por enviar" : ""));
  }
}

/* ---------- o dedo ------------------------------------------------------ */
function ligarGestos(){
  palco().querySelectorAll("[data-acao]").forEach(el => {
    el.addEventListener("click", ev => {
      const acao = el.getAttribute("data-acao");
      const projeto = el.getAttribute("data-projeto");
      const item = el.getAttribute("data-item");
      if(acao.indexOf("abrir-") !== 0) ev.preventDefault();
      executar(acao, {projeto, item});
    });
  });
  const filtro = palco().querySelector('[data-campo="filtro"]');
  if(filtro){
    filtro.addEventListener("input", () => {
      estado.filtro = filtro.value;
      const onde = filtro.selectionStart;
      pintar();
      const novo = palco().querySelector('[data-campo="filtro"]');
      if(novo){ novo.focus(); try{ novo.setSelectionRange(onde, onde); }catch(e){} }
    });
  }
  const campo = palco().querySelector('[data-campo="pesquisa"]');
  if(campo){
    campo.addEventListener("input", () => {
      estado.consulta = campo.value;
      const foco = campo.selectionStart;
      pintar();
      const novo = palco().querySelector('[data-campo="pesquisa"]');
      if(novo){ novo.focus(); try{ novo.setSelectionRange(foco, foco); }catch(e){} }
    });
  }
}

async function executar(acao, dados){
  try{
    if(acao === "abrir-projeto") return router.ir("projeto", dados.projeto || dados.item);
    /* Um cliente encontrado na pesquisa levava a lado nenhum: o botão
       existia e não fazia nada. Vai para a lista, com ele à cabeça. */
    if(acao === "abrir-cliente"){
      estado.clienteEmFoco = dados.item || null;
      return router.ir("clientes");
    }
    if(acao === "abrir-tarefa" || acao === "concluir-tarefa") return concluirTarefa(dados.item);
    /* Uma exceção de qualidade é sempre de um projeto: mandar quem lhe toca
       para a lista de todos era fazê-lo procurar aquele que acabou de
       carregar. Sem projeto — que acontece nas exceções da carteira — vale
       a lista. */
    if(acao === "resolver-qualidade")
      return dados.projeto ? router.ir("projeto", dados.projeto) : router.ir("projetos");
    if(acao === "definir-proxima-acao") return definirProximaAcao(dados.projeto);
    /* As reuniões vêm do calendário, que o telemóvel ainda não lê — mas a
       ação existe no Core e um dia chega cá. Sem tratamento, o botão não
       fazia nada e não havia como saber porquê. */
    if(acao === "abrir-reuniao")
      return dados.projeto ? router.ir("projeto", dados.projeto) : router.ir("hoje");
    if(acao === "faturar" || acao === "cobrar") return router.ir("financeiro");
    if(acao === "nova-tarefa") return novaTarefa(dados.projeto);
    if(acao === "nova-nota") return novaNota(dados.projeto);
    if(acao === "mudar-estado") return mudarEstado(dados.projeto);
    if(acao === "login") return auth.login();
    if(acao === "logout") return auth.logout();
    if(acao === "sincronizar") return sincronizar();
    if(acao === "trocar-marca") return trocarMarca();
    if(acao === "ler-organizacao") return lerOrganizacao();
    if(acao === "editar-publicacao") return editarPublicacao(dados.item);
    if(acao === "fechar-publicacao"){ estado.publicacaoEditando = null; return pintar(); }
    if(acao === "gravar-publicacao") return gravarPublicacao();
    if(acao === "nova-publicacao") return novaPublicacao();
  }catch(e){
    estado.erro = e.message || String(e);
    pintar();
  }
}

/* ---------- as ações de escrita ---------------------------------------- */
function folha(titulo, corpo, aoConfirmar){
  const d = document.createElement("div");
  d.className = "folha";
  d.innerHTML = '<h2>' + titulo + '</h2>' + corpo
    + '<div class="acoes"><button type="button" class="acao acao-forte" data-ok>Guardar</button>'
    + '<button type="button" class="acao" data-cancelar>Cancelar</button></div>';
  document.body.appendChild(d);
  const fechar = () => d.remove();
  d.querySelector("[data-cancelar]").addEventListener("click", fechar);
  d.querySelector("[data-ok]").addEventListener("click", () => {
    const valor = d.querySelector("[data-valor]");
    aoConfirmar(valor ? valor.value : null);
    fechar();
  });
  const campo = d.querySelector("[data-valor]");
  if(campo) campo.focus();
}

/* ---------- o calendário editorial -------------------------------------
   Lido a pedido e nunca guardado: o ficheiro é a fonte, e uma cópia no
   telemóvel passaria a ser uma segunda verdade. Cada gravação relê antes e
   depois — a mesma regra do desktop, com o «eTag» a fazer no Graph o que
   ali faz a comparação do conteúdo. */
function organizador(){
  if(!organizacao)
    organizacao = criarOrganizacao({graph:criarGraph({token:auth.token}),
                                    config:window.CORP_CONFIG || {}});
  return organizacao;
}
function horaCurta(){
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
async function lerOrganizacao(){
  estado.calendarioALer = true; estado.calendarioMensagem = null; pintar();
  try{
    estado.calendario = await organizador().ler();
    estado.calendarioLidoEm = horaCurta();
  }catch(e){
    estado.calendarioMensagem = {ok:false,
      texto:"Não consegui ler o Organização.xlsx: " + (e.message || String(e))};
  }
  estado.calendarioALer = false;
  pintar();
}
function editarPublicacao(id){
  const lista = (estado.calendario && estado.calendario.publicacoes) || [];
  estado.publicacaoEditando = lista.filter(p => p.id === id)[0] || null;
  estado.calendarioMensagem = null;
  pintar();
}
function campoPub(nome){
  const el = document.getElementById("pub-" + nome);
  return (el && !el.disabled) ? String(el.value || "").trim() : undefined;
}
async function gravarPublicacao(){
  const alvo = estado.publicacaoEditando;
  if(!alvo) return;
  const mudancas = {};
  ["projeto", "tipo", "data"].forEach(c => {
    const v = campoPub(c);
    if(v !== undefined) mudancas[c] = v;
  });
  estado.calendarioAGravar = true; estado.calendarioMensagem = null; pintar();
  try{
    const r = await organizador().gravar(alvo, mudancas);
    if(r.modelo){ estado.calendario = r.modelo; estado.calendarioLidoEm = horaCurta(); }
    if(!r.ok){
      estado.calendarioMensagem = {ok:false, texto:(r.conflito ? "Não gravei: " : "") + r.porque};
      if(r.conflito) estado.publicacaoEditando = null;
    }else{
      estado.publicacaoEditando = null;
      const avisos = (r.avisos || []).join("; ");
      estado.calendarioMensagem = {ok:true,
        texto:(r.semMudanca ? "Nada mudou — o ficheiro já dizia isso."
              : "Gravado no Organização.xlsx e confirmado por releitura.")
              + (avisos ? " Repare: " + avisos + "." : "")};
    }
  }catch(e){
    estado.calendarioMensagem = {ok:false, texto:e.message || String(e)};
  }
  estado.calendarioAGravar = false;
  pintar();
}
function novaPublicacao(){
  folha("Publicação nova",
    '<label for="np">Projeto / assunto</label><input type="text" id="np" data-valor>'
    + '<label for="nt">Tipo</label><input type="text" id="nt">'
    + '<label for="nd">Data</label><input type="date" id="nd">',
    async projeto => {
      if(!projeto) return;
      const tipo = (document.getElementById("nt") || {}).value || "";
      const data = (document.getElementById("nd") || {}).value || "";
      estado.calendarioAGravar = true; pintar();
      try{
        const r = await organizador().gravarNova(estado.marca, {projeto, tipo, data});
        if(r.modelo){ estado.calendario = r.modelo; estado.calendarioLidoEm = horaCurta(); }
        estado.calendarioMensagem = r.ok
          ? {ok:true, texto:"Escrito no Organização.xlsx e confirmado por releitura."}
          : {ok:false, texto:r.porque};
      }catch(e){
        estado.calendarioMensagem = {ok:false, texto:e.message || String(e)};
      }
      estado.calendarioAGravar = false;
      pintar();
    });
}

async function novaTarefa(projectId){
  folha("Nova tarefa",
    '<label for="t">O que é preciso fazer</label>'
    + '<input type="text" id="t" data-valor placeholder="Entregar elementos à Câmara">',
    async titulo => {
      if(!titulo) return;
      const id = uuid();
      const p = projetoPorId(projectId);
      /* A tarefa aparece já: quem a escreveu tem de a ver, com rede ou sem
         ela. O «pendente» diz que ainda não chegou ao Data Hub. */
      const nova = {id, projectId, folderRef:p && p.folderRef, title:titulo,
                    status:"aberta", dueAt:null, pendente:true};
      estado.tarefas = estado.tarefas.concat([nova]);
      await store.put("tasks", nova);
      await sync.mutate({type:"task.create", entity:"Tasks", id, projectId,
                         payload:{Title:titulo, EntityId:id, ProjectId:projectId,
                                  Status:"aberta"}});
      /* E ao ficheiro do projeto, que é a fonte: escrita só na List, a
         tarefa vivia no SharePoint e não existia para quem abre o processo
         no computador. Vai com o mesmo id — outro fazia dela duas. */
      if(p && p.folderRef) await mandarAoProjeto("task.create", p, titulo, {id});
      await actualizarPendentes();
      pintar();
    });
}

async function concluirTarefa(id){
  const t = estado.tarefas.filter(x => x.id === id)[0];
  if(!t) return;
  t.status = "feita";
  t.completedAt = new Date().toISOString();
  t.pendente = true;
  await store.put("tasks", t);
  await sync.mutate({type:"task.complete", entity:"Tasks", id, projectId:t.projectId,
                     baseVersion:t.__etag || null,
                     payload:{Status:"feita", UpdatedAt:t.completedAt}});
  const p = projetoPorId(t.projectId);
  const pasta = t.folderRef || (p && p.folderRef);
  if(pasta) await mandarAoProjeto("task.complete", {id:t.projectId, folderRef:pasta},
                                  "feita", {id});
  await actualizarPendentes();
  pintar();
}

async function novaNota(projectId){
  folha("Nota",
    '<label for="n">O que ficou dito</label><textarea id="n" data-valor rows="4"></textarea>',
    async texto => {
      if(!texto) return;
      const id = uuid();
      const p = projetoPorId(projectId);
      const nota = {id, projectId, text:texto,
                    createdAt:new Date().toISOString(), pendente:true};
      estado.notas = estado.notas.concat([nota]);
      await store.put("notes", nota);
      await sync.mutate({type:"note.create", entity:"NotesDecisions", id, projectId,
                         payload:{Title:texto.slice(0, 60), EntityId:id, ProjectId:projectId,
                                  Type:"note", CreatedAt:new Date().toISOString(),
                                  Payload:JSON.stringify({text:texto})}});
      /* E à cronologia do processo, que é onde quem abre o projeto no
         computador a vai encontrar. */
      if(p && p.folderRef) await mandarAoProjeto("note.create", p, texto);
      await actualizarPendentes();
      pintar();
    });
}

/* O vocabulário do estado é fechado — e por marca. Escrever à mão daria
   tantos estados quantos os dias. */
const ESTADOS = ["A aguardar cliente", "A aguardar Câmara", "A aguardar terceiros",
                 "Ação CO.RP", "Ação OPERE", "Suspenso", "Concluído"];

async function mudarEstado(projectId){
  const p = projetoPorId(projectId);
  if(!p) return;
  const permitidos = ESTADOS.filter(e =>
    p.brand === "opere" ? e !== "Ação CO.RP" : e !== "Ação OPERE");
  folha("Estado operacional",
    '<label for="e">Quem tem a bola</label><select id="e" data-valor>'
    + permitidos.map(e => '<option' + (e === p.operationalState ? " selected" : "")
        + '>' + e + '</option>').join("") + '</select>',
    async novo => {
      if(!novo || novo === p.operationalState) return;
      p.operationalState = novo;
      p.pendente = true;
      await store.put("projects", p);
      /* Escrevia-se só a coluna do Data Hub, e a publicação seguinte
         reescrevia-a a partir do disco: o estado mudado no telemóvel durava
         quinze minutos e ninguém dava por isso. Agora vai por comando, e o
         agente escreve-o no ficheiro do projeto. */
      await mandarAoProjeto("project.state", p, novo);
      pintar();
    });
}

/* A próxima ação é a pergunta do «Hoje»: «o que é que isto está à espera
   que aconteça». Escrevê-la só na coluna do Data Hub era escrevê-la na
   areia — a publicação seguinte reescreve a coluna a partir do disco. Vai
   por comando, com a pasta, e o agente aplica-a no ficheiro do projeto. */
async function definirProximaAcao(projectId){
  const p = projetoPorId(projectId);
  if(!p) return;
  folha("Próxima ação",
    '<label for="a">O que tem de acontecer a seguir</label>'
    + '<input type="text" id="a" data-valor value="' + (p.nextAction || "")
    + '" placeholder="Entregar elementos à Câmara">',
    async texto => {
      if(!texto || texto === p.nextAction) return;
      p.nextAction = texto;
      p.pendente = true;
      await store.put("projects", p);
      await mandarAoProjeto("project.nextAction", p, texto);
      pintar();
    });
}
/* Um comando é a única escrita que chega ao ficheiro do projeto. Leva a
   pasta porque é por ela que o Mac o encontra — procurar por semelhança de
   nomes seria decidir uma identidade por parecença. */
async function mandarAoProjeto(tipo, p, valor, extra){
  const id = uuid();
  const carga = Object.assign({folderRef:p.folderRef, valor:valor,
                               quem:(estado.utilizador || {}).upn || null,
                               quando:new Date().toISOString()}, extra || {});
  await sync.mutate({type:tipo, entity:"Commands", id, projectId:p.id,
    payload:{Title:tipo, EntityId:id, Type:tipo, EntityRef:p.id, Status:"pending",
             CreatedAt:new Date().toISOString(), Payload:JSON.stringify(carga)}});
  await actualizarPendentes();
}

async function trocarMarca(){
  estado.marca = estado.marca === "corp" ? "opere" : "corp";
  const m = document.getElementById("marcaAtual");
  if(m) m.textContent = estado.marca === "opere" ? "OPERE" : "CO.RP";
  await sincronizar();
}

async function actualizarPendentes(){
  const p = await sync.pendentes();
  estado.pendentes = p.total;
  estado.conflitos = p.conflitos;
  estado.sync = p.conflitos ? "erro" : (p.total ? "a-sincronizar" : "ok");
}

/* ---------- ligar tudo -------------------------------------------------- */
async function carregarDoHub(){
  if(!hub) throw new Error("sem ligação ao Data Hub");
  return carregarCarteira(hub);
}

async function sincronizar(){
  estado.sync = "a-sincronizar";
  marcarNavegacao(router.actual().nome);
  const bootstrap = criarBootstrap({store, carregar:carregarDoHub});
  const b = await bootstrap();
  estado.projetos = comRotulos((b.projects || []).filter(p =>
    !p.brand || p.brand === estado.marca));
  estado.clientes = b.clients || [];
  estado.tarefas = b.tasks || [];
  estado.consultas = b.consultations || [];
  estado.qualidade = b.quality || [];
  /* As notas voltam do Data Hub como tudo o resto: escritas só em memória,
     desapareciam na recarga seguinte. */
  estado.notas = (b.notes || []).map(notaCanonica);
  /* Colaborações e prémios são de uma marca só, como os projetos: somar as
     duas contabilidades num total era inventar um número que ninguém tem. */
  estado.colaboracoes = (b.collaborations || []).filter(c =>
    !c.brand || c.brand === estado.marca);
  estado.premios = (b.awards || []).filter(p => !p.brand || p.brand === estado.marca);
  if(b.fontes) estado.fontes = b.fontes;
  /* Uma lista do Data Hub em baixo não esvazia a carteira, mas também não
     se esconde: o Perfil di-lo. */
  estado.fontesEmFalta = b.fontesEmFalta || [];
  /* A List do dinheiro é lida à parte, e um 403 nela é uma resposta
     legítima — para quem não pode ver o financeiro. Para quem pode, é uma
     fonte em baixo, e ficava calada: a carteira aparecia inteira, com todos
     os honorários vazios, com ar de não estarem preenchidos. */
  if(b.semFinanceiro && estado.financeiro
     && estado.fontesEmFalta.indexOf("ProjectFinance") < 0)
    estado.fontesEmFalta = estado.fontesEmFalta.concat(["ProjectFinance"]);
  estado.stale = b.stale;
  estado.lastSync = b.lastSync;
  estado.indice = construir({projetos:estado.projetos, clientes:estado.clientes,
                             tarefas:estado.tarefas,
                             consultas:estado.consultas});
  if(!b.stale) await sync.flushOutbox();
  await actualizarPendentes();
  pintar();
}

async function arrancar(){
  /* O Service Worker regista-se primeiro e sozinho: o shell offline não pode
     depender de haver configuração, nem de a autenticação correr bem. Estava
     no fim, e uma app registada no Entra por configurar ficava sem offline
     sem ninguém perceber porquê. */
  if("serviceWorker" in navigator){
    try{ await navigator.serviceWorker.register("./sw.js"); }
    catch(e){ /* sem SW, a app continua — só não abre sem rede */ }
  }

  store = await criarStore();
  sync = criarSync({
    store,
    estaOnline: () => navigator.onLine,
    enviar: async m => {
      if(!hub) throw new Error("sem ligação");
      if(m.type === "task.complete" || m.type === "project.state"){
        const lista = m.entity;
        const alvo = await hub.get(lista, m.entityId || m.id);
        if(!alvo) throw new Error("item desaparecido");
        return hub.atualizar(lista, alvo.__itemId, m.payload, m.baseVersion || alvo.__etag);
      }
      return hub.criar(m.entity, m.payload);
    },
    aoMudarEstado: e => { estado.sync = e; marcarNavegacao(router.actual().nome); }
  });

  router = criarRouter(ROTAS, () => pintar());

  /* Delegado, e não ligado uma vez a cada botão: o palco é repintado a cada
     mudança de ecrã, e um listener posto no arranque morre com o HTML que o
     tinha. Ligações dentro de uma vista deixavam de funcionar sem um erro
     que se visse — o clique simplesmente não fazia nada. */
  document.addEventListener("click", ev => {
    const b = ev.target.closest ? ev.target.closest("[data-rota-ir]") : null;
    if(b) router.ir(b.getAttribute("data-rota-ir"));
  });
  /* Uma linha que leva a outro ecrã também tem de responder ao teclado: com
     role="link" e tabindex, quem navega por tabulação chega lá e carrega. */
  document.addEventListener("keydown", ev => {
    if(ev.key !== "Enter" && ev.key !== " ") return;
    const b = ev.target.closest ? ev.target.closest("[data-rota-ir]") : null;
    if(!b) return;
    ev.preventDefault();
    router.ir(b.getAttribute("data-rota-ir"));
  });
  const marca = document.querySelector('[data-acao="trocar-marca"]');
  if(marca) marca.addEventListener("click", () => trocarMarca());

  window.addEventListener("online", () => { sincronizar(); });
  window.addEventListener("offline", () => { estado.stale = true; pintar(); });

  /* Primeiro pinta-se com o que está em cache — abrir tem de ser instantâneo
     — e só depois se vai à rede. */
  await sincronizarLocal();
  router.arrancar();

  const cfg = window.CORP_CONFIG;
  if(!cfg){ estado.erro = "Falta o config.js: copie o config.example.js."; pintar(); return; }

  let r = {ok:false};
  try{ r = await auth.init(cfg); }
  catch(e){ estado.erro = "Autenticação indisponível: " + (e.message || e); }
  if(r.ok && auth.conta()){
    const graph = criarGraph({token:auth.token});
    try{
      const siteId = await descobrirSite(graph, cfg.siteHostname, cfg.sitePath);
      const provisorio = criarDataHub({graph, siteId, listas:{}});
      /* As Lists que a app precisa vêm do código, não da configuração:
         acrescentar uma vista e esquecer o «config.js» dava um ecrã vazio
         sem erro nenhum. O que estiver configurado junta-se, para uma
         instalação poder ter mais. */
      const listas = await provisorio.descobrirListas(
        LISTAS_NECESSARIAS.concat(cfg.listas || [])
          .filter((n, i, a) => a.indexOf(n) === i));
      hub = criarDataHub({graph, siteId, listas});
      const conta = auth.conta();
      const autorizado = await auth.autorizar(hub, conta.username);
      if(!autorizado.permitido){
        estado.erro = "Acesso negado: " + autorizado.razao;
        hub = null; pintar(); return;
      }
      estado.utilizador = {upn:conta.username, nome:conta.name, papel:autorizado.papel};
      estado.financeiro = podeVerFinanceiro(autorizado.registo);
      await sincronizar();
    }catch(e){
      estado.erro = "Não foi possível ligar ao Data Hub: " + (e.message || e);
      pintar();
    }
  }else{
    pintar();
  }

}

async function sincronizarLocal(){
  const [projects, clients, tasks, consultations, quality,
         collaborations, awards, notes] = await Promise.all([
    store.getAll("projects"), store.getAll("clients"), store.getAll("tasks"),
    store.getAll("consultations"), store.getAll("quality"),
    store.getAll("collaborations"), store.getAll("awards"), store.getAll("notes")
  ]);
  estado.projetos = comRotulos(projects); estado.clientes = clients; estado.tarefas = tasks;
  estado.consultas = consultations; estado.qualidade = quality;
  estado.notas = (notes || []).map(notaCanonica);
  estado.colaboracoes = (collaborations || []).filter(c =>
    !c.brand || c.brand === estado.marca);
  estado.premios = (awards || []).filter(p => !p.brand || p.brand === estado.marca);
  estado.lastSync = await store.meta("lastSync");
  estado.stale = !!estado.lastSync;
  estado.indice = construir({projetos:projects, clientes:clients,
                             tarefas:tasks, consultas:consultations});
  await actualizarPendentes();
}

arrancar();
