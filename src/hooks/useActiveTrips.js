import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { supabase } from '../../supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook untuk mengambil room aktif milik user (sebagai host) dari Supabase.
 * Auto-refresh saat screen mendapat fokus.
 */
export function useActiveTrips() {
  const { user } = useAuth();
  const [activeTrips, setActiveTrips] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchActiveTrips = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          id,
          room_pin,
          created_at,
          room_trips (
            origin_latitude,
            origin_longitude,
            destination_latitude,
            destination_longitude,
            vehicle_count
          )
        `)
        .eq('host_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setActiveTrips(data || []);
    } catch (error) {
      console.error('[useActiveTrips] Error:', error);
      setActiveTrips([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Refresh otomatis saat screen refocus
  useFocusEffect(
    useCallback(() => {
      fetchActiveTrips();
    }, [fetchActiveTrips])
  );

  return { activeTrips, loading, refetch: fetchActiveTrips };
}
