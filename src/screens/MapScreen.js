import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '../lib/supabase'; // Pastikan path ini benar

export default function MapScreen({ route }) {
  // Ambil room_id dari navigasi (setelah buat/gabung room)
  const { roomId } = route.params || { roomId: 'GANTI_DENGAN_ID_TESTING' };
  
  const [myLocation, setMyLocation] = useState(null);
  const [friendsLocations, setFriendsLocations] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let subscription;

    // --- LOGIKA 1: Ambil Izin & Pantau Lokasi Kita (Watch Position) ---
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Izin akses lokasi ditolak');
        return;
      }

      // Pantau pergerakan setiap 5 meter
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5, 
        },
        async (location) => {
          const { latitude, longitude, heading } = location.coords;
          setMyLocation({ latitude, longitude, heading });

          // Kirim ke Supabase
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('locations').upsert({
              user_id: user.id,
              room_id: roomId,
              latitude,
              longitude,
              heading,
              updated_at: new Date(),
            });
          }
        }
      );
    })();

    // --- LOGIKA 2: Subscribe Lokasi Teman (Real-time) ---
    subscription = supabase
      .channel('public:locations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'locations' }, payload => {
          updateFriends(payload.new);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'locations' }, payload => {
          updateFriends(payload.new);
      })
      .subscribe();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);

  const updateFriends = (newLoc) => {
    setFriendsLocations((prev) => {
      const filtered = prev.filter(f => f.user_id !== newLoc.user_id);
      return [...filtered, newLoc];
    });
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: -6.9175, // Default Bandung/Sukabumi
          longitude: 107.6191,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* Render Motor Kita Sendiri */}
        {myLocation && (
          <Marker
            coordinate={myLocation}
            rotation={myLocation.heading} // Motor berputar sesuai arah jalan
            anchor={{ x: 0.5, y: 0.5 }}
          >
          <Image 
             source={require('../../assets/images/motor.png')} 
             style={{ width: 40, height: 40, resizeMode: 'contain' }} 
        />
          </Marker>
        )}

        {/* Render Motor Teman-teman (Treza dkk) */}
        {friendsLocations.map((friend) => (
          <Marker
            key={friend.user_id}
            coordinate={{ latitude: friend.latitude, longitude: friend.longitude }}
            rotation={friend.heading}
            title="Teman"
          >
            <Image 
             source={require('../../assets/images/teman.jpg')} 
             style={{ width: 40, height: 40, resizeMode: 'contain' }} 
        />
          </Marker>
        ))}
      </MapView>
      
      {/* Overlay Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>Room PIN: {roomId}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  infoBox: { position: 'absolute', top: 50, left: 20, backgroundColor: 'white', padding: 10, borderRadius: 10, elevation: 5 },
  infoText: { fontWeight: 'bold' }
});