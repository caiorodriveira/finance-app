import { Despesa, Receita, Cartao } from '../models/types';

/**
 * Representa um item pendente no dashboard:
 * - tipo 'despesa': uma despesa individual (pagamento direto)
 * - tipo 'fatura': agrupamento de despesas de um cartão
 */
export interface PendenteItem {
  tipo: 'despesa' | 'fatura';
  id: string;
  nome: string;
  valor: number;
  data_vencimento?: string;
  despesas?: Despesa[]; // despesas que compõem a fatura
}

/**
 * Representa o resumo de fatura de um cartão
 */
export interface FaturaCartao {
  cartao: Cartao;
  despesas: Despesa[];
  total: number;
}

/**
 * Calcula o total de receitas do mês
 */
export function calcularTotalReceitas(receitas: Receita[]): number {
  return receitas.reduce((acc, r) => acc + r.valor, 0);
}

/**
 * Calcula o total de despesas do mês
 */
export function calcularTotalDespesas(despesas: Despesa[]): number {
  return despesas.reduce((acc, d) => acc + d.valor, 0);
}

/**
 * Calcula o saldo do mês: receitas - despesas
 */
export function calcularSaldo(receitas: Receita[], despesas: Despesa[]): number {
  return calcularTotalReceitas(receitas) - calcularTotalDespesas(despesas);
}

/**
 * Calcula o valor total pago (despesas com pago = true)
 */
export function calcularValorPago(despesas: Despesa[]): number {
  return despesas.filter(d => d.pago).reduce((acc, d) => acc + d.valor, 0);
}

/**
 * Calcula o valor restante a pagar
 */
export function calcularValorAPagar(despesas: Despesa[]): number {
  return despesas.filter(d => !d.pago).reduce((acc, d) => acc + d.valor, 0);
}

/**
 * Calcula o progresso de pagamento em porcentagem (0–100)
 */
export function calcularProgressoPagamento(despesas: Despesa[]): number {
  const total = calcularTotalDespesas(despesas);
  if (total === 0) return 0;
  return (calcularValorPago(despesas) / total) * 100;
}

/**
 * Retorna despesas pendentes (não pagas) do mês
 */
export function getDespesasPendentes(despesas: Despesa[]): Despesa[] {
  return despesas.filter(d => !d.pago);
}

/**
 * Retorna despesas vinculadas a um cartão específico
 */
export function getDespesasPorCartao(despesas: Despesa[], cartaoId: string): Despesa[] {
  return despesas.filter(d => d.cartao_id === cartaoId);
}

/**
 * Calcula o total gasto em um cartão específico no mês
 */
export function calcularTotalCartao(despesas: Despesa[], cartaoId: string): number {
  return getDespesasPorCartao(despesas, cartaoId).reduce((acc, d) => acc + d.valor, 0);
}

/**
 * Formata um valor numérico como moeda BRL
 */
export function formatarMoeda(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

/**
 * Gera o nome do mês em português a partir de YYYY-MM
 */
export function getNomeMes(mesReferencia: string): string {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const [year, month] = mesReferencia.split('-').map(Number);
  return `${meses[month - 1]} ${year}`;
}

/**
 * Agrupa despesas pendentes para exibição:
 * - Despesas com pagamento direto aparecem individualmente
 * - Despesas de cartão são agrupadas como "Fatura (nome do cartão)"
 */
export function agruparPendentes(despesas: Despesa[], cartoes: Cartao[]): PendenteItem[] {
  const pendentes = despesas.filter(d => !d.pago);
  const items: PendenteItem[] = [];

  // Despesas com pagamento direto (sem cartão)
  const diretas = pendentes.filter(d => d.forma_pagamento !== 'cartao' || !d.cartao_id);
  for (const d of diretas) {
    items.push({
      tipo: 'despesa',
      id: d.id,
      nome: d.nome,
      valor: d.valor,
      data_vencimento: d.data_vencimento,
    });
  }

  // Agrupar despesas de cartão por cartão_id
  const despesasCartao = pendentes.filter(d => d.forma_pagamento === 'cartao' && d.cartao_id);
  const porCartao = new Map<string, Despesa[]>();
  for (const d of despesasCartao) {
    const list = porCartao.get(d.cartao_id!) || [];
    list.push(d);
    porCartao.set(d.cartao_id!, list);
  }

  for (const [cartaoId, deps] of porCartao) {
    const cartao = cartoes.find(c => c.id === cartaoId);
    const nomeCartao = cartao ? cartao.nome : 'Cartão';
    const total = deps.reduce((acc, d) => acc + d.valor, 0);
    items.push({
      tipo: 'fatura',
      id: `fatura-${cartaoId}`,
      nome: `Fatura ${nomeCartao}`,
      valor: total,
      despesas: deps,
    });
  }

  return items;
}

/**
 * Retorna resumo de fatura por cartão (todas as despesas, não apenas pendentes)
 */
export function getFaturasCartoes(despesas: Despesa[], cartoes: Cartao[]): FaturaCartao[] {
  return cartoes
    .map(cartao => {
      const deps = despesas.filter(d => d.cartao_id === cartao.id);
      return {
        cartao,
        despesas: deps,
        total: deps.reduce((acc, d) => acc + d.valor, 0),
      };
    })
    .filter(f => f.despesas.length > 0);
}
