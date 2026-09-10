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

import { getTripHistory } from '../../api/history.api';
import { colors, fonts, fontSize, radius, spacing } from '../../constants/theme';

export default function HistoryModal({ visible, onClose }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    if (!visible) return;

    setTrips([]);
    setPage(1);
    loadHistory(1, true);
  }, [visible]);

  const loadHistory = async (nextPage = 1, reset = false) => {
    setLoading(true);
    setError('');

    try {
      const data = await getTripHistory({ page: nextPage, per_page: 10, role: 'all' });
      const nextTrips = data.trips || [];

      setTrips(previous => (reset ? nextTrips : [...previous, ...nextTrips]));
      setMeta(data.meta || null);
      setPage(nextPage);
    } catch (err) {
      setError(err?.message || 'Gagal memuat riwayat perjalanan.');
    } finally {
      setLoading(false);
    }
  };

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

  const formatCoord = (location) => {
    if (!location?.latitude || !location?.longitude) return 'Tidak tersedia';
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  };

  const formatVehicle = (item) => {
    const count = item.vehicle_count || 0;
    const vehicle = item.vehicle_type === 'motorcycle' ? 'motor' : 'mobil';
    return `${count} ${vehicle}`;
  };

  const renderTrip = ({ item, index }) => (
    <View style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <View style={styles.tripIndexBadge}>
          <Text style={styles.tripIndexText}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tripDate}>{formatDate(item.finished_at || item.started_at)}</Text>
          <Text style={styles.tripPin}>PIN: {item.room_pin}</Text>
        </View>
        <View style={styles.tripStatusBadge}>
          <MaterialCommunityIcons name="check-circle" size={12} color={colors.success} />
          <Text style={styles.tripStatusText}>Selesai</Text>
        </View>
      </View>

      <View style={styles.tripBody}>
        <View style={styles.tripRoute}>
          <View style={styles.tripRouteRow}>
            <View style={[styles.tripRouteDot, { backgroundColor: colors.success }]} />
            <Text style={styles.tripRouteLabel}>Asal</Text>
            <Text style={styles.tripRouteCoord}>{item.origin?.name || formatCoord(item.origin)}</Text>
          </View>
          <View style={styles.tripRouteLine} />
          <View style={styles.tripRouteRow}>
            <View style={[styles.tripRouteDot, { backgroundColor: colors.danger }]} />
            <Text style={styles.tripRouteLabel}>Tujuan</Text>
            <Text style={styles.tripRouteCoord}>{item.destination?.name || formatCoord(item.destination)}</Text>
          </View>
        </View>
        {item.vehicle_count > 0 && (
          <View style={styles.tripVehicleBadge}>
            <MaterialCommunityIcons name="car-multiple" size={12} color={colors.primaryMuted} />
            <Text style={styles.tripVehicleText}>{formatVehicle(item)}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!meta?.has_more) return null;

    return (
      <TouchableOpacity
        style={styles.loadMoreBtn}
        onPress={() => loadHistory(page + 1)}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={styles.loadMoreText}>Muat Lagi</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Riwayat Perjalanan</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {loading && trips.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.emptyText}>Memuat riwayat...</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.danger} />
              <Text style={styles.emptyTitle}>Gagal Memuat Riwayat</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.loadMoreBtn} onPress={() => loadHistory(1, true)} activeOpacity={0.8}>
                <Text style={styles.loadMoreText}>Coba Lagi</Text>
              </TouchableOpacity>
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
              keyExtractor={(item) => item.session_id}
              renderItem={renderTrip}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={renderFooter}
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
  listContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl + 16,
    gap: spacing.md,
  },
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
  loadMoreBtn: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: 'rgba(99,102,241,0.12)',
  },
  loadMoreText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
});
