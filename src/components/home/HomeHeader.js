import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../constants/theme';
import { useLanguage } from '../../contexts/LanguageContext';

export function HomeHeader({ displayName, profileInitial, profilePhotoUrl, onProfilePress }) {
  const { t } = useLanguage();

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
      return { actionTitle: 'MORNING RIDE ☀️' };
    } else if (hr >= 11 && hr < 15) {
      return { actionTitle: 'CONVOY SESSION 🌤️' };
    } else if (hr >= 15 && hr < 18.5) {
      return { actionTitle: 'SUNSET CRUISING 🌇' };
    } else {
      return { actionTitle: 'NIGHT RADAR 🌙' };
    }
  };

  const getTickerItems = () => {
    const hr = new Date().getHours();
    let timeSlogan = t('home.sloganMorning');
    if (hr >= 11 && hr < 15) timeSlogan = t('home.sloganNoon');
    else if (hr >= 15 && hr < 18.5) timeSlogan = t('home.sloganAfternoon');
    else if (hr < 4 || hr >= 18.5) timeSlogan = t('home.sloganNight');

    return [
      { icon: 'shield-check', text: timeSlogan, color: colors.primaryMuted },
      { icon: 'speedometer', text: t('home.tickerTire'), color: '#10B981' },
      { icon: 'radar', text: t('home.tickerRadar'), color: '#0EA5E9' },
      { icon: 'alert-decagram-outline', text: t('home.tickerSos'), color: '#EF4444' },
      { icon: 'car-multiple', text: t('home.tickerPin'), color: '#F59E0B' },
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
          toValue: -6,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTickerIndex((prev) => (prev + 1) % tickerItems.length);
        tickerSlideAnim.setValue(6);

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
          {/* Action Badge */}
          <View style={styles.sessionBadge}>
            <Text style={styles.actionTitle}>{greeting.actionTitle}</Text>
          </View>
          {/* User Name */}
          <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
        </View>

        {/* Profile Avatar with Beacon */}
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
            styles.sloganRow,
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
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + spacing.xs : spacing.xs,
    paddingBottom: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
    flex: 1,
    paddingRight: spacing.md,
  },
  sessionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.md - 2,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    marginBottom: 4,
  },
  actionTitle: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: colors.primaryMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  userName: {
    fontSize: 20,
    fontFamily: fonts.black,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  avatarWrapper: {
    position: 'relative',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.5)',
    overflow: 'hidden',
  },
  profileInitial: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: fontSize.md + 2,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  onlineBeaconDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  tickerRibbonContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  sloganRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sloganText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.primaryMuted,
    letterSpacing: 0.2,
  },
});
