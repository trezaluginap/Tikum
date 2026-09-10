import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../constants/theme';

export function HomeHeader({ displayName, profileInitial, profilePhotoUrl, onProfilePress }) {
  // Entrance animation for whole header HUD
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(headerSlideAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getGreetingConfig = () => {
    const hr = new Date().getHours();
    if (hr >= 4 && hr < 11) {
      return { actionTitle: 'MORNING RIDE ☀️', badgeText: 'PAGI' };
    } else if (hr >= 11 && hr < 15) {
      return { actionTitle: 'CONVOY SESSION 🌤️', badgeText: 'SIANG' };
    } else if (hr >= 15 && hr < 18.5) {
      return { actionTitle: 'SUNSET CRUISING 🌇', badgeText: 'SORE' };
    } else {
      return { actionTitle: 'NIGHT RADAR 🌙', badgeText: 'MALAM' };
    }
  };

  const getTickerItems = () => {
    const hr = new Date().getHours();
    let timeSlogan = 'Rapatkan Barisan! 🏍️';
    if (hr >= 11 && hr < 15) timeSlogan = 'Siap Riding Rombongan? 🚗';
    else if (hr >= 15 && hr < 18.5) timeSlogan = 'Gas Tipis-Tipis Santai 💨';
    else if (hr < 4 || hr >= 18.5) timeSlogan = 'Safety Riding Malam Ini! 📍';

    return [
      { icon: 'shield-check', text: timeSlogan, color: colors.primaryMuted },
      { icon: 'speedometer', text: '💡 Cek tekanan ban & BBM sebelum jalan', color: '#10B981' },
      { icon: 'radar', text: '📡 TiKum Radar Online · Supabase Active', color: '#0EA5E9' },
      { icon: 'alert-decagram-outline', text: '🚨 Tombol SOS siap jika darurat', color: '#EF4444' },
      { icon: 'car-multiple', text: '📍 Bagikan 6-digit PIN untuk gabung', color: '#F59E0B' },
    ];
  };

  const greeting = getGreetingConfig();
  const tickerItems = getTickerItems();
  const [tickerIndex, setTickerIndex] = useState(0);

  const tickerFadeAnim = useRef(new Animated.Value(1)).current;
  const tickerSlideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(tickerFadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(tickerSlideAnim, {
          toValue: -8,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTickerIndex((prev) => (prev + 1) % tickerItems.length);
        tickerSlideAnim.setValue(8);

        Animated.parallel([
          Animated.timing(tickerFadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(tickerSlideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 3800);

    return () => clearInterval(interval);
  }, [tickerItems.length]);

  const currentTicker = tickerItems[tickerIndex] || tickerItems[0];

  return (
    <Animated.View
      style={[
        styles.hudContainer,
        {
          opacity: headerFadeAnim,
          transform: [{ translateY: headerSlideAnim }],
        },
      ]}
    >
      <View style={styles.headerTopRow}>
        <View style={styles.left}>
          
          {/* Action Session Title */}
          <Text style={styles.actionTitle}>{greeting.actionTitle}</Text>

          {/* User Name */}
          <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
        </View>

        {/* Profile Avatar with Online Beacon */}
        <TouchableOpacity style={styles.avatarWrapper} onPress={onProfilePress} activeOpacity={0.85}>
          <View style={styles.profileButton}>
            {profilePhotoUrl ? (
              <Image source={{ uri: profilePhotoUrl }} style={styles.profileImage} />
            ) : (
              <Text style={styles.profileInitial}>{profileInitial}</Text>
            )}
          </View>
          <View style={styles.onlineBeaconDot} />
        </TouchableOpacity>
      </View>

      {/* Rotating Info Ticker Ribbon */}
      <View style={styles.tickerRibbonContainer}>
        <Animated.View
          style={[
            styles.sloganBadge,
            {
              opacity: tickerFadeAnim,
              transform: [{ translateY: tickerSlideAnim }],
            },
          ]}
        >
          <MaterialCommunityIcons
            name={currentTicker.icon}
            size={13}
            color={currentTicker.color}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.sloganText, { color: currentTicker.color }]} numberOfLines={1}>
            {currentTicker.text}
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hudContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.65)',
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md + 2,
    paddingBottom: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.28)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  left: {
    flex: 1,
    paddingRight: spacing.md,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  statusPillText: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: colors.success,
    letterSpacing: 1,
  },
  actionTitle: {
    fontSize: 11,
    fontFamily: fonts.black,
    color: colors.primaryMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  callsignRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
    gap: 6,
  },
  callsignLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  userName: {
    fontSize: 22,
    fontFamily: fonts.black,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  avatarWrapper: {
    position: 'relative',
  },
  profileButton: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.5)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  profileInitial: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: fontSize.xl,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  onlineBeaconDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.card,
  },
  tickerRibbonContainer: {
    marginTop: spacing.md - 2,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  sloganBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  sloganText: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    color: colors.primaryMuted,
    letterSpacing: 0.4,
  },
});
