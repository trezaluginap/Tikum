import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView from 'react-native-maps';

import { supabase } from '../../supabase';
import ConvoyDialog from '../components/common/ConvoyDialog';
import ConvoyToast from '../components/common/ConvoyToast';
import { ActiveTripsCard } from '../components/home/ActiveTripsCard';
import { CreateRoomModal } from '../components/home/CreateRoomModal';
import HistoryModal from '../components/home/HistoryModal';
import { HomeHeader } from '../components/home/HomeHeader';
import { JoinRoomModal } from '../components/home/JoinRoomModal';
import { TipsCard } from '../components/home/TipsCard';
import { colors, fonts, fontSize, radius, spacing } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useActiveTrips } from '../hooks/useActiveTrips';
import { useLocationSearch } from '../hooks/useLocationSearch';
import { useOsrmRoute } from '../hooks/useOsrmRoute';

const INDONESIA_REGION = {
  latitude: -2.5,
  longitude: 118.0,
  latitudeDelta: 30,
  longitudeDelta: 30,
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { t } = useLanguage();

  // ── Modals State ──
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // ── Loading ──
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  // ── Custom UI Dialogs & Toasts ──
  const [dialogConfig, setDialogConfig] = useState({ visible: false });
  const [toastConfig, setToastConfig] = useState({ visible: false });

  const showToast = (type, title, message, duration = 4000) => {
    setToastConfig({ visible: true, type, title, message });
    setTimeout(() => setToastConfig((prev) => ({ ...prev, visible: false })), duration);
  };

  // ── Vehicle & Routing ──
  const [vehicleCount, setVehicleCount] = useState(1);
  const [vehicleType, setVehicleType] = useState('motorcycle');
  const [useTolls, setUseTolls] = useState(true);

  const routingMode = vehicleType === 'motorcycle'
    ? 'motorcycle'
    : (useTolls ? 'auto_toll' : 'auto_no_toll');

  // ── Hooks ──
  const origin = useLocationSearch();
  const destination = useLocationSearch();
  const { routeCoords, routeSummary } = useOsrmRoute(origin.coords, destination.coords, routingMode);
  const { activeTrips, loading: tripsLoading } = useActiveTrips();

  // ── Reset on blur ──
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

  // ── Handlers ──
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
      let modeCode = vehicleType === 'motorcycle' ? 1 : (useTolls ? 2 : 3);
      const encodedVehicleCount = modeCode * 1000 + vehicleCount;

      await supabase
        .from('room_trips')
        .upsert([{
          room_id: createdRoom.id,
          origin_latitude: origin.coords.latitude,
          origin_longitude: origin.coords.longitude,
          destination_latitude: destination.coords.latitude,
          destination_longitude: destination.coords.longitude,
          vehicle_count: encodedVehicleCount,
        }], { onConflict: 'room_id' });

      setCreateModalVisible(false);
      const savedCoords = origin.coords;
      const savedDestCoords = destination.coords;
      const savedOriginName = origin.name;
      const savedDestName = destination.name;

      origin.clearAll();
      destination.clearAll();
      setVehicleCount(1);

      setDialogConfig({
        visible: true,
        type: 'success',
        icon: 'key-star',
        title: 'ROOM CONVOY AKTIF!',
        message: `PIN Room Kamu: ${generatedPin}\n\nBagikan 6 digit PIN di atas kepada anggota rombongan agar mereka bisa bergabung.`,
        buttons: [
          {
            text: 'MASUK KE ROOM TRIP',
            style: 'primary',
            onPress: () => {
              navigation.navigate('Map', {
                roomId: createdRoom.id,
                pin: generatedPin,
                role: 'leader',
                origin: savedCoords,
                destination: savedDestCoords,
                originName: savedOriginName,
                destinationName: savedDestName,
                vehicleCount: encodedVehicleCount,
                preloadedRoute: routeCoords,
                preloadedSummary: routeSummary,
              });
            },
          },
        ],
      });
    } catch (error) {
      setDialogConfig({
        visible: true,
        type: 'danger',
        icon: 'alert-circle',
        title: 'Gagal Membuat Room',
        message: error.message || 'Terjadi kesalahan saat memproses rute perjalanan.',
        buttons: [{ text: 'MENGERTI', style: 'primary' }],
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!/^\d{6}$/.test(pinInput)) {
      showToast('warning', 'Validasi PIN', 'PIN room harus terdiri dari 6 digit angka.');
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

      if (error || !data) throw new Error('PIN tidak ditemukan atau room perjalanan sudah ditutup.');

      const { data: tripData } = await supabase
        .from('room_trips')
        .select('origin_latitude, origin_longitude, destination_latitude, destination_longitude, vehicle_count')
        .eq('room_id', data.id)
        .maybeSingle();

      let joinOrigin = null, joinDestination = null, joinedVehicleCount = null;
      if (tripData) {
        joinOrigin = { latitude: tripData.origin_latitude, longitude: tripData.origin_longitude };
        joinDestination = { latitude: tripData.destination_latitude, longitude: tripData.destination_longitude };
        joinedVehicleCount = tripData.vehicle_count;
      }

      setJoinModalVisible(false);
      setPinInput('');
      showToast('success', 'Berhasil Bergabung!', 'Kamu telah terhubung ke radar rombongan.');
      navigation.navigate('Map', {
        roomId: data.id,
        role: 'member',
        origin: joinOrigin,
        destination: joinDestination,
        vehicleCount: joinedVehicleCount,
      });
    } catch (error) {
      setDialogConfig({
        visible: true,
        type: 'danger',
        icon: 'account-cancel',
        title: 'Gagal Bergabung',
        message: error.message || 'Periksa kembali 6 digit PIN room yang diberikan temanmu.',
        buttons: [{ text: 'COBA LAGI', style: 'primary' }],
      });
    } finally {
      setJoinLoading(false);
    }
  };

  const handleTripResume = (trip) => {
    const td = Array.isArray(trip.room_trips) ? trip.room_trips[0] : trip.room_trips;
    if (!td) return;
    navigation.navigate('Map', {
      roomId: trip.id,
      pin: trip.room_pin,
      role: 'leader',
      origin: { latitude: td.origin_latitude, longitude: td.origin_longitude },
      destination: { latitude: td.destination_latitude, longitude: td.destination_longitude },
      vehicleCount: td.vehicle_count,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Custom Overlays */}
      <ConvoyToast
        visible={toastConfig.visible}
        type={toastConfig.type}
        title={toastConfig.title}
        message={toastConfig.message}
        onClose={() => setToastConfig((prev) => ({ ...prev, visible: false }))}
      />
      <ConvoyDialog
        visible={dialogConfig.visible}
        type={dialogConfig.type}
        icon={dialogConfig.icon}
        title={dialogConfig.title}
        message={dialogConfig.message}
        buttons={dialogConfig.buttons}
        onClose={() => setDialogConfig({ visible: false })}
      />

      {/* Modals */}
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

      {/* Header */}
      <HomeHeader
        displayName={displayName}
        profileInitial={profileInitial}
        profilePhotoUrl={user?.user_metadata?.profile_photo_url || null}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.scrollInner}>
        {/* Map Radar View */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={INDONESIA_REGION}
            customMapStyle={mapDarkStyle}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
          />
          <View style={styles.mapOverlay}>
            <Text style={styles.mapOverlayText}>{t('home.radarTitle')}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
              <MaterialCommunityIcons name="rocket-launch" size={20} color={colors.primary} />
            </View>
            <Text style={styles.actionTitle}>{t('home.buatRoom')}</Text>
            <Text style={styles.actionDesc}>{t('home.buatRoomDesc')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setJoinModalVisible(true)}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
              <MaterialCommunityIcons name="account-group" size={20} color={colors.success} />
            </View>
            <Text style={styles.actionTitle}>{t('home.gabungRoom')}</Text>
            <Text style={styles.actionDesc}>{t('home.gabungRoomDesc')}</Text>
          </TouchableOpacity>
        </View>

        {/* Active Trips Card */}
        <View style={styles.sectionContainer}>
          <ActiveTripsCard
            activeTrips={activeTrips}
            loading={tripsLoading}
            onTripResume={handleTripResume}
            onHistoryPress={() => setHistoryModalVisible(true)}
          />
        </View>

        {/* Tips Card */}
        <View style={styles.sectionContainer}>
          <TipsCard />
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

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
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollInner: { paddingBottom: 20 },
  mapContainer: {
    height: 130,
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  map: { ...StyleSheet.absoluteFillObject },
  mapOverlay: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  mapOverlayText: { fontSize: 10, fontFamily: fonts.bold, color: colors.primaryMuted, letterSpacing: 0.5 },
  quickActions: { flexDirection: 'row', gap: spacing.md, marginHorizontal: spacing.xl, marginTop: spacing.md, marginBottom: spacing.sm },
  actionCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
  actionIcon: { width: 38, height: 38, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  actionTitle: { fontSize: fontSize.md, fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: 2 },
  actionDesc: { fontSize: 10, fontFamily: fonts.medium, color: colors.textMuted },
  sectionContainer: { paddingHorizontal: spacing.xl, marginTop: spacing.sm },
});