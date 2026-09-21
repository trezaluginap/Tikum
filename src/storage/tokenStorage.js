import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'tikum_api_token';

let SecureStore = null;
try {
  SecureStore = require('expo-secure-store');
} catch (_e) {
  SecureStore = null;
}

const canUseSecureStore = async () => SecureStore && typeof SecureStore.isAvailableAsync === 'function' && (await SecureStore.isAvailableAsync());

export const getToken = async () => {
  if (await canUseSecureStore()) {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) return token;
  }

  return __DEV__ ? await AsyncStorage.getItem(TOKEN_KEY) : null;
};

export const saveToken = async (token) => {
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return;
  }

  if (__DEV__) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return;
  }

  throw new Error('Secure token storage tidak tersedia.');
};

export const deleteToken = async () => {
  if (await canUseSecureStore()) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }

  await AsyncStorage.removeItem(TOKEN_KEY);
};
