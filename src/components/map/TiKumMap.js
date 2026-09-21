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

// Never instantiate react-native-maps: project uses MapLibre/Leaflet only.
const MapViewNative = null;
const MapViewComp = MapLibreGL?.MapView || MapLibreGL?.default?.MapView;
const CameraComp = MapLibreGL?.Camera || MapLibreGL?.default?.Camera;

// OpenStreetMap Standard Tiles & OpenTopoMap (100% Free, No API Key Required)
export const TIKUM_DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark';
export const TIKUM_STREETS_STYLE = 'https://tiles.openfreemap.org/styles/bright';

// ── WebView Leaflet Bridge ──
// Exposes mapRef-compatible API that bridges to Leaflet via postMessage
function LeafletMapBridge(props, ref) {
  const {
    style,
    centerLat,
    centerLng,
    zoom,
    routeCoords = [],
    markers = [],
    myLocation,
    onPress,
  } = props;

  const webViewRef = useRef(null);

  const postCmd = (cmd, data) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ cmd, ...data }));
    }
  };

  // Expose mapRef-compatible API
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
  }));

  // Update user location marker in real-time
  useEffect(() => {
    if (myLocation) {
      postCmd('updateUser', { lat: myLocation.latitude, lng: myLocation.longitude, heading: myLocation.heading || 0 });
    }
  }, [myLocation?.latitude, myLocation?.longitude]);

  // Update route polyline
  useEffect(() => {
    if (routeCoords.length > 1) {
      postCmd('setRoute', {
        coords: routeCoords.map((c) => [c.latitude, c.longitude]),
      });
    }
  }, [routeCoords.length]);

  // Update markers
  useEffect(() => {
    if (markers.length > 0) {
      postCmd('setMarkers', { markers });
    }
  }, [markers.length]);

  const markersJSON = JSON.stringify(markers.map((m) => ({
    id: m.id,
    lat: m.latitude,
    lng: m.longitude,
    label: m.label || '',
    color: m.color || '#6366F1',
    icon: m.icon || 'circle',
  })));

  const routeJSON = JSON.stringify(
    routeCoords.map((c) => [c.latitude, c.longitude])
  );

  const leafletHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
        <style>
          html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #0F172A; }
          .gps-marker {
            width: 20px; height: 20px; background: #6366F1;
            border: 3px solid #FFF; border-radius: 50%;
            box-shadow: 0 0 14px rgba(99,102,241,0.7);
          }
          .gps-pulse {
            width: 40px; height: 40px; border-radius: 50%;
            background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.4);
            position: absolute; top: -10px; left: -10px;
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.7; }
            100% { transform: scale(2); opacity: 0; }
          }
          .origin-marker { background: #10B981; border: 2px solid #FFF; width: 14px; height: 14px; border-radius: 50%; }
          .dest-marker { background: #EF4444; border: 2px solid #FFF; width: 14px; height: 14px; border-radius: 50%; }
          .friend-marker { background: #10B981; border: 2px solid #FFF; width: 16px; height: 16px; border-radius: 50%; }
          .poi-marker { background: #F59E0B; border: 2px solid #FFF; width: 14px; height: 14px; border-radius: 50%; }
          .marker-label {
            background: rgba(15,23,42,0.85); color: #FFF; font-size: 10px;
            padding: 2px 6px; border-radius: 4px; white-space: nowrap;
            font-family: sans-serif; font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false, attributionControl: false })
            .setView([${centerLat}, ${centerLng}], ${zoom});

          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

          // User GPS marker
          var userMarker = L.marker([${centerLat}, ${centerLng}], {
            icon: L.divIcon({
              className: '',
              html: '<div class="gps-pulse"></div><div class="gps-marker"></div>',
              iconSize: [20, 20], iconAnchor: [10, 10]
            })
          }).addTo(map);

          // Route polyline
          var routeLine = null;
          var initRoute = ${routeJSON};
          if (initRoute && initRoute.length > 1) {
            routeLine = L.polyline(initRoute, { color: '#6366F1', weight: 5, opacity: 0.85 }).addTo(map);
            map.fitBounds(routeLine.getBounds(), { padding: [60, 60] });
          }

          // Static markers
          var staticMarkers = {};
          var initMarkers = ${markersJSON};
          initMarkers.forEach(function(m) {
            var cls = m.icon === 'origin' ? 'origin-marker' : m.icon === 'dest' ? 'dest-marker' : m.icon === 'friend' ? 'friend-marker' : 'poi-marker';
            var mk = L.marker([m.lat, m.lng], {
              icon: L.divIcon({ className: cls, iconSize: [14, 14], iconAnchor: [7, 7] })
            }).addTo(map);
            if (m.label) mk.bindTooltip(m.label, { permanent: true, direction: 'bottom', className: 'marker-label', offset: [0, 8] });
            staticMarkers[m.id] = mk;
          });

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
              } else if (d.cmd === 'updateUser') {
                userMarker.setLatLng([d.lat, d.lng]);
              } else if (d.cmd === 'setRoute') {
                if (routeLine) map.removeLayer(routeLine);
                routeLine = L.polyline(d.coords, { color: '#6366F1', weight: 5, opacity: 0.85 }).addTo(map);
                map.fitBounds(routeLine.getBounds(), { padding: [60, 60] });
              } else if (d.cmd === 'setMarkers') {
                Object.values(staticMarkers).forEach(function(m) { map.removeLayer(m); });
                staticMarkers = {};
                d.markers.forEach(function(m) {
                  var cls = m.icon === 'origin' ? 'origin-marker' : m.icon === 'dest' ? 'dest-marker' : m.icon === 'friend' ? 'friend-marker' : 'poi-marker';
                  var mk = L.marker([m.lat, m.lng], {
                    icon: L.divIcon({ className: cls, iconSize: [14, 14], iconAnchor: [7, 7] })
                  }).addTo(map);
                  if (m.label) mk.bindTooltip(m.label, { permanent: true, direction: 'bottom', className: 'marker-label', offset: [0, 8] });
                  staticMarkers[m.id] = mk;
                });
              }
            } catch(_e) {}
          }
        <\/script>
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
    // WebView-specific props
    routeCoords = [],
    markers = [],
    myLocation,
  } = props;

  const centerLat = customCenter?.latitude || initialRegion?.latitude || myLocation?.latitude || -6.9175;
  const centerLng = customCenter?.longitude || initialRegion?.longitude || myLocation?.longitude || 107.6191;
  const zoom = customZoom !== undefined ? customZoom : 13;

  // 1. MapLibre Native
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

  // 2. react-native-maps Native
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

  // 3. WebView Leaflet (full interactive bridge)
  return (
    <LeafletMap
      ref={ref}
      style={style}
      centerLat={centerLat}
      centerLng={centerLng}
      zoom={zoom}
      routeCoords={routeCoords}
      markers={markers}
      myLocation={myLocation}
      onPress={onPress}
    />
  );
};

const TiKumMap = forwardRef(TiKumMapInner);
export default TiKumMap;

// ── Sub-components for Native engines (MapLibre / react-native-maps) ──
// These are only rendered as children when a native engine is active.
// In WebView mode, data flows via props (routeCoords, markers).

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

export function TiKumPolyline({ id, coordinates, strokeColor = '#6366F1', strokeWidth = 4 }) {
  if (!coordinates || coordinates.length < 2) return null;

  if (MapViewNative) {
    try {
      const { Polyline: NativePolyline } = require('react-native-maps');
      return (
        <NativePolyline
          coordinates={coordinates}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
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
