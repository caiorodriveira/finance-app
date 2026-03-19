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
  addReceita: (receita: Receita) => Promise<void>;
  updateReceita: (receita: Receita) => Promise<void>;
  deleteReceita: (id: string) => Promise<void>;
  addCartao: (cartao: Cartao) => Promise<void>;
  updateCartao: (cartao: Cartao) => Promise<void>;
  deleteCartao: (id: string) => Promise<void>;
  updateDespesa: (despesa: Despesa) => Promise<void>;
  deleteDespesa: (id: string) => Promise<void>;
  replicateMonth: () => Promise<void>;
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
      CartoesRepo.getAll()
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
    await DespesasRepo.updatePago(id, pago);
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
    const { despesas, receitas, currentMonth } = get();

    // Calculate next month
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month, 1);
    const nextMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // Replicate Despesas
    const novasDespesas = despesas.map(d => ({
      ...d,
      id: generateId(),
      mes_referencia: nextMonth,
      pago: false
    }));

    // Replicate Receitas
    const novasReceitas = receitas.map(r => ({
      ...r,
      id: generateId(),
      mes_referencia: nextMonth
    }));

    // Save to DB
    await Promise.all([
      ...novasDespesas.map(d => DespesasRepo.insert(d)),
      ...novasReceitas.map(r => ReceitasRepo.insert(r))
    ]);

    // Navigate to next month and refresh
    get().setCurrentMonth(nextMonth);
  }
}));
