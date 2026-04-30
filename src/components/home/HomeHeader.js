import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../constants/theme';

export function HomeHeader({ displayName, profileInitial, onProfilePress }) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <Text style={styles.greeting}>Halo 👋</Text>
        <Text style={styles.userName}>{displayName}</Text>
      </View>
      <TouchableOpacity style={styles.profileButton} onPress={onProfilePress} activeOpacity={0.8}>
        <Text style={styles.profileInitial}>{profileInitial}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
  },
  left: {},
  greeting: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  userName: {
    fontSize: fontSize.hero,
    fontFamily: fonts.extraBold,
    color: colors.textPrimary,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  profileInitial: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
  },
});
