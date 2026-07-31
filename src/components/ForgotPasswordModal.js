import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '../../supabase';
import { colors, fonts, fontSize, radius, spacing } from '../constants/theme';

/**
 * ForgotPasswordModal — Modal to request password reset email.
 *
 * Props:
 *   visible: boolean
 *   onClose: () => void
 */
export default function ForgotPasswordModal({ visible, onClose }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.includes('@')) {
      Alert.alert('Validasi', 'Masukkan alamat email yang valid.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: 'tikum://reset-password',
      });

      if (error) throw error;

      setSent(true);
    } catch (error) {
      Alert.alert('Gagal', error.message || 'Terjadi kesalahan saat mengirim email reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setSent(false);
    setLoading(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close Button */}
          <Pressable style={styles.closeBtn} onPress={handleClose}>
            <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
          </Pressable>

          {sent ? (
            /* ── Success State ── */
            <View style={styles.body}>
              <View style={styles.iconBadge}>
                <MaterialCommunityIcons name="email-check-outline" size={36} color={colors.success} />
              </View>
              <Text style={styles.title}>Email Terkirim!</Text>
              <Text style={styles.description}>
                Link reset password telah dikirim ke{'\n'}
                <Text style={styles.emailHighlight}>{email.trim().toLowerCase()}</Text>
              </Text>
              <Text style={styles.hint}>
                Cek folder inbox dan spam. Link berlaku selama 1 jam.
              </Text>
              <Pressable style={styles.primaryBtn} onPress={handleClose}>
                <Text style={styles.primaryBtnText}>KEMBALI KE LOGIN</Text>
              </Pressable>
            </View>
          ) : (
            /* ── Form State ── */
            <View style={styles.body}>
              <View style={styles.iconBadge}>
                <MaterialCommunityIcons name="lock-reset" size={36} color={colors.primary} />
              </View>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.description}>
                Masukkan email yang terdaftar. Kami akan mengirimkan link untuk membuat password baru.
              </Text>

              <View style={styles.inputWrap}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={20}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Alamat Email"
                  placeholderTextColor={colors.textDisabled}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                  autoFocus
                />
              </View>

              <Pressable
                style={[
                  styles.primaryBtn,
                  (!email.includes('@') || loading) && styles.primaryBtnDisabled,
                ]}
                onPress={handleReset}
                disabled={!email.includes('@') || loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} size={20} />
                ) : (
                  <Text style={styles.primaryBtnText}>KIRIM LINK RESET</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  container: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  body: {
    padding: spacing.xl,
    paddingTop: spacing.xxl + 8,
    alignItems: 'center',
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  title: {
    fontSize: fontSize.xxl,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  emailHighlight: {
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  hint: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  inputWrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    color: colors.textPrimary,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  primaryBtnDisabled: {
    backgroundColor: colors.borderLight,
    elevation: 0,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
    letterSpacing: 1,
  },
});
