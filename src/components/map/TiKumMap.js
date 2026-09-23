import React, { useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';

let MapLibreGL = null;
let WebView = null;

try {
  MapLibreGL = require('@maplibre/maplibre-react-native');
  if (MapLibreGL?.default) MapLibreGL = MapLibreGL.default;
} catch (_e) {
  MapLibreGL = null;
}

try {
  const RNWV = require('react-native-webview');
  WebView = RNWV.WebView || RNWV.default?.WebView || RNWV.default;
} catch (_e) {
  WebView = null;
}

const MapViewNative = null;
const MapViewComp = MapLibreGL?.MapView || MapLibreGL?.default?.MapView;
const CameraComp = MapLibreGL?.Camera || MapLibreGL?.default?.Camera;

export const TIKUM_DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark';
export const TIKUM_STREETS_STYLE = 'https://tiles.openfreemap.org/styles/bright';

function LeafletMapBridge(props, ref) {
  const {
    style,
    centerLat,
    centerLng,
    zoom,
    routeCoords = [],
    pickupRouteCoords = [],
    markers = [],
    myLocation,
    mapTileType = 'dark',
    onMarkerPress,
  } = props;

  const webViewRef = useRef(null);

  const postCmd = (cmd, data) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ cmd, ...data }));
    }
  };

  useImperativeHandle(ref, () => ({
    animateToRegion: (region) => {
      postCmd('panTo', { lat: region.latitude, lng: region.longitude, zoom: 16 });
    },
    fitToCoordinates: (coords, options) => {
      if (coords?.length > 0) {
        postCmd('fitBounds', {
          coords: coords.map((c) => [c.latitude, c.longitude]),
          padding: options?.edgePadding ? [
            options.edgePadding.top || 50,
            options.edgePadding.right || 50,
          ] : [50, 50],
        });
      }
    },
    animateCamera: (cam) => {
      if (cam?.center) {
        postCmd('panTo', {
          lat: cam.center.latitude,
          lng: cam.center.longitude,
          zoom: cam.zoom || 17,
        });
      }
    },
    setTileType: (type) => {
      postCmd('setTileType', { type });
    },
  }));

  useEffect(() => {
    if (myLocation) {
      postCmd('updateUser', {
        lat: myLocation.latitude,
        lng: myLocation.longitude,
        heading: myLocation.heading || 0,
        speed: myLocation.speed || 0,
      });
    }
  }, [myLocation?.latitude, myLocation?.longitude, myLocation?.heading, myLocation?.speed]);

  useEffect(() => {
    if (routeCoords.length > 1) {
      postCmd('setRoute', { coords: routeCoords.map((c) => [c.latitude, c.longitude]) });
    }
  }, [routeCoords]);

  useEffect(() => {
    if (pickupRouteCoords.length > 1) {
      postCmd('setPickupRoute', { coords: pickupRouteCoords.map((c) => [c.latitude, c.longitude]) });
    }
  }, [pickupRouteCoords]);

  useEffect(() => {
    if (markers.length > 0) {
      postCmd('setMarkers', { markers });
    }
  }, [markers]);

  useEffect(() => {
    postCmd('setTileType', { type: mapTileType });
  }, [mapTileType]);

  const markersJSON = JSON.stringify(markers.map((m) => ({
    id: m.id,
    lat: m.latitude,
    lng: m.longitude,
    label: m.label || '',
    color: m.color || '#6366F1',
    icon: m.icon || 'circle',
    photoUrl: m.photoUrl || null,
    isLagging: m.isLagging || false,
    speed: m.speed || 0,
    distanceKm: m.distanceKm || null,
  })));

  const routeJSON = JSON.stringify(routeCoords.map((c) => [c.latitude, c.longitude]));
  const pickupRouteJSON = JSON.stringify(pickupRouteCoords.map((c) => [c.latitude, c.longitude]));

  const leafletHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\\/script>
        <style>
          html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #0F172A; }
          
          /* User GPS Marker & Heading Cone */
          .gps-user-wrap { position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; }
          .gps-heading-cone {
            position: absolute; width: 60px; height: 60px; top: -6px; left: -6px;
            background: conic-gradient(from 330deg at 50% 50%, rgba(99,102,241,0.45) 0deg, rgba(99,102,241,0) 60deg);
            border-radius: 50%; pointer-events: none; transform-origin: center center; transition: transform 0.4s ease;
          }
          .gps-marker {
            width: 26px; height: 26px; background: #6366F1;
            border: 3px solid #FFFFFF; border-radius: 50%;
            box-shadow: 0 0 20px rgba(99,102,241,0.9), inset 0 0 6px rgba(255,255,255,0.6);
            z-index: 2; display: flex; align-items: center; justify-content: center;
          }
          .gps-pulse {
            width: 52px; height: 52px; border-radius: 50%;
            background: rgba(99,102,241,0.25); border: 1.5px solid rgba(99,102,241,0.6);
            position: absolute; top: -13px; left: -13px;
            animation: pulse 2s infinite; pointer-events: none;
          }
          @keyframes pulse {
            0% { transform: scale(0.9); opacity: 0.9; }
            100% { transform: scale(2.4); opacity: 0; }
          }

          /* Distinct Status Markers */
          .origin-marker {
            background: #10B981; border: 3px solid #FFF; width: 22px; height: 22px; border-radius: 50%;
            box-shadow: 0 0 14px rgba(16,185,129,0.8);
          }
          .dest-marker {
            background: #EF4444; border: 3px solid #FFF; width: 22px; height: 22px; border-radius: 50%;
            box-shadow: 0 0 14px rgba(239,68,68,0.8);
          }
          .friend-marker {
            background: #10B981; border: 2.5px solid #FFF; width: 26px; height: 26px; border-radius: 50%;
            box-shadow: 0 0 12px rgba(16,185,129,0.7); display: flex; align-items: center; justify-content: center;
            overflow: hidden; color: #FFF; font-weight: 800; font-size: 10px; font-family: sans-serif;
          }
          .lagging-friend-marker {
            background: #F59E0B; border: 2.5px solid #FFF; width: 28px; height: 28px; border-radius: 50%;
            box-shadow: 0 0 14px rgba(245,158,11,0.9); display: flex; align-items: center; justify-content: center;
            animation: pulse-warn 1.5s infinite; color: #FFF; font-weight: 800; font-size: 10px; font-family: sans-serif;
          }
          .sos-friend-marker {
            background: #EF4444; border: 3px solid #FFF; width: 30px; height: 30px; border-radius: 50%;
            box-shadow: 0 0 20px rgba(239,68,68,0.95); animation: pulse-sos 0.8s infinite;
            display: flex; align-items: center; justify-content: center; color: #FFF; font-weight: 900; font-size: 11px; font-family: sans-serif;
          }
          .poi-marker {
            background: #F59E0B; border: 2px solid #FFF; width: 18px; height: 18px; border-radius: 50%;
            box-shadow: 0 2px 8px rgba(245,158,11,0.6);
          }

          @keyframes pulse-warn {
            0% { box-shadow: 0 0 6px rgba(245,158,11,0.6); }
            50% { box-shadow: 0 0 18px rgba(245,158,11,1); }
            100% { box-shadow: 0 0 6px rgba(245,158,11,0.6); }
          }
          @keyframes pulse-sos {
            0% { transform: scale(1); box-shadow: 0 0 8px rgba(239,68,68,0.7); }
            50% { transform: scale(1.15); box-shadow: 0 0 24px rgba(239,68,68,1); }
            100% { transform: scale(1); box-shadow: 0 0 8px rgba(239,68,68,0.7); }
          }

          /* Marching Ants SVG Dash Animation */
          @keyframes stroke-flow {
            from { stroke-dashoffset: 40; }
            to { stroke-dashoffset: 0; }
          }
          .marching-ants {
            animation: stroke-flow 1.5s linear infinite;
          }

          /* Custom Callout Card Popup */
          .leaflet-popup-content-wrapper {
            background: rgba(15, 23, 42, 0.94) !important;
            color: #FFF !important;
            border-radius: 14px !important;
            padding: 4px !important;
            border: 1px solid rgba(99, 102, 241, 0.3) !important;
            box-shadow: 0 8px 24px rgba(0,0,0,0.6) !important;
            backdrop-filter: blur(8px);
          }
          .leaflet-popup-tip { background: rgba(15, 23, 42, 0.94) !important; }
          .callout-card { padding: 8px 10px; font-family: sans-serif; text-align: center; }
          .callout-name { font-size: 13px; font-weight: 800; color: #F1F5F9; margin-bottom: 2px; }
          .callout-sub { font-size: 10px; font-weight: 600; color: #94A3B8; margin-bottom: 6px; }
          .callout-badge {
            display: inline-block; background: rgba(99,102,241,0.2); color: #818CF8;
            font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 10px; margin-bottom: 6px;
          }
          .callout-btn {
            background: #6366F1; color: #FFF; font-size: 11px; font-weight: 700;
            padding: 6px 12px; border-radius: 8px; border: none; cursor: pointer;
            width: 100%; margin-top: 4px; box-shadow: 0 2px 8px rgba(99,102,241,0.4);
          }
          .marker-label {
            background: rgba(15,23,42,0.9); color: #FFF; font-size: 10px;
            padding: 2px 6px; border-radius: 4px; white-space: nowrap;
            font-family: sans-serif; font-weight: 700; border: 1px solid rgba(255,255,255,0.15);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false, attributionControl: false })
            .setView([${centerLat}, ${centerLng}], ${zoom});

          var currentTileLayer = null;
          var tileSources = {
            dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            topo: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
          };

          function setTileSource(type) {
            if (currentTileLayer) map.removeLayer(currentTileLayer);
            var url = tileSources[type] || tileSources.dark;
            currentTileLayer = L.tileLayer(url, { maxZoom: 19, subdomains: 'abcd' }).addTo(map);
          }

          setTileSource('${mapTileType}');

          // User GPS marker with Heading Cone
          var userWrapHtml = '<div class="gps-user-wrap"><div id="gpsCone" class="gps-heading-cone"></div><div class="gps-pulse"></div><div class="gps-marker"></div></div>';
          var userMarker = L.marker([${centerLat}, ${centerLng}], {
            icon: L.divIcon({
              className: '',
              html: userWrapHtml,
              iconSize: [48, 48], iconAnchor: [24, 24]
            })
          }).addTo(map);

          // Geofence circle on origin TiKum
          var tikumCircle = null;

          // Route polylines (Neon Glow & Marching Ants)
          var routeGlowLine = null;
          var routeMainLine = null;
          var pickupRouteLine = null;

          var initRoute = ${routeJSON};
          if (initRoute && initRoute.length > 1) {
            routeGlowLine = L.polyline(initRoute, { color: '#818CF8', weight: 12, opacity: 0.35 }).addTo(map);
            routeMainLine = L.polyline(initRoute, { color: '#6366F1', weight: 5, opacity: 0.95 }).addTo(map);
            map.fitBounds(routeMainLine.getBounds(), { padding: [60, 60] });
          }

          var initPickup = ${pickupRouteJSON};
          if (initPickup && initPickup.length > 1) {
            pickupRouteLine = L.polyline(initPickup, {
              color: '#0EA5E9', weight: 4, dashArray: '10, 10', opacity: 0.9, className: 'marching-ants'
            }).addTo(map);
          }

          // Static & Friend markers
          var staticMarkers = {};
          var initMarkers = ${markersJSON};

          function renderMarkers(mList) {
            Object.values(staticMarkers).forEach(function(m) { map.removeLayer(m); });
            staticMarkers = {};
            mList.forEach(function(m) {
              var isOrigin = m.icon === 'origin';
              var isDest = m.icon === 'dest';
              var isSos = m.icon === 'sos';
              var isFriend = m.icon === 'friend';

              var cls = isOrigin ? 'origin-marker' : isDest ? 'dest-marker' : isSos ? 'sos-friend-marker' : m.isLagging ? 'lagging-friend-marker' : isFriend ? 'friend-marker' : 'poi-marker';

              if (isOrigin && !tikumCircle) {
                tikumCircle = L.circle([m.lat, m.lng], { radius: 300, color: '#10B981', fillColor: '#10B981', fillOpacity: 0.12, weight: 1.5 }).addTo(map);
              }

              var innerHtml = (isFriend || isSos) ? (m.label ? m.label.substring(0, 2).toUpperCase() : 'M') : '';
              var mk = L.marker([m.lat, m.lng], {
                icon: L.divIcon({ className: cls, html: innerHtml, iconSize: [22, 22], iconAnchor: [11, 11] })
              }).addTo(map);

              if (m.label) mk.bindTooltip(m.label, { permanent: true, direction: 'bottom', className: 'marker-label', offset: [0, 10] });

              // Rich Popup Callout
              if (isFriend || isSos) {
                var popupHtml = '<div class="callout-card">' +
                  '<div class="callout-name">' + (m.label || 'Member') + '</div>' +
                  '<div class="callout-badge">' + (isSos ? '🚨 SOS DARURAT' : m.isLagging ? '⚠️ TERTINGGAL' : '🟢 AKTIF') + '</div>' +
                  '<div class="callout-sub">' + (m.distanceKm ? m.distanceKm + ' km dari kamu' : 'Dalam rombongan') + '</div>' +
                  '<button class="callout-btn" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({cmd:\'focusMember\',id:\'' + m.id + '\'}))">🎯 Fokus Kamera</button>' +
                  '</div>';
                mk.bindPopup(popupHtml);
              }

              staticMarkers[m.id] = mk;
            });
          }

          renderMarkers(initMarkers);

          // RN postMessage handler
          document.addEventListener('message', function(e) { handleMsg(e); });
          window.addEventListener('message', function(e) { handleMsg(e); });

          function handleMsg(e) {
            try {
              var d = JSON.parse(e.data);
              if (d.cmd === 'panTo') {
                map.flyTo([d.lat, d.lng], d.zoom || map.getZoom(), { duration: 0.8 });
              } else if (d.cmd === 'fitBounds') {
                if (d.coords && d.coords.length > 1) {
                  map.fitBounds(d.coords, { padding: d.padding || [50, 50] });
                }
              } else if (d.cmd === 'setTileType') {
                setTileSource(d.type);
              } else if (d.cmd === 'updateUser') {
                userMarker.setLatLng([d.lat, d.lng]);
                var cone = document.getElementById('gpsCone');
                if (cone && d.heading !== undefined) {
                  cone.style.transform = 'rotate(' + d.heading + 'deg)';
                }
              } else if (d.cmd === 'setRoute') {
                if (routeGlowLine) map.removeLayer(routeGlowLine);
                if (routeMainLine) map.removeLayer(routeMainLine);
                if (d.coords && d.coords.length > 1) {
                  routeGlowLine = L.polyline(d.coords, { color: '#818CF8', weight: 12, opacity: 0.35 }).addTo(map);
                  routeMainLine = L.polyline(d.coords, { color: '#6366F1', weight: 5, opacity: 0.95 }).addTo(map);
                  map.fitBounds(routeMainLine.getBounds(), { padding: [60, 60] });
                }
              } else if (d.cmd === 'setPickupRoute') {
                if (pickupRouteLine) map.removeLayer(pickupRouteLine);
                if (d.coords && d.coords.length > 1) {
                  pickupRouteLine = L.polyline(d.coords, {
                    color: '#0EA5E9', weight: 4, dashArray: '10, 10', opacity: 0.9, className: 'marching-ants'
                  }).addTo(map);
                }
              } else if (d.cmd === 'setMarkers') {
                renderMarkers(d.markers || []);
              }
            } catch(_e) {}
          }
        <\\/script>
      </body>
    </html>
  `;

  if (!WebView) {
    return (
      <View style={[styles.container, style, { backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#FFF', fontSize: 14 }}>Peta tidak tersedia</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: leafletHTML }}
        style={styles.map}
        scrollEnabled={false}
        javaScriptEnabled={true}
        onMessage={(e) => {
          try {
            const data = JSON.parse(e.nativeEvent.data);
            if (data?.cmd === 'focusMember' && onMarkerPress) {
              onMarkerPress(data.id);
            }
          } catch (_err) {}
        }}
        onLoadEnd={() => {
          if (routeCoords.length > 1) {
            postCmd('setRoute', { coords: routeCoords.map((c) => [c.latitude, c.longitude]) });
          }
          if (pickupRouteCoords.length > 1) {
            postCmd('setPickupRoute', { coords: pickupRouteCoords.map((c) => [c.latitude, c.longitude]) });
          }
          if (markers.length > 0) {
            postCmd('setMarkers', { markers });
          }
          postCmd('setTileType', { type: mapTileType });
        }}
      />
    </View>
  );
}

const LeafletMap = forwardRef(LeafletMapBridge);

// ── Main TiKumMap Component ──
const TiKumMapInner = function TiKumMapInner(props, ref) {
  const {
    style,
    initialRegion,
    centerCoordinate: customCenter,
    zoomLevel: customZoom,
    children,
    onPress,
    styleURL = TIKUM_DARK_STYLE,
    routeCoords = [],
    pickupRouteCoords = [],
    markers = [],
    myLocation,
    mapTileType = 'dark',
    onMarkerPress,
  } = props;

  const centerLat = customCenter?.latitude || initialRegion?.latitude || myLocation?.latitude || -6.9175;
  const centerLng = customCenter?.longitude || initialRegion?.longitude || myLocation?.longitude || 107.6191;
  const zoom = customZoom !== undefined ? customZoom : 13;

  if (MapViewComp) {
    return (
      <View style={[styles.container, style]}>
        <MapViewComp
          ref={ref}
          style={styles.map}
          styleURL={styleURL}
          attributionEnabled={false}
          logoEnabled={false}
          compassEnabled={true}
          onPress={onPress}
        >
          {CameraComp && (
            <CameraComp
              centerCoordinate={[centerLng, centerLat]}
              zoomLevel={zoom}
              animationMode="flyTo"
              animationDuration={800}
            />
          )}
          {children}
        </MapViewComp>
      </View>
    );
  }

  if (MapViewNative) {
    return (
      <View style={[styles.container, style]}>
        <MapViewNative
          ref={ref}
          style={styles.map}
          initialRegion={initialRegion || {
            latitude: centerLat,
            longitude: centerLng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onPress={onPress}
          showsUserLocation={true}
          showsMyLocationButton={true}
          followsUserLocation={true}
        >
          {children}
        </MapViewNative>
      </View>
    );
  }

  return (
    <LeafletMap
      ref={ref}
      style={style}
      centerLat={centerLat}
      centerLng={centerLng}
      zoom={zoom}
      routeCoords={routeCoords}
      pickupRouteCoords={pickupRouteCoords}
      markers={markers}
      myLocation={myLocation}
      mapTileType={mapTileType}
      onPress={onPress}
      onMarkerPress={onMarkerPress}
    />
  );
};

const TiKumMap = forwardRef(TiKumMapInner);
export default TiKumMap;

export function TiKumMarker({ id, coordinate, children, title }) {
  if (!coordinate) return null;

  if (MapViewNative) {
    try {
      const { Marker: NativeMarker } = require('react-native-maps');
      return (
        <NativeMarker
          coordinate={{ latitude: coordinate.latitude, longitude: coordinate.longitude }}
          title={title}
        >
          {children || <View style={styles.defaultMarker} />}
        </NativeMarker>
      );
    } catch (_e) { return null; }
  }

  const MarkerViewComp = MapLibreGL?.MarkerView || MapLibreGL?.PointAnnotation;
  if (!MarkerViewComp) return null;

  return (
    <MarkerViewComp
      id={id || `marker-${coordinate.latitude}-${coordinate.longitude}`}
      coordinate={[coordinate.longitude, coordinate.latitude]}
      title={title}
    >
      {children || <View style={styles.defaultMarker} />}
    </MarkerViewComp>
  );
}

export function TiKumPolyline({ id, coordinates, strokeColor = '#6366F1', strokeWidth = 4, lineDashPattern }) {
  if (!coordinates || coordinates.length < 2) return null;

  if (MapViewNative) {
    try {
      const { Polyline: NativePolyline } = require('react-native-maps');
      return (
        <NativePolyline
          coordinates={coordinates}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          lineDashPattern={lineDashPattern}
        />
      );
    } catch (_e) { return null; }
  }

  const ShapeSourceComp = MapLibreGL?.ShapeSource;
  const LineLayerComp = MapLibreGL?.LineLayer;
  if (!ShapeSourceComp || !LineLayerComp) return null;

  const geojson = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coordinates.map((c) => [c.longitude, c.latitude]),
    },
  };

  return (
    <ShapeSourceComp id={id || 'route-source'} shape={geojson}>
      <LineLayerComp
        id={`${id || 'route'}-layer`}
        style={{
          lineColor: strokeColor,
          lineWidth: strokeWidth,
          lineCap: 'round',
          lineJoin: 'round',
          ...(lineDashPattern ? { lineDasharray: lineDashPattern } : {}),
        }}
      />
    </ShapeSourceComp>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  defaultMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#6366F1',
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
});