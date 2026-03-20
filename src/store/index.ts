import { create } from 'zustand';
import { Despesa, Receita, Cartao } from '../models/types';
import { DespesasRepo, ReceitasRepo, CartoesRepo } from '../repositories';
import { generateId } from '../utils/uuid';

interface AppState {
  currentMonth: string;
  despesas: Despesa[];
  receitas: Receita[];
  cartoes: Cartao[];
  setCurrentMonth: (month: string) => void;
  loadData: () => Promise<void>;
  addDespesa: (despesa: Despesa) => Promise<void>;
  toggleDespesaPago: (id: string, pago: boolean) => Promise<void>;
  toggleFaturaCartaoPago: (cartaoId: string, pago: boolean) => Promise<void>;
  addReceita: (receita: Receita) => Promise<void>;
  updateReceita: (receita: Receita) => Promise<void>;
  deleteReceita: (id: string) => Promise<void>;
  addCartao: (cartao: Cartao) => Promise<void>;
  updateCartao: (cartao: Cartao) => Promise<void>;
  deleteCartao: (id: string) => Promise<void>;
  updateDespesa: (despesa: Despesa) => Promise<void>;
  deleteDespesa: (id: string) => Promise<void>;
  replicateMonth: () => Promise<void>;
  clearMonthData: () => Promise<void>;
  checkAndSetInitialMonth: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentMonth: new Date().toISOString().substring(0, 7), // YYYY-MM
  despesas: [],
  receitas: [],
  cartoes: [],

  setCurrentMonth: (month: string) => {
    set({ currentMonth: month });
    get().loadData();
  },

  loadData: async () => {
    const { currentMonth } = get();
    const [despesas, receitas, cartoes] = await Promise.all([
      DespesasRepo.getAllByMonth(currentMonth),
      ReceitasRepo.getAllByMonth(currentMonth),
      CartoesRepo.getAllByMonth(currentMonth)
    ]);

    // SQLite might return 'pago' as 0/1 instead of boolean, handle parsing
    const parsedDespesas = despesas.map(d => ({
      ...d,
      pago: Boolean(d.pago)
    }));

    set({ despesas: parsedDespesas, receitas, cartoes });
  },

  addDespesa: async (despesa: Despesa) => {
    await DespesasRepo.insert(despesa);
    await get().loadData();
  },

  updateDespesa: async (despesa: Despesa) => {
    await DespesasRepo.update(despesa);
    await get().loadData();
  },

  deleteDespesa: async (id: string) => {
    await DespesasRepo.delete(id);
    await get().loadData();
  },

  toggleDespesaPago: async (id: string, pago: boolean) => {
    await DespesasRepo.togglePago(id, pago);
    await get().loadData();
  },

  toggleFaturaCartaoPago: async (cartaoId: string, pago: boolean) => {
    const { currentMonth } = get();
    await DespesasRepo.togglePagoByCartao(cartaoId, currentMonth, pago);
    await get().loadData();
  },

  addReceita: async (receita: Receita) => {
    await ReceitasRepo.insert(receita);
    await get().loadData();
  },

  updateReceita: async (receita: Receita) => {
    await ReceitasRepo.update(receita);
    await get().loadData();
  },

  deleteReceita: async (id: string) => {
    await ReceitasRepo.delete(id);
    await get().loadData();
  },

  addCartao: async (cartao: Cartao) => {
    await CartoesRepo.insert(cartao);
    await get().loadData();
  },

  updateCartao: async (cartao: Cartao) => {
    await CartoesRepo.update(cartao);
    await get().loadData();
  },

  deleteCartao: async (id: string) => {
    await CartoesRepo.delete(id);
    await get().loadData();
  },

  replicateMonth: async () => {
    const { despesas, receitas, cartoes, currentMonth } = get();
    
    // Calculate next month
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month, 1);
    const nextMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const nextMonthOnly = String(date.getMonth() + 1).padStart(2, '0');

    // Replicate Cartoes
    const novasCartoes = cartoes.map(c => ({
      ...c,
      id: generateId(),
      mes_referencia: nextMonth,
      data_vencimento: c.data_vencimento.includes('/') 
        ? c.data_vencimento.split('/')[0] + '/' + nextMonthOnly
        : c.data_vencimento // Keep as is if it doesn't follow DD/MM
    }));

    // Replicate Despesas
    const novasDespesas = despesas.map(d => {
      // Find correctly scaled cartao ID if it was linked to a card
      const oldCartaoId = d.cartao_id;
      let newCartaoId = undefined;
      
      if (oldCartaoId) {
        const oldIndex = cartoes.findIndex(c => c.id === oldCartaoId);
        if (oldIndex !== -1) {
          newCartaoId = novasCartoes[oldIndex].id;
        }
      }

      return {
        ...d,
        id: generateId(),
        mes_referencia: nextMonth,
        pago: false,
        cartao_id: newCartaoId,
        data_vencimento: d.data_vencimento.includes('/') 
          ? d.data_vencimento.split('/')[0] + '/' + nextMonthOnly
          : d.data_vencimento
      };
    });

    // Replicate Receitas
    const novasReceitas = receitas.map(r => ({
      ...r,
      id: generateId(),
      mes_referencia: nextMonth,
      data_recebimento: r.data_recebimento.includes('/') 
        ? r.data_recebimento.split('/')[0] + '/' + nextMonthOnly
        : r.data_recebimento
    }));

    // Save to DB
    await Promise.all([
      ...novasCartoes.map(c => CartoesRepo.insert(c)),
      ...novasDespesas.map(d => DespesasRepo.insert(d)),
      ...novasReceitas.map(r => ReceitasRepo.insert(r))
    ]);

    // Navigate to next month and refresh
    get().setCurrentMonth(nextMonth);
  },

  clearMonthData: async () => {
    const { currentMonth, despesas, receitas, cartoes } = get();
    
    await Promise.all([
      ...despesas.map(d => DespesasRepo.delete(d.id)),
      ...receitas.map(r => ReceitasRepo.delete(r.id)),
      ...cartoes.map(c => CartoesRepo.delete(c.id))
    ]);

    await get().loadData();
  },

  checkAndSetInitialMonth: async () => {
    const today = new Date();
    const currentMonthStr = today.toISOString().substring(0, 7);
    
    // Calcula o mês anterior
    const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonthStr = prevDate.toISOString().substring(0, 7);
    
    // Busca despesas do mês anterior
    const prevDespesas = await DespesasRepo.getAllByMonth(prevMonthStr);
    
    // SQLite retorna pago como 0 ou 1, então precisamos tratar
    const hasUnpaid = prevDespesas.some(d => !Boolean(d.pago));
    
    if (hasUnpaid) {
      set({ currentMonth: prevMonthStr });
    } else {
      set({ currentMonth: currentMonthStr });
    }
  }
}));
