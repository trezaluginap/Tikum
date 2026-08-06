import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { colors, fonts, fontSize, radius, spacing } from '../../constants/theme';

// ─── Map Picker Modal ───────────────────────────────────────────
function MapPickerModal({ visible, onClose, onConfirm, title }) {
  const [pickedCoord, setPickedCoord] = useState(null);
  const [pickedName, setPickedName] = useState('');
  const [resolving, setResolving] = useState(false);
  const mapRef = useRef(null);

  const handleMapPress = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPickedCoord({ latitude, longitude });
    setResolving(true);

    try {
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address) {
        const parts = [
          address.name,
          address.street,
          address.subregion || address.city,
          address.region,
        ].filter(Boolean);
        // Hapus duplikat (kadang name == street)
        const unique = [...new Set(parts)];
        setPickedName(unique.join(', '));
      } else {
        setPickedName(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      }
    } catch {
      setPickedName(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    } finally {
      setResolving(false);
    }
  };

  const handleConfirm = () => {
    if (!pickedCoord) return;
    onConfirm(pickedName, pickedCoord.latitude, pickedCoord.longitude);
    setPickedCoord(null);
    setPickedName('');
    onClose();
  };

  const handleClose = () => {
    setPickedCoord(null);
    setPickedName('');
    onClose();
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={handleClose}>
      <View style={pickerStyles.container}>
        {/* Header */}
        <View style={pickerStyles.header}>
          <TouchableOpacity onPress={handleClose} style={pickerStyles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={pickerStyles.headerTitle}>{title || 'Pilih di Peta'}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Map */}
        <MapView
          ref={mapRef}
          style={pickerStyles.map}
          initialRegion={{
            latitude: -6.9175,
            longitude: 107.6191,
            latitudeDelta: 0.5,
            longitudeDelta: 0.5,
          }}
          onPress={handleMapPress}
          customMapStyle={mapDarkStyle}
        >
          {pickedCoord && (
            <Marker coordinate={pickedCoord}>
              <View style={pickerStyles.markerContainer}>
                <MaterialCommunityIcons name="map-marker" size={36} color={colors.primary} />
              </View>
            </Marker>
          )}
        </MapView>

        {/* Instruksi / Info */}
        <View style={pickerStyles.footer}>
          {!pickedCoord ? (
            <View style={pickerStyles.hintBox}>
              <MaterialCommunityIcons name="gesture-tap" size={20} color={colors.textMuted} />
              <Text style={pickerStyles.hintText}>Ketuk peta untuk memilih lokasi</Text>
            </View>
          ) : (
            <View style={pickerStyles.pickedBox}>
              <View style={pickerStyles.pickedInfo}>
                <MaterialCommunityIcons name="map-marker-check" size={20} color={colors.success} />
                <View style={{ flex: 1 }}>
                  {resolving ? (
                    <Text style={pickerStyles.pickedName}>Mencari alamat...</Text>
                  ) : (
                    <Text style={pickerStyles.pickedName} numberOfLines={2}>{pickedName}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={[pickerStyles.confirmBtn, resolving && { opacity: 0.5 }]}
                onPress={handleConfirm}
                disabled={resolving}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="check" size={20} color={colors.white} />
                <Text style={pickerStyles.confirmText}>Pilih Lokasi Ini</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Tombol "Lokasi Saat Ini" ───────────────────────────────────
function CurrentLocationButton({ onLocationFound, loading: externalLoading }) {
  const [gpsLoading, setGpsLoading] = useState(false);

  const handlePress = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Aktifkan izin lokasi untuk menggunakan fitur ini.');
        return;
      }
      let loc = await Location.getLastKnownPositionAsync();
      if (!loc) {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      let displayName = 'Lokasi Saat Ini';
      if (address) {
        const parts = [address.street, address.subregion || address.city, address.region].filter(Boolean);
        displayName = parts.join(', ') || 'Lokasi Saat Ini';
      }
      onLocationFound(displayName, loc.coords.latitude, loc.coords.longitude);
    } catch (error) {
      Alert.alert('Error', 'Gagal mendapatkan lokasi. Pastikan GPS aktif.');
    } finally {
      setGpsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.gpsBtn}
      onPress={handlePress}
      disabled={gpsLoading || externalLoading}
      activeOpacity={0.7}
    >
      {gpsLoading ? (
        <ActivityIndicator color={colors.primary} size={14} />
      ) : (
        <MaterialCommunityIcons name="crosshairs-gps" size={16} color={colors.primary} />
      )}
      <Text style={styles.gpsBtnText}>
        {gpsLoading ? 'Mencari lokasi...' : 'Gunakan Lokasi Saat Ini'}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Location Search Field ──────────────────────────────────────
function LocationField({
  label, iconColor, value, onSearch, searching, suggestions,
  onSelect, selectedCoords, prefix, editable, showGps, onGpsFound,
  onPickMap, loading,
}) {
  const placeholder = label.includes('Asal') ? 'Cari lokasi asal...' : 'Cari lokasi tujuan...';
  return (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <View style={styles.searchBox}>
        <MaterialCommunityIcons name="map-marker" size={18} color={iconColor} />
        <TextInput
          style={styles.formInput}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          value={value}
          onChangeText={onSearch}
          editable={editable}
        />
        {searching && <ActivityIndicator color={iconColor} size={16} />}
      </View>

      {/* Action buttons (GPS + Pilih di Peta) — muncul sebelum lokasi dipilih */}
      {!selectedCoords && (
        <View style={styles.actionRow}>
          {showGps && (
            <CurrentLocationButton onLocationFound={onGpsFound} loading={loading} />
          )}
          <TouchableOpacity
            style={styles.pickMapBtn}
            onPress={onPickMap}
            disabled={loading}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="map-search-outline" size={16} color={colors.primary} />
            <Text style={styles.gpsBtnText}>Pilih di Peta</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(_, i) => `${prefix}-${i}`}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.suggestionItem} onPress={() => onSelect(item)}>
              <View style={styles.suggestionIcon}>
                <MaterialCommunityIcons name="map-marker-outline" size={16} color={colors.primaryMuted} />
              </View>
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionTitle}>{item.name}</Text>
                {item.subtitle ? (
                  <Text style={styles.suggestionSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {selectedCoords && (
        <View style={styles.selectedBadge}>
          <MaterialCommunityIcons name="check-circle" size={14} color={colors.success} />
          <Text style={styles.selectedText} numberOfLines={1}>{value}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Modal ─────────────────────────────────────────────────
export function CreateRoomModal({
  visible, onClose, origin, destination, vehicleCount,
  onDecrement, onIncrement, routeCoords, routeSummary,
  onCreateRoom, loading, isReady,
  vehicleType, onVehicleTypeChange, useTolls, onUseTollsChange,
}) {
  const [mapPickerTarget, setMapPickerTarget] = useState(null); // 'origin' | 'dest' | null

  const handleMapConfirm = (name, lat, lng) => {
    if (mapPickerTarget === 'origin') {
      origin.setManual(name, lat, lng);
    } else if (mapPickerTarget === 'dest') {
      destination.setManual(name, lat, lng);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      {/* Map Picker sub-modal */}
      <MapPickerModal
        visible={!!mapPickerTarget}
        onClose={() => setMapPickerTarget(null)}
        onConfirm={handleMapConfirm}
        title={mapPickerTarget === 'origin' ? 'Pilih Titik Asal' : 'Pilih Titik Tujuan'}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handleBar} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Buat Room</Text>
                <Text style={styles.sheetSubtitle}>Atur rute perjalanan convoy</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetBody}>
              {/* MAP PREVIEW */}
              {(origin.coords || destination.coords) && (
                <View style={styles.mapBox}>
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: origin.coords?.latitude || destination.coords?.latitude || -6.9175,
                      longitude: origin.coords?.longitude || destination.coords?.longitude || 107.6191,
                      latitudeDelta: 0.1,
                      longitudeDelta: 0.1,
                    }}
                  >
                    {routeCoords.length > 0 && (
                      <Polyline coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={3} />
                    )}
                    {origin.coords && <Marker coordinate={origin.coords} title="Asal" pinColor="#10B981" />}
                    {destination.coords && <Marker coordinate={destination.coords} title="Tujuan" pinColor="#EF4444" />}
                  </MapView>
                  {routeSummary && (
                    <View style={styles.routeInfo}>
                      <Text style={styles.routeInfoText}>
                        📏 {routeSummary.distanceKm} km  •  ⏱️ {routeSummary.durationMin} min
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* FORM */}
              <LocationField
                label="Titik Asal"
                iconColor={colors.success}
                value={origin.name}
                onSearch={origin.onSearch}
                searching={origin.searching}
                suggestions={origin.suggestions}
                onSelect={origin.onSelect}
                selectedCoords={origin.coords}
                prefix="origin"
                editable={!loading}
                showGps={true}
                onGpsFound={origin.setManual}
                onPickMap={() => setMapPickerTarget('origin')}
                loading={loading}
              />
              <LocationField
                label="Titik Tujuan"
                iconColor={colors.danger}
                value={destination.name}
                onSearch={destination.onSearch}
                searching={destination.searching}
                suggestions={destination.suggestions}
                onSelect={destination.onSelect}
                selectedCoords={destination.coords}
                prefix="dest"
                editable={!loading}
                showGps={false}
                onPickMap={() => setMapPickerTarget('dest')}
                loading={loading}
              />

              {/* VEHICLE TYPE SELECTOR */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Jenis Kendaraan</Text>
                <View style={styles.pillRow}>
                  <TouchableOpacity
                    style={[styles.pillBtn, vehicleType === 'motorcycle' && styles.pillBtnActive]}
                    onPress={() => onVehicleTypeChange('motorcycle')}
                    activeOpacity={0.7}
                    disabled={loading}
                  >
                    <MaterialCommunityIcons
                      name="motorbike"
                      size={18}
                      color={vehicleType === 'motorcycle' ? colors.white : colors.textMuted}
                    />
                    <Text style={[styles.pillBtnText, vehicleType === 'motorcycle' && styles.pillBtnTextActive]}>Motor</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pillBtn, vehicleType === 'car' && styles.pillBtnActive]}
                    onPress={() => onVehicleTypeChange('car')}
                    activeOpacity={0.7}
                    disabled={loading}
                  >
                    <MaterialCommunityIcons
                      name="car"
                      size={18}
                      color={vehicleType === 'car' ? colors.white : colors.textMuted}
                    />
                    <Text style={[styles.pillBtnText, vehicleType === 'car' && styles.pillBtnTextActive]}>Mobil</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* TOLL OPTION (only for car) */}
              {vehicleType === 'car' && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Opsi Tol</Text>
                  <View style={styles.pillRow}>
                    <TouchableOpacity
                      style={[styles.pillBtn, useTolls === true && styles.pillBtnActiveToll]}
                      onPress={() => onUseTollsChange(true)}
                      activeOpacity={0.7}
                      disabled={loading}
                    >
                      <MaterialCommunityIcons
                        name="highway"
                        size={16}
                        color={useTolls === true ? colors.white : colors.textMuted}
                      />
                      <Text style={[styles.pillBtnText, useTolls === true && styles.pillBtnTextActive]}>Lewat Tol</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pillBtn, useTolls === false && styles.pillBtnActiveNoToll]}
                      onPress={() => onUseTollsChange(false)}
                      activeOpacity={0.7}
                      disabled={loading}
                    >
                      <MaterialCommunityIcons
                        name="road-variant"
                        size={16}
                        color={useTolls === false ? colors.white : colors.textMuted}
                      />
                      <Text style={[styles.pillBtnText, useTolls === false && styles.pillBtnTextActive]}>Tanpa Tol</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* VEHICLE STEPPER */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Jumlah Kendaraan</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, vehicleCount <= 1 && styles.stepperBtnOff]}
                    onPress={onDecrement}
                    disabled={vehicleCount <= 1}
                  >
                    <MaterialCommunityIcons name="minus" size={20} color={vehicleCount <= 1 ? colors.textDisabled : colors.primary} />
                  </TouchableOpacity>
                  <View style={styles.stepperCenter}>
                    <Text style={styles.stepperValue}>{vehicleCount}</Text>
                    <Text style={styles.stepperLabel}>{vehicleType === 'motorcycle' ? 'motor' : 'mobil'}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.stepperBtn, vehicleCount >= 99 && styles.stepperBtnOff]}
                    onPress={onIncrement}
                    disabled={vehicleCount >= 99}
                  >
                    <MaterialCommunityIcons name="plus" size={20} color={vehicleCount >= 99 ? colors.textDisabled : colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ height: 16 }} />
            </ScrollView>

            {/* SUBMIT */}
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={[styles.submitBtn, !isReady && styles.submitBtnDisabled]}
                onPress={onCreateRoom}
                disabled={!isReady}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} size={18} />
                ) : (
                  <MaterialCommunityIcons name="rocket-launch" size={20} color={colors.white} />
                )}
                <Text style={styles.submitBtnText}>
                  {loading ? 'Membuat Room...' : 'Buat Room & Mulai'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Dark map style ─────────────────────────────────────────────
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

// ─── Map Picker Styles ──────────────────────────────────────────
const pickerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + 16,
    paddingBottom: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.cardElevated,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg, fontFamily: fonts.bold, color: colors.textPrimary,
  },
  map: { flex: 1 },
  markerContainer: { alignItems: 'center' },
  footer: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  hintText: {
    fontSize: fontSize.md, fontFamily: fonts.medium, color: colors.textMuted,
  },
  pickedBox: { gap: spacing.md },
  pickedInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  pickedName: {
    fontSize: fontSize.md, fontFamily: fonts.medium, color: colors.textPrimary, lineHeight: 20,
  },
  confirmBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    elevation: 4,
  },
  confirmText: {
    color: colors.white, fontSize: fontSize.lg, fontFamily: fonts.semiBold,
  },
});

