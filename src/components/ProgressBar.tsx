import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface ProgressBarProps {
  progress: number; // 0 to 100
  label?: string;
  color?: string;
}

export default function ProgressBar({ progress, label, color = '#3b82f6' }: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${clampedProgress}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 10,
    fontWeight: '600',
  },
  barBackground: {
    height: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
});
