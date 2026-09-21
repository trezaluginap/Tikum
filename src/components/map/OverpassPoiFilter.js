import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../constants/theme';

export default function OverpassPoiFilter({ origin, destination, onPoiSelected }) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [_poiResults, setPoiResults] = useState([]);

  const categories = [
    { id: 'fuel', label: 'SPBU', icon: 'gas-station', amenity: 'fuel' },
    { id: 'repair', label: 'Bengkel', icon: 'wrench', amenity: 'car_repair' },
    { id: 'cafe', label: 'Rest Area', icon: 'coffee', amenity: 'cafe' },
  ];

  const fetchPoi = async (cat) => {
    if (activeCategory === cat.id) {
      setActiveCategory(null);
      setPoiResults([]);
      onPoiSelected([]);
      return;
    }

    setActiveCategory(cat.id);
    setLoading(true);

    try {
      const centerLat = origin?.latitude || destination?.latitude || -6.9175;
      const centerLng = origin?.longitude || destination?.longitude || 107.6191;

      // Overpass API Query — 5 km radius search
      const query = `[out:json][timeout:10];node(around:5000,${centerLat},${centerLng})["amenity"="${cat.amenity}"];out body 10;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json && json.elements) {
        const nodes = json.elements.map(el => ({
          id: `poi-${el.id}`,
          name: el.tags?.name || cat.label,
          latitude: el.lat,
          longitude: el.lon,
          type: cat.id,
        }));
        setPoiResults(nodes);
        onPoiSelected(nodes);
      } else {
        setPoiResults([]);
        onPoiSelected([]);
      }
    } catch (_err) {
      setPoiResults([]);
      onPoiSelected([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          const isActive = activeCategory === item.id;
          return (
            <TouchableOpacity
              style={[styles.btn, isActive && styles.btnActive]}
              onPress={() => fetchPoi(item)}
              activeOpacity={0.8}
            >
              {loading && isActive ? (
                <ActivityIndicator size="small" color={colors.white} style={{ marginRight: 4 }} />
              ) : (
                <MaterialCommunityIcons
                  name={item.icon}
                  size={16}
                  color={isActive ? colors.white : colors.textPrimary}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text style={[styles.btnText, isActive && styles.btnTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 155,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 43,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    marginRight: spacing.xs + 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  btnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  btnText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  btnTextActive: {
    color: colors.white,
    fontFamily: fonts.bold,
  },
});
