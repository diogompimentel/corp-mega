/* Formatar é decidir o que se afirma.

   Um valor por saber escreve-se «por confirmar», nunca «0 €»: um zero é uma
   afirmação, e a mais perigosa aqui — lê-se como «não foi faturado». */

export function esc(s){
  return String(s == null ? "" : s).replace(/[&<>"]/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
}

export function euros(v){
  if(typeof v !== "number" || !isFinite(v)) return null;
  return new Intl.NumberFormat("pt-PT", {style:"currency", currency:"EUR",
    maximumFractionDigits:0}).format(v);
}

export function dinheiro(v){
  const f = euros(v);
  return f === null ? '<i class="porconfirmar">por confirmar</i>' : esc(f);
}

/* A fase viaja como id no contrato («execucao»); o rótulo é da casa e vem
   do Core. Sem rótulo, escreve-se o id de forma legível em vez de o mostrar
   cru — «Execucao» sem acento parece um erro, e é. */
const FASES = {
  "estudo-previo":"Estudo prévio", "pip":"PIP", "licenciamento":"Licenciamento",
  "execucao":"Projeto de execução", "assistencia-tecnica":"Assistência técnica",
  "consulta":"Consulta", "adjudicado":"Adjudicado", "producao":"Produção",
  "entregue-concluido":"Entregue / Concluído"
};
export function fase(id, rotulo){
  if(rotulo) return rotulo;
  if(!id) return "";
  return FASES[id] || titulo(String(id).replace(/-/g, " "));
}

export function titulo(s){
  const t = String(s || "");
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

/* Um prazo diz-se em relação a hoje: «vencido há 8 dias» decide-se mais
   depressa do que «2026-08-20». */
export function prazo(iso, hoje){
  if(!iso) return null;
  const a = Date.parse(String(iso).slice(0, 10) + "T12:00:00Z");
  const b = Date.parse(String(hoje || new Date().toISOString()).slice(0, 10) + "T12:00:00Z");
  if(isNaN(a) || isNaN(b)) return null;
  const d = Math.round((a - b) / 86400000);
  if(d < 0) return {texto:"vencido há " + (-d) + " dia(s)", classe:"etiq-vencido"};
  if(d === 0) return {texto:"hoje", classe:"etiq-hoje"};
  if(d === 1) return {texto:"amanhã", classe:"etiq"};
  return {texto:"daqui a " + d + " dia(s)", classe:"etiq"};
}

export function vazio(titulo, nota){
  return '<div class="vazio"><b>' + esc(titulo) + '</b>'
    + (nota ? '<span>' + esc(nota) + '</span>' : '') + '</div>';
}

export function erro(mensagem){
  return '<div class="erro" role="alert">' + esc(mensagem) + '</div>';
}

/* Um retrato em cache não se esconde: diz-se que é de quando é. */
export function avisoVelho(lastSync, razao){
  if(!lastSync) return "";
  const d = new Date(lastSync);
  const quando = isNaN(d.getTime()) ? String(lastSync)
    : d.toLocaleString("pt-PT", {dateStyle:"short", timeStyle:"short"});
  return '<div class="velho">' + esc(razao || "Sem rede")
    + ' — a mostrar o retrato de ' + esc(quando) + '.</div>';
}
