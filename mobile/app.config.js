import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: 'TiKum',
  slug: 'TiKum',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'tikum',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'TiKum memerlukan akses lokasi di background agar posisi kamu tetap terlihat oleh rombongan konvoi, bahkan saat aplikasi diminimalkan.',
      NSLocationWhenInUseUsageDescription:
        'TiKum memerlukan akses lokasi untuk menampilkan posisi kamu di peta konvoi.',
      UIBackgroundModes: ['location'],
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
    ],
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
        dark: {
          backgroundColor: '#000000',
        },
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'TiKum memerlukan akses lokasi di background agar posisi kamu tetap terlihat oleh rombongan konvoi.',
        locationAlwaysPermission:
          'TiKum memerlukan akses lokasi di background agar posisi kamu tetap terlihat oleh rombongan konvoi.',
        locationWhenInUsePermission:
          'TiKum memerlukan akses lokasi untuk menampilkan posisi kamu di peta konvoi.',
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    'expo-font',
    'expo-router',
    'expo-web-browser',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  entryPoint: './App.js',
  extra: {
    ...config.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    reverbHost: process.env.EXPO_PUBLIC_REVERB_HOST,
    reverbPort: process.env.EXPO_PUBLIC_REVERB_PORT,
    reverbScheme: process.env.EXPO_PUBLIC_REVERB_SCHEME,
    reverbAppKey: process.env.EXPO_PUBLIC_REVERB_APP_KEY,
    resetPasswordUrl: 'tikum://reset-password',
  },
});
