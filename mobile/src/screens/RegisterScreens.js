import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
    ActivityIndicator, Animated, KeyboardAvoidingView, Platform,
    Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { colors, fonts, fontSize, radius, spacing } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import ConvoyDialog from '../components/common/ConvoyDialog';

export default function RegisterScreens({ navigation }) {
    const { register, logout } = useAuth();
    const [step, setStep] = useState(1);
    
    // Form Data
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [vehicleName, setVehicleName] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const [dialogConfig, setDialogConfig] = useState({ visible: false });

    // Step Transition Animation
    const stepFadeAnim = useRef(new Animated.Value(1)).current;

    const getFriendlyRegisterError = (errorMsg) => {
        if (!errorMsg) return 'Registrasi gagal. Silakan coba lagi.';
        const lower = errorMsg.toLowerCase();
        if (lower.includes('already registered') || lower.includes('user_already_exists') || lower.includes('already been taken')) {
            return 'Email ini sudah terdaftar. Silakan gunakan email lain atau login.';
        }
        if (lower.includes('password should be at least')) {
            return 'Password terlalu pendek. Gunakan minimal 6 karakter.';
        }
        if (lower.includes('invalid email') || lower.includes('email_invalid')) {
            return 'Format alamat email tidak valid. Periksa kembali penulisan email.';
        }
        return errorMsg;
    };

    // Step 1 validation
    const isStep1Valid = email.includes('@') && password.length >= 6 && confirmPassword === password;
    const passwordMismatch = confirmPassword.length > 0 && confirmPassword !== password;
    // Step 2 validation
    const isStep2Valid = displayName.trim().length > 0 && vehicleName.trim().length > 0;

    const handleNext = () => {
        if (!isStep1Valid) return;
        Animated.sequence([
            Animated.timing(stepFadeAnim, { toValue: 0.2, duration: 120, useNativeDriver: true }),
            Animated.timing(stepFadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]).start();
        setStep(2);
    };

    const handleBack = () => {
        if (step === 2) {
            Animated.sequence([
                Animated.timing(stepFadeAnim, { toValue: 0.2, duration: 120, useNativeDriver: true }),
                Animated.timing(stepFadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
            ]).start();
            setStep(1);
        } else {
            navigation.goBack();
        }
    };

    const handleRegister = async () => {
        if (!isStep2Valid || loading) return;
        setLoading(true);

        try {
            await register({
                email: email.trim().toLowerCase(),
                password,
                displayName: displayName.trim(),
                vehicleName: vehicleName.trim(),
            });
            await logout();

            setDialogConfig({
                visible: true,
                type: 'success',
                icon: 'account-check',
                title: 'Registrasi Berhasil!',
                message: 'Akun radar kamu telah berhasil dibuat. Silakan login untuk bergabung ke rombongan convoy.',
                buttons: [{
                    text: 'MASUK SEKARANG',
                    style: 'primary',
                    onPress: () => navigation.navigate('Login')
                }],
            });
        } catch (error) {
            setDialogConfig({
                visible: true,
                type: 'danger',
                icon: 'account-alert',
                title: 'Registrasi Gagal',
                message: getFriendlyRegisterError(error.message),
                buttons: [{ text: 'MENGERTI', style: 'primary' }],
            });
        } finally {
            setLoading(false);
        }
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

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                
                {/* Background Glow */}
                <View style={styles.glowTop} />

                <View style={styles.content}>
                    {/* Header with Back Button */}
                    <View style={styles.topHeader}>
                        <Pressable onPress={handleBack} style={styles.backButton}>
                            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
                        </Pressable>
                        <Text style={styles.stepIndicator}>TAHAP {step} DARI 2</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={styles.headerSection}>
                        <Text style={styles.mainTitle}>{step === 1 ? 'Data Akses' : 'Identitas Radar'}</Text>
                        <Text style={styles.subtitle}>
                            {step === 1 
                                ? 'Buat kredensial akses untuk bergabung ke dalam jaringan.'
                                : 'Lengkapi identitas diri dan kendaraan untuk visibilitas di radar.'}
                        </Text>
                    </View>

                    {/* Form Section */}
                    <Animated.View style={[styles.formSection, { opacity: stepFadeAnim }]}>
                        {step === 1 ? (
                            /* ── STEP 1: Email & Password ── */
                            <View style={styles.stepContainer}>
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

                                <View style={[
                                    styles.inputGroup,
                                    focusedField === 'confirmPassword' && styles.inputGroupFocused,
                                    passwordMismatch && styles.inputGroupError,
                                ]}>
                                    <MaterialCommunityIcons
                                        name="lock-check-outline"
                                        size={20}
                                        color={passwordMismatch ? colors.danger : (focusedField === 'confirmPassword' ? colors.primary : colors.textMuted)}
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={styles.inputField}
                                        placeholder="Konfirmasi Password"
                                        placeholderTextColor={colors.textDisabled}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry={!showConfirmPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        onFocus={() => setFocusedField('confirmPassword')}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                    <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.togglePassword}>
                                        <MaterialCommunityIcons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
                                    </Pressable>
                                </View>

                                <View style={[styles.errorRow, { opacity: passwordMismatch ? 1 : 0 }]}>
                                    <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.danger} />
                                    <Text style={styles.errorText}>Password tidak cocok</Text>
                                </View>

                                <Pressable
                                    onPress={handleNext}
                                    disabled={!isStep1Valid}
                                    style={[styles.primaryButton, !isStep1Valid && styles.primaryButtonDisabled]}
                                >
                                    <Text style={styles.primaryButtonText}>LANJUTKAN</Text>
                                    <MaterialCommunityIcons name="arrow-right" size={20} color={colors.white} style={{ marginLeft: 8 }} />
                                </Pressable>
                            </View>
                        ) : (
                            /* ── STEP 2: Identitas ── */
                            <View style={styles.stepContainer}>
                                <View style={[styles.inputGroup, focusedField === 'displayName' && styles.inputGroupFocused]}>
                                    <MaterialCommunityIcons name="account-outline" size={20} color={focusedField === 'displayName' ? colors.primary : colors.textMuted} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.inputField}
                                        placeholder="Callsign (Nama Tampil)"
                                        placeholderTextColor={colors.textDisabled}
                                        value={displayName}
                                        onChangeText={setDisplayName}
                                        onFocus={() => setFocusedField('displayName')}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </View>

                                <View style={[styles.inputGroup, focusedField === 'vehicle' && styles.inputGroupFocused]}>
                                    <MaterialCommunityIcons name="car-sports" size={20} color={focusedField === 'vehicle' ? colors.primary : colors.textMuted} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.inputField}
                                        placeholder="Unit Kendaraan"
                                        placeholderTextColor={colors.textDisabled}
                                        value={vehicleName}
                                        onChangeText={setVehicleName}
                                        onFocus={() => setFocusedField('vehicle')}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </View>

                                <Pressable
                                    onPress={handleRegister}
                                    disabled={!isStep2Valid || loading}
                                    style={[styles.primaryButton, (!isStep2Valid || loading) && styles.primaryButtonDisabled]}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={colors.white} size="small" />
                                    ) : (
                                        <>
                                            <Text style={styles.primaryButtonText}>DAFTAR AKUN</Text>
                                            <MaterialCommunityIcons name="check-circle-outline" size={20} color={colors.white} style={{ marginLeft: 8 }} />
                                        </>
                                    )}
                                </Pressable>
                            </View>
                        )}
                    </Animated.View>

                    {/* Login Link */}
                    {step === 1 && (
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Sudah memiliki akses? </Text>
                            <Pressable onPress={() => navigation.navigate('Login')}>
                                <Text style={styles.loginLink}>Masuk Sistem</Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { flexGrow: 1, justifyContent: 'center', minHeight: '100%' },

    glowTop: {
        position: 'absolute', top: '-15%', right: '-20%',
        width: 400, height: 400, borderRadius: 200,
        backgroundColor: colors.primary, opacity: 0.1,
    },

    content: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl, zIndex: 10 },

    topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
    backButton: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.cardElevated, justifyContent: 'center', alignItems: 'center' },
    stepIndicator: { fontSize: fontSize.xs, fontFamily: fonts.bold, color: colors.primaryMuted, letterSpacing: 2 },

    headerSection: { marginBottom: 32 },
    mainTitle: { fontSize: 36, fontFamily: fonts.black, color: colors.textPrimary, letterSpacing: -1.2, marginBottom: spacing.xs },
    subtitle: { fontSize: fontSize.sm, fontFamily: fonts.medium, color: colors.textSecondary, lineHeight: 22 },

    formSection: { marginBottom: spacing.xl },
    stepContainer: { width: '100%' },

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
    inputGroupError: {
        borderColor: colors.danger,
        borderWidth: 1,
        backgroundColor: 'rgba(239,68,68,0.08)',
    },
    inputIcon: { marginRight: spacing.sm },
    inputField: { flex: 1, height: 48, fontSize: fontSize.md, fontFamily: fonts.medium, color: colors.textPrimary },
    togglePassword: { padding: spacing.sm },

    primaryButton: {
        flexDirection: 'row', backgroundColor: colors.primary, borderRadius: radius.md,
        paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
        elevation: 6, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45, shadowRadius: 12, marginTop: spacing.md,
    },
    primaryButtonDisabled: { backgroundColor: colors.borderLight, elevation: 0, shadowOpacity: 0 },
    primaryButtonText: { color: colors.white, fontSize: fontSize.md, fontFamily: fonts.bold, letterSpacing: 1.2 },

    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xl },
    footerText: { fontSize: fontSize.sm, fontFamily: fonts.medium, color: colors.textMuted },
    loginLink: { fontSize: fontSize.sm, fontFamily: fonts.bold, color: colors.primary },
});