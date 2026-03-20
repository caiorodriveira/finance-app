import React, { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppStore } from '../store';
import { generateId } from '../utils/uuid';
import { Receita } from '../models/types';
import { formatarMoeda } from '../services/financas';
import { colors, shadow } from '../theme/colors';
import AppShell from '../components/AppShell';

export default function ReceitasScreen() {
  const { receitas, currentMonth, addReceita, updateReceita, deleteReceita } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Receita | null>(null);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataRecebimento, setDataRecebimento] = useState('');

  const resetForm = () => {
    setDescricao('');
    setValor('');
    setDataRecebimento('');
    setEditingItem(null);
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!descricao || !valor || !dataRecebimento) return;

    if (editingItem) {
      await updateReceita({
        ...editingItem,
        descricao,
        valor: parseFloat(valor),
        data_recebimento: dataRecebimento,
      });
    } else {
      await addReceita({
        id: generateId(),
        descricao,
        valor: parseFloat(valor),
        tipo: 'receita',
        data_recebimento: dataRecebimento,
        mes_referencia: currentMonth,
      });
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
    Alert.alert('Remover receita', 'Deseja remover esta receita?', [
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

  const totalReceitas = receitas.reduce((acc, item) => acc + item.valor, 0);

  return (
    <AppShell title="Receitas">
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.heroOverline}>Receitas</Text>
          <Text style={styles.heroValue}>{formatarMoeda(totalReceitas)}</Text>
          <Text style={styles.heroHint}>Total previsto para {currentMonth}</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
          <Text style={styles.addButtonText}>Adicionar receita</Text>
        </TouchableOpacity>

        <Modal visible={showForm} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.modalTitle}>{editingItem ? 'Editar receita' : 'Nova receita'}</Text>

              <Text style={styles.inputLabel}>Descricao</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: salario, freela, bonus"
                placeholderTextColor={colors.textSoft}
                value={descricao}
                onChangeText={setDescricao}
              />

              <Text style={styles.inputLabel}>Valor</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor={colors.textSoft}
                keyboardType="numeric"
                value={valor}
                onChangeText={setValor}
              />

              <Text style={styles.inputLabel}>Data de recebimento</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM"
                placeholderTextColor={colors.textSoft}
                value={dataRecebimento}
                onChangeText={setDataRecebimento}
              />

              <View style={styles.formActions}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleAdd}>
                  <Text style={styles.primaryButtonText}>Salvar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={resetForm}>
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <FlatList
          data={receitas}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma receita cadastrada neste mes.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardMain}>
                <Text style={styles.cardTitle}>{item.descricao}</Text>
                <Text style={styles.cardValue}>{formatarMoeda(item.valor)}</Text>
                <Text style={styles.cardMeta}>Recebimento {item.data_recebimento}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.iconButton} onPress={() => handleEdit(item)}>
                  <Text style={styles.iconButtonText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconButton, styles.iconButtonDanger]}
                  onPress={() => handleDelete(item.id)}
                >
                  <Text style={[styles.iconButtonText, styles.iconButtonDangerText]}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    ...shadow,
  },
  heroOverline: {
    color: colors.income,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  heroHint: {
    color: colors.textMuted,
    fontSize: 12,
  },
  addButton: {
    backgroundColor: colors.income,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  addButtonText: {
    color: '#052114',
    fontSize: 15,
    fontWeight: '800',
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  cardMain: {
    marginBottom: 12,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardValue: {
    color: colors.income,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 6,
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 15,
    paddingVertical: 11,
    alignItems: 'center',
  },
  iconButtonDanger: {
    backgroundColor: 'rgba(255, 180, 171, 0.12)',
  },
  iconButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  iconButtonDangerText: {
    color: colors.expense,
  },
  emptyText: {
    color: colors.textSoft,
    textAlign: 'center',
    marginTop: 48,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  modalSheet: {
    backgroundColor: colors.surfaceSoft,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 22,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 18,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 15,
    marginBottom: 14,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.income,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#052114',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
});
