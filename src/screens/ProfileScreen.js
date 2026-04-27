import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';

import { supabase } from '../../supabase';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, session } = useAuth();
  const colorScheme = useColorScheme();
  
  // State untuk form
  const [displayName, setDisplayName] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  
  // State untuk theme
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');
  
  // State untuk loading
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const isDark = isDarkMode || colorScheme === 'dark';
  const colors = {
    bg: isDark ? '#1a1a1a' : '#F8F9FA',
    card: isDark ? '#2a2a2a' : '#fff',
    text: isDark ? '#fff' : '#333',
    textSecondary: isDark ? '#aaa' : '#666',
    border: isDark ? '#444' : '#eee',
    input: isDark ? '#3a3a3a' : '#f5f5f5',
  };

  // Load user data saat pertama kali
  useEffect(() => {
    loadUserProfile();
    loadThemePreference();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // Ambil data dari user metadata
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

      console.log('✅ User profile loaded');
    } catch (error) {
      console.error('❌ Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('@tikum_theme');
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('❌ Error loading theme:', error);
    }
  };

  const saveThemePreference = async (isDark) => {
    try {
      await AsyncStorage.setItem('@tikum_theme', isDark ? 'dark' : 'light');
      console.log('✅ Theme preference saved:', isDark ? 'dark' : 'light');
    } catch (error) {
      console.error('❌ Error saving theme:', error);
    }
  };

  // Handle pick image
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.cancelled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setProfileImage(imageUri);
        console.log('📸 Image selected:', imageUri);
      }
    } catch (error) {
      Alert.alert('❌ Error', 'Gagal memilih gambar');
      console.error('Image picker error:', error);
    }
  };

  // Handle update profile
  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Validasi', 'Nama display tidak boleh kosong');
      return;
    }

    setUpdating(true);
    try {
      // Update user metadata di Supabase
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

      if (error) {
        throw error;
      }

      Alert.alert('✅ Sukses!', 'Profil berhasil diperbarui');
      console.log('✅ Profile updated successfully');

    } catch (error) {
      console.error('❌ Update error:', error);
      Alert.alert('❌ Gagal Update', error.message || 'Terjadi kesalahan');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Apakah anda yakin ingin keluar?', [
      { text: 'Batal', onPress: () => {} },
      {
        text: 'Keluar',
        onPress: async () => {
          try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            navigation.replace('Login');
          } catch (error) {
            Alert.alert('❌ Error', error.message);
          }
        },
      },
    ]);
  };

  const handleThemeToggle = (value) => {
    setIsDarkMode(value);
    saveThemePreference(value);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.profilePhotoContainer, { borderColor: colors.border }]}
            onPress={handlePickImage}
          >
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.profilePhoto}
              />
            ) : (
              <View style={[styles.profilePhotoPlaceholder, { backgroundColor: colors.input }]}>
                <MaterialCommunityIcons name="camera-plus" size={40} color="#2196F3" />
              </View>
            )}
            <View style={styles.editBadge}>
              <MaterialCommunityIcons name="pencil" size={14} color="white" />
            </View>
          </TouchableOpacity>

          <Text style={[styles.headerText, { color: colors.text }]}>
            {displayName || 'Pengguna'}
          </Text>
          <Text style={[styles.headerSubText, { color: colors.textSecondary }]}>
            {user?.email}
          </Text>
        </View>

        {/* FORM SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Pribadi</Text>

          {/* Display Name */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Nama Display</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.input, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Masukkan nama anda"
              placeholderTextColor={colors.textSecondary}
              value={displayName}
              onChangeText={setDisplayName}
              editable={!updating}
            />
          </View>

          {/* Phone Number */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Nomor Telepon</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.input, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="08xxxxxxxxxx"
              placeholderTextColor={colors.textSecondary}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              editable={!updating}
            />
          </View>

          {/* Bio */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Bio</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.input, 
                color: colors.text,
                borderColor: colors.border,
                minHeight: 80,
                textAlignVertical: 'top'
              }]}
              placeholder="Tulis bio singkat anda"
              placeholderTextColor={colors.textSecondary}
              value={bio}
              onChangeText={setBio}
              multiline={true}
              numberOfLines={4}
              editable={!updating}
            />
          </View>
        </View>

        {/* VEHICLE SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Kendaraan</Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Nama Kendaraan</Text>
            <View style={[styles.inputWithIcon, { 
              backgroundColor: colors.input,
              borderColor: colors.border 
            }]}>
              <MaterialCommunityIcons name="car" size={20} color="#2196F3" style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.inputText, { color: colors.text }]}
                placeholder="Mobil Pribadi, Motor Harian, etc"
                placeholderTextColor={colors.textSecondary}
                value={vehicleName}
                onChangeText={setVehicleName}
                editable={!updating}
              />
            </View>
          </View>
        </View>

        {/* SETTINGS SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pengaturan</Text>

          <View style={[styles.settingItem, { 
            backgroundColor: colors.card,
            borderColor: colors.border 
          }]}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="moon-waning-crescent" size={24} color="#2196F3" />
              <Text style={[styles.settingLabel, { color: colors.text }]}>Mode Gelap</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={handleThemeToggle}
              disabled={updating}
              trackColor={{ false: '#ccc', true: '#2196F3' }}
            />
          </View>

          {/* Notifikasi */}
          <View style={[styles.settingItem, { 
            backgroundColor: colors.card,
            borderColor: colors.border 
          }]}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="bell" size={24} color="#2196F3" />
              <Text style={[styles.settingLabel, { color: colors.text }]}>Notifikasi</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </View>

          {/* Privasi */}
          <View style={[styles.settingItem, { 
            backgroundColor: colors.card,
            borderColor: colors.border 
          }]}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="lock" size={24} color="#2196F3" />
              <Text style={[styles.settingLabel, { color: colors.text }]}>Privasi</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View style={[styles.section, { paddingBottom: 30 }]}>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={handleUpdateProfile}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>Simpan Perubahan</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnDanger]}
            onPress={handleLogout}
            disabled={updating}
          >
            <MaterialCommunityIcons name="logout" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.btnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  profilePhotoContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    marginBottom: 15,
    overflow: 'hidden',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  profilePhotoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerSubText: {
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 15,
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  inputText: {
    flex: 1,
    fontSize: 14,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },
  btn: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  btnPrimary: {
    backgroundColor: '#2196F3',
  },
  btnDanger: {
    backgroundColor: '#f44336',
  },
  btnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
