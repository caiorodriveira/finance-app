import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Switch, Modal, ScrollView, Alert } from 'react-native';
import { useAppStore } from '../store';
import { generateId } from '../utils/uuid';
import { Despesa, CategoriaDespesa, FormaPagamento } from '../models/types';
import { formatarMoeda, getFaturasCartoes, FaturaCartao } from '../services/financas';

const CATEGORIAS: { label: string; value: CategoriaDespesa }[] = [
  { label: 'Fixo', value: 'fixo' },
  { label: 'Assinatura', value: 'assinatura' },
  { label: 'Cartão de Crédito', value: 'cartao_credito' },
  { label: 'Outro', value: 'outro' },
];

export default function DespesasScreen() {
  const { despesas, cartoes, currentMonth, addDespesa, updateDespesa, deleteDespesa, toggleDespesaPago } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Despesa | null>(null);
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [categoria, setCategoria] = useState<CategoriaDespesa>('outro');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pagamento_direto');
  const [cartaoId, setCartaoId] = useState<string | undefined>(undefined);

  const resetForm = () => {
    setNome(''); setValor(''); setDataVencimento('');
    setCategoria('outro'); setFormaPagamento('pagamento_direto');
    setCartaoId(undefined); setEditingItem(null); setShowForm(false);
  };

  const handleAdd = async () => {
    if (!nome || !valor || !dataVencimento) return;
    
    const dados: Partial<Despesa> = {
      nome,
      valor: parseFloat(valor),
      categoria,
      forma_pagamento: formaPagamento,
      cartao_id: formaPagamento === 'cartao' ? cartaoId : undefined,
      data_vencimento: dataVencimento,
    };

    if (editingItem) {
      await updateDespesa({
        ...editingItem,
        ...dados as Despesa,
      });
    } else {
      const nova: Despesa = {
        ...dados as Despesa,
        id: generateId(),
        pago: false,
        mes_referencia: currentMonth,
      };
      await addDespesa(nova);
    }
    resetForm();
  };

  const handleEdit = (item: Despesa) => {
    setEditingItem(item);
    setNome(item.nome);
    setValor(item.valor.toString());
    setDataVencimento(item.data_vencimento);
    setCategoria(item.categoria);
    setFormaPagamento(item.forma_pagamento);
    setCartaoId(item.cartao_id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Confirmar', 'Deseja remover esta despesa?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await deleteDespesa(id);
        },
      },
    ]);
  };

  const faturas = getFaturasCartoes(despesas, cartoes);
  const despesasDiretas = despesas;
  const [faturaExpandida, setFaturaExpandida] = useState<string | null>(null);

  const toggleFatura = (cartaoId: string) => {
    setFaturaExpandida((prev: string | null) => prev === cartaoId ? null : cartaoId);
  };

  const renderFaturaCard = (fatura: FaturaCartao) => {
    const isExpanded = faturaExpandida === fatura.cartao.id;
    const pagas = fatura.despesas.filter(d => d.pago).length;
    const total = fatura.despesas.length;

    return (
      <TouchableOpacity
        key={fatura.cartao.id}
        style={styles.faturaCard}
        onPress={() => toggleFatura(fatura.cartao.id)}
        activeOpacity={0.7}
      >
        <View style={styles.faturaHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, marginRight: 8 }}>💳</Text>
              <Text style={styles.faturaNome}>Fatura {fatura.cartao.nome}</Text>
            </View>
            <Text style={styles.faturaInfo}>
              {total} {total === 1 ? 'despesa' : 'despesas'} · {pagas} {pagas === 1 ? 'paga' : 'pagas'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.faturaTotal}>{formatarMoeda(fatura.total)}</Text>
            <Text style={styles.faturaExpandIcon}>{isExpanded ? '▲' : '▼'}</Text>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.faturaDetalhe}>
            {fatura.despesas.map(d => (
              <View key={d.id} style={styles.faturaItem}>
                <Text style={styles.faturaItemNome}>{d.nome}</Text>
                <Text style={[styles.faturaItemValor, d.pago && { color: '#22c55e' }]}>
                  {formatarMoeda(d.valor)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: Despesa }) => {
    return (
      <View style={[styles.card, item.pago && styles.cardPago]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardNome}>{item.nome}</Text>
          <Text style={styles.cardValor}>{formatarMoeda(item.valor)}</Text>
          <View style={styles.tagsRow}>
            <Text style={styles.tag}>{item.categoria}</Text>
          </View>
          <Text style={styles.cardDate}>Vence: {item.data_vencimento}</Text>
        </View>
        <View style={styles.statusCol}>
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtnRow}>
              <Text style={styles.actionTextRow}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtnRow}>
              <Text style={styles.actionTextRow}>🗑️</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.statusText, { color: item.pago ? '#22c55e' : '#ef4444' }]}>
            {item.pago ? '✓ Pago' : '✗ Pendente'}
          </Text>
          <Switch
            value={item.pago}
            onValueChange={(val: boolean) => toggleDespesaPago(item.id, val)}
            trackColor={{ false: '#e2e8f0', true: '#86efac' }}
            thumbColor={item.pago ? '#22c55e' : '#94a3b8'}
          />
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <>
      {/* Fatura cards - non-editable */}
      {faturas.length > 0 && (
        <View style={styles.faturasSection}>
          <Text style={styles.faturasTitle}>Faturas de Cartão</Text>
          {faturas.map(renderFaturaCard)}
        </View>
      )}

      {/* Section title for direct expenses */}
      {despesasDiretas.length > 0 && faturas.length > 0 && (
        <Text style={styles.despesasDiretasTitle}>Despesas Diretas</Text>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      {/* Add Button */}
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
        <Text style={styles.addBtnText}>+ Nova Despesa</Text>
      </TouchableOpacity>

      {/* Form Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingItem ? 'Editar Despesa' : 'Nova Despesa'}</Text>

            <TextInput style={styles.input} placeholder="Nome da despesa" value={nome} onChangeText={setNome} />
            <TextInput style={styles.input} placeholder="Valor" keyboardType="numeric" value={valor} onChangeText={setValor} />
            <TextInput style={styles.input} placeholder="Vencimento (DD/MM)" value={dataVencimento} onChangeText={setDataVencimento} />

            {/* Categoria */}
            <Text style={styles.formLabel}>Categoria</Text>
            <View style={styles.optionsRow}>
              {CATEGORIAS.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[styles.optionChip, categoria === cat.value && styles.optionChipActive]}
                  onPress={() => setCategoria(cat.value)}
                >
                  <Text style={[styles.optionText, categoria === cat.value && styles.optionTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Forma de pagamento */}
            <Text style={styles.formLabel}>Forma de Pagamento</Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[styles.optionChip, formaPagamento === 'pagamento_direto' && styles.optionChipActive]}
                onPress={() => { setFormaPagamento('pagamento_direto'); setCartaoId(undefined); }}
              >
                <Text style={[styles.optionText, formaPagamento === 'pagamento_direto' && styles.optionTextActive]}>
                  Direto
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionChip, formaPagamento === 'cartao' && styles.optionChipActive]}
                onPress={() => setFormaPagamento('cartao')}
              >
                <Text style={[styles.optionText, formaPagamento === 'cartao' && styles.optionTextActive]}>
                  Cartão
                </Text>
              </TouchableOpacity>
            </View>

            {/* Cartão selection */}
            {formaPagamento === 'cartao' && cartoes.length > 0 && (
              <>
                <Text style={styles.formLabel}>Selecionar Cartão</Text>
                <View style={styles.optionsRow}>
                  {cartoes.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.optionChip, cartaoId === c.id && styles.optionChipActive]}
                      onPress={() => setCartaoId(c.id)}
                    >
                      <Text style={[styles.optionText, cartaoId === c.id && styles.optionTextActive]}>
                        {c.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.saveBtnModal} onPress={handleAdd}>
                <Text style={styles.saveBtnText}>Salvar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* List - only direct expenses (card expenses shown in fatura cards above) */}
      <FlatList
        data={despesasDiretas}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          faturas.length === 0
            ? <Text style={styles.emptyText}>Nenhuma despesa cadastrada para este mês.</Text>
            : null
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f1f5f9' },
  addBtn: {
    backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', marginBottom: 16, elevation: 2,
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  card: {
    backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', elevation: 1,
    borderLeftWidth: 4, borderLeftColor: '#ef4444',
  },
  cardPago: { borderLeftColor: '#22c55e', opacity: 0.75 },
  cardNome: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  cardValor: { fontSize: 14, color: '#ef4444', marginVertical: 2, fontWeight: '500' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  tag: {
    fontSize: 10, backgroundColor: '#e2e8f0', color: '#475569', paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 4, overflow: 'hidden',
  },
  cardDate: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  statusCol: { alignItems: 'center', marginLeft: 8, justifyContent: 'center' },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  actionBtnRow: { padding: 4 },
  actionTextRow: { fontSize: 16 },
  statusText: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },

  // Fatura cards
  faturasSection: { marginBottom: 16 },
  faturasTitle: { fontSize: 16, fontWeight: 'bold', color: '#7c3aed', marginBottom: 10 },
  despesasDiretasTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 10, marginTop: 4 },
  faturaCard: {
    backgroundColor: '#faf5ff', borderRadius: 14, marginBottom: 10,
    padding: 16, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#7c3aed',
  },
  faturaHeader: { flexDirection: 'row', alignItems: 'center' },
  faturaNome: { fontSize: 16, fontWeight: 'bold', color: '#5b21b6' },
  faturaInfo: { fontSize: 12, color: '#8b5cf6', marginTop: 2 },
  faturaTotal: { fontSize: 18, fontWeight: 'bold', color: '#7c3aed' },
  faturaExpandIcon: { fontSize: 10, color: '#a78bfa', marginTop: 2 },
  faturaDetalhe: {
    marginTop: 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#e9d5ff',
  },
  faturaItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, paddingHorizontal: 4,
  },
  faturaItemNome: { fontSize: 13, color: '#1e293b' },
  faturaItemValor: { fontSize: 13, fontWeight: '600', color: '#7c3aed' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12,
    marginBottom: 12, fontSize: 15, backgroundColor: '#f8fafc',
  },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 4 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  optionChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  optionChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  optionText: { fontSize: 13, color: '#475569' },
  optionTextActive: { color: '#fff', fontWeight: '600' },
  formActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  saveBtnModal: {
    flex: 1, backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', marginRight: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelBtn: {
    flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', marginLeft: 8, borderWidth: 1, borderColor: '#e2e8f0',
  },
  cancelBtnText: { color: '#64748b', fontWeight: '600', fontSize: 15 },
});
