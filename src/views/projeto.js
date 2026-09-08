/* PROJETO — a ficha operacional.

   O primeiro ecrã responde a «em que ponto está isto e o que faço a
   seguir». O editor técnico do Licenciamento não vive aqui: no telemóvel
   dele só interessa o resumo — prazo, entidade, último ofício e próxima
   ação. */
import {esc, dinheiro, euros, fase, vazio} from "../formato.js";

function morada(p){
  /* Só a morada, e o país. O nome do projeto ia junto na procura — «Casa em
     Pêra de Cima» não é um lugar, e misturá-lo com a rua fazia o mapa
     aterrar onde calhava. Sem morada não há botão: um mapa que abre no
     sítio errado é pior do que um mapa que não abre. */
  if(!p.location) return null;
  return "https://maps.apple.com/maps?q="
    + encodeURIComponent(p.location + ", Portugal");
}

function linhaDinheiro(rotulo, valor){
  return '<tr><td>' + esc(rotulo) + '</td><td>' + dinheiro(valor) + '</td></tr>';
}

export function render(modelo){
  modelo = modelo || {};
  const p = modelo.projeto;
  if(!p) return vazio("Projeto não encontrado.", "Volte à carteira e escolha outro.");

  const f = p.finance || {};
  const c = modelo.cliente || null;
  const tel = c && (c.phones || [])[0];
  const mail = c && (c.emails || [])[0];
  const mapa = morada(p);
  const conflito = (p.health || []).indexOf("fees-review") >= 0;
  /* Houve aqui um cronómetro de horas. Saiu: as horas que ele contava
     nunca chegavam ao Hours Tracker — o comando ficava «failed» no Data Hub
     — e um botão que promete o que não cumpre é pior do que a ausência
     dele. As horas continuam a contar-se onde sempre se contaram. */

  return '<h1>' + esc(p.name || p.folderRef || "projeto") + '</h1>'
    + '<p class="sub">' + esc(fase(p.phase, p.phaseLabel) || "fase por saber")
    + (p.operationalState ? " · " + esc(p.operationalState) : "")
    + (p.location ? " · " + esc(p.location) : "") + '</p>'

    /* A próxima ação é a pergunta do dia — «o que é que isto está à espera
       que aconteça». Escrevia-se só a partir do Hoje, e só quando o projeto
       já lá estava por não a ter. Aqui está sempre à mão. */
    + '<div class="cartao"><b>Próxima ação</b>'
    + (p.nextAction ? '<p>' + esc(p.nextAction) + '</p>'
                    : '<p class="porsaber">por definir</p>')
    + '<div class="acoes"><button type="button" class="acao'
    + (p.nextAction ? '' : ' acao-forte') + '" data-acao="definir-proxima-acao"'
    + ' data-projeto="' + esc(p.id) + '">'
    + (p.nextAction ? 'Alterar' : 'Definir') + '</button></div></div>'
    + (conflito && !modelo.semFinanceiro
        ? '<div class="erro" role="alert">Honorários a rever: já foi faturado mais do que os '
          + 'honorários conhecidos.</div>'
        : '')

    /* Quem não pode ver o financeiro não vê a tabela — e não vê um cartão
       vazio onde ela estava, que seria dizer-lhe que ali havia qualquer
       coisa. Sem dinheiro e sem horas, o cartão não existe. */
    + (function(){
        var linhas = (modelo.semFinanceiro ? ""
          : linhaDinheiro("Honorários", f.fees)
            + linhaDinheiro("Faturado", f.invoiced)
            + linhaDinheiro("Por faturar", f.toInvoice)
            + linhaDinheiro("Por receber", f.toReceive))
          + (typeof f.hours === "number"
              ? '<tr><td>Horas</td><td>' + f.hours + " h"
                + (typeof f.eurPerHour === "number" && !modelo.semFinanceiro
                    ? " · " + esc(euros(f.eurPerHour)) + "/h" : "")
                + '</td></tr>'
              : "");
        return linhas
          ? '<div class="cartao"><table class="dinheiro"><tbody>' + linhas
            + '</tbody></table></div>'
          : "";
      })()

    + (modelo.licenciamento
        ? '<div class="cartao"><b>Licenciamento</b>'
          + '<p class="meta">' + esc(modelo.licenciamento.entidade || "entidade por saber")
          + (modelo.licenciamento.prazo ? " · prazo " + esc(modelo.licenciamento.prazo) : "")
          + '</p>'
          + (modelo.licenciamento.ultimoOficio
              ? '<p class="meta">último ofício: ' + esc(modelo.licenciamento.ultimoOficio) + '</p>'
              : '')
          + '</div>'
        : '')

    + '<div class="acoes">'
    + (tel ? '<a class="acao" href="tel:' + esc(tel) + '">Telefonar</a>'
           : '<button type="button" class="acao" disabled>Telefonar</button>')
    + (mail ? '<a class="acao" href="mailto:' + esc(mail) + '?subject='
              + encodeURIComponent(p.name || "") + '">Email</a>'
            : '<button type="button" class="acao" disabled>Email</button>')
    + (mapa ? '<a class="acao" href="' + esc(mapa) + '" rel="noopener">Mapa</a>'
            : '<button type="button" class="acao" disabled>Mapa</button>')
    + (modelo.documentos
        ? '<a class="acao" href="' + esc(modelo.documentos) + '" rel="noopener">Documentos</a>'
        : '<button type="button" class="acao" disabled>Documentos</button>')
    + '</div>'

    + '<div class="acoes">'
    + '<button type="button" class="acao acao-forte" data-acao="nova-tarefa"'
    + ' data-projeto="' + esc(p.id) + '">Nova tarefa</button>'
    + '<button type="button" class="acao" data-acao="nova-nota"'
    + ' data-projeto="' + esc(p.id) + '">Nota/decisão</button>'
    + '<button type="button" class="acao" data-acao="mudar-estado"'
    + ' data-projeto="' + esc(p.id) + '">Estado</button>'
    + '</div>'

    + (modelo.tarefas && modelo.tarefas.length
        ? '<h2>Tarefas</h2><ul class="lista">' + modelo.tarefas.map(t =>
            '<li><button type="button" class="linha" data-acao="concluir-tarefa"'
            + ' data-item="' + esc(t.id) + '">'
            + '<span class="titulo">' + esc(t.title || t.titulo) + '</span>'
            + '<span class="meta">tocar para concluir</span></button></li>').join("")
          + '</ul>'
        : '')

    + (modelo.notas && modelo.notas.length
        ? '<h2>Notas e decisões</h2><ul class="lista">' + modelo.notas.map(n =>
            '<li class="linha"><span>' + esc(n.text || n.texto) + '</span>'
            + '<span class="meta">' + esc(n.createdAt || "") + '</span></li>').join("")
          + '</ul>'
        : '');
}
