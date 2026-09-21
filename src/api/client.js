import Constants from 'expo-constants';
import { deleteToken, getToken } from '../storage/tokenStorage';

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || (__DEV__ ? 'http://localhost:8000/api' : '')).replace(/\/$/, '');

if (!__DEV__ && /^(https?:\/\/)(localhost|127\.0\.0\.1|10\.0\.2\.2)(:|\/)/i.test(apiUrl)) {
  throw new Error('Production API URL harus memakai host publik HTTPS.');
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const request = async (path, options = {}) => {
  if (!apiUrl) {
    throw new ApiError('EXPO_PUBLIC_API_URL belum diatur.', 0);
  }

  const token = await getToken();
  const isFormData = options.body instanceof FormData;
  const url = `${apiUrl}${path}`;

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    throw new ApiError(error?.message || 'Tidak dapat terhubung ke server.', 0);
  }

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    await deleteToken();
  }

  if (!response.ok) {
    const validationMessage = data?.errors ? Object.values(data.errors).flat()[0] : null;
    throw new ApiError(validationMessage || data?.message || 'Permintaan API gagal.', response.status, data);
  }

  return data;
};
