import React, { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppStore } from '../store';
import { generateId } from '../utils/uuid';
import { Cartao } from '../models/types';
import { calcularTotalCartao, formatarMoeda } from '../services/financas';
import { colors, shadow } from '../theme/colors';
import AppShell from '../components/AppShell';

export default function CartoesScreen() {
  const { cartoes, despesas, currentMonth, addCartao, updateCartao, deleteCartao } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Cartao | null>(null);
  const [nome, setNome] = useState('');
  const [limite, setLimite] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');

  const resetForm = () => {
    setNome('');
    setLimite('');
    setDataVencimento('');
    setEditingItem(null);
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!nome || !limite) return;

    if (editingItem) {
      await updateCartao({
        ...editingItem,
        nome,
        limite: parseFloat(limite),
        data_vencimento: dataVencimento,
        mes_referencia: currentMonth,
      });
    } else {
      await addCartao({
        id: generateId(),
        nome,
        limite: parseFloat(limite),
        data_vencimento: dataVencimento,
        mes_referencia: currentMonth,
      });
    }

    resetForm();
  };

  const handleEdit = (item: Cartao) => {
    setEditingItem(item);
    setNome(item.nome);
    setLimite(item.limite.toString());
    setDataVencimento(item.data_vencimento);
    setShowForm(true);
  };

  const handleDelete = (id: string, hasExpenses: boolean) => {
    if (hasExpenses) {
      Alert.alert('Cartao em uso', 'Nao e possivel excluir um cartao que possui despesas vinculadas.');
      return;
    }

    Alert.alert('Excluir cartao', 'Deseja remover este cartao?', [
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

  return (
    <AppShell title="Cartoes">
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.heroOverline}>Cartoes</Text>
          <Text style={styles.heroValue}>{cartoes.length}</Text>
          <Text style={styles.heroHint}>Cartões cadastrados no ciclo atual</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
          <Text style={styles.addButtonText}>Adicionar cartao</Text>
        </TouchableOpacity>

        <Modal visible={showForm} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.modalTitle}>{editingItem ? 'Editar cartao' : 'Novo cartao'}</Text>

              <Text style={styles.inputLabel}>Nome</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Nubank, Inter, Itau"
                placeholderTextColor={colors.textSoft}
                value={nome}
                onChangeText={setNome}
              />

              <Text style={styles.inputLabel}>Limite</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor={colors.textSoft}
                keyboardType="numeric"
                value={limite}
                onChangeText={setLimite}
              />

              <Text style={styles.inputLabel}>Vencimento</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: dia 10"
                placeholderTextColor={colors.textSoft}
                value={dataVencimento}
                onChangeText={setDataVencimento}
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
          data={cartoes}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhum cartao cadastrado neste mes.</Text>}
          renderItem={({ item }) => {
            const totalGasto = calcularTotalCartao(despesas, item.id);
            const percentUsed = item.limite > 0 ? (totalGasto / item.limite) * 100 : 0;
            const available = item.limite - totalGasto;

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.nome}</Text>
                    <Text style={styles.cardSubtitle}>Vencimento {item.data_vencimento || 'nao informado'}</Text>
                  </View>
                  <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerButton} onPress={() => handleEdit(item)}>
                      <Text style={styles.headerButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.headerButton, styles.headerButtonDanger]}
                      onPress={() => handleDelete(item.id, totalGasto > 0)}
                    >
                      <Text style={[styles.headerButtonText, styles.headerButtonDangerText]}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Limite</Text>
                    <Text style={styles.metricValue}>{formatarMoeda(item.limite)}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Usado</Text>
                    <Text style={[styles.metricValue, { color: colors.expense }]}>{formatarMoeda(totalGasto)}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Livre</Text>
                    <Text style={[styles.metricValue, { color: colors.income }]}>{formatarMoeda(available)}</Text>
                  </View>
                </View>

                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.min(percentUsed, 100)}%`,
                        backgroundColor: percentUsed >= 80 ? colors.expense : colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{percentUsed.toFixed(0)}% do limite utilizado</Text>
              </View>
            );
          }}
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
    color: colors.accent,
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
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  addButtonText: {
    color: '#041b2e',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  cardSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  headerActions: {
    gap: 8,
  },
  headerButton: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerButtonDanger: {
    backgroundColor: 'rgba(255, 180, 171, 0.12)',
  },
  headerButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  headerButtonDangerText: {
    color: colors.expense,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metric: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 12,
  },
  metricLabel: {
    color: colors.textSoft,
    fontSize: 11,
    marginBottom: 6,
  },
  metricValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  barTrack: {
    height: 8,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  barLabel: {
    color: colors.textMuted,
    fontSize: 11,
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
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#041b2e',
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
