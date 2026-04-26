import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

export default function LoginScreen({ onBackToRegister }) {
  const handleContinue = () => {
    Alert.alert('Info', 'Login page siap. Lanjutkan alur berikutnya dari sini.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <Text style={styles.description}>
        Register sekarang hanya menyimpan data lokal sesuai kolom yang ada di database: display_name dan vehicle_type.
      </Text>

      <Pressable onPress={handleContinue} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Lanjut</Text>
      </Pressable>

      <Pressable onPress={onBackToRegister} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Kembali ke Register</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  description: {
    marginBottom: 18,
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 10,
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    color: '#222',
    fontWeight: '600',
  },
});
