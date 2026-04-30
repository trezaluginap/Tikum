import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  Platform,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { supabase } from '../../supabase';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts, fontSize, radius, spacing } from '../constants/theme';

// Dark map style
const mapDarkStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#0e1626' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
];

export default function MapScreen({ route, navigation }) {
  const {
    roomId, pin, origin, destination,
    originName, destinationName,
    vehicleCount, role,
    preloadedRoute, preloadedSummary,
  } = route.params || {};

  const { user } = useAuth();
  const mapRef = useRef(null);
  const [myLocation, setMyLocation] = useState(null);
  const [friendsLocations, setFriendsLocations] = useState([]);
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [initialRegion, setInitialRegion] = useState({
    latitude: -6.9175, longitude: 107.6191,
    latitudeDelta: 0.1, longitudeDelta: 0.1,
  });

  const displayName = user?.user_metadata?.display_name || 'Pengguna';

  // ── Init: preloaded route + region ──
  useEffect(() => {
    if (preloadedRoute?.length > 0) {
      setRouteCoords(preloadedRoute);
      if (preloadedSummary) setRouteSummary(preloadedSummary);
    }
    if (origin && destination) {
      const minLat = Math.min(origin.latitude, destination.latitude);
      const maxLat = Math.max(origin.latitude, destination.latitude);
      const minLng = Math.min(origin.longitude, destination.longitude);
      const maxLng = Math.max(origin.longitude, destination.longitude);
      setInitialRegion({
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max((maxLat - minLat) * 1.3, 0.1),
        longitudeDelta: Math.max((maxLng - minLng) * 1.3, 0.1),
      });
    }
  }, []);

  // ── Location tracking + Supabase realtime ──
  useEffect(() => {
    let subscriptionLocations;
    let subscriptionRooms;
    let locationWatcher;
    const currentUserId = user?.id;

    (async () => {
      try {
        if (!currentUserId) { setErrorMsg('User tidak terautentikasi'); return; }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setErrorMsg('Izin lokasi ditolak'); return; }
        if (!roomId) return;

        // Watch position
        locationWatcher = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 5 },
          async (location) => {
            const { latitude, longitude, heading } = location.coords;
            setMyLocation({ latitude, longitude, heading });

            try {
              await supabase.from('locations').upsert({
                user_id: currentUserId,
                room_id: roomId,
                latitude, longitude, heading,
                display_name: displayName,
                updated_at: new Date(),
              });
            } catch (err) {
              console.error('Location update error:', err);
            }
          }
        );

        // Realtime subscription (Locations)
        subscriptionLocations = supabase
          .channel(`room:${roomId}:locations`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, payload => {
            if (payload.event === 'DELETE') {
               setFriendsLocations(prev => prev.filter(f => f.user_id !== payload.old?.user_id));
            } else if (payload.new?.room_id === roomId && payload.new?.user_id !== currentUserId) {
              updateFriends(payload.new);
            }
          })
          .subscribe();

        // Realtime subscription (Rooms - Auto Kick)
        subscriptionRooms = supabase
          .channel(`room:${roomId}:status`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, payload => {
             if (payload.new && payload.new.is_active === false) {
                Alert.alert('Room Ditutup', 'Perjalanan telah diselesaikan oleh Leader.', [
                   { text: 'OK', onPress: () => navigation.navigate('Home') } // atau goBack() depending on nav stack
                ]);
             }
          })
          .subscribe();

      } catch (error) {
        console.error('Map init error:', error);
        setErrorMsg('Gagal menginisialisasi peta');
      }
    })();

    return () => {
      if (subscriptionLocations) supabase.removeChannel(subscriptionLocations);
      if (subscriptionRooms) supabase.removeChannel(subscriptionRooms);
      if (locationWatcher) locationWatcher.remove();
    };
  }, [roomId]);

  const updateFriends = (newLoc) => {
    setFriendsLocations((prev) => {
      if (!newLoc?.user_id) return prev;
      const filtered = prev.filter(f => f.user_id !== newLoc.user_id);
      return [...filtered, newLoc];
    });
  };

  // ── OSRM route fetch (if not preloaded) ──
  useEffect(() => {
    if (routeCoords.length > 0) return;
    if (origin && destination) {
      (async () => {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          const json = await res.json();
          if (!json.routes?.length) throw new Error('Rute tidak ditemukan');
          const sel = json.routes[0];
          setRouteCoords(sel.geometry.coordinates.map(([lon, lat]) => ({ latitude: lat, longitude: lon })));
          setRouteSummary({ distanceKm: (sel.distance / 1000).toFixed(1), durationMin: Math.ceil(sel.duration / 60) });
        } catch (err) { console.error('OSRM error:', err); }
      })();
    }
  }, [origin, destination]);

  // ── Fit map to route ──
  useEffect(() => {
    if (mapRef.current && routeCoords.length > 0) {
      try {
        mapRef.current.fitToCoordinates(routeCoords, {
          edgePadding: { top: 120, right: 50, bottom: 280, left: 50 },
          animated: true,
        });
      } catch (err) { console.error('fitToCoordinates error:', err); }
    }
  }, [routeCoords]);

  // ── Handlers ──
  const handleCopyPin = async () => {
    if (!pin) return;
    await Clipboard.setStringAsync(pin);
    if (Platform.OS === 'android') {
      ToastAndroid.show('PIN disalin!', ToastAndroid.SHORT);
    } else {
      Alert.alert('Disalin', `PIN ${pin} berhasil disalin`);
    }
  };

  const handleLeaveRoom = () => {
    if (role === 'leader') {
      Alert.alert('Selesaikan Perjalanan?', 'Ini akan menutup room dan mengakhiri sesi convoy untuk semua member.', [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Selesaikan', 
          style: 'destructive', 
          onPress: async () => {
            try {
              // Hapus lokasi leader
              if (user?.id) {
                 await supabase.from('locations').delete().eq('user_id', user.id).eq('room_id', roomId);
              }
              // Nonaktifkan room di Supabase
              await supabase
                .from('rooms')
                .update({ is_active: false, updated_at: new Date() })
                .eq('id', roomId);
              
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Gagal menutup room.');
            }
          } 
        },
      ]);
    } else {
      Alert.alert('Keluar Room?', 'Kamu akan keluar dari pemantauan radar ini.', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Keluar', style: 'destructive', onPress: async () => {
            try {
               if (user?.id) {
                  await supabase.from('locations').delete().eq('user_id', user.id).eq('room_id', roomId);
               }
               navigation.goBack();
            } catch (error) {
               console.error('Error delete location', error);
               navigation.goBack();
            }
        } },
      ]);
    }
  };

  const handleRecenter = () => {
    if (!mapRef.current) return;
    if (routeCoords.length > 0) {
      mapRef.current.fitToCoordinates(routeCoords, {
        edgePadding: { top: 120, right: 50, bottom: 280, left: 50 },
        animated: true,
      });
    } else if (myLocation) {
      mapRef.current.animateToRegion({
        ...myLocation, latitudeDelta: 0.01, longitudeDelta: 0.01,
      }, 500);
    }
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    // Rumus Haversine
    const R = 6371; // Radius bumi dalam km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; 
    return distance.toFixed(1); // satu desimal
  };

  const memberCount = friendsLocations.length + 1; // +1 untuk diri sendiri

  // ─────────────────────────────
  //  RENDER
  // ─────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* ══ MAP ══ */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        customMapStyle={mapDarkStyle}
      >
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={4} />
        )}

        {origin && (
          <Marker coordinate={origin} title={originName || 'Asal'}>
            <View style={styles.markerOrigin}>
              <MaterialCommunityIcons name="flag-variant" size={16} color={colors.success} />
            </View>
          </Marker>
        )}

        {destination && (
          <Marker coordinate={destination} title={destinationName || 'Tujuan'}>
            <View style={styles.markerDest}>
              <MaterialCommunityIcons name="flag-checkered" size={16} color={colors.danger} />
            </View>
          </Marker>
        )}

        {/* User location marker */}
        {myLocation && (
          <Marker coordinate={myLocation} rotation={myLocation.heading} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.myMarkerWrap}>
              <View style={styles.myMarkerDot}>
                <MaterialCommunityIcons name="navigation" size={18} color={colors.white} />
              </View>
              <View style={styles.markerLabel}>
                <Text style={styles.markerLabelText}>Kamu</Text>
              </View>
            </View>
          </Marker>
        )}

        {/* Friend markers with display name */}
        {friendsLocations.map((friend) => (
          <Marker
            key={friend.user_id}
            coordinate={{ latitude: friend.latitude, longitude: friend.longitude }}
            rotation={friend.heading}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.friendMarkerWrap}>
              <View style={styles.friendMarkerDot}>
                <MaterialCommunityIcons name="account" size={16} color={colors.white} />
              </View>
              <View style={styles.markerLabel}>
                <Text style={styles.markerLabelText} numberOfLines={1}>
                  {friend.display_name || 'Member'}
                </Text>
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* ══ TOP BAR ══ */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarBtn} onPress={handleLeaveRoom}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>TiKum</Text>
          {pin && (
            <TouchableOpacity style={styles.pinBadge} onPress={handleCopyPin} activeOpacity={0.7}>
              <Text style={styles.pinBadgeLabel}>PIN</Text>
              <Text style={styles.pinBadgeValue}>{pin}</Text>
              <MaterialCommunityIcons name="content-copy" size={12} color={colors.primaryMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.topBarBtn} onPress={handleRecenter}>
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ══ BOTTOM PANEL ══ */}
      <View style={styles.bottomPanel}>
        {/* Route Info */}
        {routeSummary && (
          <View style={styles.routeRow}>
            <View style={styles.routeStat}>
              <MaterialCommunityIcons name="map-marker-distance" size={16} color={colors.primary} />
              <Text style={styles.routeStatText}>{routeSummary.distanceKm} km</Text>
            </View>
            <View style={styles.routeDivider} />
            <View style={styles.routeStat}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={colors.primary} />
              <Text style={styles.routeStatText}>{routeSummary.durationMin} min</Text>
            </View>
            <View style={styles.routeDivider} />
            <View style={styles.routeStat}>
              <MaterialCommunityIcons name="account-group" size={16} color={colors.primary} />
              <Text style={styles.routeStatText}>{memberCount} member</Text>
            </View>
            {vehicleCount && (
              <>
                <View style={styles.routeDivider} />
                <View style={styles.routeStat}>
                  <MaterialCommunityIcons name="car-multiple" size={16} color={colors.primary} />
                  <Text style={styles.routeStatText}>{vehicleCount} mobil</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Route names */}
        {(originName || destinationName) && (
          <View style={styles.routeNames}>
            <View style={styles.routeNameRow}>
              <View style={[styles.routeDot, { backgroundColor: colors.success }]} />
              <Text style={styles.routeNameText} numberOfLines={1}>{originName || 'Titik Asal'}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={14} color={colors.textMuted} />
            <View style={styles.routeNameRow}>
              <View style={[styles.routeDot, { backgroundColor: colors.danger }]} />
              <Text style={styles.routeNameText} numberOfLines={1}>{destinationName || 'Tujuan'}</Text>
            </View>
          </View>
        )}

        {/* Members list */}
        <View style={styles.membersSection}>
          <Text style={styles.membersSectionTitle}>ANGGOTA CONVOY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersList}>
            {/* Self */}
            <View style={styles.memberChip}>
              <View style={[styles.memberAvatar, { backgroundColor: 'rgba(99,102,241,0.2)' }]}>
                <MaterialCommunityIcons name="navigation" size={14} color={colors.primary} />
              </View>
              <View style={{ alignItems: 'center' }}>
                 <Text style={styles.memberName}>Kamu</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
            </View>

            {/* Friends */}
            {friendsLocations.map((friend) => {
              const distance = myLocation && friend.latitude ? getDistance(myLocation.latitude, myLocation.longitude, friend.latitude, friend.longitude) : '?';
              return (
                <View key={friend.user_id} style={styles.memberChip}>
                  <View style={[styles.memberAvatar, { backgroundColor: 'rgba(16,185,129,0.2)' }]}>
                    <MaterialCommunityIcons name="account" size={14} color={colors.success} />
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {friend.display_name || 'Member'}
                    </Text>
                    <Text style={styles.memberDistance}>{distance} km dari kamu</Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                </View>
              );
            })}

            {friendsLocations.length === 0 && (
              <View style={styles.waitingChip}>
                <MaterialCommunityIcons name="account-clock" size={14} color={colors.textMuted} />
                <Text style={styles.waitingText}>Menunggu member...</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* ══ ERROR ══ */}
      {errorMsg && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map: { ...StyleSheet.absoluteFillObject },

  // ── Top Bar ──
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + 16,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(15,23,42,0.85)',
    zIndex: 40,
  },
  topBarBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.cardElevated,
    justifyContent: 'center', alignItems: 'center',
  },
  topBarCenter: { alignItems: 'center', gap: spacing.xs },
  topBarTitle: {
    fontSize: fontSize.lg, fontFamily: fonts.black, color: colors.primary, letterSpacing: -0.5,
  },
  pinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: 'rgba(99,102,241,0.12)',
    paddingVertical: 3, paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.full,
  },
  pinBadgeLabel: { fontSize: 9, fontFamily: fonts.bold, color: colors.primaryMuted, letterSpacing: 1 },
  pinBadgeValue: { fontSize: fontSize.sm, fontFamily: fonts.extraBold, color: colors.primary },

  // ── Markers ──
  myMarkerWrap: { alignItems: 'center' },
  myMarkerDot: {
    width: 32, height: 32, borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: colors.white,
    elevation: 6,
  },
  friendMarkerWrap: { alignItems: 'center' },
  friendMarkerDot: {
    width: 28, height: 28, borderRadius: radius.full,
    backgroundColor: colors.success,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.white,
    elevation: 4,
  },
  markerLabel: {
    backgroundColor: 'rgba(15,23,42,0.8)',
    paddingVertical: 2, paddingHorizontal: 6,
    borderRadius: radius.sm, marginTop: 2, maxWidth: 80,
  },
  markerLabelText: {
    fontSize: 9, fontFamily: fonts.semiBold, color: colors.white, textAlign: 'center',
  },

  markerOrigin: {
    width: 30, height: 30, borderRadius: radius.full,
    backgroundColor: 'rgba(16,185,129,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.success,
  },
  markerDest: {
    width: 30, height: 30, borderRadius: radius.full,
    backgroundColor: 'rgba(239,68,68,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.danger,
  },

  // ── Bottom Panel ──
  bottomPanel: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingTop: spacing.lg, paddingBottom: spacing.xl + 8,
    paddingHorizontal: spacing.xl,
    zIndex: 30,
  },
  routeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.md, marginBottom: spacing.md,
  },
  routeStat: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  routeStatText: { fontSize: fontSize.sm, fontFamily: fonts.semiBold, color: colors.textPrimary },
  routeDivider: { width: 1, height: 14, backgroundColor: colors.border },

  routeNames: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardElevated,
    borderRadius: radius.md, paddingHorizontal: spacing.md,
  },
  routeNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeNameText: { fontSize: fontSize.xs, fontFamily: fonts.medium, color: colors.textSecondary, flex: 1 },

  // ── Members ──
  membersSection: {},
  membersSectionTitle: {
    fontSize: fontSize.xs, fontFamily: fonts.semiBold, color: colors.textMuted,
    letterSpacing: 1, marginBottom: spacing.sm,
  },
  membersList: { gap: spacing.sm },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.cardElevated,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  memberAvatar: {
    width: 24, height: 24, borderRadius: radius.full,
    justifyContent: 'center', alignItems: 'center',
  },
  memberName: { fontSize: fontSize.sm, fontFamily: fonts.medium, color: colors.textPrimary, maxWidth: 80 },
  memberDistance: { fontSize: 9, fontFamily: fonts.medium, color: colors.textMuted },
  statusDot: { width: 6, height: 6, borderRadius: 3 },

  waitingChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
  },
  waitingText: { fontSize: fontSize.xs, fontFamily: fonts.regular, color: colors.textMuted },

  // ── Error ──
  errorBanner: {
    position: 'absolute', top: 100, left: spacing.xl, right: spacing.xl,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.dangerLight, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    zIndex: 50,
  },
  errorText: { fontSize: fontSize.sm, fontFamily: fonts.medium, color: colors.danger, flex: 1 },
});