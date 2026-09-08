/* FINANCEIRO — o resumo, e só o resumo.

   A reconciliação documental do Moloni fica no desktop. Aqui interessa
   saber quanto está por faturar e por receber, e em que projetos.

   Um total só se soma com valores que se podem afirmar: o que fica de fora
   diz-se, em vez de desaparecer para a conta ficar bonita. */
import {esc, euros, dinheiro, vazio} from "../formato.js";

function somar(projetos, campo){
  let total = 0, contados = 0, fora = 0;
  projetos.forEach(p => {
    const v = (p.finance || {})[campo];
    if(typeof v === "number"){ total += v; contados++; }
    else fora++;
  });
  return {total:contados ? total : null, contados, fora};
}

export function render(modelo){
  modelo = modelo || {};
  const projetos = modelo.projetos || [];
  if(!projetos.length)
    return '<h1>Financeiro</h1>' + vazio("Sem carteira carregada.", "Sincronize no Perfil.");

  /* «fees» são os honorários acordados, e é assim que o Atelier lhes
     chama. Aqui chamavam-se «Contratado» — o mesmo número, 907.893 €, com
     dois nomes em dois ecrãs da mesma casa, e «contrato» é ainda por cima
     outro campo do contrato canónico. Quem olha para os dois fica sem
     saber se vê a mesma grandeza ou duas. */
  const honorarios = somar(projetos, "fees");
  const faturado = somar(projetos, "invoiced");
  const porFaturar = somar(projetos, "toInvoice");
  const porReceber = somar(projetos, "toReceive");

  const linha = (rotulo, r) =>
    '<tr><td>' + esc(rotulo) + '</td><td>' + dinheiro(r.total)
    + (r.fora ? '<br><span class="meta">' + r.fora + ' por confirmar</span>' : '')
    + '</td></tr>';

  const devedores = projetos
    .filter(p => typeof (p.finance || {}).toInvoice === "number" && p.finance.toInvoice > 0)
    .sort((a, b) => b.finance.toInvoice - a.finance.toInvoice)
    .slice(0, 12);

  return '<h1>Financeiro</h1>'
    + '<div class="cartao"><table class="dinheiro"><tbody>'
    + linha("Honorários", honorarios)
    + linha("Faturado", faturado)
    + linha("Por faturar", porFaturar)
    + linha("Por receber", porReceber)
    + '</tbody></table></div>'
    + (devedores.length
        ? '<h2>Por faturar, projeto a projeto</h2><ul class="lista">'
          + devedores.map(p =>
              '<li><button type="button" class="linha" data-acao="abrir-projeto"'
              + ' data-projeto="' + esc(p.id) + '">'
              + '<span class="titulo">' + esc(p.name || p.folderRef) + '</span>'
              + '<span class="meta">' + esc(euros(p.finance.toInvoice)) + ' por faturar</span>'
              + '</button></li>').join("") + '</ul>'
        : '');
}
