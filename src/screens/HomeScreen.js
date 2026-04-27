import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

// Pastikan struktur path folder ini sama persis dengan yang ada di laptop teman lu
import { supabase } from '../../supabase';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth(); // Menarik "identitas" dari satpam Gatekeeper
  const [modalVisible, setModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [originName, setOriginName] = useState('');
  const [destinationName, setDestinationName] = useState('');
  const [originCoords, setOriginCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [vehicleCount, setVehicleCount] = useState('1');
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const [searchingDest, setSearchingDest] = useState(false);
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);

  // Route preview state (untuk MapView preview di modal)
  const [previewRouteCoords, setPreviewRouteCoords] = useState([]);
  const [previewRouteSummary, setPreviewRouteSummary] = useState(null);

  // Debounce timers untuk API search (avoid rate limiting)
  const originSearchTimeoutRef = useRef(null);
  const destSearchTimeoutRef = useRef(null);

  // Mengambil nama dari metadata user (diisi saat register)
  const displayName = user?.user_metadata?.display_name || 'Pengguna';
  const profileInitial = displayName.substring(0, 2).toUpperCase();

  // Search lokasi menggunakan Nominatim (OpenStreetMap) - Free dan tidak perlu API key
  // DEBOUNCED: hanya search setelah user stop typing 500ms (avoid rate limiting)
  const searchLocation = async (query, isOrigin = true) => {
    if (!query.trim()) {
      isOrigin ? setOriginSuggestions([]) : setDestSuggestions([]);
      return;
    }

    // Clear previous timeout
    const timeoutRef = isOrigin ? originSearchTimeoutRef : destSearchTimeoutRef;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout untuk delay 500ms sebelum search
    timeoutRef.current = setTimeout(async () => {
      try {
        isOrigin ? setSearchingOrigin(true) : setSearchingDest(true);
        
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=id&limit=5`;
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'TiKum-App/1.0', // Nominatim require User-Agent
          }
        });

        // Check response status
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        // Parse JSON dengan error handling
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
          throw new Error('Respons server tidak valid, coba lagi');
        }

        // Handle empty result
        if (!Array.isArray(data) || data.length === 0) {
          isOrigin ? setOriginSuggestions([]) : setDestSuggestions([]);
          return;
        }

        const suggestions = data.map(item => ({
          name: item.display_name.split(',')[0], // Ambil nama pertama saja
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          fullName: item.display_name
        }));

        if (isOrigin) {
          setOriginSuggestions(suggestions);
        } else {
          setDestSuggestions(suggestions);
        }
      } catch (error) {
        console.error('Error searching location:', error);
        // Jangan tampilkan alert untuk setiap search, biar smooth UX
        // Alert.alert('Error', error.message || 'Gagal mencari lokasi');
      } finally {
        isOrigin ? setSearchingOrigin(false) : setSearchingDest(false);
      }
    }, 500); // Tunggu 500ms setelah user stop typing sebelum API call
  };

  const selectLocation = (location, isOrigin = true) => {
    if (isOrigin) {
      setOriginName(location.name);
      setOriginCoords({ latitude: location.latitude, longitude: location.longitude });
      setOriginSuggestions([]);
    } else {
      setDestinationName(location.name);
      setDestinationCoords({ latitude: location.latitude, longitude: location.longitude });
      setDestSuggestions([]);
    }
  };

  // Fetch OSRM route untuk preview
  const fetchOsrmRoute = async (fromPoint, toPoint) => {
    try {
      if (!fromPoint || !toPoint) return;

      const url = `https://router.project-osrm.org/route/v1/driving/${fromPoint.longitude},${fromPoint.latitude};${toPoint.longitude},${toPoint.latitude}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const json = await res.json();

      if (!json.routes || json.routes.length === 0) {
        throw new Error('Rute OSRM tidak ditemukan');
      }

      const selected = json.routes[0];
      const coords = selected.geometry.coordinates.map(([lon, lat]) => ({
        latitude: lat,
        longitude: lon,
      }));

      setPreviewRouteCoords(coords);
      setPreviewRouteSummary({
        distanceKm: (selected.distance / 1000).toFixed(1),
        durationMin: Math.ceil(selected.duration / 60),
      });
    } catch (error) {
      console.error('OSRM route error:', error);
    }
  };

  // Watch origin dan destination - fetch route preview saat keduanya dipilih
  useEffect(() => {
    if (originCoords && destinationCoords) {
      fetchOsrmRoute(originCoords, destinationCoords);
    } else {
      setPreviewRouteCoords([]);
      setPreviewRouteSummary(null);
    }
  }, [originCoords, destinationCoords]);

  // --- FUNGSI BUAT ROOM (CAPTAIN) ---
  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      // 1. Safety check
      if (!user || !user.id) {
        throw new Error("Sesi tidak valid, silakan login ulang.");
      }

      // 2. Validate location inputs
      if (!originCoords || !destinationCoords) {
        throw new Error('Asal dan tujuan harus dipilih dari pencarian lokasi.');
      }

      const parsedVehicleCount = Number(vehicleCount);
      if (Number.isNaN(parsedVehicleCount) || parsedVehicleCount < 1) {
        throw new Error('Jumlah kendaraan minimal 1.');
      }

      // 3. Generate PIN 6 digit acak
      const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();

      console.log('📍 Membuat room dengan PIN:', generatedPin);

      // 4. Simpan ke database Supabase
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

      if (error) {
        console.error('❌ Supabase Error:', error);
        throw new Error(error.message || 'Gagal menyimpan room ke database');
      }

      if (!data || data.length === 0) {
        throw new Error('Room berhasil dibuat tapi data tidak terambil');
      }

      const createdRoom = data[0];

      const { error: tripError } = await supabase
        .from('room_trips')
        .upsert([
          {
            room_id: createdRoom.id,
            origin_latitude: originCoords.latitude,
            origin_longitude: originCoords.longitude,
            destination_latitude: destinationCoords.latitude,
            destination_longitude: destinationCoords.longitude,
            vehicle_count: parsedVehicleCount,
          }
        ], { onConflict: 'room_id' });

      if (tripError) {
        console.warn('Trip setup tidak tersimpan ke room_trips:', tripError.message);
      }

      Alert.alert("✅ Sukses!", `Room dibuat dengan PIN: ${generatedPin}\nRute: ${originName} → ${destinationName}`);
      
      // 5. Navigasi ke MapScreen sambil membawa parameter (SEBELUM clear state!)
      navigation.navigate('Map', {
        roomId: createdRoom.id,
        pin: generatedPin,
        role: 'leader',
        origin: originCoords,
        destination: destinationCoords,
        originName,
        destinationName,
        vehicleCount: parsedVehicleCount,
        preloadedRoute: previewRouteCoords,
        preloadedSummary: previewRouteSummary,
      });

      // Clear modal state
      setCreateModalVisible(false);
      setOriginName('');
      setDestinationName('');
      setOriginCoords(null);
      setDestinationCoords(null);
      setVehicleCount('1');

    } catch (error) {
      console.error("❌ Create Room Error:", error);
      Alert.alert(
        "Gagal Membuat Room", 
        error.message || "Terjadi kesalahan yang tidak diketahui"
      );
    } finally {
      setLoading(false);
    }
  };

  // --- FUNGSI GABUNG ROOM (GUEST) ---
  const handleJoinRoom = async () => {
    if (pinInput.length !== 6) {
      Alert.alert("Validasi", "PIN harus terdiri dari 6 digit angka.");
      return;
    }
    
    if (!/^\d{6}$/.test(pinInput)) {
      Alert.alert("Validasi", "PIN hanya boleh berisi angka 0-9.");
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Mencari room dengan PIN:', pinInput);

      // 1. Cek apakah PIN ada di database dan aktif
      const { data, error } = await supabase
        .from('rooms')
        .select('id, is_active')
        .eq('room_pin', pinInput)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('❌ Supabase Error:', error);
        throw new Error(error.message || "PIN tidak ditemukan atau room sudah ditutup.");
      }

      if (!data) {
        throw new Error("PIN tidak ditemukan atau room sudah ditutup.");
      }

      let origin = null;
      let destination = null;
      let joinedVehicleCount = null;

      const { data: tripData, error: tripError } = await supabase
        .from('room_trips')
        .select('origin_latitude, origin_longitude, destination_latitude, destination_longitude, vehicle_count')
        .eq('room_id', data.id)
        .maybeSingle();

      if (!tripError && tripData) {
        origin = {
          latitude: tripData.origin_latitude,
          longitude: tripData.origin_longitude,
        };
        destination = {
          latitude: tripData.destination_latitude,
          longitude: tripData.destination_longitude,
        };
        joinedVehicleCount = tripData.vehicle_count;
      }

      // 2. Jika ketemu, tutup modal dan lempar ke Map
      setModalVisible(false);
      setPinInput('');
      Alert.alert("✅ Sukses!", "Berhasil bergabung dengan room");
      navigation.navigate('Map', {
        roomId: data.id,
        role: 'member',
        origin,
        destination,
        vehicleCount: joinedVehicleCount,
      });

    } catch (error) {
      console.error("❌ Join Room Error:", error);
      Alert.alert(
        "Gagal Gabung", 
        error.message || "Terjadi kesalahan yang tidak diketahui"
      );
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
            <Text style={styles.modalSubTitle}>Masukkan 6 digit PIN dari Leader</Text>
            
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
                <Text style={styles.textJoin}>{loading ? 'Cek...' : 'Gabung'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- MODAL SETUP TRIP LEADER --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentWide}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Setup Room Leader</Text>
              <Text style={styles.modalSubTitle}>Cari titik asal dan tujuan perjalanan</Text>

              {/* MAP PREVIEW */}
              {(originCoords || destinationCoords) && (
                <View style={styles.mapPreviewContainer}>
                  <MapView
                    style={styles.mapPreview}
                    initialRegion={{
                      latitude: originCoords?.latitude || destinationCoords?.latitude || -6.9175,
                      longitude: originCoords?.longitude || destinationCoords?.longitude || 107.6191,
                      latitudeDelta: 0.1,
                      longitudeDelta: 0.1,
                    }}
                  >
                    {/* Rute OSRM */}
                    {previewRouteCoords.length > 0 && (
                      <Polyline
                        coordinates={previewRouteCoords}
                        strokeColor="#1E88E5"
                        strokeWidth={4}
                      />
                    )}

                    {/* Marker Asal */}
                    {originCoords && (
                      <Marker coordinate={originCoords} title="Asal" pinColor="green" />
                    )}

                    {/* Marker Tujuan */}
                    {destinationCoords && (
                      <Marker coordinate={destinationCoords} title="Tujuan" pinColor="red" />
                    )}
                  </MapView>

                  {/* Info Rute */}
                  {previewRouteSummary && (
                    <View style={styles.routeInfoBox}>
                      <Text style={styles.routeInfoText}>
                        📏 {previewRouteSummary.distanceKm} km | ⏱️ {previewRouteSummary.durationMin} menit
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* ASAL */}
              <Text style={styles.inputLabel}>📍 Titik Asal</Text>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari lokasi asal (contoh: Cibadak)"
                  value={originName}
                  onChangeText={(text) => {
                    setOriginName(text);
                    searchLocation(text, true);
                  }}
                  editable={!loading}
                />
                {searchingOrigin && <ActivityIndicator style={styles.loadingIcon} color="#2196F3" />}
              </View>
              
              {originSuggestions.length > 0 && (
                <FlatList
                  data={originSuggestions}
                  keyExtractor={(item, idx) => `origin-${idx}`}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.suggestionItem}
                      onPress={() => selectLocation(item, true)}
                    >
                      <MaterialCommunityIcons name="map-marker" size={16} color="#2196F3" />
                      <Text style={styles.suggestionText}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}

              {originCoords && <Text style={styles.selectedText}>✓ {originName} dipilih</Text>}

              {/* TUJUAN */}
              <Text style={[styles.inputLabel, { marginTop: 15 }]}>🎯 Titik Tujuan</Text>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari lokasi tujuan (contoh: Sukabumi)"
                  value={destinationName}
                  onChangeText={(text) => {
                    setDestinationName(text);
                    searchLocation(text, false);
                  }}
                  editable={!loading}
                />
                {searchingDest && <ActivityIndicator style={styles.loadingIcon} color="#2196F3" />}
              </View>

              {destSuggestions.length > 0 && (
                <FlatList
                  data={destSuggestions}
                  keyExtractor={(item, idx) => `dest-${idx}`}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.suggestionItem}
                      onPress={() => selectLocation(item, false)}
                    >
                      <MaterialCommunityIcons name="map-marker" size={16} color="#F44336" />
                      <Text style={styles.suggestionText}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}

              {destinationCoords && <Text style={styles.selectedText}>✓ {destinationName} dipilih</Text>}

              {/* JUMLAH KENDARAAN */}
              <Text style={[styles.inputLabel, { marginTop: 15 }]}>🚗 Jumlah Kendaraan</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Contoh: 4"
                keyboardType="number-pad"
                value={vehicleCount}
                onChangeText={setVehicleCount}
                editable={!loading}
              />

              <View style={styles.modalAction}>
                <TouchableOpacity
                  style={[styles.btnModal, styles.btnCancel]}
                  onPress={() => {
                    setCreateModalVisible(false);
                    setOriginName('');
                    setDestinationName('');
                    setOriginCoords(null);
                    setDestinationCoords(null);
                  }}
                  disabled={loading}
                >
                  <Text style={styles.textCancel}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnModal, styles.btnJoin, !originCoords || !destinationCoords ? styles.btnDisabled : {}]}
                  onPress={handleCreateRoom}
                  disabled={loading || !originCoords || !destinationCoords}
                >
                  <Text style={styles.textJoin}>{loading ? 'Membuat...' : 'Buat Room'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.subText}>Halo 👋</Text>
          <Text style={styles.welcomeText}>{displayName}</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileCircle}
          onPress={() => navigation.navigate('Profile')}
        >
           <Text style={styles.profileInitial}>{profileInitial}</Text>
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
            onPress={() => setCreateModalVisible(true)}
            disabled={loading}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#2196F3' }]}>
              <MaterialCommunityIcons name="plus" size={28} color="white" />
            </View>
            <Text style={styles.actionText}>Buat Room</Text>
            <Text style={styles.actionSubText}>Jadi Leader</Text>
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
  profileInitial: { color: 'white', fontWeight: 'bold', fontSize: 16 },
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
  modalContentWide: { width: '92%', backgroundColor: 'white', borderRadius: 20, padding: 20 },
  inputLabel: { fontSize: 13, color: '#555', marginBottom: 6, marginTop: 6, fontWeight: '600' },
  formInput: { width: '100%', height: 46, backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 12, fontSize: 14, marginBottom: 4 },
  pinInput: { width: '100%', height: 50, backgroundColor: '#F5F5F5', borderRadius: 10, textAlign: 'center', fontSize: 24, fontWeight: 'bold', letterSpacing: 10, marginBottom: 20 },
  modalAction: { flexDirection: 'row', justifyContent: 'space-between' },
  btnModal: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  btnCancel: { backgroundColor: '#F5F5F5' },
  btnJoin: { backgroundColor: '#2196F3' },
  btnDisabled: { opacity: 0.5 },
  textJoin: { color: 'white', fontWeight: 'bold' },
  textCancel: { color: '#666' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  searchInput: { flex: 1, height: 45, backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 12, fontSize: 14, borderWidth: 1, borderColor: '#E0E0E0' },
  loadingIcon: { marginRight: 10 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#F9F9F9', marginBottom: 5, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#2196F3' },
  suggestionText: { marginLeft: 10, fontSize: 14, color: '#333', fontWeight: '500' },
  selectedText: { fontSize: 12, color: '#4CAF50', marginTop: 5, fontWeight: 'bold', marginBottom: 10 },
  mapPreviewContainer: { marginBottom: 15, borderRadius: 15, overflow: 'hidden', elevation: 2 },
  mapPreview: { width: '100%', height: 200 },
  routeInfoBox: { backgroundColor: '#E3F2FD', padding: 12, alignItems: 'center', borderBottomLeftRadius: 15, borderBottomRightRadius: 15 },
  routeInfoText: { fontSize: 14, color: '#1976D2', fontWeight: 'bold' }
});