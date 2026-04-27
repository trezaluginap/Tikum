import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native'; // Untuk navigasi
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../lib/supabase'; // Pastikan path ini benar

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [loading, setLoading] = useState(false);

  // --- FUNGSI ASLI BUAT ROOM (CAPTAIN) ---
  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      // 1. Generate PIN 6 digit acak
      const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();

      // 2. Ambil ID user yang sedang login
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("Sesi berakhir, silakan login ulang.");

      // 3. Simpan ke database Supabase
      const { data, error } = await supabase
        .from('rooms')
        .insert([
          { 
            room_pin: generatedPin, 
            host_id: user.id, 
            is_active: true 
          }
        ])
        .select();

      if (error) throw error;

      Alert.alert("Sukses!", `Room dibuat dengan PIN: ${generatedPin}`);
      
      // 4. Navigasi ke MapScreen sambil membawa ID Room
      navigation.navigate('Map', { roomId: data[0].id, pin: generatedPin });

    } catch (error) {
      Alert.alert("Gagal Membuat Room", error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- FUNGSI ASLI GABUNG ROOM (GUEST) ---
  const handleJoinRoom = async () => {
    if (pinInput.length !== 6) {
      Alert.alert("Error", "PIN harus 6 digit.");
      return;
    }

    setLoading(true);
    try {
      // 1. Cek apakah PIN ada di database dan aktif
      const { data, error } = await supabase
        .from('rooms')
        .select('id, is_active')
        .eq('room_pin', pinInput)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        throw new Error("PIN tidak ditemukan atau sudah tidak aktif.");
      }

      // 2. Jika ketemu, tutup modal dan pindah ke Map
      setModalVisible(false);
      setPinInput('');
      navigation.navigate('Map', { roomId: data.id });

    } catch (error) {
      Alert.alert("Gagal Gabung", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* --- MODAL INPUT PIN --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Gabung Titik Kumpul</Text>
            <Text style={styles.modalSubTitle}>Masukkan 6 digit PIN dari Captain</Text>
            
            <TextInput
              style={styles.pinInput}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              value={pinInput}
              onChangeText={setPinInput}
              editable={!loading}
            />

            <View style={styles.modalAction}>
              <TouchableOpacity 
                style={[styles.btnModal, styles.btnCancel]} 
                onPress={() => { setModalVisible(false); setPinInput(''); }}
                disabled={loading}
              >
                <Text style={styles.textCancel}>Batal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.btnModal, styles.btnJoin]} 
                onPress={handleJoinRoom}
                disabled={loading}
              >
                <Text style={styles.textJoin}>{loading ? 'Checking...' : 'Gabung'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.subText}>Halo 👋</Text>
          <Text style={styles.welcomeText}>Faisal Abdul Aziz</Text>
        </View>
        <TouchableOpacity style={styles.profileCircle}>
           <Text style={styles.profileInitial}>FA</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        <View style={styles.statusCard}>
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Status Perjalanan</Text>
            <Text style={styles.statusValue}>Siap untuk TiKum?</Text>
          </View>
          <MaterialCommunityIcons name="map-marker-distance" size={40} color="rgba(255,255,255,0.7)" />
        </View>

        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#E3F2FD' }]}
            onPress={handleCreateRoom}
            disabled={loading}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#2196F3' }]}>
              <MaterialCommunityIcons name="plus" size={28} color="white" />
            </View>
            <Text style={styles.actionText}>Buat Room</Text>
            <Text style={styles.actionSubText}>Jadi Captain</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#F1F8E9' }]}
            onPress={() => setModalVisible(true)}
            disabled={loading}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#4CAF50' }]}>
              <MaterialCommunityIcons name="login" size={24} color="white" />
            </View>
            <Text style={styles.actionText}>Gabung Room</Text>
            <Text style={styles.actionSubText}>Masukkan PIN</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Layanan Lainnya</Text>
        <View style={styles.menuList}>
          <TouchableOpacity style={styles.menuListItem}>
            <View style={styles.menuLeft}>
              <MaterialCommunityIcons name="history" size={24} color="#666" />
              <Text style={styles.menuText}>Riwayat Perjalanan</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#CCC" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#fff', paddingTop: 60, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 4 },
  welcomeText: { fontSize: 20, fontWeight: '800', color: '#333' },
  subText: { color: '#888', fontSize: 14 },
  profileCircle: { width: 45, height: 45, backgroundColor: '#2196F3', borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  profileInitial: { color: 'white', fontWeight: 'bold' },
  content: { padding: 20 },
  statusCard: { backgroundColor: '#2196F3', padding: 25, borderRadius: 20, marginBottom: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { color: '#E3F2FD', fontSize: 14 },
  statusValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#444', marginBottom: 15 },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  actionButton: { width: width * 0.43, padding: 20, borderRadius: 20, alignItems: 'flex-start', elevation: 2 },
  iconCircle: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  actionText: { fontSize: 15, fontWeight: 'bold' },
  actionSubText: { fontSize: 12, color: '#666' },
  menuList: { backgroundColor: '#fff', borderRadius: 20, padding: 10 },
  menuListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuText: { marginLeft: 15, fontSize: 15, color: '#444' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalSubTitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  pinInput: { width: '100%', height: 50, backgroundColor: '#F5F5F5', borderRadius: 10, textAlign: 'center', fontSize: 24, fontWeight: 'bold', letterSpacing: 10, marginBottom: 20 },
  modalAction: { flexDirection: 'row', justifyContent: 'space-between' },
  btnModal: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  btnCancel: { backgroundColor: '#F5F5F5' },
  btnJoin: { backgroundColor: '#2196F3' },
  textJoin: { color: 'white', fontWeight: 'bold' },
  textCancel: { color: '#666' }
});