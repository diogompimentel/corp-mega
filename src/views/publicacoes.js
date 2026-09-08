/* PUBLICAÇÕES — o calendário editorial, no telemóvel.

   O calendário não vive no Data Hub: vive no Organização.xlsx, e é lido
   pelo Graph a pedido. Por isso esta vista, ao contrário das outras, diz
   sempre em que estado está — por ler, a ler, lido, em conflito. As outras
   podem mostrar o último retrato e dizer que é velho; esta não tem retrato
   nenhum guardado, e fingir que tinha era inventar um calendário.

   O que se pode escrever é decidido pelo mesmo adaptador do desktop, e por
   isso uma data em corrente aqui diz o mesmo que lá diz. */
import {esc, vazio} from "../formato.js";

function dataPt(s){
  if(!s) return "—";
  const p = String(s).slice(0, 10).split("-");
  return p.length === 3 ? p[2] + "-" + p[1] + "-" + p[0] : String(s);
}
function mesPt(s){
  if(!s) return "Sem data";
  const d = new Date(String(s) + "T12:00:00");
  return isNaN(d.getTime()) ? "Sem data"
    : d.toLocaleDateString("pt-PT", {month:"long", year:"numeric"});
}

export function render(m){
  m = m || {};
  const marca = m.marca === "opere" ? "OPERE" : "CO.RP";
  let h = '<h1>Publicações</h1>';

  if(m.mensagem)
    h += '<div class="' + (m.mensagem.ok ? "cartao" : "erro") + '">'
      + esc(m.mensagem.texto) + '</div>';

  if(m.aLer)
    return h + '<p class="sub">a ler o Organização.xlsx…</p>'
      + '<ul class="lista"><li class="skeleton"><span class="skeleton-linha"></span></li></ul>';

  if(!m.calendario){
    return h + vazio("O calendário está no Organização.xlsx.", "Lido a pedido.")
      + '<div class="acoes"><button type="button" class="acao acao-forte" '
      + 'data-acao="ler-organizacao">Ler o calendário</button></div>'
      + (m.semRede ? '<p class="sub">Sem rede — este ecrã precisa dela.</p>' : '');
  }

  if(m.editando){
    const p = m.editando;
    h += '<p class="sub">' + esc(p.celulas.projeto) + ' · linha ' + p.linha + '</p>';
    [["projeto", "Projeto / assunto", "text"],
     ["tipo", "Tipo", "text"],
     ["data", "Data", "date"]].forEach(c => {
      const pode = (p.edicao && p.edicao[c[0]]) || {pode:true};
      h += '<label for="pub-' + c[0] + '">' + esc(c[1]) + '</label>'
        + '<input type="' + c[2] + '" id="pub-' + c[0] + '" value="'
        + esc(p[c[0]] || "") + '"' + (pode.pode ? "" : " disabled") + '>'
        + (pode.porque ? '<p class="sub">' + esc(pode.porque) + '</p>' : '');
    });
    h += '<div class="acoes">'
      + '<button type="button" class="acao acao-forte" data-acao="gravar-publicacao"'
      + (m.aGravar ? " disabled" : "") + '>'
      + (m.aGravar ? "A gravar…" : "Gravar no Excel") + '</button>'
      + '<button type="button" class="acao" data-acao="fechar-publicacao">Voltar</button></div>'
    return h;
  }

  const lista = (m.calendario.porMarca && m.calendario.porMarca[m.marca || "corp"]) || [];
  h += '<p class="sub">' + esc(marca) + ' · ' + lista.length + ' publicação(ões)'
    + (m.lidoEm ? ' · lido às ' + esc(m.lidoEm) : '') + '</p>'
    + '<div class="acoes">'
    + '<button type="button" class="acao" data-acao="ler-organizacao">Reler</button>'
    + '<button type="button" class="acao" data-acao="nova-publicacao">Nova</button>'
    + (m.calendario.ficha && m.calendario.ficha.url
        ? '<a class="acao" href="' + esc(m.calendario.ficha.url) + '" target="_blank" rel="noopener">Abrir no Excel</a>'
        : '') + '</div>';

  if(!lista.length)
    return h + vazio("Nada agendado para " + marca + ".",
      "As linhas desta faixa do Organização.xlsx aparecem aqui por mês.");

  let mes = null;
  h += '<ul class="lista">';
  lista.forEach(p => {
    const q = mesPt(p.data);
    if(q !== mes){ mes = q; h += '<li class="sub">' + esc(mes) + '</li>'; }
    const passou = p.data && m.hoje && p.data < m.hoje;
    h += '<li><button type="button" class="linha" data-acao="editar-publicacao"'
      + ' data-item="' + esc(p.id) + '">'
      + '<span class="titulo">' + esc(p.projeto || "—") + '</span>'
      + '<span class="meta">' + esc(dataPt(p.data)) + ' · ' + esc(p.tipo || "—") + '</span>'
      + (passou ? '<span class="etiq etiq-vencido">passou</span>' : '')
      + '</button></li>';
  });
  return h + '</ul>';
}
