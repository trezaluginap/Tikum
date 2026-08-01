import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import DestinationScreen from '../screens/DestinationScreen';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StatsScreen from '../screens/StatsScreen';
import { colors, fonts, radius, spacing } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';

const Tab = createBottomTabNavigator();

function CustomGlassTabBar({ state, descriptors, navigation }) {
  const { t } = useLanguage();

  const getTabLabel = (routeName) => {
    switch (routeName) {
      case 'Home': return t('home.Radar');
      case 'Destinasi': return t('home.destinasi');
      case 'Stats': return t('home.statistik');
      case 'Settings': return t('home.pengaturan');
      default: return routeName;
    }
  };

  const getTabIcon = (routeName) => {
    switch (routeName) {
      case 'Radar': return 'radar';
      case 'Destinasi': return 'compass-outline';
      case 'Stats': return 'chart-timeline-variant';
      case 'Settings': return 'cog-outline';
      default: return 'circle';
    }
  };

  return (
    <View style={styles.tabBarFloatingContainer}>
      <View style={styles.glassTabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconName = getTabIcon(route.name);
          const label = getTabLabel(route.name);

          return (
            <TouchableOpacity
              key={route.key}
              style={[styles.tabItem, isFocused && styles.tabItemActive]}
              onPress={onPress}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={iconName}
                size={20}
                color={isFocused ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomGlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Radar" component={HomeScreen} />
      <Tab.Screen name="Destinasi" component={DestinationScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarFloatingContainer: {
    position: 'absolute',
    bottom: 24,
    left: spacing.xl,
    right: spacing.xl,
    height: 60,
    zIndex: 100,
  },
  glassTabBar: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.88)',
    borderRadius: radius.xl + 4,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.28)',
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingVertical: 4,
  },
  tabItemActive: {
    transform: [{ scale: 1.05 }],
  },
  tabLabel: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    marginTop: 3,
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: colors.primary,
  },
});
