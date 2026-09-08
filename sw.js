/* O Service Worker: o que faz a app abrir sem rede.

   Duas regras, e a segunda é de segurança:

     · o app shell — HTML, CSS, módulos, ícones — vive em cache e serve-se
       de lá primeiro, porque não muda entre sincronizações;
     · nada do Microsoft Graph entra na Cache API. Uma resposta do Graph
       traz dados do atelier e viaja com um token; guardá-la em disco no
       telemóvel seria pôr lá o que se disse que não ia para lá. Os dados
       operacionais vivem em IndexedDB, que a app controla e limpa.
   ======================================================================= */
const CACHE = "mega-pwa-v1-cc2c5c668d";

/* A lista sai do bundle, escrita pelo «mobile/build.py» na construção.
   Escrita à mão derivava: uma vista entrava na app e nunca entrava aqui,
   e numa instalação nova, sem rede, faltava sem que nada o dissesse.
   O que estiver escrito abaixo é substituído. */
const SHELL = [
  "./",
  "./core/core.js",
  "./fontes/SimplonMono-Regular.otf",
  "./fontes/SimplonNorm-Medium.otf",
  "./fontes/SimplonNorm-Regular.otf",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./index.html",
  "./manifest.webmanifest",
  "./src/app.js",
  "./src/auth.js",
  "./src/datahub.js",
  "./src/formato.js",
  "./src/graph.js",
  "./src/organizacao.js",
  "./src/permissoes.js",
  "./src/router.js",
  "./src/search.js",
  "./src/store.js",
  "./src/sync.js",
  "./src/views/clientes.js",
  "./src/views/colaboracoes.js",
  "./src/views/financeiro.js",
  "./src/views/hoje.js",
  "./src/views/perfil.js",
  "./src/views/pesquisa.js",
  "./src/views/projeto.js",
  "./src/views/projetos.js",
  "./src/views/publicacoes.js",
  "./src/views/tarefas.js",
  "./styles.css",
  "./vendor/msal-browser.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(nomes => Promise.all(
    nomes.filter(n => n !== CACHE).map(n => caches.delete(n))
  )).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  /* Autenticação e dados nunca passam por aqui. */
  if(url.hostname.indexOf("graph.microsoft.com") >= 0
     || url.hostname.indexOf("login.microsoftonline.com") >= 0) return;
  if(e.request.method !== "GET") return;
  if(url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cacheada => {
      if(cacheada) return cacheada;
      return fetch(e.request).then(resposta => {
        /* Só se guarda o que é nosso e correu bem. */
        if(resposta && resposta.status === 200 && resposta.type === "basic"){
          const copia = resposta.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
        }
        return resposta;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
