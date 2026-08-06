import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  // Weekly bar chart mock data (height %)
  const weeklyData = [
    { day: 'Sen', val: 25, active: false },
    { day: 'Sel', val: 40, active: false },
    { day: 'Rab', val: 15, active: false },
    { day: 'Kam', val: 60, active: true },
    { day: 'Jum', val: 30, active: false },
    { day: 'Sab', val: 90, active: true },
    { day: 'Min', val: 100, active: true },
  ];

  // Strava convoy feed mock items
  const recentRides = [
    {
      id: '1',
      title: 'Sunmori Puncak Pass - Kebun Teh',
      time: 'Kemarin • 07:30 WIB',
      distance: '45.2 km',
      duration: '1j 40m',
      speed: '52 km/h',
      riders: 8,
      type: 'motorcycle',
    },
    {
      id: '2',
      title: 'Coastal Cruise Pantai Pasir Putih PIK 2',
      time: '3 Hari Lalu • 20:00 WIB',
      distance: '32.0 km',
      duration: '1j 15m',
      speed: '44 km/h',
      riders: 5,
      type: 'car',
    },
  ];

  // Leaderboard mock items
  const topRiders = [
    { rank: 1, name: displayName, km: '340.5 km', badge: 'Pioneer Lead', isMe: true },
    { rank: 2, name: 'Dimas Pratama', km: '285.0 km', badge: 'Night Cruiser', isMe: false },
    { rank: 3, name: 'Budi Santoso', km: '190.2 km', badge: 'Safety Rider', isMe: false },
  ];

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
          {/* Section Title */}
          <View style={styles.tabHeaderRow}>
            <MaterialCommunityIcons name="chart-timeline-variant" size={20} color={colors.primary} />
            <Text style={styles.tabTitle}>{t('home.statsTitle')}</Text>
          </View>
          <Text style={styles.tabSubtitle}>{t('home.statsSub')}</Text>

          {/* ══ 1. WEEKLY ACTIVITY MINI BAR CHART ══ */}
          <View style={styles.weeklyChartCard}>
            <View style={styles.chartHeaderRow}>
              <Text style={styles.cardSectionTitle}>Aktivitas Minggu Ini</Text>
              <Text style={styles.chartTotalVal}>+124 km minggu ini</Text>
            </View>
            <View style={styles.barChartContainer}>
              {weeklyData.map((item, idx) => (
                <View key={idx} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${item.val}%`,
                          backgroundColor: item.active ? colors.primary : 'rgba(99, 102, 241, 0.3)',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barDayText, item.active && styles.barDayTextActive]}>{item.day}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ══ 2. COMPACT 4-METRIC GRID ══ */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <MaterialCommunityIcons name="map-marker-distance" size={16} color={colors.primary} />
              <Text style={styles.metricVal}>340.5 km</Text>
              <Text style={styles.metricLabel}>{t('home.totalDistance')}</Text>
            </View>
            <View style={styles.metricCard}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#10B981" />
              <Text style={styles.metricVal}>14.2 Jam</Text>
              <Text style={styles.metricLabel}>{t('home.avgDuration')}</Text>
            </View>
            <View style={styles.metricCard}>
              <MaterialCommunityIcons name="speedometer" size={16} color="#F59E0B" />
              <Text style={styles.metricVal}>48 km/h</Text>
              <Text style={styles.metricLabel}>Rata-Rata Kecepatan</Text>
            </View>
            <View style={styles.metricCard}>
              <MaterialCommunityIcons name="account-group" size={16} color="#0EA5E9" />
              <Text style={styles.metricVal}>12x Trip</Text>
              <Text style={styles.metricLabel}>{t('home.ridingCount')}</Text>
            </View>
          </View>

          {/* ══ 3. RIDER BADGES SHOWCASE ══ */}
          <Text style={styles.sectionHeading}>{t('home.badgesHeading')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesScroll}>
            <View style={styles.badgeCard}>
              <View style={[styles.badgeIconCircle, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
                <MaterialCommunityIcons name="shield-crown-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.badgeName}>{t('home.badgePioneer')}</Text>
              <Text style={styles.badgeStatusText}>UNLOCKED</Text>
            </View>

            <View style={styles.badgeCard}>
              <View style={[styles.badgeIconCircle, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                <MaterialCommunityIcons name="weather-night" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.badgeName}>{t('home.badgeNight')}</Text>
              <Text style={styles.badgeStatusText}>UNLOCKED</Text>
            </View>

            <View style={styles.badgeCard}>
              <View style={[styles.badgeIconCircle, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                <MaterialCommunityIcons name="heart-pulse" size={20} color="#10B981" />
              </View>
              <Text style={styles.badgeName}>{t('home.badgeSafety')}</Text>
              <Text style={styles.badgeStatusText}>UNLOCKED</Text>
            </View>

            {/* Locked Badge */}
            <View style={[styles.badgeCard, styles.badgeCardLocked]}>
              <View style={[styles.badgeIconCircle, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                <MaterialCommunityIcons name="lock" size={18} color={colors.textMuted} />
              </View>
              <Text style={[styles.badgeName, { color: colors.textMuted }]}>Highland</Text>
              <Text style={styles.badgeLockedText}>LOCKED</Text>
            </View>
          </ScrollView>

          {/* ══ 4. RECENT CONVOY ACTIVITY FEED (STRAVA STYLE) ══ */}
          <Text style={styles.sectionHeading}>Riwayat Konvoi Terbaru (Feed)</Text>
          {recentRides.map((ride) => (
            <View key={ride.id} style={styles.rideFeedCard}>
              <View style={styles.rideFeedHeader}>
                <View style={styles.rideIconBg}>
                  <MaterialCommunityIcons
                    name={ride.type === 'motorcycle' ? 'motorbike' : 'car-side'}
                    size={16}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rideTitle}>{ride.title}</Text>
                  <Text style={styles.rideTime}>{ride.time}</Text>
                </View>
              </View>

              <View style={styles.rideMetricsRow}>
                <View style={styles.rideMetricCol}>
                  <Text style={styles.rideMetricVal}>{ride.distance}</Text>
                  <Text style={styles.rideMetricLabel}>Jarak</Text>
                </View>
                <View style={styles.rideMetricDivider} />
                <View style={styles.rideMetricCol}>
                  <Text style={styles.rideMetricVal}>{ride.duration}</Text>
                  <Text style={styles.rideMetricLabel}>Durasi</Text>
                </View>
                <View style={styles.rideMetricDivider} />
                <View style={styles.rideMetricCol}>
                  <Text style={styles.rideMetricVal}>{ride.speed}</Text>
                  <Text style={styles.rideMetricLabel}>Rata² Speed</Text>
                </View>
                <View style={styles.rideMetricDivider} />
                <View style={styles.rideMetricCol}>
                  <Text style={styles.rideMetricVal}>{ride.riders} Member</Text>
                  <Text style={styles.rideMetricLabel}>Rombongan</Text>
                </View>
              </View>
            </View>
          ))}

          {/* ══ 5. REGIONAL LEADERBOARD TEASER ══ */}
          <Text style={styles.sectionHeading}>Leaderboard Regional</Text>
          <View style={styles.leaderboardCard}>
            {topRiders.map((item) => (
              <View key={item.rank} style={[styles.leaderboardRow, item.isMe && styles.leaderboardRowMe]}>
                <Text style={styles.rankNum}>#{item.rank}</Text>
                <View style={styles.riderAvatarMini}>
                  <Text style={styles.riderAvatarInitial}>{item.name.substring(0, 1)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.riderName, item.isMe && { color: colors.primary }]}>{item.name}</Text>
                  <Text style={styles.riderBadgeLabel}>🏅 {item.badge}</Text>
                </View>
                <Text style={styles.riderKm}>{item.km}</Text>
              </View>
            ))}
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
  sectionHeading: { fontSize: fontSize.sm + 1, fontFamily: fonts.bold, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm },

  // 1. Weekly Bar Chart
  weeklyChartCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  chartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardSectionTitle: { fontSize: fontSize.xs + 1, fontFamily: fonts.bold, color: colors.textPrimary },
  chartTotalVal: { fontSize: 10, fontFamily: fonts.medium, color: colors.primaryMuted },
  barChartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 60, paddingTop: 8 },
  barCol: { alignItems: 'center', flex: 1 },
  barTrack: { width: 14, height: 40, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 7 },
  barDayText: { fontSize: 9, fontFamily: fonts.medium, color: colors.textMuted, marginTop: 4 },
  barDayTextActive: { color: colors.primary, fontFamily: fonts.bold },

  // 2. Metrics Grid (2x2)
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  metricCard: {
    width: '48%',
    backgroundColor: 'rgba(30, 41, 59, 0.45)',
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  metricVal: { fontSize: fontSize.md, fontFamily: fonts.black, color: colors.textPrimary, marginTop: 2 },
  metricLabel: { fontSize: 9, fontFamily: fonts.medium, color: colors.textMuted, marginTop: 1 },

  // 3. Badges Showcase Scroll
  badgesScroll: { gap: spacing.sm, paddingRight: spacing.md, marginBottom: spacing.xs },
  badgeCard: {
    width: 90,
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
  },
  badgeCardLocked: { backgroundColor: 'rgba(15, 23, 42, 0.4)', borderColor: 'rgba(255, 255, 255, 0.05)' },
  badgeIconCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  badgeName: { fontSize: 9, fontFamily: fonts.bold, color: colors.textPrimary, textAlign: 'center' },
  badgeStatusText: { fontSize: 7, fontFamily: fonts.black, color: colors.primary, letterSpacing: 0.5, marginTop: 2 },
  badgeLockedText: { fontSize: 7, fontFamily: fonts.black, color: colors.textMuted, letterSpacing: 0.5, marginTop: 2 },

  // 4. Strava Ride Feed Cards
  rideFeedCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.18)',
  },
  rideFeedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  rideIconBg: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(99, 102, 241, 0.12)', justifyContent: 'center', alignItems: 'center' },
  rideTitle: { fontSize: fontSize.xs + 1, fontFamily: fonts.bold, color: colors.textPrimary },
  rideTime: { fontSize: 9, fontFamily: fonts.medium, color: colors.textMuted, marginTop: 1 },
  rideMetricsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.4)', borderRadius: radius.md, paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.sm },
  rideMetricCol: { alignItems: 'center', flex: 1 },
  rideMetricVal: { fontSize: 10, fontFamily: fonts.bold, color: colors.textPrimary },
  rideMetricLabel: { fontSize: 8, fontFamily: fonts.medium, color: colors.textMuted, marginTop: 1 },
  rideMetricDivider: { width: 1, height: 16, backgroundColor: 'rgba(255, 255, 255, 0.08)' },

  // 5. Leaderboard
  leaderboardCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.18)',
  },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.sm, borderRadius: radius.md, gap: spacing.sm },
  leaderboardRowMe: { backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  rankNum: { fontSize: fontSize.xs, fontFamily: fonts.black, color: colors.primary, width: 24 },
  riderAvatarMini: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  riderAvatarInitial: { fontSize: 10, fontFamily: fonts.bold, color: colors.white },
  riderName: { fontSize: fontSize.xs, fontFamily: fonts.bold, color: colors.textPrimary },
  riderBadgeLabel: { fontSize: 8, fontFamily: fonts.medium, color: colors.textMuted, marginTop: 1 },
  riderKm: { fontSize: fontSize.xs, fontFamily: fonts.black, color: colors.textPrimary },
});