// ─── Main Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    maxHeight: '92%', minHeight: '60%',
  },
  handleBar: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.borderLight, alignSelf: 'center', marginTop: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  sheetTitle: { fontSize: fontSize.xxl, fontFamily: fonts.bold, color: colors.textPrimary },
  sheetSubtitle: { fontSize: fontSize.sm, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: colors.cardElevated, justifyContent: 'center', alignItems: 'center',
  },
  sheetBody: { paddingHorizontal: spacing.xl },

  // Map preview
  mapBox: { borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg, elevation: 2 },
  map: { width: '100%', height: 160 },
  routeInfo: {
    backgroundColor: colors.routeInfoBg,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md, alignItems: 'center',
  },
  routeInfoText: { fontSize: fontSize.sm, fontFamily: fonts.semiBold, color: colors.routeInfoText },

  // Form
  formGroup: { marginBottom: spacing.lg },
  formLabel: {
    fontSize: fontSize.sm, fontFamily: fonts.semiBold, color: colors.textSecondary,
    marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.inputBg, borderRadius: radius.md,
    paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  formInput: {
    flex: 1, height: 46, paddingHorizontal: spacing.sm,
    fontSize: fontSize.md, fontFamily: fonts.regular, color: colors.textPrimary,
  },

  // Action row (GPS + Pick Map)
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)', borderStyle: 'dashed',
  },
  pickMapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)', borderStyle: 'dashed',
  },
  gpsBtnText: { fontSize: fontSize.sm, fontFamily: fonts.medium, color: colors.primary },

  // Suggestions
  suggestionItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md,
    backgroundColor: colors.suggestion, marginTop: spacing.xs, borderRadius: radius.sm,
  },
  suggestionIcon: {
    width: 28, height: 28, borderRadius: radius.full,
    backgroundColor: colors.cardElevated, justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  suggestionContent: { flex: 1 },
  suggestionTitle: { fontSize: fontSize.md, fontFamily: fonts.medium, color: colors.textPrimary },
  suggestionSubtitle: { fontSize: fontSize.xs, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 1 },

  selectedBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.sm,
    borderRadius: radius.sm, marginTop: spacing.sm, gap: spacing.xs,
  },
  selectedText: { flex: 1, fontSize: fontSize.xs, fontFamily: fonts.semiBold, color: colors.textSuccess },

  // Stepper
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.inputBg, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  stepperBtn: {
    paddingVertical: 12, paddingHorizontal: 20,
    backgroundColor: colors.cardElevated, alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnOff: { backgroundColor: colors.inputBg },
  stepperCenter: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  stepperValue: { fontSize: fontSize.xxl, fontFamily: fonts.bold, color: colors.textPrimary },
  stepperLabel: { fontSize: fontSize.xs, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 1 },

  // Pill selectors (vehicle type, toll option)
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillBtnActiveToll: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  pillBtnActiveNoToll: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  pillBtnText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
  },
  pillBtnTextActive: {
    color: colors.white,
  },

  // Footer
  sheetFooter: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  submitBtn: {
    flexDirection: 'row', backgroundColor: colors.primary,
    borderRadius: radius.md, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', gap: spacing.sm, elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: colors.white, fontSize: fontSize.lg, fontFamily: fonts.semiBold },
});

export default CreateRoomModal;
