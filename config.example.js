/* Configuração da PWA.

   Copiar para «config.js» e preencher. Não há segredo nenhum aqui: uma SPA
   autentica-se com Authorization Code + PKCE, e um segredo no browser é um
   segredo público.

   O ficheiro «config.js» não vai para o repositório. */
window.CORP_CONFIG = {
  clientId: "00000000-0000-0000-0000-000000000000",
  tenantId: "00000000-0000-0000-0000-000000000000",
  redirectUri: "https://exemplo.pages.dev/",
  siteHostname: "exemplo.sharepoint.com",
  sitePath: "/sites/MegaApp",
  /* Onde está o Organização.xlsx. Não é uma List: é um ficheiro no OneDrive
     do «geral@», e a app alcança-o com «Files.ReadWrite.All» delegado. O
     caminho é a partir da raiz dessa drive («Documents», no endereço web).
     Sem esta secção valem estes valores. */
  organizacao: {
    utilizador: "geral@corparquitetos.com",
    caminho: "Documentos/co.rp/00. Atelier/02. Organização/09. Coordenação/Organização.xlsx"
  },
  /* Os nomes das Lists do Data Hub. Os ids são descobertos na primeira
     ligação e ficam em cache. */
  listas: ["Projects", "Clients", "Consultations", "Tasks", "NotesDecisions",
           "Commands", "Conflicts", "AppMeta", "Users", "AuditLog"]
};
