import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../constants/theme';

function TripItem({ trip, onResume }) {
  const tripData = Array.isArray(trip.room_trips) ? trip.room_trips[0] : trip.room_trips;
  const rawVC = tripData?.vehicle_count ?? 0;
  const modeCode = rawVC >= 1000 ? Math.floor(rawVC / 1000) : 2;
  const cleanCount = rawVC >= 1000 ? (rawVC % 1000) : rawVC;
  const isMotor = modeCode === 1;
  const vehicleLabel = isMotor ? 'motor' : 'mobil';
  const vehicleEmoji = isMotor ? '🏍️' : '🚗';

  return (
    <TouchableOpacity style={styles.tripItem} onPress={() => onResume(trip)} activeOpacity={0.7}>
      <View style={styles.pinBadge}>
        <Text style={styles.pinLabel}>PIN</Text>
        <Text style={styles.pinValue}>{trip.room_pin}</Text>
      </View>
      <View style={styles.tripInfo}>
        <Text style={styles.tripVehicle}>{vehicleEmoji} {cleanCount || '-'} {vehicleLabel}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export function ActiveTripsCard({ activeTrips, loading, onTripResume, onHistoryPress }) {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Perjalanan Aktif</Text>
        {activeTrips.length > 0 && (
          <View style={styles.liveBadge}>
            <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
      ) : activeTrips.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <MaterialCommunityIcons name="map-marker-off-outline" size={28} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyText}>Belum ada perjalanan aktif</Text>
          <Text style={styles.emptySubText}>Buat room untuk memulai convoy</Text>
        </View>
      ) : (
        activeTrips.map((trip) => (
          <TripItem key={trip.id} trip={trip} onResume={onTripResume} />
        ))
      )}

      <TouchableOpacity style={styles.historyBtn} onPress={onHistoryPress} activeOpacity={0.7}>
        <Text style={styles.historyText}>Lihat Riwayat</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primary} />
      </TouchableOpacity>
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
    borderColor: 'rgba(99, 102, 241, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  liveText: {
    fontSize: 9,
    fontFamily: fonts.black,
    color: colors.success,
    letterSpacing: 0.5,
  },

  tripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  pinBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  pinLabel: { fontSize: 9, fontFamily: fonts.bold, color: colors.primaryMuted, letterSpacing: 1 },
  pinValue: { fontSize: fontSize.lg, fontFamily: fonts.black, color: colors.primary },
  tripInfo: { flex: 1 },
  tripVehicle: { fontSize: fontSize.sm, fontFamily: fonts.semiBold, color: colors.textPrimary },

  emptyState: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyText: { fontSize: fontSize.md, fontFamily: fonts.bold, color: colors.textSecondary },
  emptySubText: { fontSize: fontSize.xs, fontFamily: fonts.medium, color: colors.textMuted, marginTop: spacing.xs },

  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  historyText: { fontSize: fontSize.sm, fontFamily: fonts.semiBold, color: colors.primary },
});
