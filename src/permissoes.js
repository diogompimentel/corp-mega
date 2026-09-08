/* Quem vê o dinheiro.

   A regra vem da List «Users» do Data Hub, não do código: mudar um papel no
   SharePoint tem de chegar à app sem se voltar a publicar nada.

   Duas coisas importam aqui:

   · **Por omissão, não vê.** Um registo antigo sem a coluna, ou uma leitura
     que falhou, não podem abrir a porta. O silêncio fecha.

   · **Esconder o separador não chega.** Se a ficha do projeto continuar a
     trazer honorários e faturado, esconder o menu é teatro. Os valores são
     retirados do modelo antes de chegarem às vistas.

   E isto é o que a *app mostra*. Quem impede mesmo alguém de ler é o
   SharePoint, com as permissões da List — está explicado em
   `docs/mega-app-permissoes.md`. */

export function podeVerFinanceiro(utilizador){
  if(!utilizador) return false;
  const v = utilizador.Financeiro !== undefined ? utilizador.Financeiro
          : utilizador.financeiro;
  /* O SharePoint devolve booleanos como texto em algumas leituras. */
  return v === true || v === "true" || v === 1 || v === "1";
}

/* As horas não são dinheiro: quem gere a produção precisa delas, e retirá-las
   junto com os honorários tirava trabalho a quem não tem nada a ver com
   faturação. O €/h sai, porque esse já é uma leitura financeira. */
const CAMPOS_DE_DINHEIRO = ["fees", "produced", "invoiced", "toInvoice",
                            "received", "toReceive", "overReceived", "eurPerHour"];

export function semDinheiro(projeto){
  if(!projeto) return projeto;
  const finance = Object.assign({}, projeto.finance || {});
  CAMPOS_DE_DINHEIRO.forEach(c => { finance[c] = null; });
  return Object.assign({}, projeto, {
    finance,
    /* «honorários a rever» é uma exceção financeira: não se anuncia a quem
       não pode ver o financeiro. */
    health: (projeto.health || []).filter(h => h !== "fees-review"
                                            && h !== "over-received")
  });
}

export function filtrar(projetos, pode){
  if(pode) return projetos || [];
  return (projetos || []).map(semDinheiro);
}
