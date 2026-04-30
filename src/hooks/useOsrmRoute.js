import { useEffect, useState } from 'react';

/**
 * Custom hook untuk fetch rute OSRM antara dua titik koordinat.
 * Otomatis fetch ulang saat originCoords atau destinationCoords berubah.
 *
 * Usage:
 *   const { routeCoords, routeSummary } = useOsrmRoute(origin.coords, destination.coords);
 */
export function useOsrmRoute(originCoords, destinationCoords) {
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);

  useEffect(() => {
    if (!originCoords || !destinationCoords) {
      setRouteCoords([]);
      setRouteSummary(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${originCoords.longitude},${originCoords.latitude};${destinationCoords.longitude},${destinationCoords.latitude}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const json = await res.json();

        if (!json.routes || json.routes.length === 0) {
          throw new Error('Rute OSRM tidak ditemukan');
        }

        const selected = json.routes[0];
        setRouteCoords(
          selected.geometry.coordinates.map(([lon, lat]) => ({
            latitude: lat,
            longitude: lon,
          }))
        );
        setRouteSummary({
          distanceKm: (selected.distance / 1000).toFixed(1),
          durationMin: Math.ceil(selected.duration / 60),
        });
      } catch (error) {
        console.error('[useOsrmRoute] Error:', error);
      }
    };

    fetchRoute();
  }, [originCoords, destinationCoords]);

  return { routeCoords, routeSummary };
}
