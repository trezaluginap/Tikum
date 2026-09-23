import AsyncStorage from '@react-native-async-storage/async-storage';

const DARK_MAP_KEY = '@tikum_pref_dark_map';
const NOTIFICATIONS_KEY = '@tikum_pref_notifications';
const VOICE_KEY = '@tikum_pref_voice';

export async function getDarkMapPref() {
  const value = await AsyncStorage.getItem(DARK_MAP_KEY);
  if (value === null) return null;
  return value === '1';
}

export async function setDarkMapPref(enabled) {
  await AsyncStorage.setItem(DARK_MAP_KEY, enabled ? '1' : '0');
}

export async function getNotificationsPref() {
  const value = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
  if (value === null) return null;
  return value === '1';
}

export async function setNotificationsPref(enabled) {
  await AsyncStorage.setItem(NOTIFICATIONS_KEY, enabled ? '1' : '0');
}

export async function getVoicePref() {
  const value = await AsyncStorage.getItem(VOICE_KEY);
  if (value === null) return null;
  return value === '1';
}

export async function setVoicePref(enabled) {
  await AsyncStorage.setItem(VOICE_KEY, enabled ? '1' : '0');
}

export async function loadSettingsPrefs() {
  const [darkMap, notifications, voice] = await Promise.all([
    getDarkMapPref(),
    getNotificationsPref(),
    getVoicePref(),
  ]);
  return {
    darkMap: darkMap === null ? true : darkMap,
    notifications: notifications === null ? true : notifications,
    voice: voice === null ? true : voice,
  };
}