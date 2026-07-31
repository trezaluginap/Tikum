import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../constants/theme';

/**
 * ConvoyToast — Top animated banner notification for instant updates.
 *
 * Props:
 *   visible: boolean
 *   type: 'info' | 'warning' | 'danger' | 'success'
 *   title: string
 *   message: string
 *   onClose: () => void
 */
export default function ConvoyToast({ visible, type = 'info', title, message, onClose }) {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 50,
        useNativeDriver: true,
        speed: 14,
        bounciness: 6,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  const getTypeTheme = () => {
    switch (type) {
      case 'danger':
        return { accent: colors.danger, bg: '#450A0A', icon: 'alert-decagram' };
      case 'warning':
        return { accent: colors.warning, bg: '#451A03', icon: 'alert-circle' };
      case 'success':
        return { accent: colors.success, bg: '#064E3B', icon: 'check-circle' };
      default:
        return { accent: colors.primary, bg: '#1E1B4B', icon: 'information' };
    }
  };

  const theme = getTypeTheme();

  return (
    <Animated.View
      style={[
        styles.toastCard,
        { backgroundColor: theme.bg, borderColor: theme.accent, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <MaterialCommunityIcons name={theme.icon} size={24} color={theme.accent} style={{ marginRight: spacing.sm }} />
      <View style={styles.textContainer}>
        {title ? <Text style={[styles.title, { color: theme.accent }]}>{title}</Text> : null}
        {message ? <Text style={styles.message} numberOfLines={2}>{message}</Text> : null}
      </View>
      <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
        <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    elevation: 10,
    zIndex: 100,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xs + 1,
    fontFamily: fonts.bold,
    marginBottom: 2,
  },
  message: {
    fontSize: fontSize.xs,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
});
