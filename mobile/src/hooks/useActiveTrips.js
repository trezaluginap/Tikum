import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { getActiveRooms } from '../api/rooms.api';
import { useAuth } from '../contexts/AuthContext';

const adaptTrip = (trip) => {
  if (!trip) return trip;
  const modeCode = trip.vehicle_type === 'motorcycle' ? 1 : (trip.use_tolls === false ? 3 : 2);
  return { ...trip, vehicle_count: modeCode * 1000 + trip.vehicle_count };
};

const adaptRoom = (room) => ({
  ...room,
  room_trips: adaptTrip(room.room_trips || room.trip),
});

export function useActiveTrips() {
  const { user } = useAuth();
  const [activeTrips, setActiveTrips] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchActiveTrips = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getActiveRooms();
      setActiveTrips((data.rooms || []).map(adaptRoom));
    } catch (error) {
      console.error('[useActiveTrips] Error:', error);
      setActiveTrips([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchActiveTrips();
    }, [fetchActiveTrips])
  );

  return { activeTrips, loading, refetch: fetchActiveTrips };
}
