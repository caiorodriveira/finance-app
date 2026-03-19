import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useAppStore } from '../store';
import { generateId } from '../utils/uuid';
import { Receita } from '../models/types';
import { formatarMoeda } from '../services/financas';
import { ReceitasRepo } from '../repositories';

export default function ReceitasScreen() {
  const { receitas, currentMonth, addReceita, updateReceita, deleteReceita } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Receita | null>(null);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataRecebimento, setDataRecebimento] = useState('');

  const resetForm = () => {
    setDescricao(''); setValor(''); setDataRecebimento('');
    setEditingItem(null); setShowForm(false);
  };

  const handleAdd = async () => {
    if (!descricao || !valor || !dataRecebimento) return;
    
    if (editingItem) {
      const atualizada: Receita = {
        ...editingItem,
        descricao,
        valor: parseFloat(valor),
        data_recebimento: dataRecebimento,
      };
      await updateReceita(atualizada);
    } else {
      const nova: Receita = {
        id: generateId(),
        descricao,
        valor: parseFloat(valor),
        tipo: 'receita',
        data_recebimento: dataRecebimento,
        mes_referencia: currentMonth,
      };
      await addReceita(nova);
    }
    resetForm();
  };

  const handleEdit = (item: Receita) => {
    setEditingItem(item);
    setDescricao(item.descricao);
    setValor(item.valor.toString());
    setDataRecebimento(item.data_recebimento);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Confirmar', 'Deseja remover esta receita?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await deleteReceita(id);
        },
      },
    ]);
  };

  const totalReceitas = receitas.reduce((acc, r) => acc + r.valor, 0);

  const renderItem = ({ item }: { item: Receita }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardDesc}>{item.descricao}</Text>
        <Text style={styles.cardValor}>{formatarMoeda(item.valor)}</Text>
        <Text style={styles.cardDate}>Recebido: {item.data_recebimento}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
          <Text style={styles.actionText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
          <Text style={styles.actionText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Total */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total de Receitas</Text>
        <Text style={styles.totalValue}>{formatarMoeda(totalReceitas)}</Text>
      </View>

      {/* Add Button */}
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
        <Text style={styles.addBtnText}>+ Nova Receita</Text>
      </TouchableOpacity>

      {/* Modal Form */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingItem ? 'Editar Receita' : 'Nova Receita'}</Text>
            <TextInput style={styles.input} placeholder="Descrição (ex: Salário)" value={descricao} onChangeText={setDescricao} />
            <TextInput style={styles.input} placeholder="Valor" keyboardType="numeric" value={valor} onChangeText={setValor} />
            <TextInput style={styles.input} placeholder="Data recebimento (DD/MM)" value={dataRecebimento} onChangeText={setDataRecebimento} />
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

      {/* List */}
      <FlatList
        data={receitas}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma receita cadastrada para este mês.</Text>}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f1f5f9' },
  totalCard: {
    backgroundColor: '#0f172a', padding: 20, borderRadius: 14,
    marginBottom: 16, alignItems: 'center', elevation: 3,
  },
  totalLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 4 },
  totalValue: { color: '#22c55e', fontSize: 26, fontWeight: 'bold' },
  addBtn: {
    backgroundColor: '#22c55e', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', marginBottom: 16, elevation: 2,
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  card: {
    backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', elevation: 1,
    borderLeftWidth: 4, borderLeftColor: '#22c55e',
  },
  cardDesc: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  cardValor: { fontSize: 14, color: '#22c55e', marginVertical: 2, fontWeight: '500' },
  cardDate: { fontSize: 11, color: '#94a3b8' },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { padding: 8 },
  actionText: { fontSize: 18 },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12,
    marginBottom: 12, fontSize: 15, backgroundColor: '#f8fafc',
  },
  formActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  saveBtnModal: {
    flex: 1, backgroundColor: '#22c55e', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', marginRight: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelBtn: {
    flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', marginLeft: 8, borderWidth: 1, borderColor: '#e2e8f0',
  },
  cancelBtnText: { color: '#64748b', fontWeight: '600', fontSize: 15 },
});
