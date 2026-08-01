import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../constants/theme';

const TIPS = [
  { id: '1', icon: 'key-variant', text: 'Bagikan PIN kepada teman agar mereka bisa join room.' },
  { id: '2', icon: 'map-check-outline', text: 'Cek rute preview sebelum membuat room.' },
  { id: '3', icon: 'car-multiple', text: 'Isi jumlah kendaraan untuk koordinasi lebih baik.' },
];

export function TipsCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Tips & Trik</Text>
      {TIPS.map((tip, index) => (
        <View key={tip.id} style={[styles.tipRow, index === TIPS.length - 1 && styles.tipRowLast]}>
          <View style={styles.tipIcon}>
            <MaterialCommunityIcons name={tip.icon} size={16} color={colors.primaryMuted} />
          </View>
          <Text style={styles.tipText}>{tip.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.18)',
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  tipRowLast: { borderBottomWidth: 0 },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  tipText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    lineHeight: 19,
  },
});
