import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { resetPassword } from '../api/auth.api';
import { colors, fonts, fontSize, radius, spacing } from '../constants/theme';

export default function ResetPasswordScreen({ navigation, route }) {
  const token = route?.params?.token || '';
  const email = route?.params?.email || '';
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const canSubmit = useMemo(
    () => token && email && password.length >= 8 && passwordConfirmation.length >= 8 && !loading,
    [email, loading, password, passwordConfirmation, token]
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError('');

    try {
      await resetPassword({ email, token, password, passwordConfirmation });
      setSuccess(true);
    } catch (err) {
      setError(err?.message || 'Reset password gagal.');
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <View style={styles.iconBadge}>
          <MaterialCommunityIcons
            name={success ? 'check-circle-outline' : 'lock-reset'}
            size={40}
            color={success ? colors.success : colors.primary}
          />
        </View>

        <Text style={styles.title}>{success ? 'Password Berhasil Direset' : 'Buat Password Baru'}</Text>
        <Text style={styles.description}>
          {success
            ? 'Silakan login kembali dengan password baru kamu.'
            : `Reset password untuk ${email || 'akun TiKum'}.`}
        </Text>

        {success ? (
          <Pressable style={styles.primaryBtn} onPress={goToLogin}>
            <Text style={styles.primaryBtnText}>KEMBALI KE LOGIN</Text>
          </Pressable>
        ) : (
          <>
            {!token || !email ? (
              <Text style={styles.errorText}>Link reset password tidak valid.</Text>
            ) : null}

            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password Baru"
                placeholderTextColor={colors.textDisabled}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
            </View>

            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="lock-check-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Konfirmasi Password"
                placeholderTextColor={colors.textDisabled}
                secureTextEntry
                value={passwordConfirmation}
                onChangeText={setPasswordConfirmation}
                editable={!loading}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} size={20} />
              ) : (
                <Text style={styles.primaryBtnText}>RESET PASSWORD</Text>
              )}
            </Pressable>

            <Pressable style={styles.secondaryBtn} onPress={goToLogin} disabled={loading}>
              <Text style={styles.secondaryBtnText}>Kembali ke Login</Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconBadge: {
    width: 80,
    height: 80,
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
    textAlign: 'center',
  },
  description: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
    marginBottom: spacing.md,
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
  errorText: {
    width: '100%',
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnDisabled: {
    backgroundColor: colors.borderLight,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
    letterSpacing: 1,
  },
  secondaryBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.semiBold,
  },
});
