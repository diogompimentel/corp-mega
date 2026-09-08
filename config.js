/* Configuração Microsoft da PWA CO.RP / OPERE.

   Não existe client secret numa SPA. O redirect local é calculado pela app
   e deve estar registado como plataforma "Single-page application":
   http://localhost:8777/
*/
window.CORP_CONFIG = {
  clientId: "d41b26ac-0fc2-4e45-8077-efb640b41a1f",
  tenantId: "e22e1ddd-c755-4d49-8360-b35392e6d44b",
  redirectUri: null,
  siteHostname: "cgfywsnshyvihel0yxi5pnax62j.sharepoint.com",
  sitePath: "/sites/allcompany",
  /* O Organização.xlsx: não é uma List, é um ficheiro no OneDrive do
     «geral@». O caminho é a partir da raiz dessa drive. */
  organizacao: {
    utilizador: "geral@corparquitetos.com",
    caminho: "Documentos/co.rp/00. Atelier/02. Organização/09. Coordenação/Organização.xlsx"
  },
  listas: ["Projects", "Clients", "Consultations", "Tasks", "NotesDecisions",
           "Commands", "Conflicts", "AppMeta", "Users", "AuditLog", "Aliases", "SyncRuns"]
};
