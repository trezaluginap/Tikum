import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Halo, Faisal!</Text>
          <Text style={styles.subText}>Selamat datang di Tikum</Text>
        </View>
        <TouchableOpacity style={styles.profileCircle}>
           {/* Nanti bisa diisi foto profil dari Supabase */}
           <Text style={{color: 'white'}}>FA</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        
        {/* Ringkasan Status / Statistik */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>Status Registrasi</Text>
          <Text style={styles.cardValue}>Aktif</Text>
        </View>

        {/* Menu Utama (Contoh Tombol) */}
        <Text style={styles.sectionTitle}>Menu Utama</Text>
        <View style={styles.menuGrid}>
          <TouchableOpacity style={styles.menuItem}>
            <Text>Daftar Tamu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text>Riwayat</Text>
          </TouchableOpacity>
        </View>

        {/* List Aktivitas Terbaru */}
        <Text style={styles.sectionTitle}>Aktivitas Terbaru</Text>
        <View style={styles.recentList}>
          <Text style={styles.emptyText}>Belum ada aktivitas terbaru.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subText: {
    color: '#666',
  },
  profileCircle: {
    width: 45,
    height: 45,
    backgroundColor: '#2196F3',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  cardInfo: {
    backgroundColor: '#2196F3',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  cardTitle: {
    color: '#fff',
    opacity: 0.8,
  },
  cardValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
  },
  menuGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  menuItem: {
    backgroundColor: '#fff',
    width: '48%',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2, // shadow untuk android
  },
  recentList: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
  }
});