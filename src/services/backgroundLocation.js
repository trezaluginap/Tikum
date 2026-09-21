import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { updateCurrentLocation } from '../api/locations.api';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';
export const ACTIVE_TOUR_SESSION_ID_KEY = 'tikum_active_tour_session_id';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BG Location] Task error:', error.message);
    return;
  }

  if (!data?.locations?.length) return;

  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const sessionId = await AsyncStorage.getItem(ACTIVE_TOUR_SESSION_ID_KEY);
    if (!sessionId) return;

    const location = data.locations[0];
    const { latitude, longitude, heading, speed, accuracy } = location.coords;

    await updateCurrentLocation(sessionId, {
      latitude,
      longitude,
      heading: heading ?? null,
      speed: speed ?? null,
      accuracy: accuracy ?? null,
      recorded_at: new Date(location.timestamp || Date.now()).toISOString(),
    });
  } catch (err) {
    console.error('[BG Location] Update error:', err);
  }
});

export async function startBackgroundLocationTracking(sessionId) {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(ACTIVE_TOUR_SESSION_ID_KEY, sessionId);

    const isTaskDefined = TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
    if (!isTaskDefined) {
      console.warn('[BG Location] Task not defined');
      return false;
    }

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) {
      return true;
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 10,
      timeInterval: 5000,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'TiKum - Convoy Aktif',
        notificationBody: 'Lokasi kamu sedang dipantau oleh rombongan.',
        notificationColor: '#6366F1',
      },
      pausesUpdatesAutomatically: false,
    });

    console.log('[BG Location] Started successfully');
    return true;
  } catch (err) {
    console.error('[BG Location] Start error:', err);
    return false;
  }
}

export async function stopBackgroundLocationTracking() {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }

    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.removeItem(ACTIVE_TOUR_SESSION_ID_KEY);

    console.log('[BG Location] Stopped successfully');
  } catch (err) {
    console.error('[BG Location] Stop error:', err);
  }
}
