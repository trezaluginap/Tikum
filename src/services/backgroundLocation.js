import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { supabase } from '../../supabase';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';

/**
 * Background task handler — receives location updates even when app is backgrounded.
 * Upserts the user's latest position to Supabase `locations` table.
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BG Location] Task error:', error.message);
    return;
  }

  if (!data?.locations?.length) return;

  try {
    // Get current session
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    // Get the stored roomId from the task body
    const location = data.locations[0];
    const { latitude, longitude, heading } = location.coords;

    // We store the active roomId in AsyncStorage so bg task can read it
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const roomId = await AsyncStorage.getItem('tikum_active_room_id');
    if (!roomId) return;

    await supabase.from('locations').upsert({
      user_id: userId,
      room_id: roomId,
      latitude,
      longitude,
      heading: heading || 0,
      updated_at: new Date(),
    });
  } catch (err) {
    console.error('[BG Location] Upsert error:', err);
  }
});

/**
 * Start background location tracking.
 * Call this when entering a room.
 */
export async function startBackgroundLocationTracking(roomId) {
  try {
    // Store roomId for background task access
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem('tikum_active_room_id', roomId);

    const isTaskDefined = TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
    if (!isTaskDefined) {
      console.warn('[BG Location] Task not defined');
      return false;
    }

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) {
      // Already running, just update the roomId
      return true;
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 10, // Update every 10 meters
      timeInterval: 5000, // At most every 5 seconds
      showsBackgroundLocationIndicator: true, // iOS blue bar
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

/**
 * Stop background location tracking.
 * Call this when leaving a room.
 */
export async function stopBackgroundLocationTracking() {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }

    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.removeItem('tikum_active_room_id');

    console.log('[BG Location] Stopped successfully');
  } catch (err) {
    console.error('[BG Location] Stop error:', err);
  }
}
