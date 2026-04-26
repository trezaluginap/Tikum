import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../supabase';
import { navigate } from '../navigation/rootNavigation';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Validasi tombol: mati kalau email belum ada '@' atau password kurang dari 6
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

            // Kalau sukses, biarkan kosong. 
            // AuthContext di App.js akan otomatis mendeteksi perubahan sesi dan pindah ke Home.

        } catch (error) {
            Alert.alert('Login Gagal', error.message || 'Periksa kembali email dan password Anda.');
            console.error('Login error:', error);
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
        <View style={styles.container}>
            <Text style={styles.title}>Welcome Back! 📍</Text>
            <Text style={styles.description}>
                Silakan login untuk mulai membuat atau bergabung ke titik kumpul.
            </Text>

            <View style={styles.section}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="email@contoh.com"
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="******"
                    style={styles.input}
                    secureTextEntry
                />
            </View>

            <Pressable
                onPress={handleLogin}
                disabled={isDisabled}
                style={[styles.primaryButton, isDisabled && styles.primaryButtonDisabled]}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.primaryButtonText}>Login</Text>
                )}
            </Pressable>

            <Pressable onPress={handleBackToRegister} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Belum punya akun? Daftar di sini</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#111',
    },
    description: {
        marginBottom: 30,
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    section: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#444',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
    },
    primaryButton: {
        marginTop: 10,
        backgroundColor: '#111',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    primaryButtonDisabled: {
        backgroundColor: '#a0a0a0',
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryButton: {
        marginTop: 20,
        paddingVertical: 10,
        alignItems: 'center',
    },
    secondaryButtonText: {
        fontSize: 14,
        color: '#555',
        fontWeight: '600',
    },
});