import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

// Pastikan path import benar
import { supabase } from '../../supabase';

const { width, height } = Dimensions.get('window');

export default function MapScreen({ route }) {
  const { roomId } = route.params || { roomId: null };
  
  const [myLocation, setMyLocation] = useState(null);
  const [friendsLocations, setFriendsLocations] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  // Fungsi untuk update state lokasi teman
  const updateFriends = (newLoc) => {
    setFriendsLocations((prev) => {
      const filtered = prev.filter(f => f.user_id !== newLoc.user_id);
      return [...filtered, newLoc];
    });
  };

  useEffect(() => {
    if (!supabase || !supabase.channel) return;

    let locationSubscription;
    let supabaseSubscription;

    const startTracking = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Izin lokasi ditolak');
        return;
      }

      // Memantau pergerakan user
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 2, // Update setiap 2 meter biar lebih smooth
        },
        async (location) => {
          const { latitude, longitude, heading } = location.coords;
          
          // Update state lokal agar marker motor muncul
          setMyLocation({ latitude, longitude, heading: heading || 0 });

          // Kirim ke database
          const { data: { user } } = await supabase.auth.getUser();
          if (user && roomId) {
            await supabase.from('locations').upsert({
              user_id: user.id,
              room_id: roomId,
              latitude,
              longitude,
              heading: heading || 0,
              updated_at: new Date(),
            });
          }
        }
      );
    };

    startTracking();

    // Subscribe Realtime Lokasi Teman
    supabaseSubscription = supabase
      .channel(`room_locations_${roomId}`)
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'locations',
          filter: `room_id=eq.${roomId}` 
        }, 
        (payload) => {
          if (payload.new) updateFriends(payload.new);
        }
      )
      .subscribe();

    return () => {
      if (locationSubscription) locationSubscription.remove();
      if (supabaseSubscription) supabase.removeChannel(supabaseSubscription);
    };
  }, [roomId]);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        // showsUserLocation dan followsUserLocation membantu memicu GPS HP
        showsUserLocation={true} 
        followsUserLocation={true}
        // Region ini yang bikin peta otomatis fokus ke posisi motor kamu
        region={myLocation ? {
          latitude: myLocation.latitude,
          longitude: myLocation.longitude,
          latitudeDelta: 0.005, // Level zoom yang enak buat liat jalan
          longitudeDelta: 0.005,
        } : {
          latitude: -6.9175, 
          longitude: 107.6191,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* Render Motor Kamu */}
        {myLocation && (
          <Marker
            coordinate={{
              latitude: myLocation.latitude,
              longitude: myLocation.longitude
            }}
            rotation={myLocation.heading}
            anchor={{ x: 0.5, y: 0.5 }}
            title="Saya"
          >
            <Image 
              source={require('../../assets/images/motor.png')} 
              style={styles.motorIcon} 
            />
          </Marker>
        )}

        {/* Render Motor Teman */}
        {friendsLocations.map((friend) => (
          <Marker
            key={friend.user_id}
            coordinate={{ latitude: friend.latitude, longitude: friend.longitude }}
            rotation={friend.heading}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <Image 
              source={require('../../assets/images/teman.jpg')} 
              style={styles.friendIcon} 
            />
          </Marker>
        ))}
      </MapView>
      
      {/* Overlay Status */}
      <View style={styles.infoBox}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: myLocation ? '#4CAF50' : '#FF5252' }]} />
          <Text style={styles.infoText}>GPS: {myLocation ? 'Aktif' : 'Mencari...'}</Text>
        </View>
        <Text style={styles.infoSubText}>PIN: {roomId?.substring(0, 8)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: width, height: height },
  infoBox: { 
    position: 'absolute', 
    top: 50, 
    left: 20, 
    backgroundColor: 'white', 
    padding: 12, 
    borderRadius: 15, 
    elevation: 5,
    minWidth: 120
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  infoText: { fontWeight: 'bold', fontSize: 13, color: '#333' },
  infoSubText: { fontSize: 11, color: '#666' },
  motorIcon: { width: 50, height: 50, resizeMode: 'contain' },
  friendIcon: { width: 40, height: 40, resizeMode: 'contain', borderRadius: 20, borderWidth: 2, borderColor: 'white' }
});