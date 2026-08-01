import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Platform,
    Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { supabase } from '../../supabase';
import { navigate } from '../navigation/rootNavigation';
import { colors, fonts, fontSize, radius, spacing } from '../constants/theme';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import ConvoyDialog from '../components/common/ConvoyDialog';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const [forgotModalVisible, setForgotModalVisible] = useState(false);
    const [dialogConfig, setDialogConfig] = useState({ visible: false });

    // Entrance animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideUpAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 450,
                useNativeDriver: true,
            }),
            Animated.timing(slideUpAnim, {
                toValue: 0,
                duration: 450,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const getFriendlyErrorMessage = (errorMsg) => {
        if (!errorMsg) return 'Periksa kembali email dan password Anda.';
        const lower = errorMsg.toLowerCase();
        if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
            return 'Email atau password yang Anda masukkan salah. Silakan periksa kembali.';
        }
        if (lower.includes('email not confirmed')) {
            return 'Alamat email Anda belum dikonfirmasi. Cek inbox email Anda untuk melakukan verifikasi.';
        }
        if (lower.includes('too many requests') || lower.includes('rate limit')) {
            return 'Terlalu banyak percobaan login gagal. Silakan tunggu beberapa menit.';
        }
        if (lower.includes('user not found')) {
            return 'Akun dengan email ini belum terdaftar. Silakan registrasi terlebih dahulu.';
        }
        return errorMsg;
    };

    const isDisabled = useMemo(() => {
        return !email.includes('@') || password.length < 6 || loading;
    }, [email, password, loading]);

    const handleLogin = async () => {
        if (isDisabled) return;
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password: password,
            });

            if (error) throw error;
        } catch (error) {
            setDialogConfig({
                visible: true,
                type: 'danger',
                icon: 'lock-alert',
                title: 'Login Gagal',
                message: getFriendlyErrorMessage(error.message),
                buttons: [{ text: 'MENGERTI', style: 'primary' }],
            });
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

            {/* Custom Dialog */}
            <ConvoyDialog
                visible={dialogConfig.visible}
                type={dialogConfig.type}
                icon={dialogConfig.icon}
                title={dialogConfig.title}
                message={dialogConfig.message}
                buttons={dialogConfig.buttons}
                onClose={() => setDialogConfig({ visible: false })}
            />

            {/* Forgot Password Modal */}
            <ForgotPasswordModal
                visible={forgotModalVisible}
                onClose={() => setForgotModalVisible(false)}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                
                {/* Background Glow */}
                <View style={styles.glowTop} />
                <View style={styles.glowBottom} />

                <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>
                    {/* Header */}
                    <View style={styles.headerSection}>
                        <View style={styles.logoBadge}>
                            <MaterialCommunityIcons name="radar" size={32} color={colors.primary} />
                        </View>
                        <Text style={styles.mainTitle}>TiKum</Text>
                        <Text style={styles.subtitle}>
                            Sistem koordinasi konvoi terpusat. Masukkan kredensial untuk mengakses akun.
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.formSection}>
                        <View style={[styles.inputGroup, focusedField === 'email' && styles.inputGroupFocused]}>
                            <MaterialCommunityIcons name="email-outline" size={20} color={focusedField === 'email' ? colors.primary : colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.inputField}
                                placeholder="Alamat Email"
                                placeholderTextColor={colors.textDisabled}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                editable={!loading}
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>

                        <View style={[styles.inputGroup, focusedField === 'password' && styles.inputGroupFocused]}>
                            <MaterialCommunityIcons name="lock-outline" size={20} color={focusedField === 'password' ? colors.primary : colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.inputField}
                                placeholder="Password (Min. 6 Karakter)"
                                placeholderTextColor={colors.textDisabled}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                            />
                            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.togglePassword}>
                                <MaterialCommunityIcons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
                            </Pressable>
                        </View>

                        <View style={styles.forgotRow}>
                            <Pressable onPress={() => setForgotModalVisible(true)}>
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
                                    <Text style={styles.loginButtonText}>Login</Text>
                                </View>
                            )}
                        </Pressable>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Belum memiliki identitas akun? </Text>
                        <Pressable onPress={handleBackToRegister}>
                            <Text style={styles.registerLink}>Registrasi Akun</Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </ScrollView>
            </KeyboardAvoidingView>
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
        width: 72, height: 72, borderRadius: radius.xl,
        backgroundColor: colors.card,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: spacing.md, borderWidth: 1.5, borderColor: 'rgba(99, 102, 241, 0.3)',
        shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
    },
    mainTitle: { fontSize: 42, fontFamily: fonts.black, color: colors.textPrimary, letterSpacing: -1.5, marginBottom: spacing.xs },
    subtitle: { fontSize: fontSize.sm, fontFamily: fonts.medium, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, maxWidth: '85%' },

    formSection: { marginBottom: spacing.xl },
    inputGroup: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.inputBg, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.border,
        paddingHorizontal: spacing.md, paddingVertical: 4,
        marginBottom: spacing.md,
    },
    inputGroupFocused: {
        borderColor: colors.primary,
        borderWidth: 1,
        backgroundColor: 'rgba(99,102,241,0.08)',
    },
    inputIcon: { marginRight: spacing.sm },
    inputField: { flex: 1, height: 48, fontSize: fontSize.md, fontFamily: fonts.medium, color: colors.textPrimary },
    togglePassword: { padding: spacing.sm },

    forgotRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.xl },
    forgotText: { fontSize: fontSize.xs, fontFamily: fonts.semiBold, color: colors.primaryMuted },

    loginButton: {
        backgroundColor: colors.primary, borderRadius: radius.md,
        paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
        elevation: 6, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45, shadowRadius: 12,
    },
    loginButtonDisabled: { backgroundColor: colors.borderLight, elevation: 0, shadowOpacity: 0 },
    buttonContent: { flexDirection: 'row', alignItems: 'center' },
    buttonIcon: { marginRight: spacing.sm },
    loginButtonText: { color: colors.white, fontSize: fontSize.md, fontFamily: fonts.bold, letterSpacing: 1.2 },

    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.border },
    footerText: { fontSize: fontSize.sm, fontFamily: fonts.medium, color: colors.textMuted },
    registerLink: { fontSize: fontSize.sm, fontFamily: fonts.bold, color: colors.primary },
});