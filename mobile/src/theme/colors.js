export const Colors = {
  // Brand Greens inspired by the logo
  primary: '#059669',       // Deep emerald
  primaryLight: '#10B981',  // Vibrant mint green
  primaryDark: '#047857',   // Forest emerald
  primaryMuted: '#D1FAE5',  // Soft background tint
  primaryPale: '#ECFDF5',   // Very light mint

  // Occupancy Status (matching logo traffic lights)
  levelFree: '#10B981',     // Green - Свободно
  levelMedium: '#F59E0B',   // Yellow/Amber - Плотненько
  levelFull: '#EF4444',     // Red - Не влезешь
  levelNone: '#94A3B8',     // Gray - Нет данных

  // Neutrals
  white: '#FFFFFF',
  black: '#0F172A',
  dark: '#1E293B',
  gray700: '#334155',
  gray600: '#475569',
  gray500: '#64748B',
  gray400: '#94A3B8',
  gray300: '#CBD5E1',
  gray200: '#E2E8F0',
  gray100: '#F1F5F9',
  gray50: '#F8FAFC',

  // Accents
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  headlightYellow: '#FBBF24',
  trolleybusBlue: '#0284C7',
  busEmerald: '#059669',

  // Shadows
  shadow: 'rgba(15, 23, 42, 0.08)',
  shadowStrong: 'rgba(15, 23, 42, 0.16)',
};

export const LEVELS = [
  { id: 0, badge: 'Свободно', hint: 'Есть сидячие места', color: Colors.levelFree, bg: '#D1FAE5' },
  { id: 1, badge: 'Плотненько', hint: 'Только стоя, но свободно', color: Colors.levelMedium, bg: '#FEF3C7' },
  { id: 2, badge: 'Не влезешь', hint: 'Салон переполнен', color: Colors.levelFull, bg: '#FEE2E2' },
];
