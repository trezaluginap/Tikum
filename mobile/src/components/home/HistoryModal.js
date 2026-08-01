import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '../../../supabase';
import { useAuth } from '../../contexts/AuthContext';
import { colors, fonts, fontSize, radius, spacing } from '../../constants/theme';

/**
 * HistoryModal — slide-up modal showing completed trips the user hosted.
 * 
 * Props:
 *   visible: boolean
 *   onClose: () => void
 */
export default function HistoryModal({ visible, onClose }) {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !user?.id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // Fetch rooms hosted by user that are no longer active
        const { data: rooms, error: roomsErr } = await supabase
          .from('rooms')
          .select('id, room_pin, created_at')
          .eq('host_id', user.id)
          .eq('is_active', false)
          .order('created_at', { ascending: false })
          .limit(30);

        if (roomsErr) throw roomsErr;
        if (cancelled || !rooms?.length) {
          setTrips([]);
          setLoading(false);
          return;
        }

        // Fetch associated trip details
        const roomIds = rooms.map(r => r.id);
        const { data: tripData, error: tripErr } = await supabase
          .from('room_trips')
          .select('room_id, origin_latitude, origin_longitude, destination_latitude, destination_longitude, vehicle_count, created_at')
          .in('room_id', roomIds);

        if (tripErr) throw tripErr;

        // Merge data
        const tripMap = {};
        (tripData || []).forEach(t => { tripMap[t.room_id] = t; });

        const merged = rooms.map(room => ({
          id: room.id,
          pin: room.room_pin,
          createdAt: room.created_at,
          trip: tripMap[room.id] || null,
        }));

        if (!cancelled) setTrips(merged);
      } catch (err) {
        console.error('HistoryModal fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [visible, user?.id]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  };

  const formatCoord = (lat, lng) => {
    if (!lat || !lng) return 'Tidak tersedia';
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const renderTrip = ({ item, index }) => (
    <View style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <View style={styles.tripIndexBadge}>
          <Text style={styles.tripIndexText}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tripDate}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.tripPin}>PIN: {item.pin}</Text>
        </View>
        <View style={styles.tripStatusBadge}>
          <MaterialCommunityIcons name="check-circle" size={12} color={colors.success} />
          <Text style={styles.tripStatusText}>Selesai</Text>
        </View>
      </View>

      {item.trip && (
        <View style={styles.tripBody}>
          <View style={styles.tripRoute}>
            <View style={styles.tripRouteRow}>
              <View style={[styles.tripRouteDot, { backgroundColor: colors.success }]} />
              <Text style={styles.tripRouteLabel}>Asal</Text>
              <Text style={styles.tripRouteCoord}>
                {formatCoord(item.trip.origin_latitude, item.trip.origin_longitude)}
              </Text>
            </View>
            <View style={styles.tripRouteLine} />
            <View style={styles.tripRouteRow}>
              <View style={[styles.tripRouteDot, { backgroundColor: colors.danger }]} />
              <Text style={styles.tripRouteLabel}>Tujuan</Text>
              <Text style={styles.tripRouteCoord}>
                {formatCoord(item.trip.destination_latitude, item.trip.destination_longitude)}
              </Text>
            </View>
          </View>
          {item.trip.vehicle_count > 0 && (
            <View style={styles.tripVehicleBadge}>
              <MaterialCommunityIcons name="car-multiple" size={12} color={colors.primaryMuted} />
              <Text style={styles.tripVehicleText}>{item.trip.vehicle_count} kendaraan</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Riwayat Perjalanan</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Body */}
          {loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.emptyText}>Memuat riwayat...</Text>
            </View>
          ) : trips.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="map-marker-off" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Belum Ada Riwayat</Text>
              <Text style={styles.emptyText}>Riwayat perjalanan yang telah selesai akan muncul di sini.</Text>
            </View>
          ) : (
            <FlatList
              data={trips}
              keyExtractor={(item) => item.id}
              renderItem={renderTrip}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
    minHeight: 300,
  },
  header: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.cardElevated,
    justifyContent: 'center', alignItems: 'center',
  },

  // List
  listContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl + 16,
    gap: spacing.md,
  },

  // Trip Card
  tripCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  tripIndexBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(99,102,241,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  tripIndexText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  tripDate: {
    fontSize: fontSize.sm,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  tripPin: {
    fontSize: fontSize.xs,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  tripStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  tripStatusText: {
    fontSize: fontSize.xs - 1,
    fontFamily: fonts.semiBold,
    color: colors.success,
  },

  // Trip Body
  tripBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  tripRoute: {
    gap: spacing.xs,
  },
  tripRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tripRouteDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  tripRouteLabel: {
    fontSize: fontSize.xs,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    width: 40,
  },
  tripRouteCoord: {
    fontSize: fontSize.xs,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    flex: 1,
  },
  tripRouteLine: {
    width: 1,
    height: 8,
    backgroundColor: colors.border,
    marginLeft: 3,
  },
  tripVehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    backgroundColor: 'rgba(99,102,241,0.08)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  tripVehicleText: {
    fontSize: fontSize.xs - 1,
    fontFamily: fonts.medium,
    color: colors.primaryMuted,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
