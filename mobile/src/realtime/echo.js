import Constants from 'expo-constants';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';

import { getToken } from '../storage/tokenStorage';

const apiUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;
const reverbHost = process.env.EXPO_PUBLIC_REVERB_HOST || Constants.expoConfig?.extra?.reverbHost;
const reverbPort = Number(process.env.EXPO_PUBLIC_REVERB_PORT || Constants.expoConfig?.extra?.reverbPort || 8080);
const reverbScheme = process.env.EXPO_PUBLIC_REVERB_SCHEME || Constants.expoConfig?.extra?.reverbScheme || 'http';
const reverbAppKey = process.env.EXPO_PUBLIC_REVERB_APP_KEY || Constants.expoConfig?.extra?.reverbAppKey;

const authEndpoint = apiUrl ? `${apiUrl}/broadcasting/auth` : null;

export const createEcho = () => {
    if (!apiUrl || !authEndpoint || !reverbHost || !reverbAppKey) {
        throw new Error('Konfigurasi Reverb belum lengkap.');
    }

    return new Echo({
        broadcaster: 'reverb',
        key: reverbAppKey,
        Pusher,
        wsHost: reverbHost,
        wsPort: reverbPort,
        wssPort: reverbPort,
        forceTLS: reverbScheme === 'https',
        encrypted: reverbScheme === 'https',
        enabledTransports: ['ws', 'wss'],
        disableStats: true,
        authorizer: (channel) => ({
            authorize: async (socketId, callback) => {
                try {
                    const token = await getToken();
                    const response = await fetch(authEndpoint, {
                        method: 'POST',
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({
                            socket_id: socketId,
                            channel_name: channel.name,
                        }),
                    });
                    const data = await response.json().catch(() => ({}));

                    if (!response.ok) {
                        callback(new Error(data?.message || 'Gagal autentikasi realtime.'), null);
                        return;
                    }

                    callback(null, data);
                } catch (error) {
                    callback(error, null);
                }
            },
        }),
    });
};

export const disconnectEcho = (echo) => {
    echo?.disconnect?.();
};
