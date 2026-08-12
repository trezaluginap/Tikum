import { useEffect, useState } from 'react';

/**
 * Decode encoded polyline string from Valhalla (precision 6).
 */
function decodePolyline(str, precision = 6) {
  let index = 0, lat = 0, lng = 0;
  const coordinates = [];
  const factor = Math.pow(10, precision);

  while (index < str.length) {
    let shift = 0, result = 0, byte;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    shift = 0;
    result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    coordinates.push({
      latitude: lat / factor,
      longitude: lng / factor,
    });
  }
  return coordinates;
}

/**
 * Build Valhalla request payload.
 * @param {object} originCoords - { latitude, longitude }
 * @param {object} destinationCoords - { latitude, longitude }
 * @param {'motorcycle'|'auto_toll'|'auto_no_toll'} mode
 */
function buildValhallaPayload(originCoords, destinationCoords, mode = 'auto_toll') {
  let costing = 'auto';
  const costingOptions = {};

  if (mode === 'motorcycle') {
    costing = 'motorcycle';
  } else if (mode === 'auto_no_toll') {
    costing = 'auto';
    costingOptions.auto = { use_tolls: 0 };
  } else {
    // auto_toll (default)
    costing = 'auto';
    costingOptions.auto = { use_tolls: 1 };
  }

  return {
    locations: [
      { lat: originCoords.latitude, lon: originCoords.longitude, type: 'break' },
      { lat: destinationCoords.latitude, lon: destinationCoords.longitude, type: 'break' },
    ],
    costing,
    costing_options: costingOptions,
    directions_options: {
      units: 'kilometers',
      language: 'id-ID',
    },
  };
}

const VALHALLA_URL = 'https://valhalla1.openstreetmap.de/route';

/**
 * Fetch a route from Valhalla.
 * Returns { routeCoords, routeSummary, maneuvers } or null on error.
 */
export async function fetchValhallaRoute(originCoords, destinationCoords, mode = 'auto_toll') {
  if (!originCoords || !destinationCoords) return null;

  const payload = buildValhallaPayload(originCoords, destinationCoords, mode);
  const url = `${VALHALLA_URL}?json=${encodeURIComponent(JSON.stringify(payload))}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      console.error('[Valhalla] HTTP Error:', res.status, errText.slice(0, 200));
      return null;
    }
    const json = await res.json();

    if (!json.trip || !json.trip.legs || json.trip.legs.length === 0) {
      console.error('[Valhalla] No trip/legs found');
      return null;
    }

    const trip = json.trip;
    const shape = trip.legs[0].shape;
    const routeCoords = decodePolyline(shape, 6);
    const maneuvers = trip.legs[0].maneuvers || [];

    return {
      routeCoords,
      routeSummary: {
        distanceKm: trip.summary.length.toFixed(1),
        durationMin: Math.ceil(trip.summary.time / 60),
      },
      maneuvers,
    };
  } catch (error) {
    console.error('[Valhalla] Fetch error:', error);
    return null;
  }
}

/**
 * Custom hook untuk fetch rute Valhalla antara dua titik koordinat.
 * Otomatis fetch ulang saat originCoords, destinationCoords, atau mode berubah.
 *
 * @param {object|null} originCoords - { latitude, longitude }
 * @param {object|null} destinationCoords - { latitude, longitude }
 * @param {'motorcycle'|'auto_toll'|'auto_no_toll'} mode
 *
 * Usage:
 *   const { routeCoords, routeSummary, loading } = useValhallaRoute(origin.coords, destination.coords, 'auto_toll');
 */
export function useValhallaRoute(originCoords, destinationCoords, mode = 'auto_toll') {
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [maneuvers, setManeuvers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!originCoords || !destinationCoords) {
      setRouteCoords([]);
      setRouteSummary(null);
      setManeuvers([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const result = await fetchValhallaRoute(originCoords, destinationCoords, mode);
      if (cancelled) return;

      if (result) {
        setRouteCoords(result.routeCoords);
        setRouteSummary(result.routeSummary);
        setManeuvers(result.maneuvers);
      } else {
        setRouteCoords([]);
        setRouteSummary(null);
        setManeuvers([]);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [
    originCoords?.latitude, originCoords?.longitude,
    destinationCoords?.latitude, destinationCoords?.longitude,
    mode,
  ]);

  return { routeCoords, routeSummary, maneuvers, loading };
}

// Keep backward-compatible export name
export const useOsrmRoute = useValhallaRoute;
