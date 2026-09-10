import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../constants/theme';

export function JoinRoomModal({ visible, onClose, pinInput, onPinChange, onJoin, loading }) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handleBar} />
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="key-variant" size={32} color={colors.primary} />
            </View>

            <Text style={styles.title}>Gabung Room</Text>
            <Text style={styles.subtitle}>Masukkan 6 digit PIN dari Leader</Text>

            <TextInput
              style={styles.pinInput}
              placeholder="••••••"
              keyboardType="number-pad"
              maxLength={6}
              value={pinInput}
              onChangeText={onPinChange}
              editable={!loading}
              placeholderTextColor={colors.textDisabled}
            />

            <TouchableOpacity
              style={[styles.btn, (pinInput.length !== 6 || loading) && styles.btnDisabled]}
              onPress={onJoin}
              disabled={loading || pinInput.length !== 6}
              activeOpacity={0.8}
            >
              <Text style={styles.btnText}>
                {loading ? 'Memproses...' : 'Bergabung'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    width: '88%',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    marginBottom: spacing.lg,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  pinInput: {
    width: '100%',
    height: 56,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
    fontSize: 32,
    fontFamily: fonts.bold,
    letterSpacing: 10,
    marginBottom: spacing.xl,
    color: colors.textPrimary,
  },
  btn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 4,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontFamily: fonts.semiBold,
  },
});
