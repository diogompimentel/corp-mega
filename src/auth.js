/* Autenticação Microsoft, sem segredos.

   Uma SPA não pode guardar um segredo: qualquer coisa que esteja no bundle
   está publicada. Por isso o fluxo é Authorization Code + PKCE, e quem o
   trata é o MSAL — que também é quem guarda os tokens, na sua sessão. Nada
   de escrever access tokens à mão em localStorage.

   Depois do login, o utilizador é verificado contra a List «Users»: quem
   não estiver lá, ou estiver inativo, não entra. O papel guarda-se em cache
   como preferência de interface, não como autorização — a autorização real
   é a do SharePoint. */

const ESCOPOS_BASE = ["User.Read"];
/* «Sites.ReadWrite.All» é o Data Hub — as Lists onde vivem os projetos.
   «Files.ReadWrite.All» é o Organização.xlsx, que não está numa List: está
   no OneDrive do «geral@», e quem entra na app é outra conta. O escopo
   delegado significa «os ficheiros a que o utilizador já tem acesso» — não
   abre nada que a pessoa não pudesse abrir pelo browser. */
const ESCOPOS_DADOS = ["https://graph.microsoft.com/Sites.ReadWrite.All",
                       "https://graph.microsoft.com/Files.ReadWrite.All"];

let app = null;
let config = null;
let contaActiva = null;

/* O MSAL entra por CDN no index quando existe; sem ele, a app diz que não
   consegue autenticar em vez de fingir que está autenticada. */
function msalDisponivel(){
  return typeof window !== "undefined" && window.msal
    && typeof window.msal.PublicClientApplication === "function";
}

export async function init(cfg){
  config = cfg || {};
  if(!msalDisponivel()) return {ok:false, razao:"biblioteca de autenticação indisponível"};
  app = new window.msal.PublicClientApplication({
    auth:{
      clientId:config.clientId,
      authority:"https://login.microsoftonline.com/" + config.tenantId,
      redirectUri:config.redirectUri || window.location.origin + window.location.pathname
    },
    cache:{cacheLocation:"sessionStorage", storeAuthStateInCookie:false}
  });
  if(typeof app.initialize === "function") await app.initialize();
  const r = await app.handleRedirectPromise();
  if(r && r.account) contaActiva = r.account;
  if(!contaActiva){
    const contas = app.getAllAccounts();
    if(contas.length) contaActiva = contas[0];
  }
  return {ok:true, conta:contaActiva};
}

export function conta(){ return contaActiva; }

export async function login(){
  if(!app) throw new Error("autenticação por iniciar");
  /* No iPhone em standalone, um popup fecha a app: o redirect é o caminho. */
  await app.loginRedirect({scopes:ESCOPOS_BASE.concat(ESCOPOS_DADOS)});
}

export async function token(scopes){
  if(!app || !contaActiva) throw new Error("sem sessão");
  const pedido = {scopes:scopes || ESCOPOS_DADOS, account:contaActiva};
  try{
    const r = await app.acquireTokenSilent(pedido);
    return r.accessToken;
  }catch(e){
    /* O silencioso falha quando o refresh expira: aí pede-se outra vez, e
       só aí. Pedir sempre seria arrastar a pessoa para o browser a meio de
       uma reunião. */
    await app.acquireTokenRedirect(pedido);
    throw new Error("a reautenticar");
  }
}

export async function logout(){
  if(!app) return;
  contaActiva = null;
  await app.logoutRedirect();
}

/* Quem pode entrar: a List «Users» do Data Hub manda. Um utilizador
   ausente ou inativo recebe acesso negado — e a razão. */
export async function autorizar(hub, upn){
  const users = await hub.list("Users").catch(() => null);
  if(users === null) return {permitido:false, razao:"não foi possível ler os utilizadores"};
  const meu = users.filter(u =>
    String(u.UserPrincipalName || u.upn || "").toLowerCase() === String(upn || "").toLowerCase())[0];
  if(!meu) return {permitido:false, razao:"esta conta não está autorizada na Mega App"};
  if(meu.Active === false || meu.active === false)
    return {permitido:false, razao:"esta conta está inativa"};
  /* O registo inteiro viaja: é dele que sai o que a pessoa pode ver, e
     lê-lo duas vezes daria duas respostas possíveis à mesma pergunta. */
  return {permitido:true, papel:meu.Role || meu.papel || "Utilizador", registo:meu};
}
