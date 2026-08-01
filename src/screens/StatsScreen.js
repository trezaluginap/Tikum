import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HomeHeader } from '../components/home/HomeHeader';
import { colors, fonts, fontSize, radius, spacing } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function StatsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { t } = useLanguage();

  const displayName = user?.user_metadata?.display_name || 'Pengguna';
  const profileInitial = displayName.substring(0, 2).toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <HomeHeader
        displayName={displayName}
        profileInitial={profileInitial}
        profilePhotoUrl={user?.user_metadata?.profile_photo_url || null}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.scrollInner}>
        <View style={styles.tabContent}>
          <View style={styles.tabHeaderRow}>
            <MaterialCommunityIcons name="chart-timeline-variant" size={20} color={colors.primary} />
            <Text style={styles.tabTitle}>{t('home.statsTitle')}</Text>
          </View>
          <Text style={styles.tabSubtitle}>{t('home.statsSub')}</Text>

          {/* Dashboard Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statsCardItem}>
              <Text style={styles.statsVal}>340 km</Text>
              <Text style={styles.statsLabel}>{t('home.totalDistance')}</Text>
            </View>
            <View style={styles.statsCardItem}>
              <Text style={styles.statsVal}>12x</Text>
              <Text style={styles.statsLabel}>{t('home.ridingCount')}</Text>
            </View>
          </View>

          <View style={styles.statsCardSingle}>
            <Text style={styles.statsVal}>2.4 Jam</Text>
            <Text style={styles.statsLabel}>{t('home.avgDuration')}</Text>
          </View>

          {/* Badges */}
          <Text style={styles.sectionHeading}>{t('home.badgesHeading')}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.badgeItem}>
              <View style={[styles.badgeIconBg, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
                <MaterialCommunityIcons name="shield-crown-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.badgeName}>{t('home.badgePioneer')}</Text>
              <Text style={styles.badgeDesc}>{t('home.badgePioneerDesc')}</Text>
            </View>

            <View style={styles.badgeItem}>
              <View style={[styles.badgeIconBg, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                <MaterialCommunityIcons name="weather-night" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.badgeName}>{t('home.badgeNight')}</Text>
              <Text style={styles.badgeDesc}>{t('home.badgeNightDesc')}</Text>
            </View>

            <View style={styles.badgeItem}>
              <View style={[styles.badgeIconBg, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                <MaterialCommunityIcons name="heart-pulse" size={24} color="#10B981" />
              </View>
              <Text style={styles.badgeName}>{t('home.badgeSafety')}</Text>
              <Text style={styles.badgeDesc}>{t('home.badgeSafetyDesc')}</Text>
            </View>
          </View>
        </View>
        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollInner: { paddingBottom: 20 },
  tabContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  tabHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  tabTitle: { fontSize: fontSize.lg, fontFamily: fonts.black, color: colors.textPrimary, letterSpacing: -0.5 },
  tabSubtitle: { fontSize: fontSize.xs, fontFamily: fonts.medium, color: colors.textMuted, lineHeight: 16, marginBottom: spacing.md },
  sectionHeading: { fontSize: fontSize.md, fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: spacing.md },

  // Stats Styling
  statsGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  statsCardItem: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
  },
  statsCardSingle: {
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statsVal: { fontSize: 28, fontFamily: fonts.black, color: colors.primary, letterSpacing: -0.5 },
  statsLabel: { fontSize: fontSize.xs - 1, fontFamily: fonts.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  badgeItem: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  badgeIconBg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  badgeName: { fontSize: 10, fontFamily: fonts.bold, color: colors.textPrimary, textAlign: 'center' },
  badgeDesc: { fontSize: 8, fontFamily: fonts.medium, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
});
