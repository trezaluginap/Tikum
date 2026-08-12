import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
  useFonts,
} from '@expo-google-fonts/inter';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

// Register background location task at module load time (required by expo-task-manager)
import './src/services/backgroundLocation';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { navigationRef } from './src/navigation/rootNavigation';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import MapScreen from './src/screens/MapScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import RegisterScreens from './src/screens/RegisterScreens';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

const darkNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0F172A',
    card: '#0F172A',
  },
};

const linking = {
  prefixes: ['tikum://'],
  config: {
    screens: {
      ResetPassword: 'reset-password',
    },
  },
};

const RootNavigator = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={darkNavTheme} linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0F172A' },
          animation: 'fade',
        }}
      >
        {session ? (
          <Stack.Group>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Map" component={MapScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </Stack.Group>
        ) : (
          <Stack.Group>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreens} />
          </Stack.Group>
        )}
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}