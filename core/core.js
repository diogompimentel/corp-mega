/* Core canónico CO.RP — gerado por mobile/build.py a partir de nucleo/.

   Não editar aqui: editar em nucleo/ e voltar a construir. */

/* ---- nucleo/identidade.js ---- */
/* =======================================================================
   IDENTIDADE CANÓNICA — UMA ASSOCIAÇÃO SÓ QUANDO É INEQUÍVOCA

   Isto esteve em «adaptadores/identidade-projetos.js», onde só o desktop
   lhe chegava. A Mega App precisa da mesma decisão em três sítios — no
   desktop, no Sync Agent que corre em Node e na PWA do telemóvel — e uma
   regra de identidade repetida em três sítios é uma regra que diverge.

   Aqui não há browser, disco nem rede: entra texto e candidatos, sai um
   estado. «associado» quando a evidência é inequívoca, «ambiguo» quando há
   mais do que um candidato compatível, «nao-associado» quando não há
   nenhum. Nunca se decide por substring casual: um nome que aparece dentro
   de vários candidatos deixa o caso ambíguo, para a confirmação humana o
   resolver com um alias que fica escrito.
   ======================================================================= */
(function(){
"use strict";

var NUC = window.NUC || (window.NUC = {});

/* Os tipos de obra que a casa usa, em português e em inglês — o website
   escreve «houses», a pasta escreve «Casas». Duas grafias do mesmo tipo
   não podem separar identidades; dois tipos diferentes não podem juntá-las. */
var TIPOS = {
  house:"casa", houses:"casas", casa:"casa", casas:"casas",
  apartment:"apartamento", apartments:"apartamento", apartamento:"apartamento", apartamentos:"apartamento",
  patio:"patio", patios:"patio", "pátio":"patio", "pátios":"patio",
  building:"edificio", buildings:"edificio", edificio:"edificio", edificios:"edificio",
  housing:"habitacao", habitacao:"habitacao", barn:"celeiro", celeiro:"celeiro",
  market:"mercado", mercado:"mercado", pavilion:"pavilhao", pavilhao:"pavilhao"
};
var PARAR = {in:1, at:1, of:1, the:1, a:1, o:1, os:1, as:1, em:1, no:1, na:1, nos:1, nas:1,
  do:1, da:1, dos:1, das:1, de:1, d:1, and:1, e:1, project:1, projeto:1,
  architecture:1, arquitetura:1};

function semAcentos(s){
  return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/* O número da pasta é arrumação da casa, não nome do trabalho: «35. Casas
   no Rogil» e «Casas no Rogil» são o mesmo projeto. */
NUC.normalizarIdentidade = function(s){
  return semAcentos(s).replace(/^\s*\d+\s*[.\-_]\s*/, "")
    .replace(/[_\-]+/g, " ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
};

function assinatura(s){
  var bruto = NUC.normalizarIdentidade(s).split(/\s+/).filter(Boolean), tipo = null, lugar = [];
  bruto.forEach(function(t){
    var x = TIPOS[t] || t;
    if(TIPOS[t] && !tipo) tipo = TIPOS[t];
    if(!PARAR[x] && !TIPOS[t]) lugar.push(x);
  });
  return {normal:NUC.normalizarIdentidade(s), tipo:tipo, lugar:lugar, lugarTxt:lugar.join(" ")};
}
function nomeDe(c){
  return (c && typeof c === "object") ? (c.nome || c.titulo || c.pasta || c.name || "") : String(c || "");
}
function aliasesDe(c){
  return (c && typeof c === "object" && Array.isArray(c.aliases)) ? c.aliases : [];
}
function resultado(estado, candidato, origem, candidatos){
  return {estado:estado, candidato:candidato || null, origem:origem || null,
          candidatos:(candidatos || []).slice()};
}
function compativelTipo(a, b){ return !(a.tipo && b.tipo && a.tipo !== b.tipo); }
function subconjunto(a, b){
  if(!a.length || !b.length) return false;
  return a.every(function(x){ return b.indexOf(x) >= 0; });
}

/* A ordem é a aprovada: nome normalizado exato, alias confirmado e só
   depois os tokens distintivos — e estes apenas quando dão um único
   candidato. Cada passo diz de onde veio a decisão em «origem». */
NUC.resolverIdentidade = function(nome, candidatos){
  candidatos = Array.isArray(candidatos) ? candidatos : [];
  var alvo = assinatura(nome), exatos = [], alias = [];
  if(!alvo.normal) return resultado("nao-associado");
  candidatos.forEach(function(c){
    if(NUC.normalizarIdentidade(nomeDe(c)) === alvo.normal) exatos.push(c);
    aliasesDe(c).forEach(function(a){
      if(NUC.normalizarIdentidade(a) === alvo.normal) alias.push(c);
    });
  });
  if(exatos.length === 1) return resultado("associado", exatos[0], "exato");
  if(exatos.length > 1) return resultado("ambiguo", null, "exato", exatos);
  alias = alias.filter(function(c, i, a){ return a.indexOf(c) === i; });
  if(alias.length === 1) return resultado("associado", alias[0], "alias");
  if(alias.length > 1) return resultado("ambiguo", null, "alias", alias);

  var possiveis = [];
  candidatos.forEach(function(c){
    var q = assinatura(nomeDe(c));
    if(!q.lugar.length || !alvo.lugar.length || !compativelTipo(alvo, q)) return;
    var exatoLugar = (q.lugarTxt === alvo.lugarTxt);
    var contem = subconjunto(alvo.lugar, q.lugar) || subconjunto(q.lugar, alvo.lugar);
    if(!exatoLugar && !contem) return;
    var comuns = alvo.lugar.filter(function(x, i, a){
      return a.indexOf(x) === i && q.lugar.indexOf(x) >= 0;
    }).length;
    if(comuns < 1) return;
    possiveis.push({c:c, exatoLugar:exatoLugar, comuns:comuns, tamanho:q.lugar.length});
  });
  var lugarExato = possiveis.filter(function(x){ return x.exatoLugar; });
  if(lugarExato.length === 1) return resultado("associado", lugarExato[0].c, "tokens");
  if(lugarExato.length > 1)
    return resultado("ambiguo", null, "tokens", lugarExato.map(function(x){ return x.c; }));
  if(possiveis.length === 1) return resultado("associado", possiveis[0].c, "tokens");
  if(possiveis.length > 1)
    return resultado("ambiguo", null, "tokens", possiveis.map(function(x){ return x.c; }));
  return resultado("nao-associado");
};

})();

/* =======================================================================
   A GRAFIA DA CASA

   Uma lista com «Carlos Pereira» ao lado de «DIRK JUUL PAUL LEROY» tem duas
   grafias, e uma delas está a gritar. O Moloni e as cadernetas exportam o
   que o formulário guardou — tudo em maiúsculas — porque são formulários,
   não capas de processo.

   Isto vive no núcleo e não num adaptador porque a grafia tem de ser a
   mesma nas três apps: o que o Atelier mostra, o que o telemóvel mostra e
   o que vai para o Data Hub. Uma por sítio seria três.

   Só se corrige o que está claramente a gritar — um nome sem uma única
   minúscula. Um nome escrito à mão, com maiúsculas e minúsculas, é uma
   decisão de alguém, e a app não reescreve decisões.
   ======================================================================= */
(function(){
"use strict";
var NUC = window.NUC || (window.NUC = {});

var LIGACOES = /^(de|da|do|das|dos|e|em|a|o|as|os|à|ao|van|von|der|den)$/;
var FORMAS = {"lda":"Lda", "ldª":"Lda", "sa":"SA", "s.a.":"S.A.", "sarl":"SARL",
              "unipessoal":"Unipessoal", "crl":"CRL", "sgps":"SGPS", "eirl":"EIRL"};

function _palavra(w, i, anterior){
  var limpo = w.replace(/[.,;]$/, ""), pont = w.slice(limpo.length);
  if(FORMAS[w]) return FORMAS[w];
  if(FORMAS[limpo]) return FORMAS[limpo] + pont;
  /* A letra de um andar não é a conjunção «e». «2.º E» é o lado esquerdo
     do segundo piso, e escrevê-lo «2.º e» transforma uma morada em erro —
     apareceu à primeira morada real que passou por aqui. Uma letra sozinha
     a seguir a um ordinal é designação, não ligação. */
  if(limpo.length === 1 && /[0-9]\s*[ºª°.]*$/.test(String(anterior || "").trim()))
    return limpo.toUpperCase() + pont;
  if(i > 0 && LIGACOES.test(limpo)) return w;
  if(/^\d/.test(limpo)) return w;
  if(/^[ivxlcdm]+$/i.test(limpo) && limpo.length > 1) return limpo.toUpperCase() + pont;
  /* Um topónimo com hífens não é uma palavra só: «Montemor-o-Novo» tem duas
     maiúsculas e um conector no meio. Capitalizar só a primeira letra dava
     «Montemor-o-novo». */
  return w.split("-").map(function(parte, k){
    if(!parte) return parte;
    if(k > 0 && LIGACOES.test(parte.replace(/[.,;]$/, ""))) return parte;
    /* Uma abreviatura leva a letra seguinte em maiúscula e o espaço que lhe
       falta: «D.joão» é «D. João». O ponto final da palavra não conta —
       senão «Lda.» ficava com um espaço pendurado. */
    var subs = parte.split(".");
    return subs.map(function(sub, n){
      if(!sub) return sub;
      return sub.charAt(0).toUpperCase() + sub.slice(1);
    }).join(".").replace(/\.(?=[A-Za-zÀ-ÿ])/g, ". ");
  }).join("-");
}

NUC.grafiaDaCasa = function(t){
  var partes = String(t || "").toLowerCase().split(/(\s+)/);
  var anterior = "";
  return partes.map(function(w, i){
    if(/^\s+$/.test(w)) return w;
    var r = _palavra(w, i, anterior);
    anterior = w;
    return r;
  }).join("");
};

/* O nome como se escreve numa capa de processo. Devolve-o intacto se
   alguém já lhe deu forma. */
NUC.nomeLegivel = function(nome){
  var t = String(nome == null ? "" : nome).trim();
  if(!t) return t;
  if(/[a-záàâãéêíóôõúçñ]/.test(t)) return t;
  return NUC.grafiaDaCasa(t);
};

})();


/* ---- nucleo/canonico.js ---- */
/* =======================================================================
   CONTRATO CANÓNICO V1 — PROJETO, CLIENTE E CONSULTA

   O desktop, o Sync Agent e a PWA leem a mesma projeção. Para isso a forma
   tem de ser fixa: os mesmos campos, sempre, mesmo quando estão vazios. Um
   campo que às vezes existe e às vezes não obriga cada ecrã a adivinhar, e
   é assim que se voltam a escrever três leituras financeiras diferentes.

   Aqui não se lê fonte nenhuma. A evidência chega já resolvida — proposta
   associada, Moloni reconciliado, horas consolidadas — e o que este
   ficheiro faz é dizer o que se pode afirmar com ela:

     · o que não se sabe fica «null», nunca zero;
     · uma conta só se faz quando as duas bases são fiáveis;
     · faturar acima dos honorários conhecidos não dá saldo negativo:
       dá «honorários a rever», que é o estado real;
     · a proveniência viaja com o valor.
   ======================================================================= */
(function(){
"use strict";

var NUC = window.NUC || (window.NUC = {});

NUC.VERSAO_MEGA = 1;

var MARCAS = {corp:1, opere:1};

function cent(v){ return Math.round(v * 100) / 100; }
function num(v){ return (typeof v === "number" && isFinite(v)) ? v : null; }
function texto(v){
  var s = (v === undefined || v === null) ? "" : String(v);
  return s ? s : null;
}
function lista(v){ return Array.isArray(v) ? v.slice() : []; }
function marca(v){
  var m = String(v || "").toLowerCase();
  return MARCAS[m] ? m : null;
}
function marcas(v){
  var vistas = {}, r = [];
  lista(v).forEach(function(x){
    var m = marca(x);
    if(m && !vistas[m]){ vistas[m] = 1; r.push(m); }
  });
  return r;
}
function nomeCanonico(v){
  return (typeof NUC.normalizarIdentidade === "function") ? NUC.normalizarIdentidade(v) : null;
}

/* ---------- contra o que é que se fatura --------------------------------
   Nem sempre o que se fatura é o que fica em casa: em alguns projetos a
   CO.RP contrata o trabalho todo e as especialidades faturam-lhe a ela
   depois. Aí «fees» é a quota da arquitetura — a receita, e o que divide as
   horas — e «contract» é o que sai em fatura para o cliente. O que falta
   faturar, e o que conta como faturar a mais, medem-se contra o segundo.

   Isto vive aqui e chama-se de fora porque estava escrito em dois sítios e
   os dois discordavam: a qualidade comparava o faturado com a quota e
   marcava «honorários a rever» nos quatro contratos públicos — os de maior
   valor da casa — enquanto o Financeiro, na mesma sessão, mostrava
   honorários acima do faturado. Uma regra escrita duas vezes é uma regra
   que diverge; escrita uma vez, não. */
NUC.baseFaturavel = function(f){
  f = f || {};
  var fees = (typeof f.fees === "number") ? f.fees : null;
  var contract = (typeof f.contract === "number") ? f.contract : null;
  return (contract !== null && (fees === null || contract > fees)) ? contract : fees;
};

/* ---------- quanto rendeu a hora ----------------------------------------
   Uma divisão precisa de um divisor que signifique alguma coisa. Os
   honorários são de vida inteira do projeto e as horas só existem desde
   16-06-2026: um projeto antigo que tenha três minutos medidos dá uma taxa
   que não é uma taxa. Na Rua do Beato liam-se «1.653.113 €/h» sobre 0,05 h,
   e no Monte Só «1.881.000 €/h» sobre 0,01 h — números que ninguém pode
   usar e que empurram a média da casa para cima.

   Abaixo de uma hora medida não se afirma taxa nenhuma, e diz-se porquê. A
   hora é o mínimo por ser a menor unidade em que a frase «este projeto
   rendeu X por hora» ainda quer dizer alguma coisa. */
NUC.HORAS_MINIMAS_PARA_TAXA = 1;

NUC.taxaHoraria = function(valor, horas){
  if(typeof valor !== "number" || valor === 0) return null;
  if(typeof horas !== "number" || !horas) return null;
  if(horas < NUC.HORAS_MINIMAS_PARA_TAXA) return null;
  return Math.round(valor / horas * 100) / 100;
};

NUC.porqueSemTaxaHoraria = function(valor, horas){
  if(typeof horas === "number" && horas > 0 && horas < NUC.HORAS_MINIMAS_PARA_TAXA)
    return "menos de uma hora medida neste projeto";
  return null;
};

/* ---------- o dinheiro -------------------------------------------------
   Cada conta tem os seus requisitos, e um requisito em falta dá «por
   saber». Zero é uma afirmação: só aparece quando a fonte o disse. */
function financeiro(f, saude){
  f = f || {};
  var fees = num(f.fees), invoiced = num(f.invoiced), received = num(f.received),
      produced = num(f.produced), hours = num(f.hours), contract = num(f.contract),
      expenses = num(f.expenses);
  /* Despesas refaturadas — deslocações, visitas — saem na fatura e o cliente
     paga-as, mas não são honorários. Ficam no «invoiced», que é o que a
     contabilidade viu, e descontam-se só na comparação com o acordado: sem
     isto, qualquer projeto que refature deslocações acusava «faturado mais do
     que os honorários» para sempre. No Monte Só eram 276,13 EUR de cada lado,
     que são exactamente as visitas. Dito pelo Diogo a 2026-09-08. */
  var honorariosFaturados = (invoiced === null) ? null
    : cent(invoiced - (expenses || 0));

  var faturavel = NUC.baseFaturavel({fees:fees, contract:contract});

  /* Faturar mais do que o que há para faturar é um desacordo entre duas
     fontes que se dizem ambas certas. Mostrar um «por faturar» negativo
     seria trocar um número falso por um matematicamente correto e
     igualmente enganador; limar a zero seria esconder. */
  var conflito = (faturavel !== null && honorariosFaturados !== null
                  && honorariosFaturados > faturavel);
  if(conflito && saude.indexOf("fees-review") < 0) saude.push("fees-review");

  /* O excesso de recebimentos entra na fila de exceções pelo mesmo caminho
     que os honorários a rever: é um desacordo entre duas fontes, não um
     erro de cálculo desta função. */
  if(invoiced !== null && received !== null && received > invoiced
     && saude.indexOf("over-received") < 0) saude.push("over-received");

  return {
    fees: fees,
    produced: produced,
    invoiced: invoiced,
    expenses: expenses,
    /* o que do faturado é honorário: é este que se compara com o acordado */
    invoicedFees: honorariosFaturados,
    contract: contract,
    /* O que falta faturar mede-se contra o que do faturado foi honorário: as
       despesas refaturadas não abatem ao acordado. No Monte Só Guest House,
       4.500 EUR acordados com 1.440 EUR de honorários faturados deixam
       3.060 EUR — e não 2.783,87 EUR, que era o mesmo desconto das visitas a
       aparecer outra vez, agora do lado errado da conta. */
    toInvoice: (faturavel !== null && honorariosFaturados !== null && !conflito)
      ? cent(faturavel - honorariosFaturados) : null,
    received: received,
    /* Receber mais do que se faturou não é uma dívida negativa. Na Casa em
       Pêra de Cima, 1.650 € faturados contra 2.366,80 € recebidos davam
       «−716,80 € por receber» — um número que não quer dizer nada e que
       ninguém sabe o que fazer com ele. Por receber é zero: não há nada a
       cobrar. O excesso não desaparece por isso — sai ao lado, com o valor,
       porque pode ser um adiantamento, uma nota de crédito, uma associação
       errada ou uma regularização, e nenhuma dessas se adivinha daqui. */
    toReceive: (invoiced !== null && received !== null)
      ? Math.max(0, cent(invoiced - received)) : null,
    overReceived: (invoiced !== null && received !== null && received > invoiced)
      ? cent(received - invoiced) : null,
    hours: hours,
    /* Honorários zero não é um honorário pequeno: é trabalho que a casa
       decidiu não cobrar. Dividi-lo por horas daria «0 €/h», que se lê
       como um projeto ruinoso quando é uma decisão.

       Divide a quota da arquitetura e não o contrato: é ela a receita da
       casa, e é dela que as horas saíram. */
    eurPerHour: NUC.taxaHoraria(fees, hours)
  };
}

/* ---------- a ordem da carteira -----------------------------------------
   A numeração da casa é a ordem do portfólio, do mais recente para o mais
   antigo: o 47 está em cima porque é nele que se está a trabalhar, e o 01
   em baixo porque acabou há anos. Estado e alertas ficam nas colunas — se
   mudassem a posição, o projeto saltava de sítio de cada vez que algo lhe
   acontecesse, e não se voltava a encontrar nada onde estava.

   Vive aqui, e não na carteira do desktop onde nasceu, porque o telemóvel
   precisa da mesma ordem e o build já lhe copia este ficheiro. Duas listas
   dos mesmos projetos por ordens diferentes são duas carteiras.

   Aceita as duas formas que existem: a linha da carteira, que já traz
   «numero» e «nome», e o projeto canónico, que traz «folderRef». */
NUC.numeroDoProjeto = function(ref){
  var m = String(ref == null ? "" : ref).trim().match(/^(\d+)\s*[.\-]/);
  return m ? parseInt(m[1], 10) : null;
};
function nomeParaOrdem(p){
  p = p || {};
  return String(p.nome || p.name || p.folderRef || p.pasta || "")
    .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
function numeroParaOrdem(p){
  p = p || {};
  if(typeof p.numero === "number") return p.numero;
  return NUC.numeroDoProjeto(p.folderRef || p.pasta || p.code || p.name || p.nome);
}
NUC.compararProjetos = function(a, b){
  var na = numeroParaOrdem(a), nb = numeroParaOrdem(b);
  if(na !== null && nb !== null && na !== nb) return nb - na;
  if(na !== null && nb === null) return -1;
  if(na === null && nb !== null) return 1;
  var xa = nomeParaOrdem(a), xb = nomeParaOrdem(b);
  return xa < xb ? -1 : (xa > xb ? 1 : 0);
};
NUC.ordenarProjetos = function(lista){
  return (lista || []).slice().sort(NUC.compararProjetos);
};

NUC.projetoCanonico = function(input){
  input = input || {};
  var saude = lista(input.health).slice();
  var nome = texto(input.name);
  return {
    schemaVersion: NUC.VERSAO_MEGA,
    id: texto(input.id),
    brand: marca(input.brand),
    code: texto(input.code),
    name: nome,
    /* o nome canónico não é decoração: é a chave por que a identidade se
       compara, e sai da mesma função que o Sync e a PWA usam */
    canonicalName: nome ? nomeCanonico(nome) : null,
    folderRef: texto(input.folderRef),
    clientId: texto(input.clientId),
    location: texto(input.location),
    phase: texto(input.phase),
    operationalState: texto(input.operationalState),
    nextAction: texto(input.nextAction),
    /* Desde quando é que se espera. Um projeto «A aguardar Câmara» sem esta
       data é uma frase sem prazo: pode ser de ontem ou de há sete meses, e
       são coisas diferentes. Não se sabendo, fica por saber — nunca zero,
       que se leria como «desde hoje». */
    waitingSince: texto(input.waitingSince),
    waitingDays: num(input.waitingDays),
    progress: num(input.progress),
    finance: financeiro(input.finance, saude),
    health: saude,
    provenance: input.provenance || {},
    updatedAt: texto(input.updatedAt)
  };
};

NUC.clienteCanonico = function(input){
  input = input || {};
  /* A grafia da casa aqui, e não em cada ecrã: o nome que sai daqui é o
     que o Atelier mostra, o que o telemóvel mostra e o que vai para o Data
     Hub. Três sítios a decidir a grafia seriam três grafias. */
  var nome = (typeof NUC.nomeLegivel === "function")
    ? NUC.nomeLegivel(texto(input.name)) : texto(input.name);
  return {
    schemaVersion: NUC.VERSAO_MEGA,
    id: texto(input.id),
    name: nome,
    canonicalName: nome ? nomeCanonico(nome) : null,
    fiscalName: texto(input.fiscalName),
    nif: texto(input.nif),
    emails: lista(input.emails),
    phones: lista(input.phones),
    /* Um cliente pode trabalhar com as duas marcas sem virar dois
       clientes: as marcas acumulam-se na mesma ficha. */
    brands: marcas(input.brands),
    moloniCustomerIds: lista(input.moloniCustomerIds).map(String),
    aliases: lista(input.aliases),
    updatedAt: texto(input.updatedAt)
  };
};

NUC.consultaCanonica = function(input){
  input = input || {};
  var obra = texto(input.workName);
  return {
    schemaVersion: NUC.VERSAO_MEGA,
    id: texto(input.id),
    brand: marca(input.brand),
    reference: texto(input.reference),
    clientId: texto(input.clientId),
    workName: obra,
    canonicalName: obra ? nomeCanonico(obra) : null,
    status: texto(input.status),
    proposalRefs: lista(input.proposalRefs),
    selectedProposalRef: texto(input.selectedProposalRef),
    /* Adjudicar não apaga a consulta: fica ligada ao projeto que gerou. */
    projectId: texto(input.projectId),
    createdAt: texto(input.createdAt),
    updatedAt: texto(input.updatedAt)
  };
};

/* ---------- trabalho que não é projeto ------------------------------------
   Nem tudo o que a casa fatura tem pasta em «02. Projetos». Duas coisas
   ficavam de fora, e o dinheiro delas não pertencia a nada:

   Uma COLABORAÇÃO é trabalho de arquitetura dentro do processo de outro — a
   Quadrante contrata a CO.RP para uma parte, e identifica cada trabalho por
   uma referência de contrato dela, «T2025-028-01». Não tem fases da casa nem
   licenciamento próprio, nasce da consulta e nunca migra para projeto. São
   32.650 € que estavam sem casa.

   Um PRÉMIO é o dinheiro de um concurso ganho. Não tem honorários acordados
   nem nada por faturar: recebe-se o que o júri decidiu. Tratá-lo como
   projeto punha um «por faturar» onde não há nada a faturar — 20.600 € que
   apareciam como trabalho por cobrar.

   Ambos são canónicos como os projetos: mesma versão de esquema, mesma
   identidade, mesma regra de que o que não se sabe fica nulo. */
NUC.colaboracaoCanonica = function(input){
  input = input || {};
  var nome = texto(input.name);
  var f = input.finance || {};
  var fees = num(f.fees), invoiced = num(f.invoiced);
  return {
    schemaVersion: NUC.VERSAO_MEGA,
    id: texto(input.id),
    brand: marca(input.brand),
    clientId: texto(input.clientId),
    /* a referência do cliente é o que identifica o trabalho do lado dele, e
       é por ela que as faturas se reconhecem umas às outras */
    clientRef: texto(input.clientRef),
    name: nome,
    canonicalName: nome ? nomeCanonico(nome) : null,
    consultationRef: texto(input.consultationRef),
    /* uma colaboração que acabe por gerar projeto fica ligada a ele */
    projectId: texto(input.projectId),
    status: texto(input.status),
    finance: {
      fees: fees,
      invoiced: invoiced,
      toInvoice: (fees !== null && invoiced !== null && invoiced <= fees)
        ? cent(fees - invoiced) : null,
      hours: num(f.hours)
    },
    health: lista(input.health),
    provenance: input.provenance || {},
    createdAt: texto(input.createdAt),
    updatedAt: texto(input.updatedAt)
  };
};

NUC.premioCanonico = function(input){
  input = input || {};
  var nome = texto(input.name);
  return {
    schemaVersion: NUC.VERSAO_MEGA,
    id: texto(input.id),
    brand: marca(input.brand),
    name: nome,
    canonicalName: nome ? nomeCanonico(nome) : null,
    /* quem lançou o concurso: IHRU, SRU, IST */
    entity: texto(input.entity),
    clientId: texto(input.clientId),
    classification: texto(input.classification),
    /* o que o júri atribuiu, e o que já entrou em fatura */
    amount: num(input.amount),
    invoiced: num(input.invoiced),
    year: num(input.year),
    health: lista(input.health),
    provenance: input.provenance || {},
    createdAt: texto(input.createdAt),
    updatedAt: texto(input.updatedAt)
  };
};

/* ---------- vocabulário operacional -------------------------------------
   Fase e Estado dizem coisas diferentes, e o ecrã só deixa de as repetir se
   o vocabulário do estado não contiver fases. «Em licenciamento · a
   aguardar cliente» era a mesma informação duas vezes, uma delas errada de
   categoria.

   A lista é fechada de propósito: quando cada projeto inventa a sua frase,
   filtrar por «o que está à espera do cliente» deixa de ser possível. */
NUC.ESTADOS_OPERACIONAIS = ["A aguardar cliente", "A aguardar Câmara", "A aguardar terceiros",
                            "Ação CO.RP", "Ação OPERE", "Suspenso", "Concluído"];

NUC.estadoOperacionalCanonico = function(op, marca){
  if(!op || !op.estado) return null;
  var accao = (String(marca || "").toLowerCase() === "opere") ? "Ação OPERE" : "Ação CO.RP";
  var estado = String(op.estado);

  /* Um projeto fechado não está à espera de ninguém, escreva-se o que se
     escrever em «aguarda». */
  if(estado === "concluido") return "Concluído";
  if(estado === "suspenso") return "Suspenso";

  /* Quem escreveu «aguarda: cliente» disse quem tem a bola, e isso manda
     sobre o estado genérico: um projeto «ativo» à espera do cliente está à
     espera do cliente, não à espera de nós. */
  var quem = String(op.aguarda || "");
  if(quem || estado === "aguarda-terceiro"){
    if(quem === "cliente") return "A aguardar cliente";
    if(quem === "camara-entidade" || quem === "camara") return "A aguardar Câmara";
    if(quem === "corp") return (String(marca || "").toLowerCase() === "opere")
      ? "Ação OPERE" : "Ação CO.RP";
    /* As especialidades, um consultor, um laboratório: são terceiros, e não
       são o cliente nem a Câmara. */
    if(quem || estado === "aguarda-terceiro") return "A aguardar terceiros";
  }
  if(estado === "parado-corp" || estado === "sem-proxima-acao") return accao;
  if(estado === "ativo" || estado === "em-curso") return accao;
  return null;
};

/* ---------- progresso OPERE --------------------------------------------
   A regra aprovada tem três degraus e mais nenhum. Testes, drafts e
   revisões são trabalho dentro da produção, não percentagens; os 50/50 das
   condições de pagamento são faturação, não execução. */
var PROGRESSO_OPERE = {
  consulta: 0, "nao-adjudicado": 0,
  adjudicado: 50, producao: 50, "em-producao": 50,
  "entregue-concluido": 100, entregue: 100, concluido: 100
};
/* O caminho de volta do rótulo para o estado que o produziu.

   O telemóvel mostra o vocabulário canónico — «A aguardar cliente» — e é
   isso que a pessoa escolhe. Quem escreve no projeto precisa do par que o
   núcleo guarda: o estado e quem tem a bola. Sem esta função, cada sítio
   que quisesse escrever inventava a sua tradução, e duas traduções da mesma
   frase acabam por discordar.

   «Ação CO.RP» e «Ação OPERE» são o mesmo estado em marcas diferentes: quem
   tem a bola somos nós. */
NUC.doEstadoOperacionalCanonico = function(rotulo){
  var r = String(rotulo == null ? "" : rotulo).trim();
  if(r === "Concluído") return {estado:"concluido", aguarda:""};
  if(r === "Suspenso") return {estado:"suspenso", aguarda:""};
  if(r === "A aguardar cliente") return {estado:"aguarda-terceiro", aguarda:"cliente"};
  if(r === "A aguardar Câmara") return {estado:"aguarda-terceiro", aguarda:"camara-entidade"};
  if(r === "A aguardar terceiros") return {estado:"aguarda-terceiro", aguarda:"outro"};
  if(r === "Ação CO.RP" || r === "Ação OPERE") return {estado:"parado-corp", aguarda:"corp"};
  return null;
};

NUC.progressoOpere = function(fase){
  var id = String(fase == null ? "" : fase).toLowerCase();
  return Object.prototype.hasOwnProperty.call(PROGRESSO_OPERE, id) ? PROGRESSO_OPERE[id] : null;
};

/* ---------- frescura das fontes -----------------------------------------
   Um snapshot gerado hoje não faz de hoje tudo o que traz dentro. As fontes
   têm idades diferentes: as horas podem ser de anteontem, o SAF-T do Moloni
   ir só até ao dia 25, as mensagens pararem numa exportação de há duas
   semanas. Dizer «atualizado em 5 de setembro» sobre esse conjunto é dizer
   uma coisa que não é verdade de nada em particular.

   Aqui cada domínio responde por si: até que dia vai, quando foi lido, e se
   isso ainda serve. O que não se sabe fica por saber; uma fonte que não está
   ligada diz que não está ligada, e não passa por vazia.

   O limite é uma semana e está escrito num sítio só. Não é uma medida do
   universo: é a régua que a casa usa para decidir se um número ainda se
   pode apresentar sem uma nota ao lado. A data crua viaja sempre, para quem
   lê poder discordar da régua. */
NUC.DIAS_ATE_FONTE_VELHA = 7;

/* Os domínios que a app conhece. Estarem todos declarados é o que permite
   dizer «esta fonte não está ligada» em vez de não dizer nada — que se lê
   como «não há nada», e são coisas diferentes. */
NUC.DOMINIOS_DE_FONTE = ["hours", "finance", "messages", "calendar",
                         "proposals", "folders", "clients", "website"];

function diaDe(v){
  var m = String(v == null ? "" : v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[0] : null;
}
function diasEntreDias(a, b){
  a = diaDe(a); b = diaDe(b);
  if(!a || !b) return null;
  return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000);
}

NUC.frescuraDeUmaFonte = function(bruto, agora){
  var vazia = {status:"missing", source:null, generatedAt:null, sourceThrough:null,
               ageDays:null, message:null};
  if(!bruto || typeof bruto !== "object") return vazia;

  var fonte = texto(bruto.source || bruto.fonte);
  var gerada = texto(bruto.generatedAt || bruto.lidoEm);
  var ate = diaDe(bruto.sourceThrough || bruto.ate);
  var erro = texto(bruto.error || bruto.erro);

  if(erro){
    return {status:"error", source:fonte, generatedAt:gerada, sourceThrough:ate,
            ageDays:null, message:erro};
  }
  if(!fonte && !gerada && !ate) return vazia;

  /* Vale a data até onde a fonte vai; não a havendo, a da leitura. Uma
     exportação feita hoje de uma caixa que só foi lida até ao dia 23 não é
     informação de hoje — e é por isso que a primeira manda. */
  var referencia = ate || diaDe(gerada);
  var idade = referencia ? diasEntreDias(referencia, agora) : null;
  var estado = "unknown";
  if(idade !== null) estado = (idade > NUC.DIAS_ATE_FONTE_VELHA) ? "stale" : "ok";

  return {status:estado, source:fonte, generatedAt:gerada, sourceThrough:ate,
          ageDays:idade, message:null};
};

NUC.frescuraDeFontes = function(bruto, agora){
  bruto = (bruto && typeof bruto === "object") ? bruto : {};
  var out = {};
  var nomes = NUC.DOMINIOS_DE_FONTE.slice();
  Object.keys(bruto).forEach(function(k){ if(nomes.indexOf(k) < 0) nomes.push(k); });
  nomes.forEach(function(k){ out[k] = NUC.frescuraDeUmaFonte(bruto[k], agora); });
  return out;
};

})();


/* ---- nucleo/qualidade.js ---- */
/* =======================================================================
   QUALIDADE DOS DADOS — UMA FILA DE TRABALHO, NÃO UM PAINEL

   O objetivo é operacional: zero pendentes bloqueantes. Por isso isto não
   produz métricas nem gráficos; produz uma lista de coisas por resolver,
   cada uma com o que falta, de onde veio e o que a resolve.

   Regra de fundo: uma ambiguidade nunca se resolve à força para o ecrã
   ficar bonito. Um projeto que não se sabe a que cliente pertence aparece
   aqui — não aparece associado ao cliente mais provável.

   Lê apenas o projeto canónico. Não conhece Moloni, Graph nem pastas: o
   que a fonte já concluiu chega em «projeto.health» e é honrado tal como
   vem.
   ======================================================================= */
(function(){
"use strict";

var NUC = window.NUC || (window.NUC = {});

/* O catálogo de exceções. «blocking» quer dizer que enquanto isto estiver
   por resolver há uma decisão que não se pode tomar com confiança. */
/* Uma via urbana sem número não é uma morada completa — e vai assim para o
   requerimento. Mas nem toda a morada tem número: um prédio rústico
   identifica-se pelo lugar, «Monte Só» ou «Vale Juncal», e pedir-lhe um
   número é pedir o que não existe. O que separa os dois casos é a via: quem
   diz «Rua» ou «Avenida» está numa morada urbana e deve o número. */
var VIA_URBANA = /^\s*(rua|avenida|av\.?|travessa|tv\.?|largo|pra[çc]a|praceta|calçada|cal[çc]ada|beco|alameda|estrada|rotunda|escadinhas)\b/i;
function moradaUrbanaSemNumero(morada){
  var t = String(morada == null ? "" : morada).trim();
  if(!t) return false;
  if(!VIA_URBANA.test(t)) return false;
  /* «n.º 1», «lote 37», «12», «2.º E» — qualquer algarismo depois da via
     conta como identificação da parcela. */
  return !/\d/.test(t.replace(VIA_URBANA, ""));
}

/* Um valor em euros escrito à portuguesa. A mensagem de uma exceção é
   conteúdo, não apresentação: «716,80 €» decide-se, «há um excesso» não. */
function euros(v){
  if(typeof v !== "number" || !isFinite(v)) return "";
  var neg = v < 0;
  var partes = Math.abs(v).toFixed(2).split(".");
  var inteiro = partes[0], grupos = [];
  while(inteiro.length > 3){ grupos.unshift(inteiro.slice(-3)); inteiro = inteiro.slice(0, -3); }
  grupos.unshift(inteiro);
  return (neg ? "-" : "") + grupos.join(".") + "," + partes[1] + " €";
}

var CATALOGO = {
  "missing-canonical-id": {rotulo:"Atribuir identidade", acao:"identidade", severity:"alta", field:"id", blocking:true,
    message:"este projeto ainda não tem identidade canónica: sem ela não se pode ligar com segurança a propostas, faturação ou tarefas"},
  "ambiguous-client": {rotulo:"Confirmar cliente", acao:"cliente", severity:"alta", field:"clientId", blocking:true,
    message:"o cliente deste projeto está por confirmar"},
  "ambiguous-proposal": {rotulo:"Escolher proposta", acao:"proposta", severity:"alta", field:"finance.fees", blocking:true,
    message:"há mais do que uma proposta plausível para este projeto e nenhuma foi confirmada"},
  "moloni-unmatched": {rotulo:"Associar documentos", acao:"moloni", severity:"alta", field:"finance.invoiced", blocking:true,
    message:"há documentos Moloni por associar: o faturado deste projeto ainda não se pode afirmar"},
  "unconfirmed-proposal": {rotulo:"Confirmar honorários", acao:"honorarios", severity:"alta", field:"finance.fees", blocking:false,
    message:"há uma proposta com um total, mas o documento não diz se é sem IVA nem "
          + "se é só a parte da CO.RP — confirmar antes de contar como honorários"},
  "fees-review": {rotulo:"Rever honorários", acao:"honorarios", severity:"alta", field:"finance.fees", blocking:true,
    message:"já foi faturado mais do que os honorários conhecidos — há honorários a rever"},
  /* Recebido acima do faturado. A causa pode ser um adiantamento, uma nota
     de crédito, um pagamento associado ao projeto errado ou uma
     regularização — e nenhuma delas se deduz dos dois números. Diz-se o que
     se vê e pede-se que alguém veja; não trava o projeto, porque o trabalho
     de arquitetura não depende disto. */
  "over-received": {rotulo:"Rever recebimentos", acao:"recebimentos",
    severity:"alta", field:"finance.received", blocking:false,
    message:"há mais recebimentos do que faturação neste projeto — rever "
          + "associação, adiantamento ou regularização"},
  /* O estado diz que a bola está do nosso lado e não há nada escrito para
     fazer. Não se inventa a tarefa: pede-se a quem sabe que a escreva. */
  "missing-next-action": {rotulo:"Escrever próxima ação", acao:"proxima-acao",
    severity:"media", field:"nextAction", blocking:false,
    message:"este projeto está em ação da casa e não tem próxima ação definida"},
  /* Duas linhas de horas para o mesmo nome. Escolher uma seria escolher ao
     acaso; somá-las seria contar duas vezes. */
  "ambiguous-hours": {rotulo:"Resolver horas ambíguas", acao:"horas",
    severity:"media", field:"finance.hours", blocking:false,
    message:"há mais do que uma linha de horas para este nome — as horas "
          + "deste projeto ainda não se podem afirmar"},
  "unknown-phase": {rotulo:"Definir fase", acao:"fase", severity:"media", field:"phase", blocking:false,
    message:"a fase deste projeto não está escrita nem se deduz da evidência"},
  "uncertain-location": {rotulo:"Confirmar localização", acao:"local", severity:"baixa", field:"location", blocking:false,
    message:"a localização deste projeto está por confirmar"},
  "incomplete-location": {rotulo:"Completar morada", acao:"local", severity:"baixa", field:"location", blocking:false,
    message:"a morada tem a via mas não o número de polícia — vai assim para "
          + "o requerimento da câmara"},
  "duplicate": {rotulo:"Resolver duplicado", acao:"duplicado", severity:"alta", field:"canonicalName", blocking:true,
    message:"há mais do que um projeto com esta identidade"},
  "alias-required": {rotulo:"Confirmar associação", acao:"alias", severity:"media", field:"canonicalName", blocking:false,
    message:"esta associação precisa de um alias confirmado para não voltar a ser perguntada"},
  "stale-source": {rotulo:"Atualizar fonte", acao:"fonte", severity:"media", field:"updatedAt", blocking:false,
    message:"a fonte deste projeto não é lida há tempo suficiente para os valores serem de confiança"}
};

function base(tipo){
  return CATALOGO[tipo] || {rotulo:"Resolver", acao:"generico",
                            severity:"media", field:null, blocking:false,
                            message:"há uma exceção de dados por resolver"};
}

/* O que resolve cada exceção, em palavras de quem a vai resolver: «Rever
   honorários», «Escolher proposta», «Associar documentos». Vive aqui, ao lado
   da severidade e do campo, porque estava numa tabela à parte no ecrã da
   qualidade — as mesmas chaves escritas duas vezes — e o «Hoje» não lhe
   chegava: mostrava «dados por resolver» em todas as linhas de qualidade,
   que é o nome do tipo do item e não uma razão. Um leitor com três linhas
   iguais na coluna «Porquê» não sabe qual delas abrir primeiro. */
NUC.acaoDaExcecao = function(tipo){
  var b = base(tipo);
  return {rotulo:b.rotulo || "Resolver", acao:b.acao || "generico"};
};
/* O id da exceção tem de ser estável entre leituras: é por ele que uma
   confirmação humana se lembra do que já foi resolvido. */
function idDe(projeto, tipo){
  return "q:" + (projeto.id || projeto.folderRef || projeto.canonicalName || "sem-identidade") + ":" + tipo;
}
function excecao(projeto, tipo, extra){
  var b = base(tipo);
  extra = extra || {};
  var bloqueante = (extra.blocking === undefined) ? b.blocking : extra.blocking;
  return {
    id: idDe(projeto, tipo),
    /* De que projeto fala. Sem isto, «o cliente deste projeto está por
       confirmar» chega ao Hoje sem dizer qual, e quem lê fica a procurar
       em quarenta e seis pastas. Fica «null» quando o projeto ainda não
       tem identidade — que é, precisamente, uma das coisas que esta fila
       existe para acusar. */
    projectId: projeto.id || null,
    projectRef: projeto.folderRef || null,
    type: tipo,
    severity: b.severity,
    field: b.field,
    message: extra.message || b.message,
    candidates: extra.candidates || [],
    sources: extra.sources || [],
    blocking: !!bloqueante
  };
}

NUC.qualidadeDoProjeto = function(projeto){
  if(!projeto) return [];
  var fila = [], vistos = {};
  function juntar(tipo, extra){
    if(vistos[tipo]) return;
    vistos[tipo] = 1;
    fila.push(excecao(projeto, tipo, extra));
  }
  var fin = projeto.finance || {};
  /* Um projeto concluído ou suspenso já não tem trabalho vivo: o que lhe
     falta é arrumação de arquivo, não coisa que trave alguém. */
  var fechado = projeto.operationalState === "Concluído"
             || projeto.operationalState === "Suspenso";

  if(!projeto.id) juntar("missing-canonical-id", {sources:["core"]});
  if(!projeto.clientId){
    /* Num projeto fechado, saber quem foi o cliente é arrumação de arquivo
       e não trabalho por fazer. Continua na fila — mas não trava nada, e
       não vai encher o Hoje de quem tem trabalho vivo para despachar. */
    /* Uma exceção que diz «cliente por confirmar» e mais nada obriga a
       abrir o projeto para perceber de que cliente se fala. O nome que a
       consulta dá é a diferença entre uma fila que se despacha e uma lista
       que se ignora. */
    /* A pista já diz de onde vem o nome — da consulta, ou do requerente
       escrito no projeto. Repetir «a consulta diz» aqui dava a origem errada
       em dezassete dos dezoito casos, que são projetos sem consulta e com o
       requerente escrito à mão. Usa-se o que a proveniência afirma. */
    var pista = (projeto.provenance || {}).client || null;
    var nome = pista && String(pista).match(/«([^»]+)»/);
    var porque = pista ? String(pista).replace(/^por associar:\s*/, "") : null;
    juntar("ambiguous-client", {
      sources:["core"],
      blocking: !fechado,
      message: nome
        ? "o cliente deste projeto está por confirmar: " + porque
        : null,
      candidates: nome ? [nome[1]] : []
    });
  }
  /* Um projeto concluído ou suspenso não tem fase corrente: acabaram todas,
     ou pararam. Pedi-la enchia a fila com exceções que ninguém pode
     resolver — e uma fila com ruído é uma fila que se ignora. */
  if(!projeto.phase && !fechado) juntar("unknown-phase", {sources:["core"]});
  /* A morada não decide nada: impede abrir o mapa, não decidir o projeto.
     Enquanto bloqueou, 46 projetos entraram na fila por falta de morada e
     esconderam as exceções que travam mesmo trabalho. */
  if(!projeto.location) juntar("uncertain-location", {sources:["core"], blocking:false});
  else if(moradaUrbanaSemNumero(projeto.location))
    juntar("incomplete-location", {sources:["core"], blocking:false});
  /* Faturar acima do acordado mede-se contra o que há para faturar, que
     havendo contrato é o contrato e não a quota da arquitetura. A regra é a
     mesma do «canonico.js» — e é dele que vem, para não voltar a haver duas
     versões dela a discordarem no mesmo ecrã. */
  var faturavel = NUC.baseFaturavel(fin);
  /* Compara-se honorário com honorário: o que na fatura foi despesa
     refaturada não conta deste lado. */
  var faturadoEmHonorarios = (typeof fin.invoicedFees === "number")
    ? fin.invoicedFees : fin.invoiced;
  if(faturavel !== null && faturadoEmHonorarios !== null
     && faturadoEmHonorarios > faturavel)
    juntar("fees-review", {candidates:[faturavel, faturadoEmHonorarios],
                           sources:["propostas","moloni"]});
  /* «Há mais recebimentos do que faturação» sem o número obriga a abrir o
     projeto para saber se são sete euros ou setecentos. */
  if(typeof fin.overReceived === "number" && fin.overReceived > 0){
    /* Dizer qual documento carrega o excesso poupa abrir as faturas todas:
       na Casa em Pêra de Cima são quatro, e o excesso está inteiro numa. */
    var onde = (projeto.provenance || {}).received || null;
    juntar("over-received", {
      candidates:[fin.invoiced, fin.received], sources:["moloni"],
      message:"recebimentos superiores ao faturado: " + euros(fin.overReceived)
            + (onde ? (" — " + onde) : "")
            + " — rever associação, adiantamento ou regularização"});
  }

  /* Uma proposta ambígua trava enquanto o honorário depender dela. Quando o
     honorário já está escrito — no projeto ou no catálogo do atelier —,
     escolher entre duas propostas não muda número nenhum: o Edifício na
     Ajuda tem 4.250 € de catálogo, 4.250 € faturados e 4.250 € recebidos, e
     estava a travar o Hoje por causa de uma escolha que não altera nada.

     Continua na fila, porque a repartição por fases ainda sai da proposta e
     essa continua por decidir. Deixa é de travar, e diz porquê. Entra antes
     do que vem da fonte para que seja esta a versão que fica. */
  if((projeto.health || []).indexOf("ambiguous-proposal") >= 0 && fin.fees !== null)
    juntar("ambiguous-proposal", {
      sources:["propostas"], blocking:false,
      message:"há mais do que uma proposta plausível para este projeto — o "
            + "honorário não depende dela, já está escrito, mas a repartição "
            + "por fases sai daí"});

  /* O que a fonte já concluiu vem em «health» e é honrado tal como veio:
     o Core não repete a leitura para confirmar. */
  (projeto.health || []).forEach(function(h){
    if(typeof h === "string") juntar(h, {sources:["fonte"]});
    else if(h && h.type) juntar(h.type, {message:h.message, candidates:h.candidates, sources:h.sources});
  });
  return fila;
};

/* Uma fila só para toda a carteira: se cada ecrã fizer a sua, voltam a
   existir problemas que só aparecem num sítio. Bloqueantes primeiro, e o
   resto por gravidade — sem cortar nada. */
var PESO = {alta:0, media:1, baixa:2};
NUC.qualidadeDaCarteira = function(projetos){
  var fila = [];
  (projetos || []).forEach(function(p){
    NUC.qualidadeDoProjeto(p).forEach(function(i){ fila.push(i); });
  });
  return fila.sort(function(a, b){
    if(a.blocking !== b.blocking) return a.blocking ? -1 : 1;
    var pa = PESO[a.severity], pb = PESO[b.severity];
    if(pa !== pb) return pa - pb;
    return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
  });
};

})();


/* ---- nucleo/hoje.js ---- */
/* =======================================================================
   HOJE — A FILA DE AÇÃO DO DIA

   Não é um resumo do atelier: é a lista do que exige uma decisão ou um
   gesto hoje. Por isso não entra aqui informação passiva. Um projeto
   suspenso é um facto; não é uma ação. Uma tarefa vencida é uma ação.

   A ordem não é uma heurística escondida: é uma pontuação explícita,
   exposta em «NUC.prioridadeHoje» para poder ser testada isoladamente e
   discutida sem ler o resto do ficheiro.

     vencido ou bloqueante  →  hoje  →  próximo prazo  →  sem prazo

   Cada linha tem de trazer uma ação concreta. Uma linha sem ação é ruído
   e não deve estar aqui.
   ======================================================================= */
(function(){
"use strict";

var NUC = window.NUC || (window.NUC = {});

/* Os degraus da fila, com folga entre eles para o desempate por prazo não
   conseguir empurrar um item para outro degrau. */
var GRAU = {bloqueante:4000, vencido:3000, hoje:2000, futuro:1000, semPrazo:0};

/* Um número em euros escrito à portuguesa. O Core não desenha, mas o texto
   de um alerta é conteúdo, não apresentação: «faturar 1.475 €» decide-se;
   «faturar» não. */
function euros(v){
  if(typeof v !== "number" || !isFinite(v)) return "";
  var inteiro = Math.round(v);
  var texto = String(Math.abs(inteiro));
  var partes = [];
  while(texto.length > 3){
    partes.unshift(texto.slice(-3));
    texto = texto.slice(0, -3);
  }
  partes.unshift(texto);
  return (inteiro < 0 ? "-" : "") + partes.join(".") + " €";
}

function dia(v){
  var m = String(v == null ? "" : v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? (m[1] + "-" + m[2] + "-" + m[3]) : null;
}
function dias(a, b){
  a = dia(a); b = dia(b);
  if(!a || !b) return null;
  return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000);
}

/* A pontuação de um item. Quanto mais alto, mais acima na fila. Dentro do
   mesmo degrau, o prazo mais próximo ganha. */
NUC.prioridadeHoje = function(item, agora){
  item = item || {};
  if(item.blocking) return GRAU.bloqueante;
  var prazo = dia(item.dueAt);
  if(!prazo) return GRAU.semPrazo;
  var d = dias(agora, prazo);
  if(d === null) return GRAU.semPrazo;
  if(d < 0) return GRAU.vencido + Math.min(900, -d);
  if(d === 0) return GRAU.hoje;
  return GRAU.futuro + Math.max(0, 900 - d);
};

function item(dados){
  return {
    id: dados.id,
    type: dados.type,
    projectId: dados.projectId || null,
    /* A pasta, para quando não há identidade canónica. Um item que diz
       «este projeto não tem identidade» não pode ser nomeado pela
       identidade: é um círculo, e o ecrã ficava com uma fila de linhas
       iguais, todas sem dizer de quem falavam. A exceção sabe a pasta —
       basta não a deitar fora a caminho daqui. */
    projectRef: dados.projectRef || null,
    clientId: dados.clientId || null,
    title: dados.title,
    reason: dados.reason || null,
    dueAt: dados.dueAt || null,
    priority: 0,
    action: dados.action || null
  };
}
function projetoDe(projetos, id){
  var achado = null;
  (projetos || []).forEach(function(p){ if(!achado && p && p.id === id) achado = p; });
  return achado;
}

/* Um estado operacional só entra quando há alguma coisa por fazer com ele.
   «Suspenso» é uma decisão já tomada; «A aguardar cliente» com uma próxima
   ação escrita é trabalho por dar. */
var ESPERA = {"A aguardar cliente":1, "A aguardar Câmara":1, "A aguardar terceiros":1,
              "Ação CO.RP":1, "Ação OPERE":1};

/* Os estados em que a bola está do nosso lado. Neles, uma próxima ação
   vazia não é um projeto parado por decisão: é uma decisão que falta
   tomar. */
var ACAO_DA_CASA = {"Ação CO.RP":1, "Ação OPERE":1};

NUC.itensDeHoje = function(dados){
  dados = dados || {};
  var agora = dados.now || null;
  var projetos = dados.projects || [];
  var fila = [];

  (dados.tasks || []).forEach(function(t){
    /* O vocabulário do núcleo é «aberta / feita / dispensada»; «concluida»
       é o que o telemóvel escrevia. Aceitam-se os dois — o que não se pode
       é pôr no Hoje uma tarefa que alguém já fechou. */
    if(!t || t.completedAt) return;
    if(t.status && t.status !== "aberta") return;
    var p = projetoDe(projetos, t.projectId);
    fila.push(item({id:t.id, type:"task", projectId:t.projectId || null,
      clientId:(p && p.clientId) || t.clientId || null, title:t.title,
      reason:(p && p.name) || null, dueAt:t.dueAt || null,
      action:"abrir-tarefa"}));
  });

  (dados.meetings || []).forEach(function(m){
    if(!m) return;
    var quando = dia(m.startsAt || m.start || m.dueAt);
    if(!quando || dias(agora, quando) !== 0) return;
    var p = projetoDe(projetos, m.projectId);
    fila.push(item({id:m.id, type:"meeting", projectId:m.projectId || null,
      clientId:(p && p.clientId) || null, title:m.title,
      reason:(p && p.name) || "reunião de hoje", dueAt:quando,
      action:"abrir-reuniao"}));
  });

  (dados.quality || []).forEach(function(q){
    if(!q || !q.blocking) return;
    fila.push(item({id:q.id, type:"quality", projectId:q.projectId || null,
      projectRef:q.projectRef || null,
      title:q.message, reason:q.type, dueAt:null, action:"resolver-qualidade"}));
    fila[fila.length - 1].blocking = true;
  });

  /* ---------- alertas que a evidência sustenta sozinha -------------------
     Um alerta inventado é pior do que nenhum: ensina a ignorar a lista. Por
     isso só entram dois, e ambos com prova.

     O primeiro é da OPERE: um trabalho entregue com saldo por faturar é
     dinheiro em cima da mesa, e o ciclo da OPERE é curto o suficiente para
     isso ser sempre uma ação. Num projeto CO.RP a meio, um saldo por faturar
     é o estado normal — e alertar sobre ele encheria o Hoje todos os dias.

     O segundo vem do Moloni: uma fatura em aberto há muito tempo. Sem a
     fonte a dizer que está vencida, não se inventa cobrança nenhuma. */
  projetos.forEach(function(p){
    if(!p) return;
    var f = p.finance || {};
    var concluido = (p.progress === 100) || (p.operationalState === "Concluído");
    if(concluido && typeof f.toInvoice === "number" && f.toInvoice > 0){
      fila.push(item({id:"faturar:" + p.id, type:"billing", projectId:p.id,
        clientId:p.clientId || null,
        title:"Faturar o que falta: " + euros(f.toInvoice),
        reason:"trabalho concluído com saldo por faturar",
        dueAt:null, action:"faturar"}));
    }
    var aberta = p.overdueInvoice || null;
    if(aberta && (aberta.dias === undefined || aberta.dias === null || aberta.dias > 0)){
      fila.push(item({id:"cobrar:" + p.id, type:"collection", projectId:p.id,
        clientId:p.clientId || null,
        title:"Cobrar " + (aberta.documento || "fatura em aberto")
              + (typeof aberta.dias === "number" ? " · " + aberta.dias + " dias" : "")
              + (typeof aberta.valor === "number" ? " · " + euros(aberta.valor) : ""),
        reason:"fatura em aberto no Moloni",
        dueAt:aberta.data || null, action:"cobrar"}));
    }
  });

  /* ---------- a próxima ação, e a que falta -------------------------------
     Um projeto em «Ação CO.RP» com a próxima ação vazia era saltado aqui: a
     condição pedia uma ação escrita, e sem ela a linha não existia. O
     projeto continuava com a bola do nosso lado e desaparecia do único ecrã
     onde isso se vê — trabalho real, escondido por um campo em branco.

     Passa a entrar, dizendo o que é: falta decidir o que fazer. A tarefa
     não se inventa. Escrever aqui um «Continuar o licenciamento» seria pôr
     na boca do atelier uma decisão que ninguém tomou, e a fila deixaria de
     se distinguir de uma lista de palpites. */
  projetos.forEach(function(p){
    if(!p || !ESPERA[p.operationalState]) return;
    if(p.nextAction){
      fila.push(item({id:"acao:" + p.id, type:"next-action", projectId:p.id,
        projectRef:p.folderRef || null,
        clientId:p.clientId || null, title:p.nextAction, reason:p.operationalState,
        dueAt:null, action:"abrir-projeto"}));
      return;
    }
    if(!ACAO_DA_CASA[p.operationalState]) return;
    fila.push(item({id:"acao:" + p.id, type:"next-action", projectId:p.id,
      projectRef:p.folderRef || null,
      clientId:p.clientId || null,
      title:p.operationalState + " por definir",
      /* O nome do projeto já está na coluna ao lado: repeti-lo aqui escrevia
         «Rua das Quintas · Rua das Quintas» e gastava a coluna que devia
         dizer o que resolve a linha. Diz-se isso, no mesmo vocabulário da
         fila de qualidade — «Escrever próxima ação». */
      reason:(typeof NUC.acaoDaExcecao === "function")
        ? NUC.acaoDaExcecao("missing-next-action").rotulo
        : "Escrever próxima ação",
      dueAt:null, action:"definir-proxima-acao"}));
  });

  fila.forEach(function(i){ i.priority = NUC.prioridadeHoje(i, agora); });
  fila.sort(function(a, b){
    if(a.priority !== b.priority) return b.priority - a.priority;
    return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
  });
  /* «blocking» serviu para pontuar; o contrato do item não o inclui. */
  fila.forEach(function(i){ delete i.blocking; });
  return fila;
};

})();


/* ---- adaptadores/publicacoes.js ---- */
/* =======================================================================
   PUBLICAÇÕES — o Excel «Organização» é a agenda editorial

   Não há uma segunda base na app. O ficheiro que o atelier já usa no
   OneDrive continua a ser a fonte; aqui lê-se a grelha «Instagram» e
   separa-se apenas o que o próprio Excel já separa em CORP e OPERE.

   O ficheiro real usa fórmulas encadeadas nas datas. Por isso esta camada
   é deliberadamente de leitura: criar/mudar a agenda faz-se no Excel e a
   app volta a lê-lo. É mais seguro do que transformar fórmulas em valores
   ou manter uma cópia paralela que possa divergir.
   ======================================================================= */
(function(){
"use strict";

var PUB=window.PUB || (window.PUB={});
var BD="corp_publicacoes_v1", db=null;
var UM_DIA=86400000, EPOCA=Date.UTC(1899,11,30);

PUB.CAMINHO="00. Atelier / 02. Organização / 09. Coordenação / Organização.xlsx";
PUB.ONE_DRIVE_URL="https://cgfywsnshyvihel0yxi5pnax62j-my.sharepoint.com/personal/geral_corparquitetos_com/Documents/Documentos/co.rp/00.%20Atelier/02.%20Organiza%C3%A7%C3%A3o/09.%20Coordena%C3%A7%C3%A3o/Organiza%C3%A7%C3%A3o.xlsx?web=1";

function flat(s){
  return String(s==null?"":s).toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
}
function vazio(v){ return v===null || v===undefined || String(v).trim()===""; }
function colLetras(n){
  var s=""; n=Number(n)+1;
  while(n>0){ n--; s=String.fromCharCode(65+(n%26))+s; n=Math.floor(n/26); }
  return s;
}
function ref(c,r){ return colLetras(c)+String(r+1); }
function xmlDes(s){
  return String(s==null?"":s).replace(/&lt;/g,"<").replace(/&gt;/g,">")
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,"&");
}
function dataExcel(v){
  if(v===null || v===undefined || v==="") return null;
  if(typeof v==="number" && isFinite(v)){
    var d=new Date(EPOCA+Math.round(v*UM_DIA));
    return d.toISOString().slice(0,10);
  }
  var s=String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  var m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if(m) return m[3]+"-"+String(m[2]).padStart(2,"0")+"-"+String(m[1]).padStart(2,"0");
  return s || null;
}
PUB.dataExcel=dataExcel;

PUB.marcaDeTexto=function(v){
  var x=flat(v).replace(/\./g,"");
  if(x==="corp" || x==="co rp" || x==="corparquitetos") return "corp";
  if(x==="opere") return "opere";
  return "por-classificar";
};
PUB.canais=function(marca){
  return marca==="opere" ? ["instagram"] :
         marca==="corp" ? ["instagram","facebook","linkedin","google"] : [];
};
PUB.rotuloCanal=function(id){
  return {instagram:"Instagram",facebook:"Facebook",linkedin:"LinkedIn",google:"Google"}[id] || id;
};

/* ---------- perfis editoriais -------------------------------------------
   O perfil é uma regra de escrita, não uma biblioteca de frases copiadas.
   Foi calibrado a partir do uso público das duas marcas: a CO.RP publica em
   inglês, abre pelo projeto/ano, explica arquitetura em prosa sóbria, fecha
   com créditos e poucos hashtags; a OPERE é mais curta e centrada na
   visualização, projeto e créditos. Nenhum perfil pode preencher um facto
   que a plataforma não saiba. */
PUB.PERFIS_EDITORIAIS={
  corp:{
    id:"corp",nome:"CO.RP",idioma:"en",
    hashtags:["#architecture","#portuguesearchitecture","#corparquitetos","#architecturedesign","#design"],
    canais:["instagram","facebook","linkedin","google"]
  },
  opere:{
    id:"opere",nome:"OPERE",idioma:"en",
    hashtags:["#archviz","#architecturevisualization","#3dvisualization","#cgi","#architecture"],
    canais:["instagram"]
  }
};
PUB.perfilEditorial=function(marca){return PUB.PERFIS_EDITORIAIS[marca]||null;};

function limpo(v){return String(v==null?"":v).replace(/\s+/g," ").trim();}
function frase(v){
  v=limpo(v);if(!v)return "";
  return /[.!?]$/.test(v)?v:(v+".");
}
function cap(v){v=limpo(v);return v?v.charAt(0).toUpperCase()+v.slice(1):"";}
function traduzOperacao(v){
  var x=flat(v);
  if(!x)return "";
  if(/reabilit|remodel|alterac/.test(x))return "refurbishment";
  if(/ampliac|extens/.test(x))return "extension";
  if(/construc|nova/.test(x))return "new construction";
  if(/concurso|competition/.test(x))return "competition";
  return limpo(v);
}
function traduzUso(v){
  var x=flat(v);
  if(!x)return "";
  if(/habitac|housing/.test(x))return "housing";
  if(/moradia|house/.test(x))return "house";
  if(/apart/.test(x))return "apartment";
  if(/turismo rural|rural tourism/.test(x))return "rural tourism";
  if(/turismo|tourism/.test(x))return "tourism";
  if(/comerc|retail/.test(x))return "retail";
  if(/equipamento|public/.test(x))return "public building";
  return limpo(v);
}
function titulo(meta){
  var t=limpo(meta.projeto)||"Project";
  return t+(meta.ano?(", "+limpo(meta.ano)):"");
}
function resumir(v,max){
  v=limpo(v); max=Number(max)||0;
  if(!max||v.length<=max)return v;
  var frases=v.match(/[^.!?]+[.!?]+(?:\s|$)/g)||[],out="";
  frases.forEach(function(f){
    f=limpo(f);
    if(!f||out.length) {
      if(out.length && out.length+1+f.length<=max) out+=" "+f;
      return;
    }
    if(f.length<=max) out=f;
  });
  if(out)return out;
  var corte=v.slice(0,max+1),i=corte.lastIndexOf(" ");
  if(i>max*0.65)corte=corte.slice(0,i);
  return corte.replace(/[\s,;:.-]+$/g,"")+"…";
}
function corpoCorp(base,meta,max){
  if(limpo(base))return frase(base);
  if(limpo(meta.descricao))return frase(resumir(meta.descricao,max));
  var tipo=flat(meta.tipo), op=traduzOperacao(meta.operacao), uso=traduzUso(meta.uso), local=limpo(meta.local);
  if(/foto obra|construction/.test(tipo))return "Construction progress"+(local?(" in "+local):"")+".";
  if(op&&uso)return cap(op)+" project for "+uso+(local?(" in "+local):"")+".";
  if(uso)return cap(uso)+" project"+(local?(" in "+local):"")+".";
  if(op)return cap(op)+" project"+(local?(" in "+local):"")+".";
  if(local)return "Architecture project in "+local+".";
  if(/desenho|drawing/.test(tipo))return "Architectural drawing study.";
  return "Architecture project.";
}
function corpoOpere(base,meta,max){
  if(limpo(base))return frase(base);
  if(limpo(meta.descricao))return frase(resumir(meta.descricao,max));
  var tipo=flat(meta.tipo);
  if(/interior/.test(tipo))return "Interior architectural visualization.";
  if(/exterior/.test(tipo))return "Exterior architectural visualization.";
  return "Architectural visualization study.";
}
function creditoCorp(meta){
  var c=limpo(meta.creditoVisual);
  return c?("image by "+c):"";
}
function creditoOpere(meta){
  var a=limpo(meta.arquitetura), c=limpo(meta.cliente);
  if(a)return "architecture by "+a;
  if(c)return "for "+c;
  return "";
}
function hashtagsCorp(meta){
  var hs=PUB.PERFIS_EDITORIAIS.corp.hashtags.slice(), x=flat([meta.operacao,meta.uso,meta.tipo].join(" "));
  if(/concurso|competition/.test(x))hs.push("#competition");
  else if(/reabilit|remodel|alterac|refurb/.test(x))hs.push("#refurbishment");
  else if(/habitac|housing|moradia|house/.test(x))hs.push("#housing");
  if(/foto obra|construction/.test(x))hs.push("#construction");
  return hs.filter(function(v,i,a){return a.indexOf(v)===i;}).slice(0,5).join(" ");
}
function hashtagsOpere(meta){
  var hs=PUB.PERFIS_EDITORIAIS.opere.hashtags.slice(),x=flat(meta.tipo);
  if(/competition|concurso/.test(x))hs.push("#competition");
  return hs.filter(function(v,i,a){return a.indexOf(v)===i;}).slice(0,5).join(" ");
}
function juntar(blocos){return blocos.filter(function(x){return limpo(x);}).join("\n\n");}

/* Um clique em «Preparar» já produz uma proposta. O texto manual é apenas
   uma nota factual opcional: quando existe, entra no corpo sem ser
   reescrito. Ano, local, autoria e créditos só entram se vierem em meta. */
PUB.gerarVersoes=function(base,marca,meta){
  base=String(base||"").trim();meta=meta||{};
  var out={},t=titulo(meta);
  if(marca==="opere"){
    var corpoO=corpoOpere(base,meta,360),credO=creditoOpere(meta),tagO=hashtagsOpere(meta);
    out.instagram=juntar(["Architectural visualization · "+t,corpoO,credO,tagO]);
    return out;
  }
  if(marca!=="corp")return out;
  var credC=creditoCorp(meta),tags=hashtagsCorp(meta),url=limpo(meta.url);
  var ig=corpoCorp(base,meta,360), fb=corpoCorp(base,meta,560), li=corpoCorp(base,meta,900), go=corpoCorp(base,meta,220);
  out.instagram=juntar([t,ig,credC,tags]);
  out.facebook=juntar([t,fb,credC,url,"CO.RP ARQUITETOS",tags]);
  out.linkedin=juntar([t,li,credC,url,"Architecture by CO.RP ARQUITETOS",tags]);
  out.google=juntar([t,go,(meta.local?("CO.RP ARQUITETOS · "+limpo(meta.local)):"CO.RP ARQUITETOS")]);
  return out;
};

/* ---------- a grelha real ------------------------------------------------
   A linha «Instagram» é seguida de faixas de três colunas. Hoje são:

       CORP  | tipo | data      OPERE | tipo | data

   A marca vem do cabeçalho da faixa, nunca do nome do projeto. Uma futura
   faixa sem marca reconhecida fica por classificar em vez de cair em CO.RP. */
PUB.modeloDaGrelha=function(grelha,meta){
  grelha=Array.isArray(grelha)?grelha:[]; meta=meta||{};
  var calculadas=meta.calculadas||{}, usadas=meta.usadas||{};
  var cab=-1, i, c;
  for(i=0;i<grelha.length;i++){
    if((grelha[i]||[]).some(function(v){return flat(v)==="instagram";})){cab=i;break;}
  }
  if(cab<0) return {folha:meta.folha||null,linhaCabecalho:null,publicacoes:[],
                    porMarca:{corp:[],opere:[]},porClassificar:[],faixas:[]};
  var linha=grelha[cab]||[], faixas=[];
  for(c=0;c<linha.length;c++){
    if(vazio(linha[c]) || flat(linha[c])==="instagram") continue;
    faixas.push({coluna:c,rotulo:String(linha[c]),marca:PUB.marcaDeTexto(linha[c])});
  }
  var pubs=[];
  faixas.forEach(function(f){
    for(var r=cab+1;r<grelha.length;r++){
      var row=grelha[r]||[];
      var projeto=row[f.coluna], tipo=row[f.coluna+1], data=row[f.coluna+2];
      if(vazio(projeto)&&vazio(tipo)&&vazio(data)) continue;
      var cel={projeto:ref(f.coluna,r),tipo:ref(f.coluna+1,r),data:ref(f.coluna+2,r)};
      pubs.push({
        id:f.marca+":"+(r+1)+":"+(f.coluna+1), marca:f.marca,
        projeto:vazio(projeto)?null:String(projeto).trim(),
        tipo:vazio(tipo)?null:String(tipo).trim(), data:dataExcel(data),
        dataBruta:vazio(data)?null:data,
        linha:r+1, coluna:f.coluna+1, folha:meta.folha||null,
        celulas:cel,
        edicao:PUB.editabilidade(cel,calculadas,usadas,meta.cadeia),
        fonte:"Organização.xlsx"
      });
    }
  });
  pubs.sort(function(a,b){
    var A=a.data||"9999-99-99", B=b.data||"9999-99-99";
    return A<B?-1:(A>B?1:(a.linha-b.linha));
  });
  var corp=pubs.filter(function(p){return p.marca==="corp";});
  var opere=pubs.filter(function(p){return p.marca==="opere";});
  var pc=pubs.filter(function(p){return p.marca==="por-classificar";});
  return {folha:meta.folha||null,linhaCabecalho:cab+1,publicacoes:pubs,
          porMarca:{corp:corp,opere:opere},porClassificar:pc,faixas:faixas};
};

/* ---------- o que se pode mesmo alterar ---------------------------------
   O livro real tem as datas em corrente: «D19» é «D18+7» e arrasta oito
   linhas por baixo. Duas coisas não se fazem daqui, e é por isto que a
   editabilidade é calculada célula a célula em vez de decidida por campo:

     · uma célula com fórmula não se escreve — substituí-la por um número
       apaga a corrente e ninguém dá por isso até as datas seguintes
       deixarem de andar;
     · uma célula que outra fórmula lê («D18», que a corrente usa) também
       não — escrevê-la moveria as datas de baixo sem as recalcular, e o
       ficheiro ficaria a dizer duas coisas diferentes ao mesmo tempo.

   Sobra o que é mesmo de entrada: projeto, tipo, e as datas soltas. */
PUB.editabilidade=function(celulas,calculadas,usadas,cadeia){
  calculadas=calculadas||{}; usadas=usadas||{};
  var out={};
  ["projeto","tipo","data"].forEach(function(campo){
    var r=celulas[campo];
    if(calculadas[r]){
      out[campo]={pode:false,
        porque:"a célula "+r+" é calculada por fórmula ("+String(calculadas[r]).replace(/^=?/,"")
              +"); anda sozinha quando a data de que depende mudar"};
      return;
    }
    if(!usadas[r]){ out[campo]={pode:true,porque:null}; return; }
    /* Lida por outra fórmula. Se tudo o que a lê for corrente de datas que
       esta app sabe refazer, escreve-se — e diz-se quantas datas andam
       atrás. Se houver uma fórmula que não se saiba recalcular, não. */
    var arrastadas=PUB.arrasto(cadeia,r,0);
    var todasContadas=PUB.arrastoCobreTudo(cadeia,r);
    if(arrastadas.length && todasContadas)
      out[campo]={pode:true,arrasta:arrastadas.length,
        porque:"mover esta data move as "+arrastadas.length+" seguintes, que a app recalcula"};
    else
      out[campo]={pode:false,
        porque:"a célula "+r+" é lida por uma fórmula que esta app não sabe recalcular"};
  });
  return out;
};
/* Toda a gente que lê esta célula, direta ou indiretamente, é corrente de
   datas conhecida? Sem esta pergunta, uma soma qualquer que passasse pela
   célula ficava com o valor velho depois de a mexermos. */
PUB.arrastoCobreTudo=function(cadeia,ref){
  cadeia=cadeia||{};
  var usadas=cadeia.usadas||null;
  var por=cadeia.arrastadosPor||{}, dep=cadeia.depende||{};
  var fila=[ref], vistos={}, ok=true;
  vistos[ref]=true;
  while(fila.length && ok){
    var r=fila.shift();
    var leitores=cadeia.leitores ? (cadeia.leitores[r]||[]) : (por[r]||[]);
    leitores.forEach(function(x){
      if(!dep[x]){ ok=false; return; }
      if(vistos[x]) return;
      vistos[x]=true; fila.push(x);
    });
  }
  return ok;
};

/* A identidade de uma publicação não é a linha: inserir uma linha no Excel
   empurra as de baixo e a app passaria a escrever na publicação errada. O
   que identifica é o conteúdo lido — marca, projeto, tipo e data — e a
   linha é só o sítio onde estava da última vez. Ao gravar confirma-se o
   conteúdo antes de escrever, e se ele andou procura-se onde foi parar. */
PUB.chaveDaPublicacao=function(p){
  if(!p) return null;
  return [p.marca||"", flat(p.projeto), flat(p.tipo), p.data||""].join("|");
};
PUB.localizar=function(modelo,alvo){
  if(!modelo||!alvo) return {estado:"sem-modelo",publicacao:null};
  var lista=modelo.publicacoes||[], chave=PUB.chaveDaPublicacao(alvo);
  var mesmaLinha=lista.filter(function(p){
    return p.marca===alvo.marca && p.linha===alvo.linha && p.coluna===alvo.coluna;
  })[0]||null;
  if(mesmaLinha && PUB.chaveDaPublicacao(mesmaLinha)===chave)
    return {estado:"encontrada",publicacao:mesmaLinha,mudouDeSitio:false};
  var iguais=lista.filter(function(p){return PUB.chaveDaPublicacao(p)===chave;});
  if(iguais.length===1)
    return {estado:"encontrada",publicacao:iguais[0],mudouDeSitio:true};
  if(iguais.length>1)
    return {estado:"ambigua",publicacao:null,
            porque:"há "+iguais.length+" linhas iguais no Excel; não dá para saber qual é esta"};
  return {estado:"desapareceu",publicacao:null,
          porque:"a linha que estava em "+(alvo.celulas?alvo.celulas.projeto:"?")+" já não tem este conteúdo — o ficheiro foi alterado no Excel"};
};

/* ---------- XLSX: ler e voltar a escrever -------------------------------
   Escrever um XLSX à mão só é defensável porque se escreve o mínimo: as
   entradas que não se tocam voltam ao ficheiro com os bytes comprimidos
   originais e o CRC que o próprio ficheiro trazia. Estilos, fórmulas,
   painéis, larguras de coluna e a extensão web do livro não passam por
   aqui — não há nada nesta camada que os possa perder. */
function u16(a,i){return a[i]|(a[i+1]<<8);}
function u32(a,i){return (a[i]|(a[i+1]<<8)|(a[i+2]<<16)|(a[i+3]<<24))>>>0;}
function p16(a,i,v){a[i]=v&255;a[i+1]=(v>>8)&255;}
function p32(a,i,v){a[i]=v&255;a[i+1]=(v>>>8)&255;a[i+2]=(v>>>16)&255;a[i+3]=(v>>>24)&255;}

var TABELA_CRC=null;
function crc32(bytes){
  if(!TABELA_CRC){
    TABELA_CRC=new Uint32Array(256);
    for(var n=0;n<256;n++){
      var c=n;
      for(var k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);
      TABELA_CRC[n]=c>>>0;
    }
  }
  var crc=0xFFFFFFFF;
  for(var i=0;i<bytes.length;i++) crc=TABELA_CRC[(crc^bytes[i])&255]^(crc>>>8);
  return (crc^0xFFFFFFFF)>>>0;
}
function inflar(bytes){
  if(typeof DecompressionStream!=="function") return Promise.reject(new Error("Este browser não consegue abrir XLSX localmente."));
  var f=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(f).arrayBuffer().then(function(b){return new Uint8Array(b);});
}
function desinflar(bytes){
  if(typeof CompressionStream!=="function") return Promise.reject(new Error("Este browser não consegue gravar XLSX localmente."));
  var f=new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Response(f).arrayBuffer().then(function(b){return new Uint8Array(b);});
}
function abrirZip(bytes){
  var fim=-1;
  for(var i=bytes.length-22;i>=0&&i>bytes.length-70000;i--){ if(u32(bytes,i)===0x06054b50){fim=i;break;} }
  if(fim<0) return Promise.reject(new Error("Organização.xlsx não é um XLSX válido."));
  var n=u16(bytes,fim+10), off=u32(bytes,fim+16), entradas=[], p=off;
  for(var k=0;k<n;k++){
    if(u32(bytes,p)!==0x02014b50) break;
    var met=u16(bytes,p+10), crc=u32(bytes,p+16), comp=u32(bytes,p+20), desc=u32(bytes,p+24),
        ln=u16(bytes,p+28), le=u16(bytes,p+30), lc=u16(bytes,p+32), lof=u32(bytes,p+42),
        mtempo=u16(bytes,p+12), mdata=u16(bytes,p+14), atrib=u32(bytes,p+38);
    var nome=new TextDecoder().decode(bytes.slice(p+46,p+46+ln));
    entradas.push({nome:nome,met:met,crc:crc,comp:comp,desc:desc,lof:lof,
                   mtempo:mtempo,mdata:mdata,atrib:atrib}); p+=46+ln+le+lc;
  }
  var out={}, seq=Promise.resolve();
  entradas.forEach(function(e){
    seq=seq.then(function(){
      var q=e.lof; if(u32(bytes,q)!==0x04034b50) throw new Error("Entrada XLSX inválida: "+e.nome);
      var ln=u16(bytes,q+26), le=u16(bytes,q+28), ini=q+30+ln+le;
      e.bruto=bytes.slice(ini,ini+e.comp);
      if(e.met===0){out[e.nome]=e.bruto;return;}
      return inflar(e.bruto).then(function(d){out[e.nome]=d;});
    });
  });
  return seq.then(function(){return {ficheiros:out,entradas:entradas};});
}
/* Reescreve o ZIP com as entradas alteradas e devolve os bytes. O que não
   foi tocado é copiado comprimido, tal e qual, com o CRC original. */
function escreverZip(zip,novos){
  var codificador=new TextEncoder();
  var partes=[], seq=Promise.resolve();
  zip.entradas.forEach(function(e){
    seq=seq.then(function(){
      if(!Object.prototype.hasOwnProperty.call(novos,e.nome)){
        partes.push({nome:e.nome,met:e.met,crc:e.crc,comp:e.comp,desc:e.desc,
                     dados:e.bruto,mtempo:e.mtempo,mdata:e.mdata,atrib:e.atrib});
        return null;
      }
      var cru=novos[e.nome];
      if(typeof cru==="string") cru=codificador.encode(cru);
      return desinflar(cru).then(function(z){
        partes.push({nome:e.nome,met:8,crc:crc32(cru),comp:z.length,desc:cru.length,
                     dados:z,mtempo:e.mtempo,mdata:e.mdata,atrib:e.atrib});
      });
    });
  });
  return seq.then(function(){
    var nomes=partes.map(function(p){return codificador.encode(p.nome);});
    var total=0,i;
    for(i=0;i<partes.length;i++) total+=30+nomes[i].length+partes[i].dados.length+46+nomes[i].length;
    total+=22;
    var out=new Uint8Array(total), pos=0, centro=[];
    for(i=0;i<partes.length;i++){
      var pt=partes[i], nm=nomes[i];
      centro.push(pos);
      p32(out,pos,0x04034b50); p16(out,pos+4,20); p16(out,pos+6,0); p16(out,pos+8,pt.met);
      p16(out,pos+10,pt.mtempo); p16(out,pos+12,pt.mdata);
      p32(out,pos+14,pt.crc); p32(out,pos+18,pt.comp); p32(out,pos+22,pt.desc);
      p16(out,pos+26,nm.length); p16(out,pos+28,0);
      out.set(nm,pos+30); pos+=30+nm.length;
      out.set(pt.dados,pos); pos+=pt.dados.length;
    }
    var inicioCentro=pos;
    for(i=0;i<partes.length;i++){
      var q=partes[i], n2=nomes[i];
      p32(out,pos,0x02014b50); p16(out,pos+4,20); p16(out,pos+6,20); p16(out,pos+8,0);
      p16(out,pos+10,q.met); p16(out,pos+12,q.mtempo); p16(out,pos+14,q.mdata);
      p32(out,pos+16,q.crc); p32(out,pos+20,q.comp); p32(out,pos+24,q.desc);
      p16(out,pos+28,n2.length); p16(out,pos+30,0); p16(out,pos+32,0);
      p16(out,pos+34,0); p16(out,pos+36,0); p32(out,pos+38,q.atrib||0);
      p32(out,pos+42,centro[i]);
      out.set(n2,pos+46); pos+=46+n2.length;
    }
    p32(out,pos,0x06054b50); p16(out,pos+4,0); p16(out,pos+6,0);
    p16(out,pos+8,partes.length); p16(out,pos+10,partes.length);
    p32(out,pos+12,pos-inicioCentro); p32(out,pos+16,inicioCentro); p16(out,pos+20,0);
    return out.slice(0,pos+22);
  });
}
function texto(f,n){ return f[n] ? new TextDecoder("utf-8").decode(f[n]) : ""; }
function partilhadas(xml){
  var out=[], re=/<si>([\s\S]*?)<\/si>/g, m;
  while((m=re.exec(xml))!==null){
    var ts=m[1].match(/<t[^>]*>[\s\S]*?<\/t>/g)||[];
    out.push(xmlDes(ts.map(function(x){return x.replace(/^<t[^>]*>|<\/t>$/g,"");}).join("")));
  }
  return out;
}
function colunaNum(refa){
  var m=String(refa||"").match(/^([A-Z]+)/), n=0;
  if(!m) return 0;
  for(var i=0;i<m[1].length;i++) n=n*26+(m[1].charCodeAt(i)-64);
  return n-1;
}
function grelhaDaFolha(xml,ss){
  var linhas={}, maxR=-1,maxC=-1, calculadas={}, re=/<c([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,m;
  while((m=re.exec(xml))!==null){
    var at=m[1]||"", rm=at.match(/\br="([A-Z]+\d+)"/);
    if(!rm) continue;
    var rr=parseInt(rm[1].replace(/\D/g,""),10)-1, cc=colunaNum(rm[1]);
    var dentro=m[2]||"", tm=at.match(/\bt="([^"]+)"/), vm=dentro.match(/<v>([\s\S]*?)<\/v>/), val=null;
    var fm=dentro.match(/<f\b([^>]*?)(?:\/>|>([\s\S]*?)<\/f>)/);
    if(fm) calculadas[rm[1]]=fm[2]?xmlDes(fm[2]):"partilhada";
    if(tm&&tm[1]==="s"&&vm) val=ss[+vm[1]]==null?null:ss[+vm[1]];
    else if(tm&&(tm[1]==="inlineStr"||tm[1]==="str")){
      var ts=dentro.match(/<t[^>]*>([\s\S]*?)<\/t>/); val=ts?xmlDes(ts[1]):(vm?xmlDes(vm[1]):null);
    }else if(vm){ val=Number(vm[1]); if(!isFinite(val)) val=xmlDes(vm[1]); }
    (linhas[rr]||(linhas[rr]={}))[cc]=val; if(rr>maxR)maxR=rr;if(cc>maxC)maxC=cc;
  }
  var grid=[];
  for(var r=0;r<=maxR;r++){
    var row=[]; for(var c=0;c<=maxC;c++) row.push(linhas[r]&&linhas[r][c]!==undefined?linhas[r][c]:null);
    grid.push(row);
  }
  var leitores=PUB.quemLeCadaCelula(xml), usadas={};
  Object.keys(leitores).forEach(function(r){ usadas[r]=true; });
  var cadeia=PUB.cadeiaDeDatas(xml);
  cadeia.leitores=leitores;
  return {grelha:grid,calculadas:calculadas,usadas:usadas,cadeia:cadeia};
}

/* ---------- a corrente das datas, lida como ela é ------------------------
   No livro do atelier as datas encadeiam-se: «D19 = D18+7», e a fórmula é
   partilhada até «D26». Uma fórmula partilhada não se repete no ficheiro —
   o filho traz só o «si» do pai, e o texto tem de ser trasladado para a
   linha dele. É isso que se faz aqui, e faz-se porque sem isto a app não
   sabe que mexer em D18 mexe em oito datas.

   Só se reconhece o que se sabe recalcular sem margem para erro: uma
   célula cuja fórmula é «outra célula + N dias». Qualquer outra fórmula
   fica de fora — não se adivinha um motor de cálculo. */
function refParaXY(r){
  var m=String(r||"").match(/^([A-Z]+)(\d+)$/);
  if(!m) return null;
  return {coluna:colunaNum(m[1]), linha:parseInt(m[2],10)};
}
function xyParaRef(c,l){ return colLetras(c)+String(l); }
/* Trasladar uma fórmula partilhada: as referências relativas andam com a
   distância entre o pai e o filho. As absolutas («$D$18») não andam. */
function trasladar(formula,de,para){
  var a=refParaXY(de), b=refParaXY(para);
  if(!a||!b) return formula;
  var dc=b.coluna-a.coluna, dl=b.linha-a.linha;
  return String(formula).replace(/(\$?)([A-Z]{1,3})(\$?)(\d{1,7})/g,
    function(todo,fixaC,col,fixaL,lin){
      var c=fixaC?colunaNum(col):(colunaNum(col)+dc);
      var l=fixaL?parseInt(lin,10):(parseInt(lin,10)+dl);
      if(c<0||l<1) return todo;
      return fixaC+colLetras(c)+fixaL+String(l);
    });
}
PUB.trasladarFormula=trasladar;
PUB.cadeiaDeDatas=function(xml){
  var pais={}, celulas=[], re=/<c([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, m;
  while((m=re.exec(String(xml||"")))!==null){
    var at=m[1]||"", rm=at.match(/\br="([A-Z]+\d+)"/);
    if(!rm) continue;
    var dentro=m[2]||"";
    var fm=dentro.match(/<f\b([^>]*?)(?:\/>|>([\s\S]*?)<\/f>)/);
    if(!fm) continue;
    var atrF=fm[1]||"", texto=fm[2]?xmlDes(fm[2]):null;
    var si=atrF.match(/\bsi="(\d+)"/);
    if(texto && si) pais[si[1]]={ref:rm[1],texto:texto};
    celulas.push({ref:rm[1],texto:texto,si:si?si[1]:null});
  }
  var depende={}, arrastadosPor={};
  celulas.forEach(function(c){
    var texto=c.texto;
    if(!texto && c.si && pais[c.si]) texto=trasladar(pais[c.si].texto,pais[c.si].ref,c.ref);
    if(!texto) return;
    var t=texto.replace(/\s+/g,"");
    var mm=t.match(/^\$?([A-Z]{1,3})\$?(\d{1,7})\+(\d{1,4})$/);
    if(!mm) return;
    var base=mm[1]+mm[2], mais=parseInt(mm[3],10);
    depende[c.ref]={base:base,mais:mais};
    (arrastadosPor[base]||(arrastadosPor[base]=[])).push(c.ref);
  });
  return {depende:depende,arrastadosPor:arrastadosPor};
};
/* Dada uma célula que mudou de valor, que mais muda por arrasto — e para
   quanto. Percorre a corrente para a frente, sem voltar atrás: uma
   fórmula que dependesse de si própria pararia aqui em vez de andar sem
   fim. */
PUB.arrasto=function(cadeia,ref,valor){
  cadeia=cadeia||{}; var por=cadeia.arrastadosPor||{}, dep=cadeia.depende||{};
  var saida=[], vistos={}, fila=[{ref:ref,valor:valor}];
  vistos[ref]=true;
  while(fila.length){
    var atual=fila.shift();
    (por[atual.ref]||[]).forEach(function(filho){
      if(vistos[filho]) return;
      vistos[filho]=true;
      var v=atual.valor+(dep[filho]?dep[filho].mais:0);
      saida.push({ref:filho,valor:v});
      fila.push({ref:filho,valor:v});
    });
  }
  return saida;
};
/* Que células é que as fórmulas da folha leem. Sem isto, escrever «D18»
   parecia inofensivo — é a âncora de que dependem oito datas. */
/* Quem lê cada célula, com as fórmulas partilhadas já trasladadas para a
   linha de cada uma. «celulasLidasPorFormulas» responde «alguém lê?»; isto
   responde «quem», que é o que faz falta para saber se o arrasto de uma
   data cobre tudo o que dela depende. */
PUB.quemLeCadaCelula=function(xml){
  var pais={}, celulas=[], re=/<c([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, m;
  while((m=re.exec(String(xml||"")))!==null){
    var at=m[1]||"", rm=at.match(/\br="([A-Z]+\d+)"/);
    if(!rm) continue;
    var fm=(m[2]||"").match(/<f\b([^>]*?)(?:\/>|>([\s\S]*?)<\/f>)/);
    if(!fm) continue;
    var texto=fm[2]?xmlDes(fm[2]):null, si=(fm[1]||"").match(/\bsi="(\d+)"/);
    if(texto && si) pais[si[1]]={ref:rm[1],texto:texto};
    celulas.push({ref:rm[1],texto:texto,si:si?si[1]:null});
  }
  var leitores={};
  celulas.forEach(function(c){
    var texto=c.texto;
    if(!texto && c.si && pais[c.si]) texto=PUB.trasladarFormula(pais[c.si].texto,pais[c.si].ref,c.ref);
    if(!texto) return;
    PUB.refsDaFormula(texto).forEach(function(r){
      if(r===c.ref) return;
      (leitores[r]||(leitores[r]=[])).push(c.ref);
    });
  });
  return leitores;
};
/* As células que uma fórmula nomeia, com os intervalos abertos. */
PUB.refsDaFormula=function(f){
  var fora=[], re=/\$?([A-Z]{1,3})\$?(\d{1,7})(?:\s*:\s*\$?([A-Z]{1,3})\$?(\d{1,7}))?/g, x;
  while((x=re.exec(String(f||"")))!==null){
    if(!x[3]){ fora.push(x[1]+x[2]); continue; }
    var c1=colunaNum(x[1]), c2=colunaNum(x[3]);
    var l1=parseInt(x[2],10), l2=parseInt(x[4],10);
    if((Math.abs(c2-c1)+1)*(Math.abs(l2-l1)+1)>4000) continue;
    for(var c=Math.min(c1,c2);c<=Math.max(c1,c2);c++)
      for(var l=Math.min(l1,l2);l<=Math.max(l1,l2);l++) fora.push(colLetras(c)+l);
  }
  return fora;
};
PUB.celulasLidasPorFormulas=function(xml){
  var usadas={}, re=/<f\b[^>]*>([\s\S]*?)<\/f>/g, m;
  function marcar(r){ usadas[r]=true; }
  function intervalo(a,b){
    var c1=colunaNum(a), c2=colunaNum(b);
    var r1=parseInt(a.replace(/\D/g,""),10), r2=parseInt(b.replace(/\D/g,""),10);
    if(!isFinite(r1)||!isFinite(r2)) return;
    if((c2-c1)*(r2-r1)>4000) return;
    for(var c=Math.min(c1,c2);c<=Math.max(c1,c2);c++)
      for(var r=Math.min(r1,r2);r<=Math.max(r1,r2);r++) marcar(colLetras(c)+r);
  }
  while((m=re.exec(String(xml||"")))!==null){
    var f=xmlDes(m[1]), re2=/\$?([A-Z]{1,3})\$?(\d{1,7})(?:\s*:\s*\$?([A-Z]{1,3})\$?(\d{1,7}))?/g, x;
    while((x=re2.exec(f))!==null){
      if(x[3]) intervalo(x[1]+x[2], x[3]+x[4]);
      else marcar(x[1]+x[2]);
    }
  }
  return usadas;
};
function folhaDoLivro(f){
  var wb=texto(f,"xl/workbook.xml"), rel=texto(f,"xl/_rels/workbook.xml.rels"), m, rid=null, nome=null;
  var re=/<sheet\b([^>]+)\/>/g;
  while((m=re.exec(wb))!==null){
    var nm=m[1].match(/\bname="([^"]+)"/), id=m[1].match(/\br:id="([^"]+)"/);
    if(!nm||!id) continue;
    if(nome===null){nome=xmlDes(nm[1]);rid=id[1];}
    if(/organiza[cç][aã]o/i.test(xmlDes(nm[1]))){nome=xmlDes(nm[1]);rid=id[1];break;}
  }
  if(!rid) throw new Error("Organização.xlsx não tem folha legível.");
  var rr=new RegExp('<Relationship\\b[^>]*\\bId="'+rid.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+'"[^>]*\\bTarget="([^"]+)"[^>]*/>');
  var rm=rel.match(rr); if(!rm) throw new Error("Não encontrei a folha editorial no Excel.");
  var alvo=rm[1].replace(/^\//,""); if(alvo.indexOf("xl/")!==0) alvo="xl/"+alvo;
  return {nome:nome,caminho:alvo};
}
PUB.lerArrayBuffer=function(ab,nome){
  var bytes=new Uint8Array(ab);
  return abrirZip(bytes).then(function(zip){
    var f=zip.ficheiros;
    var sh=folhaDoLivro(f), ss=partilhadas(texto(f,"xl/sharedStrings.xml"));
    var lida=grelhaDaFolha(texto(f,sh.caminho),ss);
    var cadeia=lida.cadeia||{};
    var m=PUB.modeloDaGrelha(lida.grelha,{folha:sh.nome,calculadas:lida.calculadas,
                                          usadas:lida.usadas,cadeia:cadeia});
    m.ficheiro=nome||"Organização.xlsx";
    m.livro={zip:zip,folha:sh.caminho,xml:texto(f,sh.caminho),
             calculadas:lida.calculadas,usadas:lida.usadas,cadeia:cadeia};
    return m;
  });
};
PUB.lerFicheiro=function(file){
  if(!file || typeof file.arrayBuffer!=="function") return Promise.reject(new Error("Escolha o ficheiro Organização.xlsx."));
  return file.arrayBuffer().then(function(ab){
    var m=PUB.lerArrayBuffer(ab,file.name);
    return m.then(function(mm){
      mm.assinatura={nome:file.name||null,tamanho:file.size||null,
                     alteradoEm:file.lastModified||null};
      return mm;
    });
  });
};

/* ---------- escrever uma célula sem tocar no resto ----------------------
   Substitui-se o miolo do «<c>» e mantêm-se os atributos — o «s=» é o
   estilo, e é dele que vem o formato de data. Texto entra como cadeia
   embutida em vez de ir à tabela partilhada: poupa mexer num segundo
   ficheiro do livro, e o Excel converte-a na gravação seguinte. */
function xmlEsc(s){
  return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
PUB.miolo=function(valor,tipo){
  if(valor===null||valor===undefined||String(valor)==="") return {atr:"",dentro:""};
  if(tipo==="numero") return {atr:"",dentro:"<v>"+xmlEsc(valor)+"</v>"};
  return {atr:' t="inlineStr"',dentro:"<is><t xml:space=\"preserve\">"+xmlEsc(valor)+"</t></is>"};
};
PUB.escreverCelula=function(xml,refa,valor,tipo){
  var esc=String(refa).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  var re=new RegExp('<c\\b([^>]*\\br="'+esc+'"[^>]*?)(\\/>|>[\\s\\S]*?<\\/c>)');
  var m=String(xml).match(re);
  if(!m) return {ok:false,xml:xml,porque:"a célula "+refa+" não existe na folha"};
  var atrib=m[1].replace(/\s*\bt="[^"]*"/g,"").replace(/\s+$/,"");
  var novo=PUB.miolo(valor,tipo);
  var subs=novo.dentro
    ? "<c"+atrib+novo.atr+">"+novo.dentro+"</c>"
    : "<c"+atrib+"/>";
  return {ok:true,xml:xml.slice(0,m.index)+subs+xml.slice(m.index+m[0].length)};
};

/* ---------- o plano de uma gravação -------------------------------------
   Separado da gravação para poder ser lido, testado e mostrado antes de
   alguém carregar em «Guardar». */
PUB.EPOCA_EXCEL=EPOCA;
PUB.deSerieExcel=function(n){
  if(typeof n!=="number"||!isFinite(n)) return "";
  return new Date(EPOCA+Math.round(n*UM_DIA)).toISOString().slice(0,10);
};
PUB.paraSerieExcel=function(iso){
  var m=String(iso||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return null;
  var d=Date.UTC(+m[1],+m[2]-1,+m[3]);
  return Math.round((d-EPOCA)/UM_DIA);
};
/* Escrever o valor de uma célula com fórmula sem lhe tocar na fórmula: o
   «<f>» fica, o «<v>» — que é a cópia que o Excel guarda do resultado —
   passa a ser o novo. Não se converte nenhuma fórmula em número; escreve-se
   ao lado dela o que ela dá. */
PUB.escreverValorCalculado=function(xml,refa,valor){
  var esc=String(refa).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  var re=new RegExp('(<c\\b[^>]*\\br="'+esc+'"[^>]*>)([\\s\\S]*?)(<\\/c>)');
  var m=String(xml).match(re);
  if(!m) return {ok:false,xml:xml,porque:"a célula calculada "+refa+" não existe na folha"};
  if(m[2].indexOf("<f")<0) return {ok:false,xml:xml,porque:"a célula "+refa+" já não tem fórmula"};
  var dentro=m[2].replace(/<v>[\s\S]*?<\/v>/,"");
  var novo=m[1]+dentro+"<v>"+xmlEsc(valor)+"</v>"+m[3];
  return {ok:true,xml:xml.slice(0,m.index)+novo+xml.slice(m.index+m[0].length)};
};

PUB.planoDeEdicao=function(pub,mudancas,cadeia,vizinhas){
  var alteracoes=[], recusas=[], avisos=[];
  if(!pub) return {alteracoes:alteracoes,recusas:[{campo:null,porque:"publicação desconhecida"}]};
  Object.keys(mudancas||{}).forEach(function(campo){
    if(["projeto","tipo","data"].indexOf(campo)<0){
      recusas.push({campo:campo,porque:"campo sem sítio conhecido no Organização.xlsx"});
      return;
    }
    var novo=mudancas[campo]; if(typeof novo==="string") novo=novo.trim();
    var atual=pub[campo]==null?"":String(pub[campo]);
    if(String(novo==null?"":novo)===atual) return;
    var pode=(pub.edicao&&pub.edicao[campo])||{pode:true};
    if(!pode.pode){ recusas.push({campo:campo,porque:pode.porque}); return; }
    if(campo==="data"){
      var serie=novo?PUB.paraSerieExcel(novo):null;
      if(novo && serie===null){ recusas.push({campo:campo,porque:"data inválida: use AAAA-MM-DD"}); return; }
      alteracoes.push({campo:campo,ref:pub.celulas.data,valor:serie,tipo:"numero",mostra:novo||""});
      /* A corrente anda atrás. Escreve-se o valor que cada fórmula passa a
         dar, sem lhe tocar na fórmula — senão o ficheiro ficava a dizer
         uma data no ecrã e outra na fórmula até alguém abrir o Excel. */
      if(serie!==null) PUB.arrasto(cadeia,pub.celulas.data,serie).forEach(function(a){
        alteracoes.push({campo:"data-em-cadeia",ref:a.ref,valor:a.valor,
                         tipo:"calculado",arrasto:true,
                         mostra:PUB.deSerieExcel(a.valor)});
      });
    }else{
      alteracoes.push({campo:campo,ref:pub.celulas[campo],valor:novo||null,tipo:"texto",mostra:novo||""});
    }
  });
  /* Mover uma corrente pode fazer duas publicações cair no mesmo dia. Não
     é erro nenhum — é uma consequência que se vê depois de gravar, e mais
     vale vê-la antes. */
  var porData={};
  (vizinhas||[]).forEach(function(p){
    if(p && p.data) (porData[p.data]||(porData[p.data]=[])).push(p);
  });
  var mexidas={};
  alteracoes.forEach(function(a){ if(a.mostra) mexidas[a.ref]=a.mostra; });
  Object.keys(mexidas).forEach(function(ref){
    var d=mexidas[ref];
    var outras=(porData[d]||[]).filter(function(p){
      return p.celulas && p.celulas.data!==ref && !mexidas[p.celulas.data];
    });
    if(outras.length)
      avisos.push("a " + d.split("-").reverse().join("-") + " fica com duas publicações: "
        + outras.map(function(p){return p.projeto||"—";}).join(", ") + " e esta");
  });
  return {alteracoes:alteracoes,recusas:recusas,avisos:avisos};
};

/* ---------- uma publicação nova ----------------------------------------
   Editar uma linha é escrever numa célula que já existe. Acrescentar uma
   é outra coisa, e por isso tem código próprio: pode haver uma linha na
   folha com as células da faixa vazias — é o caso da faixa OPERE, que
   acaba antes da CO.RP — e nesse caso escreve-se lá, sem mexer na
   estrutura. Só quando a folha acaba mesmo é que nasce uma linha nova.

   A data vai como valor e não como fórmula. É o que o próprio livro já
   faz na última linha, e estender uma fórmula partilhada obrigava a mexer
   no alcance dela — mais risco do que aquilo vale. */
PUB.faixaDaMarca=function(modelo,marca){
  return ((modelo&&modelo.faixas)||[]).filter(function(f){return f.marca===marca;})[0]||null;
};
PUB.linhaParaNova=function(modelo,marca){
  var faixa=PUB.faixaDaMarca(modelo,marca);
  if(!faixa) return null;
  var daFaixa=(modelo.publicacoes||[]).filter(function(p){return p.coluna===faixa.coluna+1;});
  var ultima=daFaixa.reduce(function(a,p){return Math.max(a,p.linha);},modelo.linhaCabecalho||0);
  var maxFolha=(modelo.publicacoes||[]).reduce(function(a,p){return Math.max(a,p.linha);},modelo.linhaCabecalho||0);
  return {linha:ultima+1, coluna:faixa.coluna, existe:(ultima+1)<=maxFolha,
          celulas:{projeto:ref(faixa.coluna,ultima), tipo:ref(faixa.coluna+1,ultima),
                   data:ref(faixa.coluna+2,ultima)}};
};
/* Uma linha que existe pode não ter a célula: o Excel omite as vazias que
   nunca foram tocadas. Antes de escrever numa delas, cria-se — vazia, na
   ordem certa das colunas, com o estilo da célula de cima para a linha não
   sair com outro aspeto. */
PUB.garantirCelula=function(xml,refa){
  var alvo=String(xml);
  var esc=String(refa).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  if(new RegExp('<c\\b[^>]*\\br="'+esc+'"').test(alvo)) return {ok:true,xml:alvo,criou:false};
  var xy=refParaXY(refa);
  if(!xy) return {ok:false,xml:alvo,porque:"referência inválida: "+refa};
  var mLinha=alvo.match(new RegExp('(<row\\b[^>]*\\br="'+xy.linha+'"[^>]*>)([\\s\\S]*?)(<\\/row>)'));
  if(!mLinha) return {ok:false,xml:alvo,porque:"a linha "+xy.linha+" não existe na folha"};
  var estilo=null;
  var acima=alvo.match(new RegExp('<c\\b([^>]*\\br="'+colLetras(xy.coluna)+(xy.linha-1)+'"[^>]*?)(?:\\/>|>)'));
  if(acima){ var sm=acima[1].match(/\bs="(\d+)"/); if(sm) estilo=sm[1]; }
  var nova='<c r="'+refa+'"'+(estilo?(' s="'+estilo+'"'):"")+'/>';
  var dentro=mLinha[2], posto=false, saida="";
  var re=/<c\b([^>]*?)(?:\/>|>[\s\S]*?<\/c>)/g, m, fim=0;
  while((m=re.exec(dentro))!==null){
    var rm=m[1].match(/\br="([A-Z]+)\d+"/);
    if(!posto && rm && colunaNum(rm[1])>xy.coluna){
      saida+=dentro.slice(fim,m.index)+nova; fim=m.index; posto=true;
    }
  }
  saida+=dentro.slice(fim);
  if(!posto) saida+=nova;
  var novaLinha=mLinha[1]+saida+mLinha[3];
  return {ok:true,criou:true,
          xml:alvo.slice(0,mLinha.index)+novaLinha+alvo.slice(mLinha.index+mLinha[0].length)};
};

/* Acrescentar uma linha à folha: entra antes do fecho do «sheetData», com
   os estilos copiados da linha de cima — uma linha nova com outro aspeto
   dava-se logo a ver — e o «dimension» passa a contá-la. */
PUB.acrescentarLinha=function(xml,linha,valores,modeloDaLinha){
  var alvo=String(xml);
  if(new RegExp('<row\\b[^>]*\\br="'+linha+'"').test(alvo))
    return {ok:false,xml:xml,porque:"a linha "+linha+" já existe na folha"};
  var acima=alvo.match(new RegExp('<row\\b[^>]*\\br="'+(linha-1)+'"[^>]*>([\\s\\S]*?)<\\/row>'));
  var estilos={};
  if(acima){
    var re=/<c\b([^>]*?)(?:\/>|>[\s\S]*?<\/c>)/g, m;
    while((m=re.exec(acima[1]))!==null){
      var rm=m[1].match(/\br="([A-Z]+)\d+"/), sm=m[1].match(/\bs="(\d+)"/);
      if(rm) estilos[rm[1]]=sm?sm[1]:null;
    }
  }
  var colunas=Object.keys(valores).sort(function(a,b){return colunaNum(a)-colunaNum(b);});
  var todas=Object.keys(estilos).length?Object.keys(estilos):colunas;
  todas=todas.slice().sort(function(a,b){return colunaNum(a)-colunaNum(b);});
  var celulas=todas.map(function(col){
    var r=col+linha, est=estilos[col]?(' s="'+estilos[col]+'"'):"";
    var v=valores[col];
    if(v===undefined||v===null||v==="") return '<c r="'+r+'"'+est+'/>';
    var miolo=PUB.miolo(v.valor,v.tipo);
    return '<c r="'+r+'"'+est+miolo.atr+'>'+miolo.dentro+'</c>';
  }).join("");
  var spans=(modeloDaLinha&&modeloDaLinha.spans)||("1:"+String(todas.length||1));
  var nova='<row r="'+linha+'" spans="'+spans+'">'+celulas+'</row>';
  var fecho=alvo.lastIndexOf("</sheetData>");
  if(fecho<0) return {ok:false,xml:xml,porque:"a folha não tem «sheetData»"};
  alvo=alvo.slice(0,fecho)+nova+alvo.slice(fecho);
  alvo=alvo.replace(/<dimension ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"\/>/,function(t,c1,l1,c2,l2){
    return (parseInt(l2,10)>=linha) ? t : '<dimension ref="'+c1+l1+':'+c2+linha+'"/>';
  });
  return {ok:true,xml:alvo};
};

/* ---------- o que publicar a seguir, proposto -------------------------
   Uma proposta não é um facto, e não se escreve sozinha: aparece no ecrã
   com a razão à frente, com os campos abertos para trocar, e só entra no
   ficheiro quando alguém carregar em aceitar.

   O cálculo é aritmética sobre o que já está no livro e na carteira —
   cadência das datas, quem foi publicado e há quanto tempo. Não usa
   modelo nenhum de linguagem e não gasta créditos: uma função de gestão
   que precisasse de uma API para funcionar deixava de funcionar no dia em
   que a API falhasse. */
PUB.cadencia=function(modelo,marca){
  var datas=((modelo&&modelo.porMarca&&modelo.porMarca[marca])||[])
    .map(function(p){return p.data;}).filter(Boolean).sort();
  if(datas.length<2) return 7;
  var contagem={}, i;
  for(i=1;i<datas.length;i++){
    var d=Math.round((Date.parse(datas[i]+"T00:00:00Z")-Date.parse(datas[i-1]+"T00:00:00Z"))/UM_DIA);
    if(d>0) contagem[d]=(contagem[d]||0)+1;
  }
  var melhor=7, quantas=0;
  Object.keys(contagem).forEach(function(d){
    if(contagem[d]>quantas || (contagem[d]===quantas && +d<melhor)){ melhor=+d; quantas=contagem[d]; }
  });
  return melhor;
};
function somarDias(iso,dias){
  var t=Date.parse(String(iso)+"T00:00:00Z");
  if(!isFinite(t)) return null;
  return new Date(t+dias*UM_DIA).toISOString().slice(0,10);
}
PUB.propostas=function(modelo,marca,opcoes){
  opcoes=opcoes||{};
  var candidatos=opcoes.projetos||[], quantas=opcoes.quantas||3;
  var hoje=opcoes.hoje||new Date().toISOString().slice(0,10);
  var daFaixa=(modelo&&modelo.porMarca&&modelo.porMarca[marca])||[];
  if(!PUB.faixaDaMarca(modelo,marca))
    return {propostas:[],porque:"o Excel não tem faixa para "+marca};
  var cadencia=PUB.cadencia(modelo,marca);
  var ultima=daFaixa.map(function(p){return p.data;}).filter(Boolean).sort().slice(-1)[0]||hoje;
  var partida=(ultima<hoje)?hoje:ultima;

  /* o histórico de cada projeto, lido do próprio calendário */
  var visto={}, tiposPorProjeto={}, tiposDaFaixa={};
  daFaixa.forEach(function(p){
    var k=flat(p.projeto);
    if(k && (!visto[k] || p.data>visto[k])) visto[k]=p.data||"";
    if(k && p.tipo){
      (tiposPorProjeto[k]||(tiposPorProjeto[k]={}))[p.tipo]=(tiposPorProjeto[k][p.tipo]||0)+1;
      tiposDaFaixa[p.tipo]=(tiposDaFaixa[p.tipo]||0)+1;
    }
  });
  function maisUsado(mapa){
    var melhor=null,n=0;
    Object.keys(mapa||{}).forEach(function(t){ if(mapa[t]>n){melhor=t;n=mapa[t];} });
    return melhor;
  }
  var tipoDaFaixa=maisUsado(tiposDaFaixa);

  var fila=candidatos.map(function(c){
    var nome=(typeof c==="string")?c:(c&&c.nome);
    var k=flat(nome);
    var ultimaVez=visto[k]||null;
    var agendado=ultimaVez && ultimaVez>=hoje;
    return {nome:nome, chave:k, ultimaVez:ultimaVez, agendado:!!agendado,
            tipo:maisUsado(tiposPorProjeto[k])||tipoDaFaixa||null};
  }).filter(function(c){ return c.nome && !c.agendado; });

  fila.sort(function(a,b){
    if(!a.ultimaVez && b.ultimaVez) return -1;
    if(a.ultimaVez && !b.ultimaVez) return 1;
    if(a.ultimaVez!==b.ultimaVez) return a.ultimaVez<b.ultimaVez?-1:1;
    return a.chave<b.chave?-1:1;
  });

  var saida=[], data=partida;
  fila.slice(0,quantas).forEach(function(c){
    data=somarDias(data,cadencia);
    saida.push({projeto:c.nome, tipo:c.tipo, data:data, marca:marca,
      porque: c.ultimaVez
        ? ("a última vez no calendário foi a "+c.ultimaVez.split("-").reverse().join("-"))
        : "nunca apareceu no calendário",
      cadencia:cadencia});
  });
  return {propostas:saida, cadencia:cadencia, partida:partida,
          porque: saida.length ? null
            : (candidatos.length ? "todos os projetos já estão agendados" : "não há projetos para propor")};
};

/* ---------- o que é comum às duas plataformas ---------------------------
   Desktop e telemóvel alcançam o ficheiro de maneiras diferentes — um
   manípulo do browser, um PUT no Graph — e param aí. Tudo o que decide o
   que se escreve vive nestas três funções, que os dois usam: aplicar as
   alterações ao XML, montar o ZIP de volta, e montar o plano de uma linha
   nova. Duas cópias destas regras acabariam por discordar. */
PUB.aplicarAlteracoes=function(xml,alteracoes){
  var i;
  for(i=0;i<(alteracoes||[]).length;i++){
    var a=alteracoes[i];
    var r=(a.tipo==="calculado")
      ? PUB.escreverValorCalculado(xml,a.ref,a.valor)
      : PUB.escreverCelula(xml,a.ref,a.valor,a.tipo);
    if(!r.ok) return {ok:false,xml:xml,porque:r.porque};
    xml=r.xml;
  }
  return {ok:true,xml:xml};
};
PUB.bytesComXml=function(modelo,xml){
  var novos={}; novos[modelo.livro.folha]=xml;
  return escreverZip(modelo.livro.zip,novos);
};
PUB.bytesComAlteracoes=function(modelo,alteracoes){
  var r=PUB.aplicarAlteracoes(modelo.livro.xml,alteracoes);
  if(!r.ok) return Promise.resolve({ok:false,porque:r.porque});
  return PUB.bytesComXml(modelo,r.xml).then(function(b){ return {ok:true,bytes:b}; });
};
/* O plano de uma linha nova: onde entra e como fica o XML. Devolve a razão
   em vez de atirar, porque as razões são para mostrar. */
PUB.planoDeLinhaNova=function(modelo,marca,dados){
  dados=dados||{};
  if(!String(dados.projeto||"").trim())
    return {ok:false,porque:"uma publicação sem projeto não se escreve"};
  var serie=dados.data?PUB.paraSerieExcel(dados.data):null;
  if(dados.data && serie===null)
    return {ok:false,porque:"data inválida: use AAAA-MM-DD"};
  var sitio=PUB.linhaParaNova(modelo,marca);
  if(!sitio) return {ok:false,porque:"o Excel não tem faixa para "+marca};
  var xml=modelo.livro.xml, i;
  var partes=[["projeto",dados.projeto,"texto"],["tipo",dados.tipo,"texto"],
              ["data",serie,"numero"]];
  if(sitio.existe){
    for(i=0;i<partes.length;i++){
      var alvo=sitio.celulas[partes[i][0]];
      var g=PUB.garantirCelula(xml,alvo);
      if(!g.ok) return {ok:false,porque:g.porque};
      var r=PUB.escreverCelula(g.xml,alvo,partes[i][1],partes[i][2]);
      if(!r.ok) return {ok:false,porque:r.porque};
      xml=r.xml;
    }
  }else{
    var valores={};
    valores[colLetras(sitio.coluna)]={valor:dados.projeto,tipo:"texto"};
    valores[colLetras(sitio.coluna+1)]={valor:dados.tipo,tipo:"texto"};
    valores[colLetras(sitio.coluna+2)]={valor:serie,tipo:"numero"};
    var rl=PUB.acrescentarLinha(xml,sitio.linha,valores);
    if(!rl.ok) return {ok:false,porque:rl.porque};
    xml=rl.xml;
  }
  return {ok:true,xml:xml,sitio:sitio};
};

/* Gravar uma publicação nova. O mesmo cuidado da edição: relê-se, escreve-se
   e volta a ler-se para confirmar. */
PUB.gravarNova=function(fonte,marca,dados){
  if(!fonte||!fonte.handle)
    return Promise.reject(new Error("Sem ligação de escrita ao ficheiro. Use «Ligar Organização.xlsx» e autorize a gravação."));
  var h=fonte.handle;
  dados=dados||{};
  return Promise.resolve(
      typeof h.requestPermission==="function" ? h.requestPermission({mode:"readwrite"}) : "granted")
    .then(function(p){
      if(p!=="granted") throw new Error("Permissão de escrita recusada pelo browser.");
      return h.getFile().then(PUB.lerFicheiro);
    })
    .then(function(fresco){
      var plano=PUB.planoDeLinhaNova(fresco,marca,dados);
      if(!plano.ok) return {ok:false,modelo:fresco,porque:plano.porque};
      return PUB.bytesComXml(fresco,plano.xml)
        .then(function(bytes){
          return h.createWritable().then(function(w){
            return Promise.resolve(w.write(bytes)).then(function(){return w.close();});
          });
        })
        .then(function(){ return h.getFile().then(PUB.lerFicheiro); })
        .then(function(depois){
          var achada=PUB.localizar(depois,{marca:marca,linha:plano.sitio.linha,
            coluna:plano.sitio.coluna+1, projeto:dados.projeto, tipo:dados.tipo,
            data:dados.data||null, celulas:plano.sitio.celulas});
          if(achada.estado!=="encontrada")
            return {ok:false,modelo:depois,
                    porque:"escreveu, mas a releitura não confirmou a linha nova — verifique o Excel"};
          return {ok:true,modelo:depois,publicacao:achada.publicacao,
                  linhaNova:!plano.sitio.existe,celulas:plano.sitio.celulas};
        });
    });
};

/* ---------- gravar ------------------------------------------------------
   A ordem importa e é a razão de haver aqui tantos passos: relê-se o
   ficheiro do disco antes de escrever (o Excel pode ter mexido nele desde
   que a app o leu), confirma-se que a linha continua a ser aquela linha,
   escreve-se, e só depois de reler outra vez é que se diz que gravou.
   Dizer «guardado» antes desta última leitura seria dizer o que não se
   sabe. */
PUB.gravar=function(fonte,alvo,mudancas){
  if(!fonte||!fonte.handle)
    return Promise.reject(new Error("Sem ligação de escrita ao ficheiro. Use «Ligar Organização.xlsx» e autorize a gravação."));
  if(typeof fonte.handle.createWritable!=="function")
    return Promise.reject(new Error("Este browser não deixa gravar no ficheiro local. Abra no OneDrive para editar."));
  var h=fonte.handle, plano=null, refsEscritas=null;
  return Promise.resolve(
      typeof h.requestPermission==="function" ? h.requestPermission({mode:"readwrite"}) : "granted")
    .then(function(p){
      if(p!=="granted") throw new Error("Permissão de escrita recusada pelo browser.");
      return h.getFile().then(PUB.lerFicheiro);
    })
    .then(function(fresco){
      var onde=PUB.localizar(fresco,alvo);
      if(onde.estado!=="encontrada")
        return {ok:false,conflito:true,modelo:fresco,
                porque:onde.porque||"a publicação já não está onde estava",
                mudouDeSitio:false};
      plano=PUB.planoDeEdicao(onde.publicacao,mudancas,fresco.livro.cadeia,
                              (fresco.porMarca&&fresco.porMarca[alvo.marca])||[]);
      if(!plano.alteracoes.length)
        return {ok:true,semMudanca:true,modelo:fresco,recusas:plano.recusas,
                publicacao:onde.publicacao};
      var aplicado=PUB.aplicarAlteracoes(fresco.livro.xml,plano.alteracoes);
      if(!aplicado.ok) return {ok:false,conflito:true,modelo:fresco,porque:aplicado.porque};
      refsEscritas=plano.alteracoes.slice();
      return PUB.bytesComXml(fresco,aplicado.xml)
        .then(function(bytes){
          return h.createWritable().then(function(w){
            return Promise.resolve(w.write(bytes)).then(function(){return w.close();});
          });
        })
        .then(function(){ return h.getFile().then(PUB.lerFicheiro); })
        .then(function(depois){
          var onde2=PUB.localizar(depois,{
            marca:alvo.marca,linha:onde.publicacao.linha,coluna:onde.publicacao.coluna,
            projeto:mudancas.projeto!==undefined?mudancas.projeto:onde.publicacao.projeto,
            tipo:mudancas.tipo!==undefined?mudancas.tipo:onde.publicacao.tipo,
            data:mudancas.data!==undefined?mudancas.data:onde.publicacao.data,
            celulas:onde.publicacao.celulas});
          if(onde2.estado!=="encontrada")
            return {ok:false,modelo:depois,porque:"gravou, mas a releitura não confirmou o valor — verifique o Excel"};
          return {ok:true,modelo:depois,publicacao:onde2.publicacao,
                  escritas:refsEscritas,recusas:plano.recusas,avisos:plano.avisos};
        });
    });
};

/* ---------- ligação local ao ficheiro sincronizado pelo OneDrive -------- */
function abrirBD(){
  if(db) return Promise.resolve(db);
  if(typeof indexedDB==="undefined") return Promise.resolve(null);
  return new Promise(function(ok,mal){
    var r=indexedDB.open(BD,1);
    r.onupgradeneeded=function(){if(!r.result.objectStoreNames.contains("h"))r.result.createObjectStore("h");};
    r.onsuccess=function(){db=r.result;ok(db);};r.onerror=function(){mal(r.error);};
  }).catch(function(){return null;});
}
function guardarHandle(h){
  return abrirBD().then(function(d){
    if(!d)return false;return new Promise(function(ok){var t=d.transaction("h","readwrite").objectStore("h").put(h,"organizacao");t.onsuccess=function(){ok(true);};t.onerror=function(){ok(false);};});
  });
}
PUB.handleGuardado=function(){
  return abrirBD().then(function(d){
    if(!d)return null;return new Promise(function(ok){var t=d.transaction("h","readonly").objectStore("h").get("organizacao");t.onsuccess=function(){ok(t.result||null);};t.onerror=function(){ok(null);};});
  });
};
PUB.lerHandle=function(h){ return h.getFile().then(PUB.lerFicheiro); };
/* A ligação é recuperada sozinha ao abrir a app: o handle fica guardado no
   IndexedDB e a permissão já dada volta com ele. Pede-se logo «readwrite»
   — pedir só leitura obrigava a uma segunda autorização à primeira
   gravação, no meio do trabalho. */
PUB.restaurar=function(){
  return PUB.handleGuardado().then(function(h){
    if(!h)return null;
    if(typeof h.queryPermission!=="function")return {handle:h,escrita:true};
    return Promise.resolve(h.queryPermission({mode:"readwrite"})).then(function(p){
      if(p==="granted") return {handle:h,escrita:true};
      return Promise.resolve(h.queryPermission({mode:"read"})).then(function(q){
        return q==="granted"?{handle:h,escrita:false}:null;
      });
    });
  });
};
/* O ficheiro pode ser alterado no Excel enquanto a app está aberta. Não se
   relê o livro inteiro a cada olhada: compara-se tamanho e data do
   ficheiro, que é o que o sistema já sabe sem abrir nada. */
PUB.mudouNoDisco=function(fonte,assinatura){
  if(!fonte||!fonte.handle||!assinatura) return Promise.resolve(false);
  return fonte.handle.getFile().then(function(f){
    return (f.size!==assinatura.tamanho) || (f.lastModified!==assinatura.alteradoEm);
  }).catch(function(){return false;});
};
PUB.escolher=function(){
  if(typeof window.showOpenFilePicker==="function"){
    return window.showOpenFilePicker({multiple:false,types:[{description:"Excel Organização",accept:{"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":[".xlsx"]}}]})
      .then(function(a){var h=a&&a[0];if(!h)throw new Error("Nenhum ficheiro escolhido.");
        return guardarHandle(h).then(function(){return {handle:h,escrita:true};});});
  }
  return new Promise(function(ok,mal){
    var i=document.createElement("input");i.type="file";i.accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    i.onchange=function(){var f=i.files&&i.files[0];if(f)ok({file:f,handle:null,escrita:false});else mal(new Error("Nenhum ficheiro escolhido."));};
    i.click();
  });
};

})();
