import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../constants/theme';

export default function RidingHudWidget({ speedKmH = 0, altitudeM = 0, distanceKm, durationMin }) {
  const displaySpeed = Math.max(0, Math.round(speedKmH || 0));
  const displayAlt = Math.max(0, Math.round(altitudeM || 0));

  return (
    <View style={styles.container}>
      {/* Speedometer */}
      <View style={styles.metricItem}>
        <Text style={styles.speedValue}>{displaySpeed}</Text>
        <Text style={styles.speedUnit}>KM/H</Text>
      </View>

      <View style={styles.divider} />

      {/* Altitude */}
      <View style={styles.metricSubItem}>
        <MaterialCommunityIcons name="image-filter-hdr" size={14} color={colors.primary} />
        <Text style={styles.metricValText}>{displayAlt} m</Text>
        <Text style={styles.metricLabelText}>ELEVASI</Text>
      </View>

      {/* ETA & Distance (If route active) */}
      {distanceKm !== undefined && distanceKm !== null && (
        <>
          <View style={styles.divider} />
          <View style={styles.metricSubItem}>
            <MaterialCommunityIcons name="map-marker-distance" size={14} color={colors.success} />
            <Text style={styles.metricValText}>{distanceKm} km</Text>
            <Text style={styles.metricLabelText}>SISA JARAK</Text>
          </View>
        </>
      )}

      {durationMin !== undefined && durationMin !== null && (
        <>
          <View style={styles.divider} />
          <View style={styles.metricSubItem}>
            <MaterialCommunityIcons name="clock-outline" size={14} color="#F59E0B" />
            <Text style={styles.metricValText}>{durationMin} mnt</Text>
            <Text style={styles.metricLabelText}>ESTIMASI</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 95,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(15, 23, 42, 0.90)',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 42,
    elevation: 6,
  },
  metricItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  speedValue: {
    fontSize: fontSize.xl + 2,
    fontFamily: fonts.black,
    color: colors.primary,
    lineHeight: 26,
  },
  speedUnit: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  metricSubItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValText: {
    fontSize: fontSize.xs + 1,
    fontFamily: fonts.bold,
    color: colors.white,
    marginTop: 1,
  },
  metricLabelText: {
    fontSize: 8,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
});
