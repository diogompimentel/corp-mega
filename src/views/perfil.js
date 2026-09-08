/* PERFIL — quem está autenticado, e como vai a sincronização.

   Sem popups a dizer «sincronizado com sucesso»: uma sincronização verde
   não é notícia. O que é notícia é uma fonte em baixo ou ações por enviar. */
import {esc, vazio} from "../formato.js";

const ESTADOS = {
  ok:"tudo sincronizado", offline:"sem rede", "a-sincronizar":"a sincronizar",
  erro:"a última sincronização falhou"
};

export function render(modelo){
  modelo = modelo || {};
  const u = modelo.utilizador || null;
  const pendentes = modelo.pendentes || 0;
  const conflitos = modelo.conflitos || 0;

  /* Clientes e Financeiro eram rotas sem porta: existiam, funcionavam, e não
     havia maneira nenhuma de lá chegar sem escrever o endereço à mão. A
     barra de baixo só leva quatro áreas num telemóvel, e este «⋯» é onde
     mora o resto. Uma área que a conta não pode ver não aparece: um botão
     que leva a «não está disponível para si» é pior do que a ausência. */
  const areas = [
    {rota:"clientes", nome:"Clientes", nota:"contactos e projetos de cada um"},
    {rota:"financeiro", nome:"Financeiro", nota:"honorários e faturação",
     so: modelo.financeiro !== false},
    {rota:"colaboracoes", nome:"Colaborações e prémios",
     nota:"trabalho para outros ateliers, concursos ganhos"},
    {rota:"publicacoes", nome:"Publicações",
     nota:"o calendário do Organização.xlsx, lido a pedido"}
  ].filter(a => a.so !== false);

  return '<h1>Perfil</h1>'
    + '<h2>Áreas</h2>'
    + '<ul class="lista">' + areas.map(a =>
        '<li class="linha ligavel" data-rota-ir="' + esc(a.rota) + '" role="link" tabindex="0">'
        + '<span class="titulo">' + esc(a.nome) + '</span>'
        + '<span class="meta">' + esc(a.nota) + '</span></li>').join("") + '</ul>'
    + (u
        ? '<div class="cartao"><b>' + esc(u.nome || u.upn || "") + '</b>'
          + '<p class="meta">' + esc(u.upn || "") + (u.papel ? " · " + esc(u.papel) : "") + '</p>'
          + '</div>'
        : '<div class="cartao"><p>Não autenticado.</p>'
          + '<button type="button" class="acao acao-forte" data-acao="login">'
          + 'Entrar com Microsoft</button></div>')

    + '<div class="cartao">'
    + '<b>Sincronização</b>'
    + '<p class="meta">' + esc(ESTADOS[modelo.estado] || "por sincronizar")
    + (modelo.lastSync ? " · última às " + esc(String(modelo.lastSync).slice(11, 16)) : "")
    + '</p>'
    + (pendentes
        ? '<p class="meta">' + pendentes + ' ação(ões) por enviar.</p>' : '')
    + (conflitos
        ? '<p class="erro">' + conflitos + ' ação(ões) em conflito: foram alteradas noutro '
          + 'sítio depois de as ter escrito. Nenhuma se perdeu.</p>' : '')
    + '<div class="acoes">'
    + '<button type="button" class="acao" data-acao="sincronizar">Sincronizar</button>'
    + (u ? '<button type="button" class="acao" data-acao="logout">Sair</button>' : '')
    + '</div></div>'

    + ((modelo.fontesEmFalta || []).length
        ? '<div class="velho">Estas listas do Data Hub não responderam: '
          + esc(modelo.fontesEmFalta.join(", ")) + '. O resto está atualizado.</div>'
        : '')
    + (modelo.fontes && modelo.fontes.length
        ? '<h2>Fontes</h2><ul class="lista">' + modelo.fontes.map(f =>
            '<li class="linha"><span class="titulo">' + esc(f.source || f.nome) + '</span>'
            + '<span class="meta">' + esc(f.status || f.estado || "")
            + (f.lastSuccessAt ? " · " + esc(String(f.lastSuccessAt).slice(0, 16)) : "")
            + '</span></li>').join("") + '</ul>'
        : '');
}
