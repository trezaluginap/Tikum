import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TiKumMap from '../components/map/TiKumMap';

import { createRoom, joinRoom } from '../api/rooms.api';
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

      const modeCode = vehicleType === 'motorcycle' ? 1 : (useTolls ? 2 : 3);
      const created = await createRoom({
        origin_name: origin.name || 'Lokasi asal',
        origin_latitude: origin.coords.latitude,
        origin_longitude: origin.coords.longitude,
        destination_name: destination.name || 'Lokasi tujuan',
        destination_latitude: destination.coords.latitude,
        destination_longitude: destination.coords.longitude,
        vehicle_type: vehicleType,
        use_tolls: useTolls,
        vehicle_count: vehicleCount,
        route_distance_km: routeSummary?.distanceKm ? Number(routeSummary.distanceKm) : undefined,
        route_duration_min: routeSummary?.durationMin ? Number(routeSummary.durationMin) : undefined,
      });
      const createdRoom = created.room;

      const generatedPin = createdRoom?.room_pin;
      const encodedVehicleCount = modeCode * 1000 + vehicleCount;
      if (!createdRoom?.id || !generatedPin) throw new Error('Response room Laravel tidak valid.');

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
                tourSessionId: created.session?.id || createdRoom.session?.id || createdRoom.active_session_id || createdRoom.id,
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
      const joined = await joinRoom(pinInput);
      const room = joined.room;
      const tripData = joined.trip;
      if (!room?.id) throw new Error('Response join room Laravel tidak valid.');

      const tourSessionId = joined.session?.id || room.session?.id || room.active_session_id || room.id;
      const joinOrigin = tripData ? { latitude: Number(tripData.origin_latitude), longitude: Number(tripData.origin_longitude) } : null;
      const joinDestination = tripData ? { latitude: Number(tripData.destination_latitude), longitude: Number(tripData.destination_longitude) } : null;
      const joinedVehicleCount = tripData?.vehicle_count || null;

      setJoinModalVisible(false);
      setPinInput('');
      showToast('success', 'Berhasil Bergabung!', 'Kamu telah terhubung ke radar rombongan.');
      navigation.navigate('Map', {
        roomId: room.id,
        tourSessionId: tourSessionId,
        pin: pinInput,
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
    const td = Array.isArray(trip.room_trips) ? trip.room_trips[0] : (trip.trip || trip.room_trips);
    if (!td) return;
    navigation.navigate('Map', {
      roomId: trip.id,
      tourSessionId: trip.session?.id || trip.active_session_id || trip.id,
      pin: trip.room_pin,
      role: 'leader',
      origin: { latitude: Number(td.origin_latitude), longitude: Number(td.origin_longitude) },
      destination: { latitude: Number(td.destination_latitude), longitude: Number(td.destination_longitude) },
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
          <TiKumMap
            style={styles.map}
            initialRegion={INDONESIA_REGION}
          />
          <View style={styles.mapOverlay}>
            <Text style={styles.mapOverlayText}>{t('home.radarLocal')}</Text>
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