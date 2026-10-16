import { useEffect, useState } from 'react';

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

function parseOsrmManeuvers(steps = []) {
  let cumulative = 0;
  return steps.map((s, idx) => {
    const mType = s.maneuver?.type || 'turn';
    const mMod = s.maneuver?.modifier || '';
    const street = s.name && s.name.trim() ? s.name.trim() : 'jalan utama';

    const isRealTurn = [
      'turn', 'uturn', 'roundabout', 'roundabout_turn',
      'exit_roundabout', 'off_ramp', 'fork', 'end_of_road', 'merge',
    ].includes(mType);

    let icon = 'navigation-variant';
    let text = `Lanjut ke ${street}`;

    if (mType === 'depart') {
      icon = 'flag-variant';
      text = `Mulai perjalanan di ${street}`;
    } else if (mType === 'arrive') {
      icon = 'flag-checkered';
      text = `Anda telah tiba di tujuan, ${street}`;
    } else if (mMod.includes('left')) {
      icon = 'arrow-top-left-bold';
      text = mType === 'fork' ? `Belok kiri bercabang ke ${street}` : `Belok kiri ke ${street}`;
    } else if (mMod.includes('right')) {
      icon = 'arrow-top-right-bold';
      text = mType === 'fork' ? `Belok kanan bercabang ke ${street}` : `Belok kanan ke ${street}`;
    } else if (mMod.includes('uturn')) {
      icon = 'undo-variant';
      text = `Putar balik ke ${street}`;
    } else if (mType === 'roundabout' || mType === 'roundabout_turn' || mType === 'exit_roundabout') {
      icon = 'arrow-u-up-right';
      text = `Ikuti bundaran, ambil jalan menuju ${street}`;
    }

    cumulative += Math.round(s.distance || 0);

    return {
      id: `step-${idx}`,
      type: mType,
      modifier: mMod,
      icon,
      instruction: text,
      streetName: street,
      isTurn: isRealTurn,
      distanceMeters: cumulative,
      location: s.maneuver?.location ? { latitude: s.maneuver.location[1], longitude: s.maneuver.location[0] } : null,
    };
  });
}

const OSRM_BIKE_URLS = [
  'https://routing.openstreetmap.de/routed-bike/route/v1/biking',
  'https://routing.openstreetmap.de/routed-car/route/v1/driving',
];
const OSRM_CAR_URLS = [
  'https://routing.openstreetmap.de/routed-car/route/v1/driving',
  'https://router.project-osrm.org/route/v1/driving',
];

async function safeFetchJson(url, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) return null;
    return JSON.parse(text);
  } catch (_e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function buildOsrmUrl(base, origin, destination) {
  return `${base}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=polyline&steps=true`;
}

export async function fetchValhallaRoute(originCoords, destinationCoords, mode = 'auto_toll') {
  if (!originCoords || !destinationCoords) return null;

  const useBike = mode === 'motorcycle' || mode === 'auto_no_toll';
  const hosts = useBike ? OSRM_BIKE_URLS : OSRM_CAR_URLS;

  for (const host of hosts) {
    const json = await safeFetchJson(buildOsrmUrl(host, originCoords, destinationCoords));
    const route = json?.routes?.[0];
    if (route?.geometry) {
      const steps = route.legs?.[0]?.steps || [];
      return {
        routeCoords: decodePolyline(route.geometry, 5),
        routeSummary: {
          distanceKm: (route.distance / 1000).toFixed(1),
          durationMin: Math.ceil(route.duration / 60),
        },
        maneuvers: parseOsrmManeuvers(steps),
      };
    }
  }

  return null;
}

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

export const useOsrmRoute = useValhallaRoute;
