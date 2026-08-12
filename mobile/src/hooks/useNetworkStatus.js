import * as Network from 'expo-network';
import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook to monitor network connectivity.
 * Returns { isConnected, isInternetReachable }.
 */
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const checkNetwork = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (!mounted) return;
        setIsConnected(state.isConnected ?? true);
        setIsInternetReachable(state.isInternetReachable ?? true);
      } catch (err) {
        // If network check fails, assume connected
        if (!mounted) return;
        setIsConnected(true);
        setIsInternetReachable(true);
      }
    };

    // Check immediately
    checkNetwork();

    // Poll every 5 seconds (expo-network doesn't have a listener API)
    intervalRef.current = setInterval(checkNetwork, 5000);

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { isConnected, isInternetReachable };
}
