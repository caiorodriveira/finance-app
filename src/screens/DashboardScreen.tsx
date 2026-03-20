import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from 'expo/node_modules/@expo/vector-icons';
import SummaryCard from '../components/SummaryCard';
import ProgressBar from '../components/ProgressBar';
import { useAppStore } from '../store';
import {
  agruparPendentes,
  calcularProgressoPagamento,
  calcularSaldo,
  calcularTotalDespesas,
  calcularTotalReceitas,
  calcularValorAPagar,
  calcularValorPago,
  formatarMoeda,
  getNomeMes,
} from '../services/financas';
import { colors, shadow } from '../theme/colors';
import AppShell from '../components/AppShell';

export default function DashboardScreen() {
  const { receitas, despesas, cartoes, currentMonth, setCurrentMonth, replicateMonth, clearMonthData } =
    useAppStore();
  const navigation = useNavigation<any>();

  const [showingSuccess, setShowingSuccess] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;

  const totalReceitas = calcularTotalReceitas(receitas);
  const totalDespesas = calcularTotalDespesas(despesas);
  const saldo = calcularSaldo(receitas, despesas);
  const valorPago = calcularValorPago(despesas);
  const valorAPagar = calcularValorAPagar(despesas);
  const progress = calcularProgressoPagamento(despesas);
  const pendentesAgrupados = agruparPendentes(despesas, cartoes);

  const handlePrevMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const d = new Date(year, month, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const triggerSuccessAnimation = () => {
    setShowingSuccess(true);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 7, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
          setShowingSuccess(false);
          scaleAnim.setValue(0.94);
        });
      }, 1200);
    });
  };

  const handleReplicate = () => {
    Alert.alert(
      'Replicar mes',
      `Deseja copiar receitas e despesas de ${getNomeMes(currentMonth)} para o proximo mes?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Replicar',
          onPress: async () => {
            await replicateMonth();
            triggerSuccessAnimation();
          },
        },
      ]
    );
  };

  const handleClear = () => {
    Alert.alert(
      'Limpar dados',
      `Deseja apagar todos os registros de ${getNomeMes(currentMonth)}? Essa acao nao pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar tudo',
          style: 'destructive',
          onPress: async () => {
            await clearMonthData();
            Alert.alert('Mes limpo', 'Os dados foram removidos com sucesso.');
          },
        },
      ]
    );
  };

  return (
    <AppShell title="Dashboard">
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceSection}>
          <Text style={styles.overline}>Saldo estimado</Text>
          <Text style={[styles.balanceValue, { color: saldo >= 0 ? colors.text : colors.expense }]}>
            {formatarMoeda(saldo)}
          </Text>

          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.monthAction}>
              <Text style={styles.monthActionText}>{'<'}</Text>
            </TouchableOpacity>
            <View style={styles.monthCenter}>
              <Text style={styles.monthText}>{getNomeMes(currentMonth)}</Text>
            </View>
            <TouchableOpacity onPress={handleNextMonth} style={styles.monthAction}>
              <Text style={styles.monthActionText}>{'>'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard
            title="Receitas"
            value={formatarMoeda(totalReceitas)}
            color={colors.income}
            style={styles.summaryCardIncome}
          />
          <SummaryCard
            title="Despesas"
            value={formatarMoeda(totalDespesas)}
            color={colors.expense}
            style={styles.summaryCardExpense}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.sectionEyebrow}>Progresso</Text>
            <Text style={styles.progressPercent}>{progress.toFixed(0)}%</Text>
          </View>
          <ProgressBar progress={progress} color={colors.primary} />
          <View style={styles.progressFoot}>
            <View>
              <Text style={styles.metaLabel}>Valor pago</Text>
              <Text style={[styles.metaValue, { color: colors.income }]}>{formatarMoeda(valorPago)}</Text>
            </View>
            <View style={styles.alignEnd}>
              <Text style={styles.metaLabel}>Em aberto</Text>
              <Text style={styles.metaValue}>{formatarMoeda(valorAPagar)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Atalhos rapidos</Text>
        </View>
        <View style={styles.quickGrid}>
          <TouchableOpacity style={styles.quickButton} onPress={() => navigation.navigate('Despesas')}>
            <View style={styles.quickIconCircle}>
              <MaterialCommunityIcons name="file-document-plus-outline" size={18} color={colors.text} />
            </View>
            <Text style={styles.quickButtonTitle}>Minhas despesas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickButton} onPress={() => navigation.navigate('Receitas')}>
            <View style={styles.quickIconCircle}>
              <MaterialCommunityIcons name="bank-outline" size={18} color={colors.text} />
            </View>
            <Text style={styles.quickButtonTitle}>Minhas receitas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickButton, styles.quickButtonWide]} onPress={() => navigation.navigate('Cartoes')}>
            <View style={styles.quickIconCircle}>
              <MaterialCommunityIcons name="credit-card-check-outline" size={18} color={colors.text} />
            </View>
            <Text style={styles.quickButtonTitle}>Meus Cartoes</Text>
          </TouchableOpacity>
        </View>

        {pendentesAgrupados.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pendencias</Text>
              <Text style={styles.linkText}>Ver tudo</Text>
            </View>
            <View style={styles.pendingList}>
              {pendentesAgrupados.map(item => (
                <View key={item.id} style={styles.pendingItem}>
                  <View style={styles.pendingDot}>
                    <Text style={styles.pendingDotText}>{item.tipo === 'fatura' ? '■' : '•'}</Text>
                  </View>
                  <View style={styles.pendingMain}>
                    <Text style={styles.pendingTitle}>{item.nome}</Text>
                    <Text style={styles.pendingSubtitle}>
                      {item.tipo === 'fatura' && item.despesas
                        ? `${item.despesas.length} itens agrupados`
                        : `Vence em ${item.data_vencimento || '-'}`}
                    </Text>
                  </View>
                  <View style={styles.alignEnd}>
                    <Text style={styles.pendingValue}>{formatarMoeda(item.valor)}</Text>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: item.tipo === 'fatura' ? 'rgba(255, 180, 171, 0.12)' : 'rgba(255, 225, 109, 0.12)' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: item.tipo === 'fatura' ? colors.expense : colors.warning },
                        ]}
                      >
                        {item.tipo === 'fatura' ? 'Atrasado' : 'Pendente'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Gestão do ciclo</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardDescription}>
            Gerencie a estrutura deste mes com base no historico ou inicie um novo planejamento.
          </Text>
          <TouchableOpacity style={styles.primaryCta} onPress={handleReplicate}>
            <MaterialCommunityIcons name="content-copy" size={16} color="#032d33" />
            <Text style={styles.primaryCtaText}>Copiar para o proximo mes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryCta} onPress={handleClear}>
            <MaterialCommunityIcons name="delete-outline" size={16} color={colors.textMuted} />
            <Text style={styles.secondaryCtaText}>Limpar este mes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {showingSuccess && (
        <Animated.View style={[styles.successOverlay, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.successBox, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.successTitle}>Mes replicado</Text>
            <Text style={styles.successText}>Os dados foram copiados para o proximo ciclo.</Text>
          </Animated.View>
        </Animated.View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 28,
  },
  balanceSection: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
  },
  overline: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 14,
  },
  monthSelector: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 999,
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthActionText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  monthCenter: {
    flex: 1,
    alignItems: 'center',
  },
  monthText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCardIncome: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  summaryCardExpense: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    ...shadow,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressPercent: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  progressFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  metaLabel: {
    color: colors.textSoft,
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metaValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 10,
    marginTop: 10,
  },
  sectionTitle: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  linkText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  quickButton: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickButtonWide: {
    width: '100%',
  },
  quickIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickButtonTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  cardDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  primaryCta: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  primaryCtaText: {
    color: '#032d33',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryCta: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryCtaText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  pendingList: {
    gap: 10,
  },
  pendingItem: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pendingDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingDotText: {
    color: colors.expense,
    fontSize: 10,
    fontWeight: '800',
  },
  pendingMain: {
    flex: 1,
  },
  pendingTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  pendingSubtitle: {
    color: colors.textSoft,
    fontSize: 11,
  },
  pendingValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  bottomSpace: {
    height: 24,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successBox: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 26,
    padding: 24,
  },
  successTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  successText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
