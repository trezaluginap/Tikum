import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

let MapLibreGL = null;
try {
  MapLibreGL = require('@maplibre/maplibre-react-native');
  if (MapLibreGL?.default) MapLibreGL = MapLibreGL.default;
} catch (e) {
  MapLibreGL = null;
}

const MapViewComp = MapLibreGL?.MapView || MapLibreGL?.default?.MapView;
const CameraComp = MapLibreGL?.Camera || MapLibreGL?.default?.Camera;

// CartoDB Dark Matter — 100% Free OpenSource Dark Map Style (No API Key Required!)
export const TIKUM_DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
export const TIKUM_STREETS_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

export default function TiKumMap({
  style,
  initialRegion,
  centerCoordinate: customCenter,
  zoomLevel: customZoom,
  children,
  onPress,
  mapRef,
  styleURL = TIKUM_DARK_STYLE,
}) {
  const centerLat = customCenter?.latitude || initialRegion?.latitude || -6.9175;
  const centerLng = customCenter?.longitude || initialRegion?.longitude || 107.6191;
  const zoom = customZoom !== undefined ? customZoom : 13;

  // 1. If MapLibre Native C++ engine is present in installed APK -> Use MapLibre Native GL
  if (MapViewComp) {
    return (
      <View style={[styles.container, style]}>
        <MapViewComp
          ref={mapRef}
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

  // 2. Dual Engine Fallback: OpenStreetMap CartoDB Dark Leaflet Map
  const leafletHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background-color: #0F172A; }
          .leaflet-control-container .leaflet-routing-container-hide { display: none; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${centerLat}, ${centerLng}], ${zoom});
          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd'
          }).addTo(map);
          L.circleMarker([${centerLat}, ${centerLng}], {
            radius: 8,
            fillColor: '#6366F1',
            color: '#FFFFFF',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
          }).addTo(map);
        </script>
      </body>
    </html>
  `;

  return (
    <View style={[styles.container, style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: leafletHTML }}
        style={styles.map}
        scrollEnabled={false}
      />
    </View>
  );
}

// Helper sub-component for MapLibre Markers (Avatars, SOS, Flags)
export function TiKumMarker({ id, coordinate, children, title }) {
  const MarkerViewComp = MapLibreGL?.MarkerView || MapLibreGL?.PointAnnotation;
  if (!MarkerViewComp || !coordinate) return null;

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

// Helper sub-component for MapLibre Vector Polyline Routes
export function TiKumPolyline({ id, coordinates, strokeColor = '#6366F1', strokeWidth = 4 }) {
  const ShapeSourceComp = MapLibreGL?.ShapeSource;
  const LineLayerComp = MapLibreGL?.LineLayer;

  if (!ShapeSourceComp || !LineLayerComp || !coordinates || coordinates.length < 2) return null;

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
