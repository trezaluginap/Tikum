import Constants from 'expo-constants';
import { deleteToken, getToken } from '../storage/tokenStorage';

const apiUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;

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
    const response = await fetch(`${apiUrl}${path}`, {
        ...options,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

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
