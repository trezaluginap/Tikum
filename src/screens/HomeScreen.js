import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView from 'react-native-maps';

import { supabase } from '../../supabase';
import { useAuth } from '../contexts/AuthContext';
import { ActiveTripsCard } from '../components/home/ActiveTripsCard';
import { CreateRoomModal } from '../components/home/CreateRoomModal';
import { HomeHeader } from '../components/home/HomeHeader';
import HistoryModal from '../components/home/HistoryModal';
import { JoinRoomModal } from '../components/home/JoinRoomModal';
import { TipsCard } from '../components/home/TipsCard';
import { colors, fonts, fontSize, radius, spacing } from '../constants/theme';
import { useActiveTrips } from '../hooks/useActiveTrips';
import { useLocationSearch } from '../hooks/useLocationSearch';
import { useOsrmRoute } from '../hooks/useOsrmRoute';

// Default region Indonesia
const INDONESIA_REGION = {
  latitude: -2.5,
  longitude: 118.0,
  latitudeDelta: 30,
  longitudeDelta: 30,
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  // ── Modals ──
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // ── Loading (split) ──
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  // ── Vehicle & Routing ──
  const [vehicleCount, setVehicleCount] = useState(1);
  const [vehicleType, setVehicleType] = useState('motorcycle'); // 'motorcycle' | 'car'
  const [useTolls, setUseTolls] = useState(true);

  const routingMode = vehicleType === 'motorcycle'
    ? 'motorcycle'
    : (useTolls ? 'auto_toll' : 'auto_no_toll');

  // ── Hooks ──
  const origin = useLocationSearch();
  const destination = useLocationSearch();
  const { routeCoords, routeSummary } = useOsrmRoute(origin.coords, destination.coords, routingMode);
  const { activeTrips, loading: tripsLoading } = useActiveTrips();

  // ── Animations ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ── Reset saat keluar ──
  useFocusEffect(
    useCallback(() => {
      return () => {
        origin.clearAll();
        destination.clearAll();
        setVehicleCount(1);
        setVehicleType('motorcycle');
        setUseTolls(true);
        setPinInput('');
      };
    }, [])
  );

  const displayName = user?.user_metadata?.display_name || 'Pengguna';
  const profileInitial = displayName.substring(0, 2).toUpperCase();
  const isCreateReady = !!origin.coords && !!destination.coords && !createLoading;

  // ── Handler: Buat Room ──
  const handleCreateRoom = async () => {
    setCreateLoading(true);
    try {
      if (!user?.id) throw new Error('Sesi tidak valid, silakan login ulang.');
      if (!origin.coords || !destination.coords) throw new Error('Asal dan tujuan harus dipilih.');

      const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
      const { data, error } = await supabase
        .from('rooms')
        .insert([{ room_pin: generatedPin, host_id: user.id, is_active: true }])
        .select();

      if (error) throw new Error(error.message);
      if (!data?.length) throw new Error('Room dibuat tapi data tidak terambil');

      const createdRoom = data[0];

      // Encode routing mode into vehicle_count: modeCode * 1000 + count
      let modeCode = 2; // default auto_toll
      if (vehicleType === 'motorcycle') modeCode = 1;
      else if (!useTolls) modeCode = 3;
      const encodedVehicleCount = modeCode * 1000 + vehicleCount;

      const { error: tripError } = await supabase
        .from('room_trips')
        .upsert([{
          room_id: createdRoom.id,
          origin_latitude: origin.coords.latitude,
          origin_longitude: origin.coords.longitude,
          destination_latitude: destination.coords.latitude,
          destination_longitude: destination.coords.longitude,
          vehicle_count: encodedVehicleCount,
        }], { onConflict: 'room_id' });

      if (tripError) console.warn('Trip setup error:', tripError.message);

      Alert.alert('✅ Sukses!', `Room dibuat!\nPIN: ${generatedPin}`);

      navigation.navigate('Map', {
        roomId: createdRoom.id,
        pin: generatedPin,
        role: 'leader',
        origin: origin.coords,
        destination: destination.coords,
        originName: origin.name,
        destinationName: destination.name,
        vehicleCount: encodedVehicleCount,
        preloadedRoute: routeCoords,
        preloadedSummary: routeSummary,
      });

      setCreateModalVisible(false);
      origin.clearAll();
      destination.clearAll();
      setVehicleCount(1);
      setVehicleType('motorcycle');
      setUseTolls(true);
    } catch (error) {
      Alert.alert('Gagal Membuat Room', error.message);
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Handler: Gabung Room ──
  const handleJoinRoom = async () => {
    if (!/^\d{6}$/.test(pinInput)) {
      Alert.alert('Validasi', 'PIN harus 6 digit angka.');
      return;
    }
    setJoinLoading(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, is_active')
        .eq('room_pin', pinInput)
        .eq('is_active', true)
        .single();

      if (error || !data) throw new Error('PIN tidak ditemukan atau room ditutup.');

      const { data: tripData, error: tripError } = await supabase
        .from('room_trips')
        .select('origin_latitude, origin_longitude, destination_latitude, destination_longitude, vehicle_count')
        .eq('room_id', data.id)
        .maybeSingle();

      let joinOrigin = null, joinDestination = null, joinedVehicleCount = null;
      if (!tripError && tripData) {
        joinOrigin = { latitude: tripData.origin_latitude, longitude: tripData.origin_longitude };
        joinDestination = { latitude: tripData.destination_latitude, longitude: tripData.destination_longitude };
        joinedVehicleCount = tripData.vehicle_count;
      }

      setJoinModalVisible(false);
      setPinInput('');
      Alert.alert('✅ Sukses!', 'Berhasil bergabung!');
      navigation.navigate('Map', {
        roomId: data.id,
        role: 'member',
        origin: joinOrigin,
        destination: joinDestination,
        vehicleCount: joinedVehicleCount,
      });
    } catch (error) {
      Alert.alert('Gagal Gabung', error.message);
    } finally {
      setJoinLoading(false);
    }
  };

  // ── Handler: Resume trip ──
  const handleTripResume = (trip) => {
    const td = Array.isArray(trip.room_trips) ? trip.room_trips[0] : trip.room_trips;
    if (!td) {
      Alert.alert('Data Tidak Lengkap', 'Detail rute perjalanan tidak ditemukan. Coba buat room baru.');
      return;
    }
    navigation.navigate('Map', {
      roomId: trip.id,
      pin: trip.room_pin,
      role: 'leader',
      origin: { latitude: td.origin_latitude, longitude: td.origin_longitude },
      destination: { latitude: td.destination_latitude, longitude: td.destination_longitude },
      vehicleCount: td.vehicle_count,
    });
  };

  // ─────────────────────────────────
  //  RENDER
  // ─────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* ── MODALS ── */}
      <CreateRoomModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        origin={origin}
        destination={destination}
        vehicleCount={vehicleCount}
        onDecrement={() => setVehicleCount((v) => Math.max(1, v - 1))}
        onIncrement={() => setVehicleCount((v) => Math.min(99, v + 1))}
        routeCoords={routeCoords}
        routeSummary={routeSummary}
        onCreateRoom={handleCreateRoom}
        loading={createLoading}
        isReady={isCreateReady}
        vehicleType={vehicleType}
        onVehicleTypeChange={setVehicleType}
        useTolls={useTolls}
        onUseTollsChange={setUseTolls}
      />
      <JoinRoomModal
        visible={joinModalVisible}
        onClose={() => { setJoinModalVisible(false); setPinInput(''); }}
        pinInput={pinInput}
        onPinChange={setPinInput}
        onJoin={handleJoinRoom}
        loading={joinLoading}
      />
      <HistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
      />

      {/* ── HEADER ── */}
      <HomeHeader
        displayName={displayName}
        profileInitial={profileInitial}
        profilePhotoUrl={user?.user_metadata?.profile_photo_url || null}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
      >
        {/* ══ MAP — ALWAYS VISIBLE ══ */}
        <Animated.View style={[styles.mapContainer, { opacity: fadeAnim }]}>
          <MapView
            style={styles.map}
            initialRegion={INDONESIA_REGION}
            customMapStyle={mapDarkStyle}
          />
          <View style={styles.mapOverlay}>
            <Text style={styles.mapOverlayText}>🇮🇩 Indonesia</Text>
          </View>
        </Animated.View>

        {/* ══ QUICK ACTIONS ══ */}
        <Animated.View style={[styles.quickActions, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
              <MaterialCommunityIcons name="rocket-launch" size={24} color={colors.primary} />
            </View>
            <Text style={styles.actionTitle}>Buat Room</Text>
            <Text style={styles.actionDesc}>Atur rute convoy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setJoinModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
              <MaterialCommunityIcons name="account-group" size={24} color={colors.success} />
            </View>
            <Text style={styles.actionTitle}>Gabung Room</Text>
            <Text style={styles.actionDesc}>Masukkan PIN</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ══ ACTIVE TRIPS ══ */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], paddingHorizontal: spacing.lg }}>
          <ActiveTripsCard
            activeTrips={activeTrips}
            loading={tripsLoading}
            onTripResume={handleTripResume}
            onHistoryPress={() => setHistoryModalVisible(true)}
          />
        </Animated.View>

        {/* ══ TIPS ══ */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], paddingHorizontal: spacing.lg }}>
          <TipsCard />
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Dark map style (Google Maps) ──
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingBottom: 30,
  },

  // Map
  mapContainer: {
    height: 200,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.mapOverlay,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.sm,
  },
  mapOverlayText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionTitle: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  actionDesc: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },

  // Sections below quick actions get horizontal padding
  sectionPadding: {
    paddingHorizontal: spacing.lg,
  },
});