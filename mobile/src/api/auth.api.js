import { request } from './client';
import { deleteToken, saveToken } from '../storage/tokenStorage';

const deviceName = 'expo-mobile';

export const register = async ({ email, password, displayName, vehicleName }) => {
    const data = await request('/register', {
        method: 'POST',
        body: JSON.stringify({
            email,
            password,
            display_name: displayName,
            vehicle_name: vehicleName,
            device_name: deviceName,
        }),
    });

    await saveToken(data.token);
    return data;
};

export const login = async ({ email, password }) => {
    const data = await request('/login', {
        method: 'POST',
        body: JSON.stringify({
            email,
            password,
            device_name: deviceName,
        }),
    });

    await saveToken(data.token);
    return data;
};

export const logout = async () => {
    try {
        await request('/logout', { method: 'POST' });
    } finally {
        await deleteToken();
    }
};

export const getCurrentUser = () => request('/me');
