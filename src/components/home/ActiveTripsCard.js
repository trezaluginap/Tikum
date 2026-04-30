import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../constants/theme';

function TripItem({ trip, onResume }) {
  const tripData = trip.room_trips?.[0];
  const vehicleCount = tripData?.vehicle_count ?? '-';

  return (
    <TouchableOpacity style={styles.tripItem} onPress={() => onResume(trip)} activeOpacity={0.7}>
      <View style={styles.pinBadge}>
        <Text style={styles.pinLabel}>PIN</Text>
        <Text style={styles.pinValue}>{trip.room_pin}</Text>
      </View>
      <View style={styles.tripInfo}>
        <Text style={styles.tripVehicle}>🚗 {vehicleCount} kendaraan</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export function ActiveTripsCard({ activeTrips, loading, onTripResume, onHistoryPress }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Perjalanan Aktif</Text>

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
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
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
    backgroundColor: colors.primaryLight + '20',
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    alignItems: 'center',
  },
  pinLabel: { fontSize: 9, fontFamily: fonts.bold, color: colors.primaryMuted, letterSpacing: 1 },
  pinValue: { fontSize: fontSize.lg, fontFamily: fonts.extraBold, color: colors.primary },
  tripInfo: { flex: 1 },
  tripVehicle: { fontSize: fontSize.sm, fontFamily: fonts.medium, color: colors.textSecondary },

  emptyState: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyText: { fontSize: fontSize.md, fontFamily: fonts.semiBold, color: colors.textSecondary },
  emptySubText: { fontSize: fontSize.xs, fontFamily: fonts.regular, color: colors.textMuted, marginTop: spacing.xs },

  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  historyText: { fontSize: fontSize.sm, fontFamily: fonts.semiBold, color: colors.primary },
});
