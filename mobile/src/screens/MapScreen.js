import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  Platform,
  View,
  Image,
  Linking,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { supabase } from '../../supabase';
import { getCurrentLocations, updateCurrentLocation } from '../api/locations.api';
import { closeRoom, leaveRoom } from '../api/rooms.api';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts, fontSize, radius, spacing } from '../constants/theme';
import { fetchValhallaRoute } from '../hooks/useOsrmRoute';
import { createEcho, disconnectEcho } from '../realtime/echo';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
} from '../services/backgroundLocation';
import ConvoyDialog from '../components/common/ConvoyDialog';
import ConvoyToast from '../components/common/ConvoyToast';

// Dark map style
const mapDarkStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#0e1626' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
];

export default function MapScreen({ route, navigation }) {
  const {
    roomId, tourSessionId, pin, origin, destination,
    originName, destinationName,
    vehicleCount, role,
    preloadedRoute, preloadedSummary,
  } = route.params || {};

  const { user } = useAuth();
  const mapRef = useRef(null);
  const roomClosedHandledRef = useRef(false);
  const [myLocation, setMyLocation] = useState(null);
  const [friendsLocations, setFriendsLocations] = useState([]);
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [initialRegion, setInitialRegion] = useState({
    latitude: -6.9175, longitude: 107.6191,
    latitudeDelta: 0.1, longitudeDelta: 0.1,
  });

  // ── Network Status ──
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isOffline = !isConnected || !isInternetReachable;

  const displayName = user?.profile?.display_name || user?.user_metadata?.display_name || 'Pengguna';

  // ── Decode routing mode from encoded vehicleCount ──
  const encodedVC = vehicleCount || 0;
  const modeCode = encodedVC >= 1000 ? Math.floor(encodedVC / 1000) : 2;
  const decodedVehicleCount = encodedVC >= 1000 ? (encodedVC % 1000) : encodedVC;
  const initialRoutingMode = modeCode === 1 ? 'motorcycle' : modeCode === 3 ? 'auto_no_toll' : 'auto_toll';

  // ── Routing Mode & In-App Navigation ──
  const [routingMode] = useState(initialRoutingMode); // fixed from room creation
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  // ── Interactive Animations ──
  const sosPulseAnim = useRef(new Animated.Value(1)).current;
  const tbtSlideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sosPulseAnim, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(sosPulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (isNavigating) {
      Animated.spring(tbtSlideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(tbtSlideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isNavigating]);

  const [routeLoading, setRouteLoading] = useState(false);
  const [navRouteCoords, setNavRouteCoords] = useState([]); // route from myLocation to origin
  const [navRouteSummary, setNavRouteSummary] = useState(null);

  // ── Navigation Mode & Convoy Radar States ──
  const [isNavigating, setIsNavigating] = useState(false);
  const [isAutoFollow, setIsAutoFollow] = useState(true);
  const [maneuvers, setManeuvers] = useState([]);
  const [sosActive, setSosActive] = useState(false);
  const [sosUsers, setSosUsers] = useState({}); // { [userId]: true }

  // ── Custom UI Notifications & Dialogs ──
  const [dialogConfig, setDialogConfig] = useState({ visible: false });
  const [toastConfig, setToastConfig] = useState({ visible: false });

  const showToast = (type, title, message, duration = 4000) => {
    setToastConfig({ visible: true, type, title, message });
    setTimeout(() => setToastConfig((prev) => ({ ...prev, visible: false })), duration);
  };

  // ── User Profiles Cache (Display Name & Photo URL) ──
  const [userProfiles, setUserProfiles] = useState({});

  const cacheProfilesFromLocations = (locations) => {
    const nextProfiles = {};
    locations.forEach((location) => {
      const profile = location.user?.profile;
      if (!profile) return;
      nextProfiles[location.user_id] = {
        name: profile.display_name || 'Member',
        photoUrl: profile.avatar_url || profile.avatar_path || null,
      };
    });
    if (Object.keys(nextProfiles).length > 0) {
      setUserProfiles(prev => ({ ...prev, ...nextProfiles }));
    }
  };

  const myProfile = {
    name: user?.profile?.display_name || displayName,
    photoUrl: user?.profile?.avatar_url || user?.user_metadata?.profile_photo_url || null
  };

  // ── Init: preloaded route + region ──
  useEffect(() => {
    if (preloadedRoute?.length > 0) {
      setRouteCoords(preloadedRoute);
      if (preloadedSummary) setRouteSummary(preloadedSummary);
    }
    if (origin && destination) {
      const minLat = Math.min(origin.latitude, destination.latitude);
      const maxLat = Math.max(origin.latitude, destination.latitude);
      const minLng = Math.min(origin.longitude, destination.longitude);
      const maxLng = Math.max(origin.longitude, destination.longitude);
      setInitialRegion({
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max((maxLat - minLat) * 1.3, 0.1),
        longitudeDelta: Math.max((maxLng - minLng) * 1.3, 0.1),
      });
    }
  }, []);

  // ── Sync profile, fetch initial locations/profiles, track location + Supabase realtime ──
  useEffect(() => {
    let echoClient;
    let echoChannel;
    let subscriptionSos;
    let locationWatcher;
    const currentUserId = user?.id;

    const syncCurrentLocations = async () => {
      const data = await getCurrentLocations(tourSessionId);
      const locations = data.locations || [];
      setFriendsLocations(locations.filter(f => f.user_id !== currentUserId));
      cacheProfilesFromLocations(locations);
    };

    const handleRoomClosed = async () => {
      if (roomClosedHandledRef.current) return;
      roomClosedHandledRef.current = true;
      if (locationWatcher) locationWatcher.remove();
      if (echoChannel) {
        echoChannel.stopListening('.member.location.updated');
        echoChannel.stopListening('.room.closed');
      }
      if (echoClient) {
        echoClient.leave(`tour-session.${tourSessionId}`);
        disconnectEcho(echoClient);
      }
      await stopBackgroundLocationTracking();
      setFriendsLocations([]);
      setDialogConfig({
        visible: true,
        type: 'warning',
        icon: 'door-closed',
        title: 'Room Ditutup',
        message: 'Perjalanan telah diselesaikan oleh Leader.',
        buttons: [
          { text: 'KEMBALI KE BERANDA', style: 'primary', onPress: () => navigation.navigate('Home') },
        ],
      });
    };

    (async () => {
      try {
        if (!currentUserId) { setErrorMsg('User tidak terautentikasi'); return; }

        // Request foreground permission first
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus !== 'granted') {
          setPermissionDenied(true);
          setErrorMsg('Izin lokasi ditolak. Aktifkan di Pengaturan.');
          return;
        }
        if (!roomId || !tourSessionId) return;

        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus === 'granted') {
          await startBackgroundLocationTracking(tourSessionId);
        } else {
          console.warn('Background location permission not granted - foreground only mode');
        }

        try {
          await syncCurrentLocations();
        } catch (err) {
          if (err.status === 401) setErrorMsg('Sesi login berakhir. Silakan login ulang.');
          else if (err.status === 403) setErrorMsg('Kamu bukan anggota aktif sesi ini.');
          else if (err.status === 422) setErrorMsg('Sesi perjalanan tidak aktif.');
          else showToast('warning', 'Lokasi', 'Gagal memuat lokasi awal. Mencoba lanjut dengan GPS kamu.');
        }

        // 3. Get current position immediately with robust fallback chain
        try {
          let initialLoc = await Location.getLastKnownPositionAsync();
          if (!initialLoc) {
            initialLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          }
          if (initialLoc?.coords) {
            const { latitude, longitude, heading } = initialLoc.coords;
            setMyLocation({ latitude, longitude, heading });

            await updateCurrentLocation(tourSessionId, {
              latitude,
              longitude,
              heading: heading ?? null,
              speed: initialLoc.coords.speed ?? null,
              accuracy: initialLoc.coords.accuracy ?? null,
              recorded_at: new Date(initialLoc.timestamp || Date.now()).toISOString(),
            });
          } else if (origin?.latitude && origin?.longitude) {
            setMyLocation({ latitude: origin.latitude, longitude: origin.longitude, heading: 0 });
          }
        } catch (err) {
          console.warn('Initial location fallback engaged:', err?.message);
          if (origin?.latitude && origin?.longitude) {
            setMyLocation({ latitude: origin.latitude, longitude: origin.longitude, heading: 0 });
          }
        }

        // 4. Watch position
        locationWatcher = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 5 },
          async (location) => {
            const { latitude, longitude, heading, speed, accuracy } = location.coords;
            setMyLocation({ latitude, longitude, heading });

            try {
              await updateCurrentLocation(tourSessionId, {
                latitude,
                longitude,
                heading: heading ?? null,
                speed: speed ?? null,
                accuracy: accuracy ?? null,
                recorded_at: new Date(location.timestamp || Date.now()).toISOString(),
              });
            } catch (err) {
              if (err.status === 401) setErrorMsg('Sesi login berakhir. Silakan login ulang.');
              else if (err.status === 403) setErrorMsg('Kamu bukan anggota aktif sesi ini.');
              else if (err.status === 422) setErrorMsg('Sesi perjalanan tidak aktif.');
              else console.error('Location update error:', err);
            }
          }
        );

        // 5. Realtime subscription (Locations via Reverb)
        try {
          echoClient = createEcho();
          echoChannel = echoClient.private(`tour-session.${tourSessionId}`)
            .listen('.member.location.updated', (payload) => {
              if (!payload?.user_id || payload.user_id === currentUserId) return;

              updateFriends({
                user_id: payload.user_id,
                latitude: payload.latitude,
                longitude: payload.longitude,
                heading: payload.heading,
                speed: payload.speed,
                accuracy: payload.accuracy,
                recorded_at: payload.recorded_at,
                received_at: payload.received_at,
                updated_at: payload.received_at,
                is_stale: payload.is_stale,
              });

              setUserProfiles(prev => ({
                ...prev,
                [payload.user_id]: {
                  name: payload.display_name || prev[payload.user_id]?.name || 'Member',
                  photoUrl: payload.avatar_url || prev[payload.user_id]?.photoUrl || null,
                },
              }));
            })
            .listen('.room.closed', () => {
              handleRoomClosed().catch(() => null);
            });

          echoClient.connector?.pusher?.connection?.bind('connected', () => {
            syncCurrentLocations().catch(() => null);
          });
          echoClient.connector?.pusher?.connection?.bind('unavailable', () => {
            showToast('warning', 'Realtime', 'Koneksi realtime terputus. Data akan disinkronkan ulang saat tersambung.');
          });
          echoClient.connector?.pusher?.connection?.bind('error', () => {
            showToast('warning', 'Realtime', 'Realtime lokasi bermasalah. Lokasi awal tetap memakai API.');
          });
        } catch (err) {
          showToast('warning', 'Realtime', err?.message || 'Gagal mengaktifkan realtime lokasi.');
        }

        // 6. Realtime subscription (SOS Emergency Alerts)
        subscriptionSos = supabase
          .channel(`room:${roomId}:sos`)
          .on('broadcast', { event: 'sos_alert' }, (payload) => {
            const data = payload?.payload;
            if (!data?.userId || data.userId === currentUserId) return;

            if (data.isSos) {
              setSosUsers((prev) => ({ ...prev, [data.userId]: true }));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              showToast('danger', '🚨 SOS DARURAT CONVOY!', `${data.userName || 'Member'} memerlukan bantuan darurat! Cek posisi di radar.`);
            } else {
              setSosUsers((prev) => {
                const copy = { ...prev };
                delete copy[data.userId];
                return copy;
              });
            }
          })
          .subscribe();

      } catch (error) {
        console.error('Map init error:', error);
        setErrorMsg('Gagal menginisialisasi peta');
      }
    })();

    return () => {
      if (echoChannel) {
        echoChannel.stopListening('.member.location.updated');
        echoChannel.stopListening('.room.closed');
      }
      if (echoClient) {
        echoClient.leave(`tour-session.${tourSessionId}`);
        disconnectEcho(echoClient);
      }
      if (subscriptionSos) supabase.removeChannel(subscriptionSos);
      if (locationWatcher) locationWatcher.remove();
      stopBackgroundLocationTracking();
    };
  }, [roomId]);

  const updateFriends = (newLoc) => {
    setFriendsLocations((prev) => {
      if (!newLoc?.user_id) return prev;
      const filtered = prev.filter(f => f.user_id !== newLoc.user_id);
      return [...filtered, newLoc];
    });
  };

  // ── Valhalla route fetch (convoy route: origin → destination) ──
  const fetchConvoyRoute = async (mode) => {
    if (!origin || !destination) return;
    setRouteLoading(true);
    try {
      const result = await fetchValhallaRoute(origin, destination, mode);
      if (result) {
        setRouteCoords(result.routeCoords);
        setRouteSummary(result.routeSummary);
        if (result.maneuvers) setManeuvers(result.maneuvers);
      }
    } catch (err) {
      console.error('Valhalla convoy route error:', err);
    } finally {
      setRouteLoading(false);
    }
  };

  useEffect(() => {
    if (preloadedRoute?.length > 0) return; // already have preloaded
    fetchConvoyRoute(routingMode);
  }, [origin, destination]);

  // ── In-app nav route (myLocation → origin) ──
  useEffect(() => {
    if (!myLocation || !origin) {
      setNavRouteCoords([]);
      setNavRouteSummary(null);
      return;
    }
    const dist = parseFloat(getDistance(myLocation.latitude, myLocation.longitude, origin.latitude, origin.longitude));
    if (dist <= 0.5) {
      setNavRouteCoords([]);
      setNavRouteSummary(null);
      return;
    }
    // Fetch in-app nav route
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchValhallaRoute(myLocation, origin, routingMode);
        if (cancelled) return;
        if (result) {
          setNavRouteCoords(result.routeCoords);
          setNavRouteSummary(result.routeSummary);
        }
      } catch (err) {
        console.error('Nav route error:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [
    myLocation?.latitude && Math.round(myLocation.latitude * 100),
    myLocation?.longitude && Math.round(myLocation.longitude * 100),
    origin?.latitude, origin?.longitude,
    routingMode,
  ]);


  // ── Camera Auto-Follow in Navigation Mode ──
  useEffect(() => {
    if (isNavigating && isAutoFollow && myLocation && mapRef.current) {
      try {
        mapRef.current.animateCamera(
          {
            center: { latitude: myLocation.latitude, longitude: myLocation.longitude },
            pitch: 55,
            heading: myLocation.heading || 0,
            zoom: 18,
          },
          { duration: 800 }
        );
      } catch (e) {
        console.error('Animate camera error:', e);
      }
    }
  }, [
    isNavigating,
    isAutoFollow,
    myLocation?.latitude && Math.round(myLocation.latitude * 1000),
    myLocation?.longitude && Math.round(myLocation.longitude * 1000),
    myLocation?.heading,
  ]);

  // ── Fit map to route ──
  useEffect(() => {
    if (!isNavigating && mapRef.current && routeCoords.length > 0) {
      try {
        mapRef.current.fitToCoordinates(routeCoords, {
          edgePadding: { top: 120, right: 50, bottom: 280, left: 50 },
          animated: true,
        });
      } catch (err) { console.error('fitToCoordinates error:', err); }
    }
  }, [routeCoords, isNavigating]);

  // ── Handlers ──
  const handleCopyPin = async () => {
    if (!pin) return;
    await Clipboard.setStringAsync(pin);
    if (Platform.OS === 'android') {
      ToastAndroid.show('PIN disalin!', ToastAndroid.SHORT);
    } else {
      Alert.alert('Disalin', `PIN ${pin} berhasil disalin`);
    }
  };

  const handleSharePin = async () => {
    if (!pin) return;
    try {
      await Share.share({
        message: `🚗 Gabung konvoi TiKum!\n\nPIN Room: ${pin}\n\nDownload TiKum dan masukkan PIN di atas untuk bergabung ke rombongan.`,
        title: 'Bagikan PIN TiKum',
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const handleLeaveRoom = () => {
    const cleanupLocal = async () => {
      await stopBackgroundLocationTracking();
      navigation.goBack();
    };

    const cleanupAndLeave = async () => {
      try {
        await leaveRoom(roomId);
        await cleanupLocal();
      } catch (error) {
        console.error('Error leaving room:', error);
        showToast('danger', 'Error', error?.message || 'Gagal keluar dari room.');
      }
    };

    if (role === 'leader') {
      setDialogConfig({
        visible: true,
        type: 'danger',
        icon: 'exit-run',
        title: 'Keluar dari Room',
        message: 'Pilih tindakan untuk sesi konvoi ini:',
        buttons: [
          { text: 'Batal', style: 'cancel' },
          { text: 'Keluar Saja', style: 'secondary', onPress: cleanupLocal },
          {
            text: 'Bubarkan Sesi',
            style: 'destructive',
            onPress: async () => {
              try {
                roomClosedHandledRef.current = true;
                await closeRoom(roomId);
                await stopBackgroundLocationTracking();
                navigation.goBack();
              } catch (error) {
                roomClosedHandledRef.current = false;
                showToast('danger', 'Error', error?.message || 'Gagal membubarkan sesi.');
              }
            },
          },
        ],
      });
    } else {
      setDialogConfig({
        visible: true,
        type: 'warning',
        icon: 'account-remove',
        title: 'Keluar Room?',
        message: 'Kamu akan keluar dari pemantauan radar ini.',
        buttons: [
          { text: 'Batal', style: 'cancel' },
          { text: 'Keluar', style: 'destructive', onPress: cleanupAndLeave },
        ],
      });
    }
  };

  const handleRecenter = () => {
    if (!mapRef.current) return;
    if (routeCoords.length > 0) {
      mapRef.current.fitToCoordinates(routeCoords, {
        edgePadding: { top: 120, right: 50, bottom: 280, left: 50 },
        animated: true,
      });
    } else if (myLocation) {
      mapRef.current.animateToRegion({
        ...myLocation, latitudeDelta: 0.01, longitudeDelta: 0.01,
      }, 500);
    }
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    // Rumus Haversine
    const R = 6371; // Radius bumi dalam km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; 
    return distance.toFixed(1); // satu desimal
  };

  const memberCount = friendsLocations.length + 1; // +1 untuk diri sendiri

  // ── Proximity Check to Tikum (Origin) ──
  const distanceToTikum = myLocation && origin
    ? parseFloat(getDistance(myLocation.latitude, myLocation.longitude, origin.latitude, origin.longitude))
    : null;

  // ── Last Seen helper ──
  const getLastSeen = (updatedAt) => {
    if (!updatedAt) return null;
    const diff = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000);
    if (diff < 60) return 'baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    return `${Math.floor(diff / 3600)}j lalu`;
  };

  // ── Navigation Mode Controls ──
  const handleToggleNavigation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextState = !isNavigating;
    setIsNavigating(nextState);
    setIsAutoFollow(true);

    if (nextState && myLocation && mapRef.current) {
      mapRef.current.animateCamera({
        center: { latitude: myLocation.latitude, longitude: myLocation.longitude },
        pitch: 55,
        heading: myLocation.heading || 0,
        zoom: 18,
      }, { duration: 600 });
    } else if (!nextState && mapRef.current) {
      mapRef.current.animateCamera({ pitch: 0, heading: 0 }, { duration: 400 });
      if (routeCoords.length > 0) {
        mapRef.current.fitToCoordinates(routeCoords, {
          edgePadding: { top: 120, right: 50, bottom: 280, left: 50 },
          animated: true,
        });
      }
    }
  };

  // ── SOS Emergency Trigger ──
  const handleToggleSOS = () => {
    const nextSosState = !sosActive;
    if (nextSosState) {
      setDialogConfig({
        visible: true,
        type: 'danger',
        icon: 'alert-decagram',
        title: 'KIRIM SINYAL SOS?',
        message: 'Sinyal darurat akan dikirimkan ke seluruh anggota rombongan konvoi!',
        buttons: [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'YA, KIRIM SOS',
            style: 'destructive',
            onPress: async () => {
              setSosActive(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              const channel = supabase.channel(`room:${roomId}:sos`);
              await channel.send({
                type: 'broadcast',
                event: 'sos_alert',
                payload: { userId: user?.id, isSos: true, userName: displayName },
              });
              showToast('danger', 'SOS AKTIF', 'Sinyal SOS telah dikirimkan ke rombongan.');
            },
          },
        ],
      });
    } else {
      setSosActive(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      supabase.channel(`room:${roomId}:sos`).send({
        type: 'broadcast',
        event: 'sos_alert',
        payload: { userId: user?.id, isSos: false, userName: displayName },
      });
      showToast('success', 'SOS NONAKTIF', 'Status darurat telah diminimalkan.');
    }
  };

  // ── Convoy Order Engine ──
  const getConvoyOrder = () => {
    if (!routeCoords || routeCoords.length === 0) return { ahead: null, behind: null, rank: 1, total: 1 };

    const getPolylineIndex = (loc) => {
      if (!loc?.latitude || !loc?.longitude) return -1;
      let minIdx = 0;
      let minVal = Infinity;
      const step = Math.max(1, Math.floor(routeCoords.length / 150));
      for (let i = 0; i < routeCoords.length; i += step) {
        const d = Math.pow(routeCoords[i].latitude - loc.latitude, 2) + Math.pow(routeCoords[i].longitude - loc.longitude, 2);
        if (d < minVal) {
          minVal = d;
          minIdx = i;
        }
      }
      return minIdx;
    };

    const members = [];
    if (myLocation) {
      members.push({
        userId: user?.id,
        name: 'Kamu',
        isSelf: true,
        index: getPolylineIndex(myLocation),
        lat: myLocation.latitude,
        lng: myLocation.longitude,
      });
    }

    friendsLocations.forEach((f) => {
      const p = userProfiles[f.user_id] || { name: 'Member' };
      members.push({
        userId: f.user_id,
        name: p.name,
        isSelf: false,
        index: getPolylineIndex(f),
        lat: f.latitude,
        lng: f.longitude,
      });
    });

    // Sort descending by index (higher index = closer to Destination = Lead)
    members.sort((a, b) => b.index - a.index);

    const selfIdx = members.findIndex((m) => m.isSelf);
    if (selfIdx === -1) return { ahead: null, behind: null, rank: 1, total: members.length };

    const ahead = selfIdx > 0 ? members[selfIdx - 1] : null;
    const behind = selfIdx < members.length - 1 ? members[selfIdx + 1] : null;

    if (ahead && myLocation) {
      ahead.distanceKm = getDistance(myLocation.latitude, myLocation.longitude, ahead.lat, ahead.lng);
    }
    if (behind && myLocation) {
      behind.distanceKm = getDistance(myLocation.latitude, myLocation.longitude, behind.lat, behind.lng);
    }

    return {
      ahead,
      behind,
      rank: selfIdx + 1,
      total: members.length,
    };
  };

  // ── Next Maneuver Resolver ──
  const getNextManeuver = () => {
    if (!maneuvers || maneuvers.length === 0 || !myLocation || routeCoords.length === 0) return null;

    let minIdx = 0;
    let minVal = Infinity;
    for (let i = 0; i < routeCoords.length; i += 5) {
      const d = Math.pow(routeCoords[i].latitude - myLocation.latitude, 2) + Math.pow(routeCoords[i].longitude - myLocation.longitude, 2);
      if (d < minVal) {
        minVal = d;
        minIdx = i;
      }
    }

    const upcoming = maneuvers.find((m) => (m.begin_shape_index || 0) >= minIdx);
    if (!upcoming) return maneuvers[maneuvers.length - 1] || null;

    const targetCoord = routeCoords[upcoming.begin_shape_index] || destination;
    const distKm = targetCoord ? getDistance(myLocation.latitude, myLocation.longitude, targetCoord.latitude, targetCoord.longitude) : '0.0';

    const translateInstruction = (text) => {
      if (!text) return 'Tetap ikuti rute konvoi';
      let str = text;
      str = str.replace(/Drive (west|east|north|south|north-west|north-east|south-west|south-east) on/gi, (match, dir) => {
        const dirMap = {
          west: 'ke barat di', east: 'ke timur di', north: 'ke utara di', south: 'ke selatan di',
          'north-west': 'ke barat laut di', 'north-east': 'ke timur laut di',
          'south-west': 'ke barat daya di', 'south-east': 'ke tenggara di',
        };
        return `Lurus terus ${dirMap[dir.toLowerCase()] || ''}`;
      });
      str = str.replace(/Drive (west|east|north|south|north-west|north-east|south-west|south-east)/gi, (match, dir) => {
        const dirMap = {
          west: 'ke barat', east: 'ke timur', north: 'ke utara', south: 'ke selatan',
          'north-west': 'ke barat laut', 'north-east': 'ke timur laut',
          'south-west': 'ke barat daya', 'south-east': 'ke tenggara',
        };
        return `Jalan ${dirMap[dir.toLowerCase()] || ''}`;
      });
      str = str.replace(/Turn right/gi, 'Belok kanan');
      str = str.replace(/Turn left/gi, 'Belok kiri');
      str = str.replace(/Make a U-turn/gi, 'Putar balik');
      str = str.replace(/Merge/gi, 'Gabung rute');
      str = str.replace(/Keep right/gi, 'Ambil jalur kanan');
      str = str.replace(/Keep left/gi, 'Ambil jalur kiri');
      str = str.replace(/Take the ramp/gi, 'Masuk ke jalan layang');
      str = str.replace(/Destination/gi, 'Titik tujuan');
      return str;
    };

    return {
      instruction: translateInstruction(upcoming.instruction),
      distanceKm: distKm,
      type: upcoming.type || 0,
    };
  };

  const getManeuverIcon = (type) => {
    switch (type) {
      case 1: case 2: case 3: return 'arrow-up-bold';
      case 10: case 11: case 15: return 'arrow-right-top';
      case 12: case 13: case 14: return 'arrow-sharp-right';
      case 17: case 18: case 22: return 'arrow-left-top';
      case 19: case 20: case 21: return 'arrow-sharp-left';
      case 26: case 27: return 'u-turn';
      case 28: case 29: return 'rotate-right';
      default: return 'navigation-variant';
    }
  };

  const convoyOrder = getConvoyOrder();
  const nextManeuver = getNextManeuver();

  // ─────────────────────────────
  //  RENDER
  // ─────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* ══ CUSTOM OVERLAY DIALOGS & TOASTS ══ */}
      <ConvoyToast
        visible={toastConfig.visible}
        type={toastConfig.type}
        title={toastConfig.title}
        message={toastConfig.message}
        onClose={() => setToastConfig((prev) => ({ ...prev, visible: false }))}
      />

      <ConvoyDialog
        visible={dialogConfig.visible}
        type={dialogConfig.type}
        icon={dialogConfig.icon}
        title={dialogConfig.title}
        message={dialogConfig.message}
        buttons={dialogConfig.buttons}
        onClose={() => setDialogConfig({ visible: false })}
      />

      {/* ══ MAP ══ */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        customMapStyle={mapDarkStyle}
      >
        {/* Convoy route (primary) */}
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={4} />
        )}

        {/* In-app navigation route to Tikum (secondary) */}
        {navRouteCoords.length > 0 && (
          <Polyline
            coordinates={navRouteCoords}
            strokeColor="#F59E0B"
            strokeWidth={3}
            lineDashPattern={[8, 6]}
          />
        )}

        {origin && (
          <Marker coordinate={origin} title={originName || 'Asal'}>
            <View style={styles.markerOrigin}>
              <MaterialCommunityIcons name="flag-variant" size={16} color={colors.success} />
            </View>
          </Marker>
        )}

        {destination && (
          <Marker coordinate={destination} title={destinationName || 'Tujuan'}>
            <View style={styles.markerDest}>
              <MaterialCommunityIcons name="flag-checkered" size={16} color={colors.danger} />
            </View>
          </Marker>
        )}

        {/* User location marker with avatar/initials */}
        {myLocation && (
          <Marker coordinate={myLocation} rotation={myLocation.heading} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.myMarkerWrap}>
              <View style={styles.myMarkerDot}>
                {myProfile.photoUrl ? (
                  <Image source={{ uri: myProfile.photoUrl }} style={styles.markerAvatarImg} />
                ) : (
                  <Text style={styles.markerInitials}>{myProfile.name.substring(0, 2).toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.markerLabel}>
                <Text style={styles.markerLabelText}>Kamu</Text>
              </View>
            </View>
          </Marker>
        )}

        {/* Friend markers with avatar/initials and display name */}
        {friendsLocations.map((friend) => {
          const profile = userProfiles[friend.user_id] || { name: 'Member', photoUrl: null };
          const isUserSos = !!sosUsers[friend.user_id];
          return (
            <Marker
              key={friend.user_id}
              coordinate={{ latitude: friend.latitude, longitude: friend.longitude }}
              rotation={friend.heading}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.friendMarkerWrap}>
                <View style={[styles.friendMarkerDot, isUserSos && styles.sosMarkerDot]}>
                  {profile.photoUrl && !profile.photoUrl.startsWith('file://') ? (
                    <Image source={{ uri: profile.photoUrl }} style={styles.friendMarkerAvatarImg} />
                  ) : (
                    <Text style={styles.friendMarkerInitials}>{profile.name.substring(0, 2).toUpperCase()}</Text>
                  )}
                </View>
                <View style={[styles.markerLabel, isUserSos && styles.sosMarkerLabel]}>
                  <Text style={styles.markerLabelText} numberOfLines={1}>
                    {isUserSos ? `⚠️ ${profile.name}` : profile.name}
                  </Text>
                </View>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* ══ TOP BAR ══ */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarBtn} onPress={handleLeaveRoom}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>TiKum</Text>
          {pin && (
            <View style={styles.pinRow}>
              <TouchableOpacity style={styles.pinBadge} onPress={handleCopyPin} activeOpacity={0.7}>
                <Text style={styles.pinBadgeLabel}>PIN</Text>
                <Text style={styles.pinBadgeValue}>{pin}</Text>
                <MaterialCommunityIcons name="content-copy" size={12} color={colors.primaryMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={handleSharePin} activeOpacity={0.7}>
                <MaterialCommunityIcons name="share-variant" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.topBarBtn, isNavigating && isAutoFollow && { backgroundColor: colors.primary }]}
          onPress={() => {
            setIsAutoFollow(true);
            handleRecenter();
          }}
        >
          <MaterialCommunityIcons
            name="crosshairs-gps"
            size={22}
            color={isNavigating && isAutoFollow ? colors.white : colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* ══ TURN-BY-TURN GUIDANCE BANNER (In Navigation Mode) ══ */}
      {isNavigating && nextManeuver && (
        <Animated.View style={[styles.tbtBanner, { transform: [{ translateY: tbtSlideAnim }] }]}>
          <View style={styles.tbtIconContainer}>
            <MaterialCommunityIcons
              name={getManeuverIcon(nextManeuver.type)}
              size={32}
              color={colors.white}
            />
          </View>
          <View style={styles.tbtTextContainer}>
            <Text style={styles.tbtDistance}>
              {parseFloat(nextManeuver.distanceKm) < 1
                ? `${Math.round(parseFloat(nextManeuver.distanceKm) * 1000)} m`
                : `${nextManeuver.distanceKm} km`}
            </Text>
            <Text style={styles.tbtInstruction} numberOfLines={2}>
              {nextManeuver.instruction}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* ══ OFFLINE BANNER ══ */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <MaterialCommunityIcons name="wifi-off" size={16} color={colors.warning} />
          <Text style={styles.offlineBannerText}>
            Koneksi terputus — lokasi tidak ter-update
          </Text>
        </View>
      )}

      {/* ══ PERMISSION DENIED BANNER ══ */}
      {permissionDenied && (
        <View style={styles.permissionBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.permissionBannerTitle}>Izin Lokasi Ditolak</Text>
            <Text style={styles.permissionBannerSub}>
              TiKum memerlukan akses lokasi untuk menampilkan posisimu di radar konvoi.
            </Text>
          </View>
          <TouchableOpacity style={styles.permissionSettingsBtn} onPress={handleOpenSettings} activeOpacity={0.7}>
            <MaterialCommunityIcons name="cog" size={14} color={colors.white} />
            <Text style={styles.permissionSettingsBtnText}>Buka Settings</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ══ TIKUM PROXIMITY WARNING BANNER ══ */}
      {distanceToTikum !== null && distanceToTikum > 0.5 && (
        <View style={styles.tikumBanner}>
          <View style={styles.tikumBannerLeft}>
            <MaterialCommunityIcons name="map-marker-alert" size={20} color="#F59E0B" />
            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
              <Text style={styles.tikumBannerTitle}>Belum di Titik Kumpul</Text>
              <Text style={styles.tikumBannerSub}>
                Jarak: {distanceToTikum} km{navRouteSummary ? ` · ${navRouteSummary.durationMin} min` : ''}
              </Text>
            </View>
          </View>
          {navRouteCoords.length > 0 && (
            <View style={styles.tikumBannerBadge}>
              <MaterialCommunityIcons name="navigation-variant" size={12} color="#F59E0B" />
              <Text style={styles.tikumBannerBadgeText}>Rute aktif</Text>
            </View>
          )}
        </View>
      )}

      {/* ══ FLOATING ACTION BUTTONS (Speedometer & SOS) ══ */}
      <View style={styles.floatingControls}>
        {/* Speedometer Badge */}
        {isNavigating && (
          <View style={styles.speedBadge}>
            <Text style={styles.speedValue}>
              {myLocation?.speed ? Math.round(myLocation.speed * 3.6) : 0}
            </Text>
            <Text style={styles.speedUnit}>KM/H</Text>
          </View>
        )}

        {/* SOS Emergency Button */}
        <Animated.View style={{ transform: [{ scale: sosPulseAnim }] }}>
          <TouchableOpacity
            style={[styles.sosFloatingBtn, sosActive && styles.sosFloatingBtnActive]}
            onPress={handleToggleSOS}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="alert-decagram" size={26} color={colors.white} />
            <Text style={styles.sosFloatingText}>{sosActive ? 'SOS AKTIF' : 'SOS'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* ══ ROUTING MODE BADGE ══ */}
      {!isNavigating && (
        <View style={styles.routeModeBadge}>
          <MaterialCommunityIcons
            name={routingMode === 'motorcycle' ? 'motorbike' : 'car'}
            size={14}
            color={colors.primary}
          />
          <Text style={styles.routeModeBadgeText}>
            {routingMode === 'motorcycle' ? 'Motor' : routingMode === 'auto_toll' ? 'Mobil (Tol)' : 'Mobil (No Tol)'}
          </Text>
        </View>
      )}

      {/* ══ BOTTOM PANEL ══ */}
      <View style={styles.bottomPanel}>
        {/* Route Info */}
        {routeSummary && (
          <View style={styles.routeRow}>
            <View style={styles.routeStat}>
              <MaterialCommunityIcons name="map-marker-distance" size={16} color={colors.primary} />
              <Text style={styles.routeStatText}>{routeSummary.distanceKm} km</Text>
            </View>
            <View style={styles.routeDivider} />
            <View style={styles.routeStat}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={colors.primary} />
              <Text style={styles.routeStatText}>{routeSummary.durationMin} min</Text>
            </View>
            <View style={styles.routeDivider} />
            <View style={styles.routeStat}>
              <MaterialCommunityIcons name="account-group" size={16} color={colors.primary} />
              <Text style={styles.routeStatText}>{memberCount} member</Text>
            </View>
            {decodedVehicleCount > 0 && (
              <>
                <View style={styles.routeDivider} />
                <View style={styles.routeStat}>
                  <MaterialCommunityIcons
                    name={routingMode === 'motorcycle' ? 'motorbike' : 'car-multiple'}
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.routeStatText}>
                    {decodedVehicleCount} {routingMode === 'motorcycle' ? 'motor' : 'mobil'}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Route names */}
        {(originName || destinationName) && (
          <View style={styles.routeNames}>
            <View style={styles.routeNameRow}>
              <View style={[styles.routeDot, { backgroundColor: colors.success }]} />
              <Text style={styles.routeNameText} numberOfLines={1}>{originName || 'Titik Asal'}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={14} color={colors.textMuted} />
            <View style={styles.routeNameRow}>
              <View style={[styles.routeDot, { backgroundColor: colors.danger }]} />
              <Text style={styles.routeNameText} numberOfLines={1}>{destinationName || 'Tujuan'}</Text>
            </View>
          </View>
        )}

        {/* Members list */}
        {!isNavigating && (
          <View style={styles.membersSection}>
            <Text style={styles.membersSectionTitle}>ANGGOTA CONVOY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersList}>
              {/* Self */}
              <View style={styles.memberChip}>
                <View style={styles.memberAvatarContainer}>
                  {myProfile.photoUrl ? (
                    <Image source={{ uri: myProfile.photoUrl }} style={styles.memberAvatarImg} />
                  ) : (
                    <View style={[styles.memberAvatar, { backgroundColor: 'rgba(99,102,241,0.2)' }]}>
                      <Text style={styles.memberAvatarText}>{myProfile.name.substring(0, 2).toUpperCase()}</Text>
                    </View>
                  )}
                </View>
                <View style={{ alignItems: 'center' }}>
                   <Text style={styles.memberName}>Kamu</Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
              </View>

              {/* Friends */}
              {friendsLocations.map((friend) => {
                const distance = myLocation && friend.latitude ? getDistance(myLocation.latitude, myLocation.longitude, friend.latitude, friend.longitude) : '?';
                const profile = userProfiles[friend.user_id] || { name: 'Member', photoUrl: null };
                const lastSeen = getLastSeen(friend.updated_at);
                const isStale = friend.updated_at && (Date.now() - new Date(friend.updated_at).getTime()) > 60000;
                return (
                  <View key={friend.user_id} style={styles.memberChip}>
                    <View style={styles.memberAvatarContainer}>
                      {profile.photoUrl && !profile.photoUrl.startsWith('file://') ? (
                        <Image source={{ uri: profile.photoUrl }} style={styles.memberAvatarImg} />
                      ) : (
                        <View style={[styles.memberAvatar, { backgroundColor: 'rgba(16,185,129,0.2)' }]}>
                          <Text style={[styles.memberAvatarText, { color: colors.success }]}>
                            {profile.name.substring(0, 2).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {profile.name}
                      </Text>
                      <Text style={styles.memberDistance}>
                        {distance} km{isStale && lastSeen ? ` · ${lastSeen}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.statusDot, { backgroundColor: isStale ? colors.warning : colors.success }]} />
                  </View>
                );
              })}

              {friendsLocations.length === 0 && (
                <View style={styles.waitingChip}>
                  <MaterialCommunityIcons name="account-clock" size={14} color={colors.textMuted} />
                  <Text style={styles.waitingText}>Menunggu member...</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* ── CONVOY POSITION RADAR HUD (In Navigation Mode) ── */}
        {isNavigating && (
          <View style={styles.radarHudContainer}>
            <Text style={styles.radarHudTitle}>URUTAN CONVOY (POSISI {convoyOrder.rank} / {convoyOrder.total})</Text>
            <View style={styles.radarHudRow}>
              {/* Behind */}
              <View style={styles.radarMemberBox}>
                <MaterialCommunityIcons name="arrow-down-thick" size={16} color={colors.textMuted} />
                <Text style={styles.radarMemberLabel} numberOfLines={1}>
                  {convoyOrder.behind ? convoyOrder.behind.name : 'Paling Belakang'}
                </Text>
                <Text style={styles.radarMemberDist}>
                  {convoyOrder.behind ? `${convoyOrder.behind.distanceKm} km` : '-'}
                </Text>
              </View>

              {/* Self Indicator */}
              <View style={styles.radarSelfBox}>
                <MaterialCommunityIcons name="navigation" size={18} color={colors.primary} />
                <Text style={styles.radarSelfText}>KAMU</Text>
              </View>

              {/* Ahead */}
              <View style={styles.radarMemberBox}>
                <MaterialCommunityIcons name="arrow-up-thick" size={16} color={colors.success} />
                <Text style={styles.radarMemberLabel} numberOfLines={1}>
                  {convoyOrder.ahead ? convoyOrder.ahead.name : 'Paling Depan (Lead)'}
                </Text>
                <Text style={styles.radarMemberDist}>
                  {convoyOrder.ahead ? `${convoyOrder.ahead.distanceKm} km` : '-'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── NAVIGATION MODE TOGGLE BUTTON ── */}
        <TouchableOpacity
          style={[styles.navToggleBtn, isNavigating && styles.navToggleBtnActive]}
          onPress={handleToggleNavigation}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={isNavigating ? 'stop-circle' : 'navigation-variant-outline'}
            size={20}
            color={colors.white}
            style={{ marginRight: spacing.sm }}
          />
          <Text style={styles.navToggleBtnText}>
            {isNavigating ? 'Akhiri Navigasi' : 'Mulai Perjalanan'}
          </Text>
        </TouchableOpacity>

        {/* ── Session Control Button ── */}
        <TouchableOpacity
          style={role === 'leader' ? styles.endTripBtn : styles.leaveTripBtn}
          onPress={handleLeaveRoom}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={role === 'leader' ? 'flag-checkered' : 'exit-run'}
            size={18}
            color={role === 'leader' ? colors.white : colors.danger}
            style={{ marginRight: spacing.sm }}
          />
          <Text style={role === 'leader' ? styles.endTripBtnText : styles.leaveTripBtnText}>
            {role === 'leader' ? 'Selesaikan Perjalanan' : 'Keluar Sesi Convoy'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ══ ERROR ══ */}
      {errorMsg && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map: { ...StyleSheet.absoluteFillObject },

  // ── Top Bar ──
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + 16,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(15,23,42,0.85)',
    zIndex: 40,
  },
  topBarBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.cardElevated,
    justifyContent: 'center', alignItems: 'center',
  },
  topBarCenter: { alignItems: 'center', gap: spacing.xs },
  topBarTitle: {
    fontSize: fontSize.lg, fontFamily: fonts.black, color: colors.primary, letterSpacing: -0.5,
  },
  pinRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
  },
  pinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: 'rgba(99,102,241,0.12)',
    paddingVertical: 3, paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.full,
  },
  pinBadgeLabel: { fontSize: 9, fontFamily: fonts.bold, color: colors.primaryMuted, letterSpacing: 1 },
  pinBadgeValue: { fontSize: fontSize.sm, fontFamily: fonts.extraBold, color: colors.primary },
  shareBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(99,102,241,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Markers ──
  myMarkerWrap: { alignItems: 'center' },
  myMarkerDot: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.white,
    elevation: 6,
    overflow: 'hidden',
  },
  markerAvatarImg: {
    width: '100%', height: '100%',
    borderRadius: 16,
  },
  markerInitials: {
    fontSize: 11, fontFamily: fonts.bold,
    color: colors.white,
  },
  friendMarkerWrap: { alignItems: 'center' },
  friendMarkerDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.success,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.white,
    elevation: 4,
    overflow: 'hidden',
  },
  friendMarkerAvatarImg: {
    width: '100%', height: '100%',
    borderRadius: 14,
  },
  friendMarkerInitials: {
    fontSize: 10, fontFamily: fonts.bold,
    color: colors.white,
  },
  markerLabel: {
    backgroundColor: 'rgba(15,23,42,0.8)',
    paddingVertical: 2, paddingHorizontal: 6,
    borderRadius: radius.sm, marginTop: 2, maxWidth: 80,
  },
  markerLabelText: {
    fontSize: 9, fontFamily: fonts.semiBold, color: colors.white, textAlign: 'center',
  },

  markerOrigin: {
    width: 30, height: 30, borderRadius: radius.full,
    backgroundColor: 'rgba(16,185,129,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.success,
  },
  markerDest: {
    width: 30, height: 30, borderRadius: radius.full,
    backgroundColor: 'rgba(239,68,68,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.danger,
  },

  // ── Bottom Panel ──
  bottomPanel: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingTop: spacing.lg, paddingBottom: spacing.xl + 8,
    paddingHorizontal: spacing.xl,
    zIndex: 30,
  },
  routeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.md, marginBottom: spacing.md,
  },
  routeStat: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  routeStatText: { fontSize: fontSize.sm, fontFamily: fonts.semiBold, color: colors.textPrimary },
  routeDivider: { width: 1, height: 14, backgroundColor: colors.border },

  routeNames: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardElevated,
    borderRadius: radius.md, paddingHorizontal: spacing.md,
  },
  routeNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeNameText: { fontSize: fontSize.xs, fontFamily: fonts.medium, color: colors.textSecondary, flex: 1 },

  // ── Members ──
  membersSection: {},
  membersSectionTitle: {
    fontSize: fontSize.xs, fontFamily: fonts.semiBold, color: colors.textMuted,
    letterSpacing: 1, marginBottom: spacing.sm,
  },
  membersList: { gap: spacing.sm },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.cardElevated,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  memberAvatar: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  memberAvatarContainer: {
    width: 24, height: 24, borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
  },
  memberAvatarImg: {
    width: '100%', height: '100%',
  },
  memberAvatarText: {
    fontSize: 9, fontFamily: fonts.bold,
    color: colors.primary,
  },
  memberName: { fontSize: fontSize.sm, fontFamily: fonts.medium, color: colors.textPrimary, maxWidth: 80 },
  memberDistance: { fontSize: 9, fontFamily: fonts.medium, color: colors.textMuted },
  statusDot: { width: 6, height: 6, borderRadius: 3 },

  waitingChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
  },
  waitingText: { fontSize: fontSize.xs, fontFamily: fonts.regular, color: colors.textMuted },

  // ── Error ──
  errorBanner: {
    position: 'absolute', top: 105, left: spacing.xl, right: spacing.xl,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.dangerLight, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    zIndex: 50,
  },
  errorText: { fontSize: fontSize.sm, fontFamily: fonts.medium, color: colors.danger, flex: 1 },

  // ── Turn-by-Turn Guidance Banner ──
  tbtBanner: {
    position: 'absolute',
    top: 105,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 35,
  },
  tbtIconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tbtTextContainer: {
    flex: 1,
  },
  tbtDistance: {
    fontSize: fontSize.lg,
    fontFamily: fonts.black,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  tbtInstruction: {
    fontSize: fontSize.sm,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
    marginTop: 2,
    lineHeight: 18,
  },

  // ── Offline Banner ──
  offlineBanner: {
    position: 'absolute',
    top: 95,
    left: spacing.lg, right: spacing.lg,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 50,
  },
  offlineBannerText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.semiBold,
    color: colors.warning,
    flex: 1,
  },

  // ── Permission Denied Banner ──
  permissionBanner: {
    position: 'absolute',
    top: 95,
    left: spacing.lg, right: spacing.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 50,
  },
  permissionBannerTitle: {
    fontSize: fontSize.xs + 1,
    fontFamily: fonts.bold,
    color: colors.danger,
    marginBottom: 2,
  },
  permissionBannerSub: {
    fontSize: fontSize.xs - 1,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  permissionSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.danger,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  permissionSettingsBtnText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.semiBold,
    color: colors.white,
  },

  // ── Tikum Proximity Banner ──
  tikumBanner: {
    position: 'absolute',
    top: 130,
    left: spacing.lg, right: spacing.lg,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 45,
    elevation: 8,
  },
  tikumBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  tikumBannerTitle: {
    fontSize: fontSize.xs + 1,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  tikumBannerSub: {
    fontSize: fontSize.xs - 1,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  tikumBannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    gap: 4,
  },
  tikumBannerBadgeText: {
    fontSize: fontSize.xs - 1,
    fontFamily: fonts.semiBold,
    color: '#F59E0B',
  },

  // ── Routing Mode Badge (read-only) ──
  routeModeBadge: {
    position: 'absolute',
    bottom: 320,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(15,23,42,0.88)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md + 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
    zIndex: 35,
  },
  routeModeBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.semiBold,
    color: colors.primaryMuted,
  },

  // ── Session Control Buttons ──
  endTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  endTripBtnText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.white,
  },
  leaveTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  leaveTripBtnText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.danger,
  },

  // ── Turn-by-Turn Guidance Banner ──
  tbtBanner: {
    position: 'absolute',
    top: 90,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: 'rgba(30, 27, 75, 0.94)',
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.5)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 60,
  },
  tbtIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  tbtTextContainer: {
    flex: 1,
  },
  tbtDistance: {
    fontSize: fontSize.xl,
    fontFamily: fonts.black,
    color: colors.white,
    letterSpacing: -0.5,
  },
  tbtInstruction: {
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    color: colors.primaryMuted,
    marginTop: 2,
    lineHeight: 18,
  },

  // ── Floating Controls (Speedometer & SOS) ──
  floatingControls: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 300,
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 40,
  },
  speedBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  speedValue: {
    fontSize: fontSize.xl,
    fontFamily: fonts.black,
    color: colors.white,
    lineHeight: 22,
  },
  speedUnit: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: colors.primaryMuted,
  },
  sosFloatingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.danger,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md + 4,
    borderRadius: radius.full,
    elevation: 8,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sosFloatingBtnActive: {
    backgroundColor: '#991B1B',
    borderWidth: 2,
    borderColor: colors.white,
  },
  sosFloatingText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.black,
    color: colors.white,
    letterSpacing: 1.2,
  },

  // ── SOS Marker Styling ──
  sosMarkerDot: {
    backgroundColor: colors.danger,
    borderColor: colors.white,
    borderWidth: 3,
  },
  sosMarkerLabel: {
    backgroundColor: colors.danger,
  },

  // ── Convoy Radar HUD ──
  radarHudContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  radarHudTitle: {
    fontSize: fontSize.xs - 1,
    fontFamily: fonts.bold,
    color: colors.primaryMuted,
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  radarHudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  radarMemberBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  radarMemberLabel: {
    fontSize: fontSize.xs - 1,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  radarMemberDist: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  radarSelfBox: {
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  radarSelfText: {
    fontSize: 10,
    fontFamily: fonts.black,
    color: colors.primary,
    marginTop: 2,
  },

  // ── Navigation Mode Toggle Button ──
  navToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  navToggleBtnActive: {
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  navToggleBtnText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.white,
    letterSpacing: 0.8,
  },
});