import * as SQLite from 'expo-sqlite';
import { dbName } from '../database/sqlite';
import { Despesa, Receita, Cartao, Pagamento } from '../models/types';

const getDb = async () => await SQLite.openDatabaseAsync(dbName);

export const ReceitasRepo = {
  getAllByMonth: async (mes_referencia: string) => {
    const db = await getDb();
    return await db.getAllAsync<Receita>('SELECT * FROM receitas WHERE mes_referencia = ?', [mes_referencia]);
  },
  insert: async (receita: Receita) => {
    const db = await getDb();
    await db.runAsync(
      'INSERT INTO receitas (id, descricao, valor, tipo, data_recebimento, mes_referencia) VALUES (?, ?, ?, ?, ?, ?)',
      [receita.id, receita.descricao, receita.valor, receita.tipo, receita.data_recebimento, receita.mes_referencia]
    );
  },
  delete: async (id: string) => {
    const db = await getDb();
    await db.runAsync('DELETE FROM receitas WHERE id = ?', [id]);
  },
  update: async (receita: Receita) => {
    const db = await getDb();
    await db.runAsync(
      'UPDATE receitas SET descricao = ?, valor = ?, tipo = ?, data_recebimento = ?, mes_referencia = ? WHERE id = ?',
      [receita.descricao, receita.valor, receita.tipo, receita.data_recebimento, receita.mes_referencia, receita.id]
    );
  }
};

export const DespesasRepo = {
  getAllByMonth: async (mes_referencia: string) => {
    const db = await getDb();
    return await db.getAllAsync<Despesa>('SELECT * FROM despesas WHERE mes_referencia = ?', [mes_referencia]);
  },
  insert: async (despesa: Despesa) => {
    const db = await getDb();
    await db.runAsync(
      'INSERT INTO despesas (id, nome, valor, categoria, forma_pagamento, cartao_id, pago, data_vencimento, mes_referencia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [despesa.id, despesa.nome, despesa.valor, despesa.categoria, despesa.forma_pagamento, despesa.cartao_id ?? null, despesa.pago ? 1 : 0, despesa.data_vencimento, despesa.mes_referencia]
    );
  },
  togglePago: async (id: string, pago: boolean) => {
    const db = await getDb();
    await db.runAsync('UPDATE despesas SET pago = ? WHERE id = ?', [pago ? 1 : 0, id]);
  },
  togglePagoByCartao: async (cartaoId: string, mesReferencia: string, pago: boolean) => {
    const db = await getDb();
    await db.runAsync(
      'UPDATE despesas SET pago = ? WHERE cartao_id = ? AND mes_referencia = ?',
      [pago ? 1 : 0, cartaoId, mesReferencia]
    );
  },
  delete: async (id: string) => {
    const db = await getDb();
    await db.runAsync('DELETE FROM despesas WHERE id = ?', [id]);
  },
  update: async (despesa: Despesa) => {
    const db = await getDb();
    await db.runAsync(
      'UPDATE despesas SET nome = ?, valor = ?, categoria = ?, forma_pagamento = ?, cartao_id = ?, pago = ?, data_vencimento = ?, mes_referencia = ? WHERE id = ?',
      [despesa.nome, despesa.valor, despesa.categoria, despesa.forma_pagamento, despesa.cartao_id ?? null, despesa.pago ? 1 : 0, despesa.data_vencimento, despesa.mes_referencia, despesa.id]
    );
  }
};

export const CartoesRepo = {
  getAllByMonth: async (mesReferencia: string) => {
    const db = await getDb();
    return await db.getAllAsync<Cartao>(
      'SELECT * FROM cartoes WHERE mes_referencia = ?',
      [mesReferencia]
    );
  },
  insert: async (cartao: Cartao) => {
    const db = await getDb();
    await db.runAsync(
      'INSERT INTO cartoes (id, nome, limite, data_vencimento, mes_referencia) VALUES (?, ?, ?, ?, ?)',
      [cartao.id, cartao.nome, cartao.limite, cartao.data_vencimento, cartao.mes_referencia]
    );
  },
  update: async (cartao: Cartao) => {
    const db = await getDb();
    await db.runAsync(
      'UPDATE cartoes SET nome = ?, limite = ?, data_vencimento = ?, mes_referencia = ? WHERE id = ?',
      [cartao.nome, cartao.limite, cartao.data_vencimento, cartao.mes_referencia, cartao.id]
    );
  },
  delete: async (id: string) => {
    const db = await getDb();
    await db.runAsync('DELETE FROM cartoes WHERE id = ?', [id]);
  }
};

export const PagamentosRepo = {
  getAll: async () => {
    const db = await getDb();
    return await db.getAllAsync<Pagamento>('SELECT * FROM pagamentos');
  },
  insert: async (pagamento: Pagamento) => {
    const db = await getDb();
    await db.runAsync(
      'INSERT INTO pagamentos (id, despesa_id, valor_pago, data_pagamento, observacao) VALUES (?, ?, ?, ?, ?)',
      [pagamento.id, pagamento.despesa_id, pagamento.valor_pago, pagamento.data_pagamento, pagamento.observacao ?? null]
    );
  }
};
