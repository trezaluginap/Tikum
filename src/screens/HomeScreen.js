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
import ConvoyDialog from '../components/common/ConvoyDialog';
import ConvoyToast from '../components/common/ConvoyToast';
import { useActiveTrips } from '../hooks/useActiveTrips';
import { useLocationSearch } from '../hooks/useLocationSearch';
import { useOsrmRoute } from '../hooks/useOsrmRoute';

import { VIRAL_SPOTS } from '../constants/viralSpots';
import { useLanguage } from '../contexts/LanguageContext';

// Default region Indonesia
const INDONESIA_REGION = {
  latitude: -2.5,
  longitude: 118.0,
  latitudeDelta: 30,
  longitudeDelta: 30,
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const { locale, changeLocale, t } = useLanguage();

  // ── Tab Navigation State ──
  const [activeTab, setActiveTab] = useState('radar'); // 'radar' | 'destinasi' | 'stats' | 'settings'

  // ── Modals ──
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // ── Loading (split) ──
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  // ── Settings Toggles State ──
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeMap, setDarkModeMap] = useState(true);

  // ── Custom UI Notifications & Dialogs ──
  const [dialogConfig, setDialogConfig] = useState({ visible: false });
  const [toastConfig, setToastConfig] = useState({ visible: false });

  const showToast = (type, title, message, duration = 4000) => {
    setToastConfig({ visible: true, type, title, message });
    setTimeout(() => setToastConfig((prev) => ({ ...prev, visible: false })), duration);
  };

  // ── Vehicle & Routing ──
  const [vehicleCount, setVehicleCount] = useState(1);
  const [vehicleType, setVehicleType] = useState('motorcycle'); // 'motorcycle' | 'car'
  const [useTolls, setUseTolls] = useState(true);

  const routingMode = vehicleType === 'motorcycle'
    ? 'motorcycle'
    : (useTolls ? 'auto_toll' : 'auto_no_toll');

  // ── Weather State & Fetcher ──
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const fetchWeather = async () => {
    setWeatherLoading(true);
    try {
      const lat = origin.coords?.latitude || -6.2088;
      const lon = origin.coords?.longitude || 106.8456;
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      const json = await res.json();
      if (json && json.current_weather) {
        setWeatherData(json.current_weather);
      }
    } catch (e) {
      console.warn('Weather fetch error:', e);
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'destinasi' && !weatherData) {
      fetchWeather();
    }
  }, [activeTab]);

  const getWeatherDescription = (code) => {
    if (code === 0) return { label: 'Cerah', icon: 'weather-sunny', color: '#F59E0B' };
    if (code >= 1 && code <= 3) return { label: 'Cerah Berawan', icon: 'weather-partly-cloudy', color: '#F59E0B' };
    if (code >= 45 && code <= 48) return { label: 'Berkabut', icon: 'weather-fog', color: '#94A3B8' };
    if (code >= 51 && code <= 55) return { label: 'Gerimis', icon: 'weather-rainy', color: '#38BDF8' };
    if (code >= 61 && code <= 65) return { label: 'Hujan', icon: 'weather-pouring', color: '#0EA5E9' };
    if (code >= 80 && code <= 82) return { label: 'Hujan Deras', icon: 'weather-lightning-rainy', color: '#0EA5E9' };
    if (code >= 95 && code <= 99) return { label: 'Badai Petir', icon: 'weather-lightning', color: '#EF4444' };
    return { label: 'Berawan', icon: 'weather-cloudy', color: '#94A3B8' };
  };

  // ── Hooks ──
  const origin = useLocationSearch();
  const destination = useLocationSearch();
  const { routeCoords, routeSummary } = useOsrmRoute(origin.coords, destination.coords, routingMode);
  const { activeTrips, loading: tripsLoading } = useActiveTrips();

  // ── Animations ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    fadeAnim.setValue(0.2);
    slideAnim.setValue(10);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
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

      setCreateModalVisible(false);
      const savedCoords = origin.coords;
      const savedDestCoords = destination.coords;
      const savedOriginName = origin.name;
      const savedDestName = destination.name;

      origin.clearAll();
      destination.clearAll();
      setVehicleCount(1);
      setVehicleType('motorcycle');
      setUseTolls(true);

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

  // ── Handler: Gabung Room ──
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

  // ── Handler: Resume trip ──
  const handleTripResume = (trip) => {
    const td = Array.isArray(trip.room_trips) ? trip.room_trips[0] : trip.room_trips;
    if (!td) {
      setDialogConfig({
        visible: true,
        type: 'info',
        icon: 'information-outline',
        title: 'Data Tidak Lengkap',
        message: 'Detail rute perjalanan tidak ditemukan. Coba buat room baru.',
        buttons: [{ text: 'MENGERTI', style: 'primary' }],
      });
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

  // ── Handler: Auto fill rute dari Tempat Viral ──
  const handleCreateRouteToSpot = (spot) => {
    destination.setManual(spot.name, spot.latitude, spot.longitude);
    setCreateModalVisible(true);
  };

  // ── Handler: Sign Out ──
  const handleSignOut = async () => {
    setDialogConfig({
      visible: true,
      type: 'danger',
      icon: 'logout-variant',
      title: t('settings.signOutConfirmTitle'),
      message: t('settings.signOutConfirmMsg'),
      buttons: [
        { text: t('settings.signOutCancel'), style: 'secondary' },
        {
          text: t('settings.signOutOk'),
          style: 'danger',
          onPress: async () => {
            try {
              if (signOut) await signOut();
              else await supabase.auth.signOut();
            } catch (err) {
              console.warn('Signout error:', err);
            }
          },
        },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* ══ CUSTOM OVERLAY DIALOGS & TOASTS ══ */}
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
        {activeTab === 'radar' && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* ══ COMPACT MAP RADAR ══ */}
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

            {/* ══ COMPACT QUICK ACTIONS ══ */}
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

            {/* ══ ACTIVE TRIPS ══ */}
            <View style={styles.sectionContainer}>
              <ActiveTripsCard
                activeTrips={activeTrips}
                loading={tripsLoading}
                onTripResume={handleTripResume}
                onHistoryPress={() => setHistoryModalVisible(true)}
              />
            </View>

            {/* ══ TIPS ══ */}
            <View style={styles.sectionContainer}>
              <TipsCard />
            </View>
          </Animated.View>
        )}

        {/* ══ DESTINASI & CUACA UNIFIED PAGE ══ */}
        {activeTab === 'destinasi' && (
          <Animated.View style={[styles.tabContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.tabHeaderRow}>
              <MaterialCommunityIcons name="compass-outline" size={20} color={colors.primary} />
              <Text style={styles.tabTitle}>{t('home.destinasiTitle')}</Text>
            </View>
            <Text style={styles.tabSubtitle}>{t('home.destinasiSub')}</Text>

            {/* Weather HUD Widget */}
            {weatherLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>{t('home.weatherLoading')}</Text>
              </View>
            ) : weatherData ? (
              <View style={[styles.weatherDashboard, { marginBottom: spacing.lg }]}>
                <View style={styles.weatherMain}>
                  <MaterialCommunityIcons
                    name={getWeatherDescription(weatherData.weathercode).icon}
                    size={54}
                    color={getWeatherDescription(weatherData.weathercode).color}
                  />
                  <Text style={styles.tempText}>{Math.round(weatherData.temperature)}°C</Text>
                  <Text style={styles.weatherCondition}>{getWeatherDescription(weatherData.weathercode).label}</Text>
                </View>

                <View style={styles.weatherDivider} />

                <View style={styles.weatherMetaRow}>
                  <View style={styles.weatherMetaItem}>
                    <MaterialCommunityIcons name="wind-power" size={16} color={colors.textMuted} />
                    <Text style={styles.weatherMetaVal}>{weatherData.windspeed} km/h</Text>
                    <Text style={styles.weatherMetaLabel}>{t('home.windSpeed')}</Text>
                  </View>
                  <View style={styles.weatherMetaItem}>
                    <MaterialCommunityIcons name="compass-rose" size={16} color={colors.textMuted} />
                    <Text style={styles.weatherMetaVal}>{weatherData.winddirection}°</Text>
                    <Text style={styles.weatherMetaLabel}>{t('home.windDir')}</Text>
                  </View>
                </View>

                <View style={styles.adviceBox}>
                  <MaterialCommunityIcons name="shield-check-outline" size={16} color="#10B981" style={{ marginRight: 6 }} />
                  <Text style={styles.adviceText}>
                    {weatherData.weathercode >= 51
                      ? t('home.weatherAdviceWet')
                      : t('home.weatherAdviceDry')}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Viral Spots Header */}
            <Text style={styles.sectionHeading}>{t('home.ridingSpotsHeading')}</Text>

            {VIRAL_SPOTS.map((spot) => (
              <View key={spot.id} style={styles.spotCard}>
                <View style={styles.spotCardHeader}>
                  <View style={styles.spotTagBadge}>
                    <Text style={styles.spotTagText}>{spot.tag}</Text>
                  </View>
                  <View style={styles.spotBestTimeBadge}>
                    <Text style={styles.spotBestTimeText}>{spot.bestTime}</Text>
                  </View>
                </View>
                <Text style={styles.spotName}>{spot.name}</Text>
                <Text style={styles.spotRegion}>{spot.region}</Text>
                <Text style={styles.spotDesc}>{spot.description}</Text>

                <TouchableOpacity
                  style={styles.spotActionBtn}
                  onPress={() => handleCreateRouteToSpot(spot)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="map-marker-distance" size={16} color={colors.white} style={{ marginRight: 6 }} />
                  <Text style={styles.spotActionBtnText}>{t('home.createRouteToSpot')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </Animated.View>
        )}

        {activeTab === 'stats' && (
          <Animated.View style={[styles.tabContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.tabHeaderRow}>
              <MaterialCommunityIcons name="chart-timeline-variant" size={20} color={colors.primary} />
              <Text style={styles.tabTitle}>{t('home.statsTitle')}</Text>
            </View>
            <Text style={styles.tabSubtitle}>{t('home.statsSub')}</Text>

            {/* Dashboard Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statsCardItem}>
                <Text style={styles.statsVal}>340 km</Text>
                <Text style={styles.statsLabel}>{t('home.totalDistance')}</Text>
              </View>
              <View style={styles.statsCardItem}>
                <Text style={styles.statsVal}>12x</Text>
                <Text style={styles.statsLabel}>{t('home.ridingCount')}</Text>
              </View>
            </View>

            <View style={styles.statsCardSingle}>
              <Text style={styles.statsVal}>2.4 Jam</Text>
              <Text style={styles.statsLabel}>{t('home.avgDuration')}</Text>
            </View>

            {/* Badges */}
            <Text style={styles.sectionHeading}>{t('home.badgesHeading')}</Text>

            <View style={styles.badgeRow}>
              <View style={styles.badgeItem}>
                <View style={[styles.badgeIconBg, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
                  <MaterialCommunityIcons name="shield-crown-outline" size={24} color={colors.primary} />
                </View>
                <Text style={styles.badgeName}>{t('home.badgePioneer')}</Text>
                <Text style={styles.badgeDesc}>{t('home.badgePioneerDesc')}</Text>
              </View>

              <View style={styles.badgeItem}>
                <View style={[styles.badgeIconBg, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                  <MaterialCommunityIcons name="weather-night" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.badgeName}>{t('home.badgeNight')}</Text>
                <Text style={styles.badgeDesc}>{t('home.badgeNightDesc')}</Text>
              </View>

              <View style={styles.badgeItem}>
                <View style={[styles.badgeIconBg, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                  <MaterialCommunityIcons name="heart-pulse" size={24} color="#10B981" />
                </View>
                <Text style={styles.badgeName}>{t('home.badgeSafety')}</Text>
                <Text style={styles.badgeDesc}>{t('home.badgeSafetyDesc')}</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ══ SETTINGS PAGE ══ */}
        {activeTab === 'settings' && (
          <Animated.View style={[styles.tabContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.tabHeaderRow}>
              <MaterialCommunityIcons name="cog-outline" size={20} color={colors.primary} />
              <Text style={styles.tabTitle}>{t('settings.title')}</Text>
            </View>
            <Text style={styles.tabSubtitle}>{t('settings.subtitle')}</Text>

            {/* Account Card */}
            <View style={styles.settingsAccountCard}>
              <View style={styles.accountAvatarCircle}>
                <Text style={styles.accountInitial}>{profileInitial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountName}>{displayName}</Text>
                <Text style={styles.accountEmail}>{user?.email || 'Akun Terverifikasi'}</Text>
              </View>
              <TouchableOpacity
                style={styles.profileEditBtn}
                onPress={() => navigation.navigate('Profile')}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="account-edit-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Settings Options Group */}
            <View style={styles.settingsGroup}>
              <Text style={styles.settingsGroupTitle}>{t('settings.prefRadar')}</Text>

              <View style={styles.settingItemRow}>
                <View style={styles.settingItemLeft}>
                  <MaterialCommunityIcons name="bell-ring-outline" size={20} color={colors.primaryMuted} />
                  <View>
                    <Text style={styles.settingItemTitle}>{t('settings.notifRealtime')}</Text>
                    <Text style={styles.settingItemSub}>{t('settings.notifSub')}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setNotificationsEnabled((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={notificationsEnabled ? 'toggle-switch' : 'toggle-switch-off-outline'}
                    size={36}
                    color={notificationsEnabled ? colors.primary : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.settingItemRow}>
                <View style={styles.settingItemLeft}>
                  <MaterialCommunityIcons name="map-clock-outline" size={20} color={colors.primaryMuted} />
                  <View>
                    <Text style={styles.settingItemTitle}>{t('settings.darkMap')}</Text>
                    <Text style={styles.settingItemSub}>{t('settings.darkMapSub')}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setDarkModeMap((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={darkModeMap ? 'toggle-switch' : 'toggle-switch-off-outline'}
                    size={36}
                    color={darkModeMap ? colors.primary : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {/* Language Switcher Row */}
              <TouchableOpacity
                style={styles.settingItemRow}
                onPress={() => setLanguageModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={styles.settingItemLeft}>
                  <MaterialCommunityIcons name="translate" size={20} color={colors.primaryMuted} />
                  <View>
                    <Text style={styles.settingItemTitle}>{t('settings.changeLang')}</Text>
                    <Text style={styles.settingItemSub}>{t('settings.changeLangSub')}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: fontSize.xs, fontFamily: fonts.bold, color: colors.primaryMuted }}>
                    {locale === 'id' ? 'Indonesia' : locale === 'en' ? 'English' : 'Melayu'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.settingsGroup}>
              <Text style={styles.settingsGroupTitle}>{t('settings.locationPerform')}</Text>

              <TouchableOpacity
                style={styles.settingItemRow}
                onPress={() => showToast('success', t('settings.clearCache'), t('settings.cacheToast'))}
                activeOpacity={0.7}
              >
                <View style={styles.settingItemLeft}>
                  <MaterialCommunityIcons name="broom" size={20} color={colors.primaryMuted} />
                  <View>
                    <Text style={styles.settingItemTitle}>{t('settings.clearCache')}</Text>
                    <Text style={styles.settingItemSub}>{t('settings.clearCacheSub')}</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={handleSignOut}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="logout-variant" size={18} color={colors.danger} style={{ marginRight: 6 }} />
              <Text style={styles.signOutBtnText}>{t('settings.signOut')}</Text>
            </TouchableOpacity>

            <Text style={styles.appVersionFooter}>TiKum Radar v1.4.0 · Build MVP Phase 1</Text>
          </Animated.View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ══ LANGUAGE SELECTOR DIALOG ══ */}
      <ConvoyDialog
        visible={languageModalVisible}
        type="info"
        icon="translate"
        title={t('settings.changeLang')}
        message="Pilih bahasa yang ingin digunakan / Choose language / Pilih bahasa:"
        buttons={[
          {
            text: 'Bahasa Indonesia 🇮🇩',
            style: locale === 'id' ? 'primary' : 'secondary',
            onPress: () => {
              changeLocale('id');
              setLanguageModalVisible(false);
              showToast('success', 'Bahasa Diubah', 'Bahasa aplikasi berhasil diubah ke Bahasa Indonesia.');
            }
          },
          {
            text: 'English 🇬🇧',
            style: locale === 'en' ? 'primary' : 'secondary',
            onPress: () => {
              changeLocale('en');
              setLanguageModalVisible(false);
              showToast('success', 'Language Changed', 'App language successfully changed to English.');
            }
          },
          {
            text: 'Bahasa Melayu 🇲🇾',
            style: locale === 'ms' ? 'primary' : 'secondary',
            onPress: () => {
              changeLocale('ms');
              setLanguageModalVisible(false);
              showToast('success', 'Bahasa Ditukar', 'Bahasa aplikasi berjaya ditukar ke Bahasa Melayu.');
            }
          },
          {
            text: locale === 'id' ? 'BATAL' : locale === 'ms' ? 'BATAL' : 'CANCEL',
            style: 'secondary',
            onPress: () => setLanguageModalVisible(false)
          }
        ]}
        onClose={() => setLanguageModalVisible(false)}
      />

      {/* ══ FLOATING GLASSMORPHIC TAB BAR ══ */}
      <View style={styles.tabBarFloatingContainer}>
        <View style={styles.glassTabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'radar' && styles.tabItemActive]}
            onPress={() => handleTabChange('radar')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="radar"
              size={20}
              color={activeTab === 'radar' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabLabel, activeTab === 'radar' && styles.tabLabelActive]}>{t('home.radar')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'destinasi' && styles.tabItemActive]}
            onPress={() => handleTabChange('destinasi')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="compass-outline"
              size={20}
              color={activeTab === 'destinasi' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabLabel, activeTab === 'destinasi' && styles.tabLabelActive]}>{t('home.destinasi')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'stats' && styles.tabItemActive]}
            onPress={() => handleTabChange('stats')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="chart-timeline-variant"
              size={20}
              color={activeTab === 'stats' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabLabel, activeTab === 'stats' && styles.tabLabelActive]}>{t('home.statistik')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'settings' && styles.tabItemActive]}
            onPress={() => handleTabChange('settings')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="cog-outline"
              size={20}
              color={activeTab === 'settings' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabLabel, activeTab === 'settings' && styles.tabLabelActive]}>{t('home.pengaturan')}</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingBottom: 20,
  },

  // Map (Compact height)
  mapContainer: {
    height: 130,
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
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
  mapOverlayText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.primaryMuted,
    letterSpacing: 0.5,
  },

  // Quick Actions (Compact)
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionTitle: {
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },

  // Section Padding (Radar items)
  sectionContainer: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },

  // General Tab Styling
  tabContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  tabHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  tabTitle: {
    fontSize: fontSize.lg,
    fontFamily: fonts.black,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  tabSubtitle: {
    fontSize: fontSize.xs,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    lineHeight: 16,
    marginBottom: spacing.md,
  },

  // Spots Styling
  spotCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  spotCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  spotTagBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  spotTagText: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: colors.primaryMuted,
  },
  spotBestTimeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  spotBestTimeText: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: colors.textMuted,
  },
  spotName: {
    fontSize: fontSize.md + 1,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  spotRegion: {
    fontSize: fontSize.xs - 1,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  spotDesc: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  spotActionBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotActionBtnText: {
    fontSize: fontSize.xs + 1,
    fontFamily: fonts.bold,
    color: colors.white,
  },

  // Weather Dash Styling
  weatherDashboard: {
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
  },
  weatherMain: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tempText: {
    fontSize: 40,
    fontFamily: fonts.black,
    color: colors.textPrimary,
    letterSpacing: -1,
    marginTop: 2,
  },
  weatherCondition: {
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  weatherDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: spacing.md,
  },
  weatherMetaRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  weatherMetaItem: {
    alignItems: 'center',
  },
  weatherMetaVal: {
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginTop: 4,
  },
  weatherMetaLabel: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  adviceBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  adviceText: {
    flex: 1,
    fontSize: fontSize.xs,
    fontFamily: fonts.medium,
    color: '#34D399',
    lineHeight: 16,
  },
  loadingContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },

  // Stats Styling
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statsCardItem: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
  },
  statsCardSingle: {
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statsVal: {
    fontSize: 28,
    fontFamily: fonts.black,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  statsLabel: {
    fontSize: fontSize.xs - 1,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  badgeItem: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  badgeIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badgeName: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 8,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },

  // Settings Styling
  settingsAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.28)',
  },
  accountAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  accountInitial: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: fontSize.md,
  },
  accountName: {
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  accountEmail: {
    fontSize: fontSize.xs,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    marginTop: 1,
  },
  profileEditBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsGroup: {
    marginBottom: spacing.lg,
  },
  settingsGroupTitle: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  settingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.45)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.xs + 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  settingItemTitle: {
    fontSize: fontSize.xs + 1,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  settingItemSub: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    marginTop: 1,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  signOutBtnText: {
    fontSize: fontSize.xs + 1,
    fontFamily: fonts.bold,
    color: colors.danger,
  },
  appVersionFooter: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    letterSpacing: 0.5,
  },

  // Floating Tab Bar Styling (Futuristic Glass Tab Bar)
  tabBarFloatingContainer: {
    position: 'absolute',
    bottom: 24,
    left: spacing.xl,
    right: spacing.xl,
    height: 60,
    zIndex: 100,
  },
  glassTabBar: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.88)',
    borderRadius: radius.xl + 4,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.28)',
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingVertical: 4,
  },
  tabItemActive: {
    transform: [{ scale: 1.05 }],
  },
  tabLabel: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    marginTop: 3,
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: colors.primary,
  },
});