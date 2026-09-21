import AsyncStorage from '@react-native-async-storage/async-storage';

const DARK_MAP_KEY = '@tikum_pref_dark_map';
const NOTIFICATIONS_KEY = '@tikum_pref_notifications';

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

export async function loadSettingsPrefs() {
  const [darkMap, notifications] = await Promise.all([
    getDarkMapPref(),
    getNotificationsPref(),
  ]);
  return {
    darkMap: darkMap === null ? true : darkMap,
    notifications: notifications === null ? true : notifications,
  };
}