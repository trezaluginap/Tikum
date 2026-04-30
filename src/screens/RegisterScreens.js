import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { supabase } from '../../supabase';
import { colors, fonts, fontSize, radius, spacing } from '../constants/theme';

export default function RegisterScreens({ navigation }) {
    const [step, setStep] = useState(1);
    
    // Form Data
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [vehicleName, setVehicleName] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Step 1 validation
    const isStep1Valid = email.includes('@') && password.length >= 6;
    // Step 2 validation
    const isStep2Valid = displayName.trim().length > 0;

    const handleNext = () => {
        if (!isStep1Valid) return;
        setStep(2);
    };

    const handleBack = () => {
        if (step === 2) {
            setStep(1);
        } else {
            navigation.goBack();
        }
    };

    const handleRegister = async () => {
        if (!isStep2Valid || loading) return;
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password: password,
                options: {
                    data: {
                        display_name: displayName,
                        vehicle_name: vehicleName,
                    }
                }
            });

            if (error) throw error;
            Alert.alert('Registrasi Berhasil!', 'Silakan periksa email Anda untuk verifikasi (jika diaktifkan) atau login.');
            navigation.navigate('Login');
        } catch (error) {
            Alert.alert('Registrasi Gagal', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" backgroundColor={colors.background} />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
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
                    <View style={styles.formSection}>
                        
                        {/* ── STEP 1: Email & Password ── */}
                        {step === 1 && (
                            <View style={styles.stepContainer}>
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
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.inputField}
                                        placeholder="Password (Min. 6 Karakter)"
                                        placeholderTextColor={colors.textDisabled}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                    />
                                    <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.togglePassword}>
                                        <MaterialCommunityIcons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
                                    </Pressable>
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
                        )}

                        {/* ── STEP 2: Identitas ── */}
                        {step === 2 && (
                            <View style={styles.stepContainer}>
                                <View style={styles.inputGroup}>
                                    <MaterialCommunityIcons name="account-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.inputField}
                                        placeholder="Callsign (Nama Tampil)"
                                        placeholderTextColor={colors.textDisabled}
                                        value={displayName}
                                        onChangeText={setDisplayName}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <MaterialCommunityIcons name="car-sports" size={20} color={colors.textMuted} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.inputField}
                                        placeholder="Unit Kendaraan (Opsional)"
                                        placeholderTextColor={colors.textDisabled}
                                        value={vehicleName}
                                        onChangeText={setVehicleName}
                                    />
                                </View>

                                <Pressable
                                    onPress={handleRegister}
                                    disabled={!isStep2Valid || loading}
                                    style={[styles.primaryButton, (!isStep2Valid || loading) && styles.primaryButtonDisabled]}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={colors.white} size={24} />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="radar" size={20} color={colors.white} style={{ marginRight: 8 }} />
                                            <Text style={styles.primaryButtonText}>BUAT IDENTITAS</Text>
                                        </>
                                    )}
                                </Pressable>
                            </View>
                        )}
                    </View>

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
    mainTitle: { fontSize: 32, fontFamily: fonts.black, color: colors.textPrimary, letterSpacing: -1, marginBottom: spacing.xs },
    subtitle: { fontSize: fontSize.sm, fontFamily: fonts.regular, color: colors.textSecondary, lineHeight: 20 },

    formSection: { marginBottom: spacing.xl },
    stepContainer: { width: '100%' },

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

    primaryButton: {
        flexDirection: 'row', backgroundColor: colors.primary, borderRadius: radius.md,
        paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
        elevation: 4, marginTop: spacing.md,
    },
    primaryButtonDisabled: { backgroundColor: colors.borderLight, elevation: 0 },
    primaryButtonText: { color: colors.white, fontSize: fontSize.md, fontFamily: fonts.bold, letterSpacing: 1 },

    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xl },
    footerText: { fontSize: fontSize.sm, fontFamily: fonts.regular, color: colors.textMuted },
    loginLink: { fontSize: fontSize.sm, fontFamily: fonts.bold, color: colors.primary },
});