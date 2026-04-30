import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { supabase } from '../../supabase';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts, fontSize, radius, spacing } from '../constants/theme';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  // State untuk form
  const [displayName, setDisplayName] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  
  // State untuk loading
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Load user data saat pertama kali
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const name = user?.user_metadata?.display_name || '';
      const vehicle = user?.user_metadata?.vehicle_name || '';
      const photo = user?.user_metadata?.profile_photo_url || null;
      const phone = user?.user_metadata?.phone_number || '';
      const userBio = user?.user_metadata?.bio || '';

      setDisplayName(name);
      setVehicleName(vehicle);
      setProfileImage(photo);
      setPhoneNumber(phone);
      setBio(userBio);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memilih gambar');
      console.error('Image picker error:', error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Peringatan', 'Nama display tidak boleh kosong');
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName,
          vehicle_name: vehicleName,
          profile_photo_url: profileImage,
          phone_number: phoneNumber,
          bio: bio,
          updated_at: new Date().toISOString(),
        },
      });

      if (error) throw error;
      Alert.alert('Sukses', 'Profil berhasil diperbarui');
    } catch (error) {
      Alert.alert('Gagal Update', error.message || 'Terjadi kesalahan');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Apakah anda yakin ingin keluar dari sistem?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            // Navigation is handled by AuthContext listening to session changes
          } catch (error) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={colors.background} />

      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* PROFILE HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.profilePhotoContainer} onPress={handlePickImage} activeOpacity={0.8}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profilePhoto} />
            ) : (
              <View style={styles.profilePhotoPlaceholder}>
                <Text style={styles.profileInitial}>
                  {(displayName || 'U').substring(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <MaterialCommunityIcons name="camera" size={16} color={colors.white} />
            </View>
          </TouchableOpacity>

          <Text style={styles.headerText}>{displayName || 'Pilot Baru'}</Text>
          <Text style={styles.headerSubText}>{user?.email}</Text>
        </View>

        {/* DATA PRIBADI */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identitas Radar</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Callsign (Nama Tampil)</Text>
            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="account" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Masukkan callsign anda"
                placeholderTextColor={colors.textDisabled}
                value={displayName}
                onChangeText={setDisplayName}
                editable={!updating}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Frekuensi (No. Telepon)</Text>
            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="phone" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="08xxxxxxxxxx"
                placeholderTextColor={colors.textDisabled}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                editable={!updating}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Status / Bio</Text>
            <View style={[styles.inputWrap, { alignItems: 'flex-start' }]}>
              <MaterialCommunityIcons name="text" size={20} color={colors.textMuted} style={[styles.inputIcon, { marginTop: 12 }]} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Deskripsi singkat..."
                placeholderTextColor={colors.textDisabled}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                editable={!updating}
              />
            </View>
          </View>
        </View>

        {/* KENDARAAN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spesifikasi Kendaraan</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Unit Convoy</Text>
            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="car-sports" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Contoh: Civic Hitam D 1234 XY"
                placeholderTextColor={colors.textDisabled}
                value={vehicleName}
                onChangeText={setVehicleName}
                editable={!updating}
              />
            </View>
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View style={[styles.section, { paddingBottom: spacing.xxl, marginTop: spacing.md }]}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={handleUpdateProfile}
            disabled={updating}
            activeOpacity={0.8}
          >
            {updating ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <MaterialCommunityIcons name="content-save" size={20} color={colors.white} style={{ marginRight: spacing.sm }} />
                <Text style={styles.btnPrimaryText}>Sinkronisasi Data</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnDanger}
            onPress={handleLogout}
            disabled={updating}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="power" size={20} color={colors.danger} style={{ marginRight: spacing.sm }} />
            <Text style={styles.btnDangerText}>Putus Koneksi (Logout)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl + 16,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.cardElevated,
    justifyContent: 'center', alignItems: 'center',
  },
  topBarTitle: {
    fontSize: fontSize.lg, fontFamily: fonts.bold, color: colors.textPrimary,
  },

  // Header (Avatar)
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xl,
  },
  profilePhotoContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: radius.full,
    marginBottom: spacing.md,
    backgroundColor: colors.cardElevated,
    borderWidth: 2,
    borderColor: colors.borderLight,
    elevation: 8,
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
    borderRadius: radius.full,
  },
  profilePhotoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight + '20',
  },
  profileInitial: {
    fontSize: 36,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  editBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  headerText: {
    fontSize: fontSize.xxl,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  headerSubText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },

  // Form Sections
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    color: colors.textPrimary,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },

  // Buttons
  btnPrimary: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    elevation: 4,
  },
  btnPrimaryText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontFamily: fonts.semiBold,
  },
  btnDanger: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 14,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  btnDangerText: {
    color: colors.danger,
    fontSize: fontSize.md,
    fontFamily: fonts.semiBold,
  },
});
