import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../constants/theme';

/**
 * ConvoyDialog — Custom glassmorphism modal dialog replacing generic Alert.alert.
 *
 * Props:
 *   visible: boolean
 *   type: 'info' | 'warning' | 'danger' | 'success'
 *   icon: string (MaterialCommunityIcons name)
 *   title: string
 *   message: string
 *   buttons: Array<{ text: string, style?: 'cancel' | 'destructive' | 'primary', onPress?: () => void }>
 *   onClose: () => void
 */
export default function ConvoyDialog({
  visible,
  type = 'info',
  icon,
  title,
  message,
  buttons = [],
  onClose,
}) {
  if (!visible) return null;

  const getTypeTheme = () => {
    switch (type) {
      case 'danger':
        return {
          accent: colors.danger,
          bgGlow: 'rgba(239, 68, 68, 0.15)',
          icon: icon || 'alert-circle',
        };
      case 'warning':
        return {
          accent: colors.warning,
          bgGlow: 'rgba(245, 158, 11, 0.15)',
          icon: icon || 'alert-decagram',
        };
      case 'success':
        return {
          accent: colors.success,
          bgGlow: 'rgba(16, 185, 129, 0.15)',
          icon: icon || 'check-circle',
        };
      default:
        return {
          accent: colors.primary,
          bgGlow: 'rgba(99, 102, 241, 0.15)',
          icon: icon || 'information',
        };
    }
  };

  const theme = getTypeTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.dialogCard, { borderColor: theme.accent + '40' }]}>
          {/* Icon Header */}
          <View style={[styles.iconBadge, { backgroundColor: theme.bgGlow, borderColor: theme.accent + '50' }]}>
            <MaterialCommunityIcons name={theme.icon} size={32} color={theme.accent} />
          </View>

          {/* Title & Message */}
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {buttons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';

              let btnStyle = styles.btnSecondary;
              let textStyle = styles.btnSecondaryText;

              if (isDestructive) {
                btnStyle = styles.btnDanger;
                textStyle = styles.btnDangerText;
              } else if (!isCancel) {
                btnStyle = styles.btnPrimary;
                textStyle = styles.btnPrimaryText;
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.btnBase, btnStyle]}
                  onPress={() => {
                    if (btn.onPress) btn.onPress();
                    if (onClose) onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={textStyle}>{btn.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  dialogCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1.5,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.sm,
  },
  btnBase: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    elevation: 3,
  },
  btnPrimaryText: {
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
    color: colors.white,
  },
  btnSecondary: {
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnSecondaryText: {
    fontSize: fontSize.md,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
  },
  btnDanger: {
    backgroundColor: colors.danger,
    elevation: 3,
  },
  btnDangerText: {
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
    color: colors.white,
  },
});
