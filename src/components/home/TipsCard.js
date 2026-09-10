import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../constants/theme';
import { useLanguage } from '../../contexts/LanguageContext';

export function TipsCard() {
  const { t } = useLanguage();

  const tips = [
    { id: '1', icon: 'key-variant', textKey: 'home.tip1' },
    { id: '2', icon: 'map-check-outline', textKey: 'home.tip2' },
    { id: '3', icon: 'car-multiple', textKey: 'home.tip3' },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('home.tipsTitle')}</Text>
      {tips.map((tip, index) => (
        <View key={tip.id} style={[styles.tipRow, index === tips.length - 1 && styles.tipRowLast]}>
          <View style={styles.tipIcon}>
            <MaterialCommunityIcons name={tip.icon} size={16} color={colors.primaryMuted} />
          </View>
          <Text style={styles.tipText}>{t(tip.textKey)}</Text>
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
