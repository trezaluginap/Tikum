import * as Network from 'expo-network';
import { useEffect, useRef, useState } from 'react';

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
        if (!mounted) return;
        setIsConnected(true);
        setIsInternetReachable(true);
      }
    };

    checkNetwork();
    intervalRef.current = setInterval(checkNetwork, 5000);

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { isConnected, isInternetReachable };
}
