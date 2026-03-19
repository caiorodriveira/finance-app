import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useAppStore } from '../store';
import { generateId } from '../utils/uuid';
import { Cartao } from '../models/types';
import { formatarMoeda, calcularTotalCartao } from '../services/financas';

export default function CartoesScreen() {
  const { cartoes, despesas, addCartao, updateCartao, deleteCartao } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Cartao | null>(null);
  const [nome, setNome] = useState('');
  const [limite, setLimite] = useState('');

  const resetForm = () => {
    setNome(''); setLimite(''); setEditingItem(null); setShowForm(false);
  };

  const handleAdd = async () => {
    if (!nome || !limite) return;
    
    if (editingItem) {
      const atualizado: Cartao = {
        ...editingItem,
        nome,
        limite: parseFloat(limite),
      };
      await updateCartao(atualizado);
    } else {
      const novo: Cartao = {
        id: generateId(),
        nome,
        limite: parseFloat(limite),
      };
      await addCartao(novo);
    }
    resetForm();
  };

  const handleEdit = (item: Cartao) => {
    setEditingItem(item);
    setNome(item.nome);
    setLimite(item.limite.toString());
    setShowForm(true);
  };

  const handleDelete = (id: string, hasDespesas: boolean) => {
    if (hasDespesas) {
      Alert.alert('Aviso', 'Não é possível remover um cartão que possui despesas vinculadas.');
      return;
    }

    Alert.alert('Confirmar', 'Deseja remover este cartão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await deleteCartao(id);
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Cartao }) => {
    const totalGasto = calcularTotalCartao(despesas, item.id);
    const percentUsed = item.limite > 0 ? (totalGasto / item.limite) * 100 : 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Text style={styles.cardIcon}>💳</Text>
            <Text style={styles.cardNome}>{item.nome}</Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
              <Text style={styles.actionText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id, totalGasto > 0)} style={styles.actionBtn}>
              <Text style={styles.actionText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Limite</Text>
            <Text style={styles.infoValue}>{formatarMoeda(item.limite)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gasto Atual</Text>
            <Text style={[styles.infoValue, { color: '#ef4444' }]}>{formatarMoeda(totalGasto)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Disponível</Text>
            <Text style={[styles.infoValue, { color: '#22c55e' }]}>
              {formatarMoeda(item.limite - totalGasto)}
            </Text>
          </View>
        </View>
        {/* Usage bar */}
        <View style={styles.usageBarBg}>
          <View
            style={[
              styles.usageBarFill,
              {
                width: `${Math.min(percentUsed, 100)}%`,
                backgroundColor: percentUsed > 80 ? '#ef4444' : '#3b82f6',
              },
            ]}
          />
        </View>
        <Text style={styles.usageText}>{percentUsed.toFixed(0)}% utilizado</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Add Button */}
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
        <Text style={styles.addBtnText}>+ Novo Cartão</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingItem ? 'Editar Cartão' : 'Novo Cartão'}</Text>
            <TextInput style={styles.input} placeholder="Nome do cartão (ex: Nubank)" value={nome} onChangeText={setNome} />
            <TextInput style={styles.input} placeholder="Limite" keyboardType="numeric" value={limite} onChangeText={setLimite} />
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
        data={cartoes}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhum cartão cadastrado.</Text>}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f1f5f9' },
  addBtn: {
    backgroundColor: '#6366f1', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', marginBottom: 16, elevation: 2,
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, padding: 16,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'space-between' },
  cardIcon: { fontSize: 24, marginRight: 8 },
  cardNome: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { padding: 4 },
  actionText: { fontSize: 18 },
  cardBody: { marginBottom: 12 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: { fontSize: 13, color: '#64748b' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  usageBarBg: {
    height: 8, backgroundColor: '#e2e8f0', borderRadius: 4,
    overflow: 'hidden', marginBottom: 4,
  },
  usageBarFill: { height: '100%', borderRadius: 4 },
  usageText: { fontSize: 11, color: '#94a3b8', textAlign: 'right' },
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
    flex: 1, backgroundColor: '#6366f1', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', marginRight: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelBtn: {
    flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', marginLeft: 8, borderWidth: 1, borderColor: '#e2e8f0',
  },
  cancelBtnText: { color: '#64748b', fontWeight: '600', fontSize: 15 },
});
