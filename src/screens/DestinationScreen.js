import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '../../supabase';
import ConvoyDialog from '../components/common/ConvoyDialog';
import ConvoyToast from '../components/common/ConvoyToast';
import { CreateRoomModal } from '../components/home/CreateRoomModal';
import { HomeHeader } from '../components/home/HomeHeader';
import { colors, fonts, fontSize, radius, spacing } from '../constants/theme';
import { VIRAL_SPOTS } from '../constants/viralSpots';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useLocationSearch } from '../hooks/useLocationSearch';
import { useOsrmRoute } from '../hooks/useOsrmRoute';

export default function DestinationScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { t } = useLanguage();

  // ── Search & Filter State ──
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('Semua');

  // ── Create Room Modal State ──
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [vehicleCount, setVehicleCount] = useState(1);
  const [vehicleType, setVehicleType] = useState('motorcycle');
  const [useTolls, setUseTolls] = useState(true);

  // ── Dialog & Toast State ──
  const [dialogConfig, setDialogConfig] = useState({ visible: false });
  const [toastConfig, setToastConfig] = useState({ visible: false });

  // ── Routing Hooks ──
  const origin = useLocationSearch();
  const destination = useLocationSearch();
  const routingMode = vehicleType === 'motorcycle' ? 'motorcycle' : (useTolls ? 'auto_toll' : 'auto_no_toll');
  const { routeCoords, routeSummary } = useOsrmRoute(origin.coords, destination.coords, routingMode);

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
    fetchWeather();
  }, []);

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

  // ── Spots Filtering ──
  const availableRegions = ['Semua', ...new Set(VIRAL_SPOTS.map((spot) => spot.region))];

  const filteredSpots = VIRAL_SPOTS.filter((spot) => {
    const matchesRegion = selectedRegion === 'Semua' || spot.region === selectedRegion;
    const matchesSearch =
      searchQuery.trim() === '' ||
      spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRegion && matchesSearch;
  });

  const handleCreateRouteToSpot = (spot) => {
    destination.setManual(spot.name, spot.latitude, spot.longitude);
    setCreateModalVisible(true);
  };

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

  const displayName = user?.user_metadata?.display_name || 'Pengguna';
  const profileInitial = displayName.substring(0, 2).toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Overlays & Modals */}
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
        isReady={!!origin.coords && !!destination.coords && !createLoading}
        vehicleType={vehicleType}
        onVehicleTypeChange={setVehicleType}
        useTolls={useTolls}
        onUseTollsChange={setUseTolls}
      />

      {/* Header */}
      <HomeHeader
        displayName={displayName}
        profileInitial={profileInitial}
        profilePhotoUrl={user?.user_metadata?.profile_photo_url || null}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.scrollInner}>
        <View style={styles.tabContent}>
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
            <View style={[styles.weatherDashboard, { marginBottom: spacing.md }]}>
              <View style={styles.weatherLeft}>
                <MaterialCommunityIcons
                  name={getWeatherDescription(weatherData.weathercode).icon}
                  size={38}
                  color={getWeatherDescription(weatherData.weathercode).color}
                />
                <View style={{ marginLeft: spacing.sm }}>
                  <Text style={styles.tempText}>{Math.round(weatherData.temperature)}°C</Text>
                  <Text style={styles.weatherCondition}>{getWeatherDescription(weatherData.weathercode).label}</Text>
                </View>
              </View>

              <View style={styles.weatherRight}>
                <View style={styles.weatherMetaItem}>
                  <MaterialCommunityIcons name="wind-power" size={14} color={colors.textMuted} />
                  <Text style={styles.weatherMetaVal}>{weatherData.windspeed} km/h</Text>
                </View>
                <View style={[styles.weatherMetaItem, { marginLeft: spacing.md }]}>
                  <MaterialCommunityIcons name="compass-rose" size={14} color={colors.textMuted} />
                  <Text style={styles.weatherMetaVal}>{weatherData.winddirection}°</Text>
                </View>
              </View>

              <View style={styles.adviceBoxCompact}>
                <MaterialCommunityIcons name="shield-check-outline" size={12} color="#10B981" style={{ marginRight: 4 }} />
                <Text style={styles.adviceTextCompact} numberOfLines={1}>
                  {weatherData.weathercode >= 51 ? t('home.weatherAdviceWet') : t('home.weatherAdviceDry')}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Viral Spots Header */}
          <Text style={styles.sectionHeading}>{t('home.ridingSpotsHeading')}</Text>

          {/* Search Input Bar */}
          <View style={styles.searchBarContainer}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('home.searchPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialCommunityIcons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Region Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.regionFilterScroll}
            style={{ marginBottom: spacing.md }}
          >
            {availableRegions.map((region) => {
              const isActive = selectedRegion === region;
              const displayLabel = region === 'Semua' ? t('home.allRegions') : region;
              return (
                <TouchableOpacity
                  key={region}
                  style={[styles.regionChip, isActive && styles.regionChipActive]}
                  onPress={() => setSelectedRegion(region)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.regionChipText, isActive && styles.regionChipTextActive]}>
                    {displayLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Spots Catalog List */}
          {filteredSpots.length === 0 ? (
            <View style={styles.emptySpotContainer}>
              <MaterialCommunityIcons name="map-marker-question-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptySpotText}>Tidak ada destinasi yang cocok</Text>
            </View>
          ) : (
            filteredSpots.map((spot) => (
              <View key={spot.id} style={styles.spotCard}>
                <View style={styles.spotCardLeft}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 2 }}>
                    <Text style={styles.spotName}>{spot.name}</Text>
                    <View style={styles.spotTagBadge}>
                      <Text style={styles.spotTagText}>{spot.tag}</Text>
                    </View>
                  </View>
                  <Text style={styles.spotRegion}>{spot.region} • {spot.bestTime}</Text>
                  <Text style={styles.spotDesc} numberOfLines={1}>{spot.description}</Text>
                </View>

                <TouchableOpacity
                  style={styles.spotActionBtnCompact}
                  onPress={() => handleCreateRouteToSpot(spot)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="map-marker-distance" size={14} color={colors.white} />
                  <Text style={styles.spotActionBtnTextCompact}>{t('home.createRouteToSpot')}</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
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
  tabContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  tabHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  tabTitle: { fontSize: fontSize.lg, fontFamily: fonts.black, color: colors.textPrimary, letterSpacing: -0.5 },
  tabSubtitle: { fontSize: fontSize.xs, fontFamily: fonts.medium, color: colors.textMuted, lineHeight: 16, marginBottom: spacing.md },
  sectionHeading: { fontSize: fontSize.md, fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: spacing.md },

  // Search & Filter Styling
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.65)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: fontSize.xs + 1, fontFamily: fonts.medium, color: colors.textPrimary, paddingVertical: 2 },
  regionFilterScroll: { gap: spacing.xs + 2, paddingRight: spacing.md },
  regionChip: {
    backgroundColor: 'rgba(30, 41, 59, 0.45)',
    borderRadius: radius.full,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  regionChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  regionChipText: { fontSize: 10, fontFamily: fonts.bold, color: colors.textMuted },
  regionChipTextActive: { color: colors.white },
  emptySpotContainer: { paddingVertical: spacing.xl, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptySpotText: { fontSize: fontSize.xs, fontFamily: fonts.medium, color: colors.textMuted },

  // Spots Styling
  spotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    gap: spacing.md,
  },
  spotCardLeft: { flex: 1 },
  spotTagBadge: { backgroundColor: 'rgba(99, 102, 241, 0.15)', paddingVertical: 2, paddingHorizontal: spacing.sm - 2, borderRadius: radius.md },
  spotTagText: { fontSize: 8, fontFamily: fonts.bold, color: colors.primaryMuted },
  spotName: { fontSize: fontSize.sm + 1, fontFamily: fonts.bold, color: colors.textPrimary },
  spotRegion: { fontSize: 10, fontFamily: fonts.bold, color: colors.textMuted, textTransform: 'uppercase', marginTop: 1, letterSpacing: 0.3 },
  spotDesc: { fontSize: 11, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 2 },
  spotActionBtnCompact: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md - 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  spotActionBtnTextCompact: { fontSize: 10, fontFamily: fonts.bold, color: colors.white },

  // Weather Dash Styling
  weatherDashboard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  weatherLeft: { flexDirection: 'row', alignItems: 'center' },
  tempText: { fontSize: 22, fontFamily: fonts.black, color: colors.textPrimary, letterSpacing: -0.5 },
  weatherCondition: { fontSize: 11, fontFamily: fonts.bold, color: colors.textPrimary, marginTop: -2 },
  weatherRight: { flexDirection: 'row', alignItems: 'center' },
  weatherMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  weatherMetaVal: { fontSize: 11, fontFamily: fonts.bold, color: colors.textPrimary },
  adviceBoxCompact: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderRadius: radius.md,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  adviceTextCompact: { flex: 1, fontSize: 10, fontFamily: fonts.medium, color: '#34D399' },
  loadingContainer: { height: 100, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: fontSize.xs, fontFamily: fonts.medium, color: colors.textMuted },
});
