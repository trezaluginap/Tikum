import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'tikum_api_token';

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);

export const saveToken = (token) => SecureStore.setItemAsync(TOKEN_KEY, token);

export const deleteToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);
