import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getTripHistory } from '../api/history.api';

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

  // ── Real State from Laravel Backend ──
  const [tripsHistory, setTripsHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await getTripHistory();
      const items = res?.data || res?.trips || res || [];
      setTripsHistory(Array.isArray(items) ? items : []);
    } catch (_err) {
      setTripsHistory([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  // ── Calculated Real Metrics ──
  const totalDistance = tripsHistory.reduce((acc, t) => {
    const d = t.distance_km ?? t.route_distance_km ?? 0;
    return acc + Number(d || 0);
  }, 0);

  const totalDurationMin = tripsHistory.reduce((acc, t) => {
    const dur = t.duration_min ?? t.route_duration_min ?? (t.duration_seconds ? t.duration_seconds / 60 : 0);
    return acc + Number(dur || 0);
  }, 0);

  const totalHours = (totalDurationMin / 60).toFixed(1);
  const totalTrips = tripsHistory.length;
  const avgSpeed = totalDurationMin > 0 ? Math.round(totalDistance / (totalDurationMin / 60)) : 0;

  // Calculate Weekly Bar Heights dynamically from real trips or fallback
  const daysOfWeek = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const dayIndexMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 }; // JS getDay() 0=Sun
  const dayDistances = [0, 0, 0, 0, 0, 0, 0];

  tripsHistory.forEach((t) => {
    if (!t.finished_at && !t.started_at) return;
    const date = new Date(t.finished_at || t.started_at);
    const dayIdx = dayIndexMap[date.getDay()];
    if (dayIdx !== undefined) {
      const dist = Number(t.distance_km ?? t.route_distance_km ?? 5);
      dayDistances[dayIdx] += dist;
    }
  });

  const maxDayDist = Math.max(...dayDistances, 1);
  const weeklyData = daysOfWeek.map((day, idx) => ({
    day,
    val: dayDistances[idx] > 0 ? Math.min(100, Math.max(20, Math.round((dayDistances[idx] / maxDayDist) * 100))) : 15,
    active: dayDistances[idx] > 0,
  }));

  // Real km within the last 7 days
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyKm = tripsHistory
    .filter((t) => {
      const ts = t.finished_at || t.started_at;
      return ts && new Date(ts).getTime() >= weekAgo;
    })
    .reduce((acc, t) => acc + Number(t.distance_km ?? t.route_distance_km ?? 0), 0);

  // Badges derived from real data
  const badgePioneer = totalTrips > 0;
  const badgeNight = tripsHistory.some((t) => {
    const ts = t.finished_at || t.started_at;
    if (!ts) return false;
    const hr = new Date(ts).getHours();
    return hr >= 18 || hr < 6;
  });
  const badgeSafety = false; // data SOS riwayat belum tersedia dari backend

  // Feed items from real history only (no mock)
  const hasTrips = tripsHistory.length > 0;
  const displayRides = hasTrips
    ? tripsHistory.slice(0, 5).map((t, idx) => {
        const dist = Number(t.distance_km ?? t.route_distance_km ?? 0).toFixed(1);
        const durMin = Math.round(Number(t.duration_min ?? t.route_duration_min ?? (t.duration_seconds ? t.duration_seconds / 60 : 0)));
        const durStr = durMin >= 60 ? `${Math.floor(durMin / 60)}j ${durMin % 60}m` : `${durMin}m`;
        const speedStr = durMin > 0 ? `${Math.round(dist / (durMin / 60))} km/h` : '0 km/h';
        const titleStr = t.origin?.name && t.destination?.name
          ? `${t.origin.name} ➔ ${t.destination.name}`
          : `Touring Sesi #${t.session_id || idx + 1}`;
        const timeStr = t.finished_at
          ? new Date(t.finished_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
          : 'Trip Selesai';

        return {
          id: String(t.session_id || idx),
          title: titleStr,
          time: timeStr,
          distance: `${dist} km`,
          duration: durStr,
          speed: speedStr,
          riders: t.member_count || 1,
          type: t.vehicle_type || 'motorcycle',
        };
      })
    : [];

  // Leaderboard: user's real totals only + placeholder for the rest
  const topRiders = [
    { rank: 1, name: displayName, km: `${totalDistance.toFixed(1)} km`, badge: 'TiKum Rider', isMe: true },
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
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
              <Text style={styles.cardSectionTitle}>{t('stats.weekTitle')}</Text>
              <Text style={styles.chartTotalVal}>{weeklyKm.toFixed(0)} km {t('stats.thisWeek')}</Text>
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
              <Text style={styles.metricVal}>{totalDistance.toFixed(1)} km</Text>
              <Text style={styles.metricLabel}>{t('home.totalDistance')}</Text>
            </View>
            <View style={styles.metricCard}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#10B981" />
              <Text style={styles.metricVal}>{totalHours} Jam</Text>
              <Text style={styles.metricLabel}>{t('home.avgDuration')}</Text>
            </View>
            <View style={styles.metricCard}>
              <MaterialCommunityIcons name="speedometer" size={16} color="#F59E0B" />
              <Text style={styles.metricVal}>{avgSpeed} km/h</Text>
              <Text style={styles.metricLabel}>{t('stats.avgSpeed')}</Text>
            </View>
            <View style={styles.metricCard}>
              <MaterialCommunityIcons name="account-group" size={16} color="#0EA5E9" />
              <Text style={styles.metricVal}>{totalTrips}x Trip</Text>
              <Text style={styles.metricLabel}>{t('home.ridingCount')}</Text>
            </View>
          </View>

          {/* ══ 3. RIDER BADGES SHOWCASE ══ */}
          <Text style={styles.sectionHeading}>{t('home.badgesHeading')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesScroll}>
            <View style={[styles.badgeCard, !badgePioneer && styles.badgeCardLocked]}>
              <View style={[styles.badgeIconCircle, { backgroundColor: badgePioneer ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)' }]}>
                <MaterialCommunityIcons name="shield-crown-outline" size={20} color={badgePioneer ? colors.primary : colors.textMuted} />
              </View>
              <Text style={[styles.badgeName, !badgePioneer && { color: colors.textMuted }]}>{t('home.badgePioneer')}</Text>
              {badgePioneer
                ? <Text style={styles.badgeStatusText}>UNLOCKED</Text>
                : <Text style={styles.badgeLockedText}>LOCKED</Text>}
            </View>

            <View style={[styles.badgeCard, !badgeNight && styles.badgeCardLocked]}>
              <View style={[styles.badgeIconCircle, { backgroundColor: badgeNight ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)' }]}>
                <MaterialCommunityIcons name="weather-night" size={20} color={badgeNight ? '#F59E0B' : colors.textMuted} />
              </View>
              <Text style={[styles.badgeName, !badgeNight && { color: colors.textMuted }]}>{t('home.badgeNight')}</Text>
              {badgeNight
                ? <Text style={styles.badgeStatusText}>UNLOCKED</Text>
                : <Text style={styles.badgeLockedText}>LOCKED</Text>}
            </View>

            <View style={[styles.badgeCard, !badgeSafety && styles.badgeCardLocked]}>
              <View style={[styles.badgeIconCircle, { backgroundColor: badgeSafety ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)' }]}>
                <MaterialCommunityIcons name="heart-pulse" size={20} color={badgeSafety ? '#10B981' : colors.textMuted} />
              </View>
              <Text style={[styles.badgeName, !badgeSafety && { color: colors.textMuted }]}>{t('home.badgeSafety')}</Text>
              {badgeSafety
                ? <Text style={styles.badgeStatusText}>UNLOCKED</Text>
                : <Text style={styles.badgeLockedText}>LOCKED</Text>}
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
          <Text style={styles.sectionHeading}>{t('stats.feedHeading')}</Text>
          {displayRides.length === 0 ? (
            <View style={styles.emptyFeedContainer}>
              <MaterialCommunityIcons name="motorbike-off" size={36} color={colors.textMuted} />
              <Text style={styles.emptyFeedText}>{t('stats.emptyFeed')}</Text>
            </View>
          ) : (
            displayRides.map((ride) => (
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
                    <Text style={styles.rideMetricLabel}>{t('stats.rideDistance')}</Text>
                  </View>
                  <View style={styles.rideMetricDivider} />
                  <View style={styles.rideMetricCol}>
                    <Text style={styles.rideMetricVal}>{ride.duration}</Text>
                    <Text style={styles.rideMetricLabel}>{t('stats.rideDuration')}</Text>
                  </View>
                  <View style={styles.rideMetricDivider} />
                  <View style={styles.rideMetricCol}>
                    <Text style={styles.rideMetricVal}>{ride.speed}</Text>
                    <Text style={styles.rideMetricLabel}>{t('stats.rideSpeed')}</Text>
                  </View>
                  <View style={styles.rideMetricDivider} />
                  <View style={styles.rideMetricCol}>
                    <Text style={styles.rideMetricVal}>{ride.riders} Member</Text>
                    <Text style={styles.rideMetricLabel}>{t('stats.rideGroup')}</Text>
                  </View>
                </View>
              </View>
            ))
          )}

          {/* ══ 5. REGIONAL LEADERBOARD TEASER ══ */}
          <Text style={styles.sectionHeading}>{t('stats.leaderboardTitle')}</Text>
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
            <Text style={styles.leaderboardHint}>{t('stats.rankSoon')}</Text>
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
  emptyFeedContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  emptyFeedText: { fontSize: fontSize.xs, fontFamily: fonts.medium, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, lineHeight: 18 },

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
  leaderboardHint: {
    fontSize: fontSize.xs,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: spacing.sm,
  },
});
