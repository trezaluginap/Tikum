import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { supabase } from '../../supabase';
import { navigate } from '../navigation/rootNavigation';
import { colors, fonts, fontSize, radius, spacing } from '../constants/theme';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isDisabled = useMemo(() => {
        return !email.includes('@') || password.length < 6 || loading;
    }, [email, password, loading]);

    const handleLogin = async () => {
        if (isDisabled) return;
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password,
            });

            if (error) throw error;
        } catch (error) {
            Alert.alert('Login Gagal', error.message || 'Periksa kembali email dan password Anda.');
        } finally {
            setLoading(false);
        }
    };

    const handleBackToRegister = () => {
        if (navigation?.navigate) {
            navigation.navigate('Register');
            return;
        }
        navigate('Register');
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" backgroundColor={colors.background} />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Background Glow */}
                <View style={styles.glowTop} />
                <View style={styles.glowBottom} />

                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.headerSection}>
                        <View style={styles.logoBadge}>
                            <MaterialCommunityIcons name="radar" size={32} color={colors.primary} />
                        </View>
                        <Text style={styles.mainTitle}>TiKum</Text>
                        <Text style={styles.subtitle}>
                            Sistem koordinasi konvoi terpusat. Masukkan kredensial untuk mengakses radar.
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.formSection}>
                        <View style={styles.inputGroup}>
                            <MaterialCommunityIcons name="email-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.inputField}
                                placeholder="Alamat Email"
                                placeholderTextColor={colors.textDisabled}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                editable={!loading}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.inputField}
                                placeholder="Password Akses"
                                placeholderTextColor={colors.textDisabled}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                editable={!loading}
                            />
                            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.togglePassword}>
                                <MaterialCommunityIcons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
                            </Pressable>
                        </View>

                        <View style={styles.forgotRow}>
                            <Pressable>
                                <Text style={styles.forgotText}>Lupa Password?</Text>
                            </Pressable>
                        </View>

                        <Pressable
                            onPress={handleLogin}
                            disabled={isDisabled}
                            style={[styles.loginButton, isDisabled && styles.loginButtonDisabled]}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.white} size={24} />
                            ) : (
                                <View style={styles.buttonContent}>
                                    <MaterialCommunityIcons name="login-variant" size={20} color={colors.white} style={styles.buttonIcon} />
                                    <Text style={styles.loginButtonText}>INISIASI KONEKSI</Text>
                                </View>
                            )}
                        </Pressable>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Belum tergabung dalam jaringan? </Text>
                        <Pressable onPress={handleBackToRegister}>
                            <Text style={styles.registerLink}>Registrasi Radar</Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { flexGrow: 1, justifyContent: 'center', minHeight: '100%' },

    // Glow effect
    glowTop: {
        position: 'absolute', top: '-10%', left: '-20%',
        width: 400, height: 400, borderRadius: 200,
        backgroundColor: colors.primary, opacity: 0.15,
    },
    glowBottom: {
        position: 'absolute', bottom: '-10%', right: '-20%',
        width: 300, height: 300, borderRadius: 150,
        backgroundColor: colors.success, opacity: 0.1,
    },

    content: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl, zIndex: 10 },

    headerSection: { marginBottom: 40, alignItems: 'center' },
    logoBadge: {
        width: 64, height: 64, borderRadius: radius.xl,
        backgroundColor: colors.cardElevated,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: spacing.md, borderWidth: 1, borderColor: colors.borderLight,
        elevation: 8,
    },
    mainTitle: { fontSize: 40, fontFamily: fonts.black, color: colors.textPrimary, letterSpacing: -1, marginBottom: spacing.xs },
    subtitle: { fontSize: fontSize.sm, fontFamily: fonts.regular, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, maxWidth: '85%' },

    formSection: { marginBottom: spacing.xl },
    inputGroup: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.inputBg, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.border,
        paddingHorizontal: spacing.md, paddingVertical: 4,
        marginBottom: spacing.md,
    },
    inputIcon: { marginRight: spacing.sm },
    inputField: { flex: 1, height: 48, fontSize: fontSize.md, fontFamily: fonts.regular, color: colors.textPrimary },
    togglePassword: { padding: spacing.sm },

    forgotRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.xl },
    forgotText: { fontSize: fontSize.xs, fontFamily: fonts.semiBold, color: colors.primaryMuted },

    loginButton: {
        backgroundColor: colors.primary, borderRadius: radius.md,
        paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
        elevation: 4, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 10,
    },
    loginButtonDisabled: { backgroundColor: colors.borderLight, elevation: 0 },
    buttonContent: { flexDirection: 'row', alignItems: 'center' },
    buttonIcon: { marginRight: spacing.sm },
    loginButtonText: { color: colors.white, fontSize: fontSize.md, fontFamily: fonts.bold, letterSpacing: 1 },

    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.border },
    footerText: { fontSize: fontSize.sm, fontFamily: fonts.regular, color: colors.textMuted },
    registerLink: { fontSize: fontSize.sm, fontFamily: fonts.bold, color: colors.primary },
});