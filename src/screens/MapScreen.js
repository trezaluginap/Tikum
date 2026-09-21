import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  SafeAreaView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  Platform,
  Vibration,
  View,
  Image,
} from 'react-native';
import TiKumMap, { TIKUM_DARK_STYLE, TIKUM_STREETS_STYLE, TiKumMarker, TiKumPolyline } from '../components/map/TiKumMap';
import ConvoyRadarSheet from '../components/map/ConvoyRadarSheet';
import SosReasonModal from '../components/map/SosReasonModal';
import OverpassPoiFilter from '../components/map/OverpassPoiFilter';
import RidingHudWidget from '../components/map/RidingHudWidget';

import { getCurrentLocations, updateCurrentLocation } from '../api/locations.api';
import { closeRoom, leaveRoom } from '../api/rooms.api';
import { resolveSos, triggerSos } from '../api/sos.api';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts, fontSize, radius, spacing } from '../constants/theme';
import { fetchValhallaRoute } from '../hooks/useOsrmRoute';
import { createEcho, disconnectEcho } from '../realtime/echo';
import { startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
} from '../services/backgroundLocation';
import { loadSettingsPrefs } from '../storage/prefs';
import ConvoyDialog from '../components/common/ConvoyDialog';
import ConvoyToast from '../components/common/ConvoyToast';

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
  const [pickupRouteCoords, setPickupRouteCoords] = useState([]);
  const [initialRegion, setInitialRegion] = useState({
    latitude: -6.9175, longitude: 107.6191,
    latitudeDelta: 0.1, longitudeDelta: 0.1,
  });

  const currentHour = new Date().getHours();
  const isNight = currentHour >= 18 || currentHour < 6;
  const [darkMapPref, setDarkMapPrefState] = useState(null);
  const notificationsPrefRef = useRef(true);

  useEffect(() => {
    loadSettingsPrefs().then((prefs) => {
      setDarkMapPrefState(prefs.darkMap);
      notificationsPrefRef.current = prefs.notifications;
    }).catch(() => {});
  }, []);

  const darkMap = darkMapPref !== null ? darkMapPref : isNight;
  const mapStyleUrl = darkMap ? TIKUM_DARK_STYLE : TIKUM_STREETS_STYLE;

  const displayName = user?.profile?.display_name || user?.user_metadata?.display_name || 'Pengguna';

  // ── Decode routing mode ──
  const encodedVC = vehicleCount || 0;
  const modeCode = encodedVC >= 1000 ? Math.floor(encodedVC / 1000) : 2;
  const initialRoutingMode = modeCode === 1 ? 'motorcycle' : modeCode === 3 ? 'auto_no_toll' : 'auto_toll';

  // ── Routing Mode & In-App Navigation ──
  const [routingMode] = useState(initialRoutingMode);

  // ── Interactive Animations ──
  const sosPulseAnim = useRef(new Animated.Value(1)).current;

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

  const [routeLoading, setRouteLoading] = useState(false);

  // ── Navigation Mode & Convoy Radar States ──
  const [isNavigating, setIsNavigating] = useState(false);
  const [isAutoFollow, setIsAutoFollow] = useState(true);
  const [maneuvers, setManeuvers] = useState([]);
  const [sosActive, setSosActive] = useState(false);
  const [activeSosAlertId, setActiveSosAlertId] = useState(null);
  const [sosUsers, setSosUsers] = useState({});
  const [sosReasonModalVisible, setSosReasonModalVisible] = useState(false);
  const [poiMarkers, setPoiMarkers] = useState([]);

  const hasActiveSosInGroup = Object.keys(sosUsers).length > 0 || sosActive;

  const handleSendSosReason = async (reasonLabel) => {
    setSosReasonModalVisible(false);
    if (!tourSessionId) return;
    try {
      await triggerSos(tourSessionId, {
        message: reasonLabel,
        latitude: myLocation?.latitude ?? null,
        longitude: myLocation?.longitude ?? null,
      });
      setSosUsers((prev) => ({ ...prev, [user?.id]: reasonLabel }));
      showToast('danger', '⚠️ DEKLARASI SOS', `Alasan bantuan: "${reasonLabel}" dikirim ke rombongan.`);
      if (notificationsPrefRef.current) {
        Vibration.vibrate([0, 300, 200, 300]);
        sayOutLoud(`Peringatan darurat dari ${displayName}. Alasan: ${reasonLabel}`);
      }
    } catch (_err) {}
  };

  // ── Custom UI Notifications & Dialogs ──
  const [dialogConfig, setDialogConfig] = useState({ visible: false });
  const [toastConfig, setToastConfig] = useState({ visible: false });

  const showToast = (type, title, message, duration = 4000) => {
    setToastConfig({ visible: true, type, title, message });
    setTimeout(() => setToastConfig((prev) => ({ ...prev, visible: false })), duration);
  };

  const sayOutLoud = (text) => {
    try {
      Speech.stop();
      Speech.speak(text, { language: 'id-ID', rate: 0.9, pitch: 1.1 });
    } catch (_speechErr) {}
  };

  // ── User Profiles Cache ──
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

  // ── Realtime & Location Polling Lifecycle ──
  useEffect(() => {
    let isMounted = true;

    // 1. Dapatkan lokasi saat ini & watch position
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return;
        }

        try {
          await Location.requestBackgroundPermissionsAsync();
        } catch (_bgErr) {}

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (isMounted && loc?.coords) {
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            heading: loc.coords.heading || 0,
            speed: loc.coords.speed || 0,
            altitude: loc.coords.altitude || 0,
          };
          setMyLocation(coords);

          // Otomatis arahkan camera peta ke lokasi GPS pengguna saat ini
          if (mapRef.current) {
            if (typeof mapRef.current.animateToRegion === 'function') {
              mapRef.current.animateToRegion({
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }, 1000);
            }
          }

          // Update lokasi awal ke backend jika ada tourSessionId
          if (tourSessionId) {
            updateCurrentLocation(tourSessionId, coords).catch(err => console.log('[Location] initial update err:', err));
          }
        }

        // Subscribing to position updates for real-time Speedometer & Altitude
        const watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 5,
          },
          (newLoc) => {
            if (isMounted && newLoc?.coords) {
              setMyLocation({
                latitude: newLoc.coords.latitude,
                longitude: newLoc.coords.longitude,
                heading: newLoc.coords.heading || 0,
                speed: newLoc.coords.speed || 0,
                altitude: newLoc.coords.altitude || 0,
              });
            }
          }
        );
        return () => watcher.remove();
      } catch (err) {
        console.log('[Location] init err:', err);
      }
    })();

    // 2. Fetch initial friends locations & start polling fallback
    let intervalId = null;
    if (tourSessionId) {
      const fetchLocations = async () => {
        try {
          const res = await getCurrentLocations(tourSessionId);
          const locs = res?.locations || res?.data || (Array.isArray(res) ? res : []);
          if (isMounted && Array.isArray(locs)) {
            cacheProfilesFromLocations(locs);
            // Filter lokasi pengguna sendiri agar tidak duplikat
            const friendsOnly = locs.filter(l => String(l.user_id) !== String(user?.id));
            setFriendsLocations(friendsOnly);
          }
        } catch (err) {
          console.log('[Locations] fetch err:', err);
        }
      };

      fetchLocations();
      intervalId = setInterval(fetchLocations, 5000); // Polling fallback 5 detik
    }

    // 3. Connect Laravel Reverb WebSocket
    let echo = null;
    if (tourSessionId) {
      try {
        echo = createEcho();
        const channelName = `private-tour-session.${tourSessionId}`;
        echo.private(channelName)
          .listen('.location.updated', (e) => {
            if (isMounted && e?.location && String(e.location.user_id) !== String(user?.id)) {
              updateFriends(e.location);
            }
          })
          .listen('.sos.triggered', (e) => {
            if (isMounted && e?.sos_alert) {
              const reasonText = e.sos_alert.note || e.sos_alert.message || e.sos_alert.reason || 'Bantuan Darurat';
              setSosUsers(prev => ({ ...prev, [e.sos_alert.user_id]: reasonText }));
              const userName = e.sos_alert.user?.profile?.display_name || 'Anggota rombongan';
              showToast('danger', '⚠️ SINYAL SOS DARURAT!', `${userName}: "${reasonText}"`);

              // Physical Device Hardware Vibration (Pattern: 500ms vibrate, 200ms pause)
              if (notificationsPrefRef.current) Vibration.vibrate([0, 500, 200, 500, 200, 800]);

              // Voice Safety Alert with Reason
              if (notificationsPrefRef.current) sayOutLoud(`Peringatan darurat! Sinyal S O S aktif dari ${userName}. Alasan: ${reasonText}`);
            }
          })
          .listen('.sos.resolved', (e) => {
            if (isMounted && e?.sos_alert) {
              setSosUsers(prev => {
                const next = { ...prev };
                delete next[e.sos_alert.user_id];
                return next;
              });
              showToast('info', 'SOS Dibatalkan', 'Sinyal bantuan diselesaikan.');
            }
          })
          .listen('.room.closed', () => {
            if (isMounted && !roomClosedHandledRef.current) {
              roomClosedHandledRef.current = true;
              showToast('warning', 'Room Ditutup', 'Host telah membubarkan sesi konvoi ini.');
              setTimeout(() => navigation.goBack(), 2000);
            }
          });
      } catch (echoErr) {
        console.log('[Reverb Echo] connection err:', echoErr?.message);
      }
    }

    // 4. Start background location tracking
    if (tourSessionId) {
      startBackgroundLocationTracking(tourSessionId).catch(err => console.log('[BgLocation] start err:', err));
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      if (echo) disconnectEcho(echo);
      stopBackgroundLocationTracking().catch(() => {});
    };
  }, [tourSessionId, user?.id]);

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

  const updateFriends = (newLoc) => {
    setFriendsLocations((prev) => {
      if (!newLoc?.user_id) return prev;
      const filtered = prev.filter(f => f.user_id !== newLoc.user_id);
      return [...filtered, newLoc];
    });
  };

  const laggingWarnedRef = useRef({});

  const maybeWarnLaggingMember = (friendLoc) => {
    if (!friendLoc || !myLocation) return;
    if (laggingWarnedRef.current[friendLoc.user_id]) return;
    const dist = getDistance(myLocation.latitude, myLocation.longitude, friendLoc.latitude, friendLoc.longitude);
    if (parseFloat(dist) > 1.5) {
      const p = userProfiles[friendLoc.user_id] || { name: 'Anggota' };
      laggingWarnedRef.current[friendLoc.user_id] = true;
      showToast('warning', '⚠️ Rombongan Terpisah', `${p.name} tertinggal ${dist} km di belakang.`);
      if (notificationsPrefRef.current) Vibration.vibrate([0, 300]);
      setTimeout(() => { delete laggingWarnedRef.current[friendLoc.user_id]; }, 120000);
    }
  };

  useEffect(() => {
    friendsLocations.forEach((f) => maybeWarnLaggingMember(f));
  }, [friendsLocations, myLocation?.latitude, myLocation?.longitude]);

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
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; 
    return distance.toFixed(1);
  };

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
              try {
                const response = await triggerSos(tourSessionId, {
                  message: 'Butuh bantuan darurat',
                  latitude: myLocation?.latitude ?? null,
                  longitude: myLocation?.longitude ?? null,
                });
                setActiveSosAlertId(response?.sos_alert?.id || response?.id || null);
              } catch (_e) {}
              setSosActive(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              showToast('danger', 'SOS AKTIF', 'Sinyal SOS telah dikirimkan ke rombongan.');
              setSosReasonModalVisible(true);
            },
          },
        ],
      });
    } else if (activeSosAlertId) {
      resolveSos(tourSessionId, activeSosAlertId)
        .then(() => {
          setSosActive(false);
          setActiveSosAlertId(null);
          showToast('success', 'SOS Dibatalkan', 'Sinyal darurat diselesaikan.');
        })
        .catch((err) => {
          showToast('danger', 'Error', err?.message || 'Gagal membatalkan SOS.');
        });
    } else {
      setSosActive(false);
    }
  };

  // ── Auto-center map on GPS updates when in navigation mode ──
  useEffect(() => {
    if (!myLocation || !isAutoFollow) return;
    if (mapRef.current?.animateToRegion) {
      mapRef.current.animateToRegion({
        latitude: myLocation.latitude,
        longitude: myLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 800);
    }
  }, [myLocation?.latitude, myLocation?.longitude, isAutoFollow]);

  // ── Build markers array for WebView Leaflet bridge ──
  const allMapMarkers = useMemo(() => {
    const m = [];
    if (origin) m.push({ id: 'origin', latitude: origin.latitude, longitude: origin.longitude, label: originName || 'Titik Kumpul', color: '#10B981', icon: 'origin' });
    if (destination) m.push({ id: 'dest', latitude: destination.latitude, longitude: destination.longitude, label: destinationName || 'Tujuan', color: '#EF4444', icon: 'dest' });
    friendsLocations.forEach((f) => {
      const p = userProfiles[f.user_id] || { name: 'Member' };
      const isSos = !!sosUsers[f.user_id];
      m.push({ id: `friend-${f.user_id}`, latitude: f.latitude, longitude: f.longitude, label: p.name, color: '#10B981', icon: isSos ? 'sos' : 'friend' });
    });
    poiMarkers.forEach((poi) => {
      m.push({ id: poi.id, latitude: poi.latitude, longitude: poi.longitude, label: poi.name, color: '#F59E0B', icon: 'poi' });
    });
    return m;
  }, [origin, destination, friendsLocations, poiMarkers, userProfiles, sosUsers, originName, destinationName]);

  // ── Auto-fetch OSRM route if preloadedRoute empty but origin & destination exist ──
  useEffect(() => {
    if (routeCoords.length > 0) return;
    if (!origin || !destination) return;

    let cancelled = false;
    (async () => {
      try {
        setRouteLoading(true);
        const result = await fetchValhallaRoute(origin, destination, routingMode);
        if (!cancelled && result?.routeCoords?.length > 0) {
          setRouteCoords(result.routeCoords);
          if (result.routeSummary) setRouteSummary(result.routeSummary);
          if (result.maneuvers) setManeuvers(result.maneuvers);
          if (mapRef.current?.fitToCoordinates) {
            mapRef.current.fitToCoordinates(result.routeCoords, {
              edgePadding: { top: 120, right: 50, bottom: 280, left: 50 },
              animated: true,
            });
          }
        }
      } catch (err) {
        console.log('[Route] auto-fetch err:', err);
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [origin?.latitude, destination?.latitude, routingMode]);

  // ── Auto-fetch pickup route (rider's GPS → meetup point TiKum) ──
  useEffect(() => {
    if (!myLocation || !origin || pickupRouteCoords.length > 0) return;

    const meetupDist = getDistance(myLocation.latitude, myLocation.longitude, origin.latitude, origin.longitude);
    if (Number(meetupDist) < 1.0) return; // sudah di titik kumpul

    let cancelled = false;
    (async () => {
      try {
        const result = await fetchValhallaRoute(myLocation, origin, routingMode);
        if (!cancelled && result?.routeCoords?.length > 1) {
          setPickupRouteCoords(result.routeCoords);
          if (mapRef.current?.fitToCoordinates) {
            mapRef.current.fitToCoordinates(result.routeCoords, {
              edgePadding: { top: 120, right: 50, bottom: 280, left: 50 },
              animated: true,
            });
          }
        }
      } catch (err) {
        console.log('[PickupRoute] auto-fetch err:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [myLocation?.latitude, myLocation?.longitude, origin?.latitude, origin?.longitude]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Overlays */}
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

      {/* MAP */}
      <TiKumMap
        ref={mapRef}
        style={styles.map}
        initialRegion={myLocation ? {
          latitude: myLocation.latitude,
          longitude: myLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        } : initialRegion}
        centerCoordinate={myLocation || undefined}
        zoomLevel={15}
        styleURL={mapStyleUrl}
        routeCoords={routeCoords}
        pickupRouteCoords={pickupRouteCoords}
        markers={allMapMarkers}
        myLocation={myLocation}
      >
        {/* Native engine children (ignored in WebView mode) */}
        {pickupRouteCoords.length > 1 && (
          <TiKumPolyline id="pickup-route" coordinates={pickupRouteCoords} strokeColor="#0EA5E9" strokeWidth={3.5} lineDashPattern={[1, 4]} />
        )}
        {routeCoords.length > 0 && (
          <TiKumPolyline id="main-route" coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={4} />
        )}

        {origin && (
          <TiKumMarker id="marker-origin" coordinate={origin} title={originName || 'Asal'}>
            <View style={styles.markerOrigin}>
              <MaterialCommunityIcons name="flag-variant" size={16} color={colors.success} />
            </View>
          </TiKumMarker>
        )}

        {destination && (
          <TiKumMarker id="marker-destination" coordinate={destination} title={destinationName || 'Tujuan'}>
            <View style={styles.markerDest}>
              <MaterialCommunityIcons name="flag-checkered" size={16} color={colors.danger} />
            </View>
          </TiKumMarker>
        )}

        {poiMarkers.map((poi) => (
          <TiKumMarker id={poi.id} key={poi.id} coordinate={{ latitude: poi.latitude, longitude: poi.longitude }} title={poi.name}>
            <View style={styles.poiMarkerWrap}>
              <MaterialCommunityIcons
                name={poi.type === 'fuel' ? 'gas-station' : poi.type === 'repair' ? 'wrench' : 'coffee'}
                size={14}
                color={colors.white}
              />
            </View>
          </TiKumMarker>
        ))}

        {myLocation && (
          <TiKumMarker id="marker-my-location" coordinate={myLocation}>
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
          </TiKumMarker>
        )}

        {friendsLocations.map((friend) => {
          const profile = userProfiles[friend.user_id] || { name: 'Member', photoUrl: null };
          const isUserSos = !!sosUsers[friend.user_id];
          return (
            <TiKumMarker
              id={`marker-friend-${friend.user_id}`}
              key={friend.user_id}
              coordinate={{ latitude: friend.latitude, longitude: friend.longitude }}
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
            </TiKumMarker>
          );
        })}
      </TiKumMap>

      {/* RIDING HUD WIDGET (Speedometer, Elevation, ETA) */}
      <RidingHudWidget
        speedKmH={(myLocation?.speed || 0) * 3.6}
        altitudeM={myLocation?.altitude || 0}
        distanceKm={routeSummary?.distanceKm}
        durationMin={routeSummary?.durationMin}
      />

      {/* OVERPASS POI FILTER (SPBU, Bengkel, Rest Area) */}
      <OverpassPoiFilter
        origin={origin}
        destination={destination}
        onPoiSelected={(nodes) => setPoiMarkers(nodes)}
      />

      {/* TOP BAR */}
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

      {/* CONVOY RADAR SHEET (Member List & Distance Tracking) */}
      <ConvoyRadarSheet
        myLocation={myLocation}
        friendsLocations={friendsLocations}
        userProfiles={userProfiles}
        sosUsers={sosUsers}
      />

      {/* SOS REASON CHOICE MODAL */}
      <SosReasonModal
        visible={sosReasonModalVisible}
        onSendReason={handleSendSosReason}
        onClose={() => setSosReasonModalVisible(false)}
      />

      {/* RED FLASHING EMERGENCY OVERLAY */}
      {hasActiveSosInGroup && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.sosOverlayFlash,
            { opacity: sosPulseAnim },
          ]}
        />
      )}
      <Animated.View style={[styles.sosFabWrap, { transform: [{ scale: sosPulseAnim }] }]}>
        <TouchableOpacity
          style={[styles.sosFab, sosActive && styles.sosFabActive]}
          onPress={handleToggleSOS}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="alert-decagram" size={26} color={colors.white} />
          <Text style={styles.sosFabText}>{sosActive ? 'SOS AKTIF' : 'SOS'}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* BOTTOM PANEL */}
      <View style={styles.bottomPanel}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map: { ...StyleSheet.absoluteFillObject },

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

  myMarkerWrap: { alignItems: 'center' },
  myMarkerDot: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.white,
    elevation: 6,
    overflow: 'hidden',
  },
  markerAvatarImg: { width: '100%', height: '100%', borderRadius: 16 },
  markerInitials: { fontSize: 11, fontFamily: fonts.bold, color: colors.white },
  friendMarkerWrap: { alignItems: 'center' },
  friendMarkerDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.success,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.white,
    elevation: 4,
    overflow: 'hidden',
  },
  friendMarkerAvatarImg: { width: '100%', height: '100%', borderRadius: 14 },
  friendMarkerInitials: { fontSize: 10, fontFamily: fonts.bold, color: colors.white },
  markerLabel: {
    backgroundColor: 'rgba(15,23,42,0.8)',
    paddingVertical: 2, paddingHorizontal: 6,
    borderRadius: radius.sm, marginTop: 2, maxWidth: 80,
  },
  markerLabelText: { fontSize: 9, fontFamily: fonts.semiBold, color: colors.white, textAlign: 'center' },

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
  poiMarkerWrap: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#F59E0B',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.white,
    elevation: 4,
  },

  bottomPanel: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingTop: spacing.lg, paddingBottom: spacing.xl + 8,
    paddingHorizontal: spacing.xl,
    zIndex: 30,
  },

  sosMarkerDot: {
    backgroundColor: colors.danger,
    borderColor: colors.white,
    borderWidth: 3,
  },
  sosMarkerLabel: {
    backgroundColor: colors.danger,
  },

  sosFabWrap: {
    position: 'absolute',
    bottom: 120,
    right: spacing.lg,
    zIndex: 40,
  },
  sosOverlayFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
    zIndex: 99,
  },
  sosFab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md + 4,
    borderRadius: radius.full,
    elevation: 8,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: colors.white,
  },
  sosFabActive: {
    backgroundColor: '#DC2626',
    borderColor: '#FCA5A5',
  },
  sosFabText: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: fontSize.sm,
    marginLeft: 6,
    letterSpacing: 1,
  },

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
  endTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
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
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  leaveTripBtnText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.danger,
  },
});
