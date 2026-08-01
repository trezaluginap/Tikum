/**
 * Design Tokens — Techy Minimalist Palette
 * Target: anak muda, convoy/group use
 */

export const colors = {
  // Brand — indigo-based, premium feel
  primary: '#6366F1',       // Indigo 500
  primaryDark: '#4338CA',   // Indigo 700
  primaryLight: '#EEF2FF',  // Indigo 50
  primaryMuted: '#A5B4FC',  // Indigo 300

  // Status
  success: '#10B981',       // Emerald 500
  successLight: '#D1FAE5',
  successDark: '#065F46',
  danger: '#EF4444',        // Red 500
  dangerLight: '#FEE2E2',
  warning: '#F59E0B',       // Amber 500

  // UI Surface — dark-accented
  background: '#0F172A',    // Slate 900
  backgroundLight: '#1E293B', // Slate 800
  card: '#1E293B',          // Slate 800
  cardElevated: '#334155',  // Slate 700
  border: '#334155',        // Slate 700
  borderLight: '#475569',   // Slate 600
  borderInput: '#475569',
  inputBg: '#1E293B',
  suggestion: '#334155',
  overlay: 'rgba(0,0,0,0.7)',
  white: '#FFFFFF',

  // Typography
  textPrimary: '#F1F5F9',   // Slate 100
  textSecondary: '#94A3B8',  // Slate 400
  textMuted: '#64748B',      // Slate 500
  textDisabled: '#475569',   // Slate 600
  textSuccess: '#6EE7B7',    // Emerald 300
  textOnPrimary: '#FFFFFF',

  // Route info
  routeInfoBg: '#312E81',    // Indigo 900
  routeInfoText: '#C7D2FE',  // Indigo 200

  // Map
  mapOverlay: 'rgba(15,23,42,0.6)',

  // Glows & Accents
  primaryGlow: 'rgba(99, 102, 241, 0.35)',
  successGlow: 'rgba(16, 185, 129, 0.35)',
  dangerGlow: 'rgba(239, 68, 68, 0.35)',
  glassBg: 'rgba(30, 41, 59, 0.75)',
  glassBorder: 'rgba(99, 102, 241, 0.2)',
};

export const shadows = {
  glowPrimary: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  glowDanger: {
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  glassCard: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 20,
  full: 999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  hero: 28,
};

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
};
