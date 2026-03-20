import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, shadow } from '../theme/colors';

interface SummaryCardProps {
  title: string;
  value: string;
  color?: string;
  style?: ViewStyle;
}

export default function SummaryCard({ title, value, color = colors.text, style }: SummaryCardProps) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 24,
    ...shadow,
  },
  title: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
  },
});
