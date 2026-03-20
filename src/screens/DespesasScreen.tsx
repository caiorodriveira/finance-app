import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppStore } from '../store';
import { generateId } from '../utils/uuid';
import { CategoriaDespesa, Despesa, FormaPagamento } from '../models/types';
import { FaturaCartao, formatarMoeda, getFaturasCartoes } from '../services/financas';
import { colors, shadow } from '../theme/colors';
import AppShell from '../components/AppShell';

const CATEGORIAS: { label: string; value: CategoriaDespesa }[] = [
  { label: 'Fixo', value: 'fixo' },
  { label: 'Assinatura', value: 'assinatura' },
  { label: 'Cartao', value: 'cartao_credito' },
  { label: 'Outro', value: 'outro' },
];

export default function DespesasScreen() {
  const {
    despesas,
    cartoes,
    currentMonth,
    addDespesa,
    updateDespesa,
    deleteDespesa,
    toggleDespesaPago,
    toggleFaturaCartaoPago,
  } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Despesa | null>(null);
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [categoria, setCategoria] = useState<CategoriaDespesa>('outro');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pagamento_direto');
  const [cartaoId, setCartaoId] = useState<string | undefined>(undefined);
  const [faturaExpandida, setFaturaExpandida] = useState<string | null>(null);
  const [confirmarFatura, setConfirmarFatura] = useState<FaturaCartao | null>(null);

  const resetForm = () => {
    setNome('');
    setValor('');
    setDataVencimento('');
    setCategoria('outro');
    setFormaPagamento('pagamento_direto');
    setCartaoId(undefined);
    setEditingItem(null);
    setShowForm(false);
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
        ...(dados as Despesa),
      });
    } else {
      await addDespesa({
        ...(dados as Despesa),
        id: generateId(),
        pago: false,
        mes_referencia: currentMonth,
      });
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
    Alert.alert('Excluir despesa', 'Deseja remover esta despesa?', [
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
  const totalDespesas = despesas.reduce((acc, item) => acc + item.valor, 0);
  const pendentes = despesas.filter(item => !item.pago).length;

  const toggleFatura = (id: string) => {
    setFaturaExpandida(prev => (prev === id ? null : id));
  };

  const renderFaturaCard = (fatura: FaturaCartao) => {
    const isExpanded = faturaExpandida === fatura.cartao.id;
    const pagas = fatura.despesas.filter(item => item.pago).length;
    const pendentesFatura = fatura.despesas.filter(item => !item.pago).length;
    const faturaQuitada = pendentesFatura === 0 && fatura.despesas.length > 0;

    return (
      <View key={fatura.cartao.id} style={styles.invoiceCard}>
        <TouchableOpacity style={styles.invoiceHeader} onPress={() => toggleFatura(fatura.cartao.id)} activeOpacity={0.88}>
          <View style={{ flex: 1 }}>
            <View style={styles.invoiceTitleRow}>
              <Text style={styles.invoiceTitle}>Fatura {fatura.cartao.nome}</Text>
              {faturaQuitada && (
                <View style={styles.invoicePaidBadge}>
                  <Text style={styles.invoicePaidBadgeIcon}>✓</Text>
                  <Text style={styles.invoicePaidBadgeText}>Paga</Text>
                </View>
              )}
            </View>
            <Text style={styles.invoiceSubtitle}>
              {fatura.despesas.length} lancamentos, {pagas} pagos
            </Text>
          </View>
          <View style={styles.alignEnd}>
            <Text style={styles.invoiceValue}>{formatarMoeda(fatura.total)}</Text>
            <Text style={styles.invoiceHint}>{isExpanded ? 'Ocultar' : 'Ver itens'}</Text>
          </View>
        </TouchableOpacity>

        {pendentesFatura > 0 && (
          <TouchableOpacity style={styles.invoicePayButton} onPress={() => setConfirmarFatura(fatura)}>
            <Text style={styles.invoicePayButtonText}>Marcar fatura como paga</Text>
          </TouchableOpacity>
        )}

        {isExpanded && (
          <View style={styles.invoiceDetails}>
            {fatura.despesas.map(item => (
              <View key={item.id} style={styles.invoiceItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.invoiceItemTitle}>{item.nome}</Text>
                  <Text style={styles.invoiceItemMeta}>Vence {item.data_vencimento}</Text>
                </View>
                <Text style={[styles.invoiceItemValue, item.pago && styles.invoiceItemValuePaid]}>
                  {formatarMoeda(item.valor)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <AppShell title="Despesas">
      <View style={styles.container}>
        <Modal visible={showForm} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.modalTitle}>{editingItem ? 'Editar despesa' : 'Nova despesa'}</Text>

              <Text style={styles.inputLabel}>Nome</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: aluguel, agua, mercado"
                placeholderTextColor={colors.textSoft}
                value={nome}
                onChangeText={setNome}
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

              <Text style={styles.inputLabel}>Vencimento</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM"
                placeholderTextColor={colors.textSoft}
                value={dataVencimento}
                onChangeText={setDataVencimento}
              />

              <Text style={styles.inputLabel}>Categoria</Text>
              <View style={styles.chipsRow}>
                {CATEGORIAS.map(item => (
                  <TouchableOpacity
                    key={item.value}
                    style={[styles.chip, categoria === item.value && styles.chipActive]}
                    onPress={() => setCategoria(item.value)}
                  >
                    <Text style={[styles.chipText, categoria === item.value && styles.chipTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Forma de pagamento</Text>
              <View style={styles.chipsRow}>
                <TouchableOpacity
                  style={[styles.chip, formaPagamento === 'pagamento_direto' && styles.chipActive]}
                  onPress={() => {
                    setFormaPagamento('pagamento_direto');
                    setCartaoId(undefined);
                  }}
                >
                  <Text style={[styles.chipText, formaPagamento === 'pagamento_direto' && styles.chipTextActive]}>
                    Direto
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, formaPagamento === 'cartao' && styles.chipActive]}
                  onPress={() => setFormaPagamento('cartao')}
                >
                  <Text style={[styles.chipText, formaPagamento === 'cartao' && styles.chipTextActive]}>Cartao</Text>
                </TouchableOpacity>
              </View>

              {formaPagamento === 'cartao' && cartoes.length > 0 && (
                <>
                  <Text style={styles.inputLabel}>Selecionar cartao</Text>
                  <View style={styles.chipsRow}>
                    {cartoes.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.chip, cartaoId === item.id && styles.chipActive]}
                        onPress={() => setCartaoId(item.id)}
                      >
                        <Text style={[styles.chipText, cartaoId === item.id && styles.chipTextActive]}>{item.nome}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

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

        <Modal visible={Boolean(confirmarFatura)} animationType="fade" transparent onRequestClose={() => setConfirmarFatura(null)}>
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Quitar fatura agrupada</Text>
              <Text style={styles.confirmText}>
                Ao confirmar, todas as despesas vinculadas ao cartao{' '}
                <Text style={styles.confirmTextStrong}>{confirmarFatura?.cartao.nome}</Text> serao marcadas como pagas.
              </Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setConfirmarFatura(null)}>
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={async () => {
                    if (confirmarFatura) {
                      await toggleFaturaCartaoPago(confirmarFatura.cartao.id, true);
                    }
                    setConfirmarFatura(null);
                  }}
                >
                  <Text style={styles.primaryButtonText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <FlatList
          data={despesas}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              <View style={styles.heroCard}>
                <Text style={styles.heroOverline}>Despesas</Text>
                <Text style={styles.heroValue}>{formatarMoeda(totalDespesas)}</Text>
                <Text style={styles.heroHint}>{pendentes} pendentes neste ciclo</Text>
              </View>

              <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
                <Text style={styles.addButtonText}>Adicionar despesa</Text>
              </TouchableOpacity>

              {faturas.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Faturas</Text>
                    <Text style={styles.sectionMeta}>{faturas.length} cartoes</Text>
                  </View>
                  {faturas.map(renderFaturaCard)}
                </>
              )}

              {despesas.length > 0 && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Lancamentos</Text>
                  <Text style={styles.sectionMeta}>{despesas.length} itens</Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma despesa cadastrada neste mes.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.card, item.pago && styles.cardPaid]}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.nome}</Text>
                  <Text style={[styles.cardValue, { color: item.pago ? colors.income : colors.expense }]}>
                    {formatarMoeda(item.valor)}
                  </Text>
                </View>
                <Switch
                  value={item.pago}
                  onValueChange={value => toggleDespesaPago(item.id, value)}
                  trackColor={{ false: colors.surfaceSoft, true: 'rgba(72, 221, 188, 0.5)' }}
                  thumbColor={item.pago ? '#eafff9' : colors.text}
                />
              </View>

              <View style={styles.tagsRow}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{item.categoria}</Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{item.forma_pagamento === 'cartao' ? 'cartao' : 'direto'}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.cardMeta}>Vencimento {item.data_vencimento}</Text>
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.smallButton} onPress={() => handleEdit(item)}>
                    <Text style={styles.smallButtonText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallButton, styles.smallButtonDanger]}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Text style={[styles.smallButtonText, styles.smallButtonDangerText]}>Excluir</Text>
                  </TouchableOpacity>
                </View>
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
  listContent: {
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    ...shadow,
  },
  heroOverline: {
    color: colors.expense,
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
    backgroundColor: colors.expense,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#320e18',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionMeta: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  invoiceCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
  },
  invoiceHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  invoiceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  invoiceTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  invoicePaidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(72, 221, 188, 0.12)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  invoicePaidBadgeIcon: {
    color: colors.income,
    fontSize: 11,
    fontWeight: '900',
  },
  invoicePaidBadgeText: {
    color: colors.income,
    fontSize: 10,
    fontWeight: '800',
  },
  invoiceSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
  },
  invoiceValue: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  invoiceHint: {
    color: colors.textSoft,
    fontSize: 11,
  },
  invoiceDetails: {
    marginTop: 12,
    gap: 10,
  },
  invoicePayButton: {
    marginTop: 12,
    backgroundColor: 'rgba(72, 221, 188, 0.12)',
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
  },
  invoicePayButtonText: {
    color: colors.income,
    fontSize: 12,
    fontWeight: '800',
  },
  invoiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  invoiceItemTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  invoiceItemMeta: {
    color: colors.textSoft,
    fontSize: 11,
  },
  invoiceItemValue: {
    color: colors.expense,
    fontSize: 12,
    fontWeight: '800',
  },
  invoiceItemValuePaid: {
    color: colors.income,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  cardPaid: {
    backgroundColor: colors.surfaceElevated,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 19,
    fontWeight: '800',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cardMeta: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  smallButtonDanger: {
    backgroundColor: 'rgba(255, 180, 171, 0.12)',
  },
  smallButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  smallButtonDangerText: {
    color: colors.expense,
  },
  alignEnd: {
    alignItems: 'flex-end',
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
  confirmOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlay,
    padding: 20,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 24,
    padding: 20,
  },
  confirmTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  confirmText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
  },
  confirmTextStrong: {
    color: colors.text,
    fontWeight: '800',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#032d33',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.expense,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#320e18',
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
