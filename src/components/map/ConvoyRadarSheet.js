import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../constants/theme';

export default function ConvoyRadarSheet({ myLocation, friendsLocations = [], userProfiles = {}, sosUsers = {}, onMemberPress }) {
  const [collapsed, setCollapsed] = useState(true);

  // Haversine formula to compute distance between two coordinates in km
  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const membersWithDistance = friendsLocations.map((friend) => {
    const profile = userProfiles[friend.user_id] || { name: 'Anggota', photoUrl: null };
    const dist = myLocation
      ? getDistanceKm(myLocation.latitude, myLocation.longitude, friend.latitude, friend.longitude)
      : null;
    const isLagging = dist !== null && parseFloat(dist) > 1.5; // > 1.5 km is flagged lagging
    const isSos = !!sosUsers[friend.user_id];

    return {
      id: friend.user_id,
      name: profile.name,
      photoUrl: profile.photoUrl,
      distanceKm: dist,
      isLagging,
      isSos,
    };
  }).sort((a, b) => (parseFloat(a.distanceKm || 0) - parseFloat(b.distanceKm || 0)));

  return (
    <View style={styles.sheetContainer}>
      <TouchableOpacity
        style={styles.sheetHeader}
        onPress={() => setCollapsed(!collapsed)}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="radar" size={20} color={colors.primary} />
          <Text style={styles.headerTitle}>Radar Rombongan</Text>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>{friendsLocations.length + 1}</Text>
          </View>
        </View>

        <MaterialCommunityIcons
          name={collapsed ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.listContainer}>
          {membersWithDistance.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada anggota rombongan terhubung</Text>
          ) : (
            <FlatList
              data={membersWithDistance}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 180 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.memberItem, item.isSos && styles.memberItemSos, item.isLagging && styles.memberItemLagging]}
                  onPress={() => onMemberPress && onMemberPress(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.memberAvatarDot}>
                    {item.photoUrl && !item.photoUrl.startsWith('file://') ? (
                      <Image source={{ uri: item.photoUrl }} style={styles.avatarImg} />
                    ) : (
                      <Text style={styles.avatarText}>{item.name.substring(0, 2).toUpperCase()}</Text>
                    )}
                  </View>

                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={styles.memberName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.memberStatus}>
                      {item.isSos ? '⚠️ Sinyal SOS!' : item.isLagging ? 'Terpisah jauh' : 'Terkoneksi'}
                    </Text>
                  </View>

                  <View style={styles.distBadge}>
                    <Text style={[styles.distText, item.isLagging && { color: '#F59E0B' }, item.isSos && { color: colors.danger }]}>
                      {item.distanceKm ? `${item.distanceKm} km` : '-'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 210,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 41,
    overflow: 'hidden',
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.white,
    marginLeft: 4,
  },
  badgeCount: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    marginLeft: 4,
  },
  badgeCountText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  emptyText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  memberItemLagging: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: radius.sm,
    paddingHorizontal: 4,
  },
  memberItemSos: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: radius.sm,
    paddingHorizontal: 4,
  },
  memberAvatarDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.white,
  },
  memberName: {
    fontSize: fontSize.xs,
    fontFamily: fonts.semiBold,
    color: colors.white,
  },
  memberStatus: {
    fontSize: 9,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  distBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  distText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.success,
  },
});
