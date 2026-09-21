import { useRef, useState } from 'react';

export function useLocationSearch() {
  const [name, setName] = useState('');
  const [coords, setCoords] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);

  const timeoutRef = useRef(null);

  const onSearch = (query) => {
    setName(query);
    setCoords(null);

    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=id&limit=5&addressdetails=1`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'TiKum-MobileApp/1.0',
          },
        });

        let data;
        try {
          data = await response.json();
        } catch {
          throw new Error('Respons server tidak valid');
        }

        if (!Array.isArray(data) || data.length === 0) {
          setSuggestions([]);
          return;
        }

        setSuggestions(
          data.map((item) => {
            const parts = item.display_name.split(',').map((s) => s.trim());
            const title = parts[0] || item.display_name;
            const subtitle = parts.slice(1, 4).join(', ');

            return {
              name: title,
              subtitle,
              fullName: item.display_name,
              latitude: parseFloat(item.lat),
              longitude: parseFloat(item.lon),
              type: item.type || '',
            };
          })
        );
      } catch (error) {
        console.error('[useLocationSearch] Error:', error);
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  const onSelect = (location) => {
    const displayName = location.subtitle
      ? `${location.name}, ${location.subtitle.split(',')[0]}`
      : location.name;
    setName(displayName);
    setCoords({ latitude: location.latitude, longitude: location.longitude });
    setSuggestions([]);
  };

  const setManual = (displayName, latitude, longitude) => {
    setName(displayName);
    setCoords({ latitude, longitude });
    setSuggestions([]);
  };

  const clearAll = () => {
    setName('');
    setCoords(null);
    setSuggestions([]);
    setSearching(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  return { name, coords, suggestions, searching, onSearch, onSelect, setManual, clearAll };
}
