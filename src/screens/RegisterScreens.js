import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../supabase';
import { navigate } from '../navigation/rootNavigation';

export default function RegisterScreens({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nama, setNama] = useState('');
    const [jenisKendaraan, setJenisKendaraan] = useState('');
    const [loading, setLoading] = useState(false);

    const isDisabled = useMemo(() => {
        return !email.includes('@') || password.length < 6 || !nama.trim() || !jenisKendaraan || loading;
    }, [email, password, nama, jenisKendaraan, loading]);

    const safeNavigate = (routeName) => {
        if (navigation?.navigate) {
            navigation.navigate(routeName);
            return;
        }

        navigate(routeName);
    };

    const handleSignUp = async () => {
        if (isDisabled) return;
        setLoading(true);

        try {
            // STEP 1: Mendaftarkan User ke Auth Supabase
            const { data: { user, session }, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;

            // STEP 2: Jika Auth Berhasil, Insert data ke table Profiles
            if (user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: user.id, // ID ini didapat dari hasil signUp tadi
                            display_name: nama.trim(),
                            vehicle_type: jenisKendaraan,
                        },
                    ]);

                if (profileError) throw profileError;
                
                Alert.alert('Berhasil', 'Silakan cek email untuk verifikasi (jika diaktifkan) atau langsung login.');
                safeNavigate('Login');
            }
        } catch (error) {
            Alert.alert('Registration Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Buat Akun Baru</Text>
            
            <View style={styles.section}>
                <Text style={styles.label}>Email</Text>
                <TextInput value={email} onChangeText={setEmail} placeholder="email@contoh.com" style={styles.input} keyboardType="email-address" autoCapitalize="none" />
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Password (Min. 6 Karakter)</Text>
                <TextInput value={password} onChangeText={setPassword} placeholder="******" style={styles.input} secureTextEntry />
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Nama Tampilan</Text>
                <TextInput value={nama} onChangeText={setNama} placeholder="Nama di Peta" style={styles.input} maxLength={15} />
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Jenis Kendaraan</Text>
                <View style={styles.row}>
                    {['Motor', 'Mobil'].map((v) => (
                        <Pressable key={v} onPress={() => setJenisKendaraan(v)} style={[styles.chip, jenisKendaraan === v && styles.chipActive]}>
                            <Text style={[styles.chipText, jenisKendaraan === v && styles.chipTextActive]}>{v}</Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            <Pressable onPress={handleSignUp} disabled={isDisabled} style={[styles.btn, isDisabled && styles.btnDisabled]}>
                <Text style={styles.btnText}>{loading ? 'Memproses...' : 'Daftar Sekarang'}</Text>
            </Pressable>

            <Pressable onPress={() => safeNavigate('Login')} style={styles.link}>
                <Text style={styles.linkText}>Sudah punya akun? Login</Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 24, flexGrow: 1, justifyContent: 'center', backgroundColor: '#fff' },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, color: '#111' },
    section: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#444' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 12, fontSize: 16 },
    row: { flexDirection: 'row', gap: 10 },
    chip: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: '#ddd' },
    chipActive: { backgroundColor: '#111', borderColor: '#111' },
    chipText: { color: '#444', fontWeight: '500' },
    chipTextActive: { color: '#fff' },
    btn: { backgroundColor: '#111', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    btnDisabled: { backgroundColor: '#ccc' },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    link: { marginTop: 20, alignItems: 'center' },
    linkText: { color: '#666', fontSize: 14 }
});