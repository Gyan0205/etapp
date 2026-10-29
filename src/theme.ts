import { useColorScheme } from 'react-native';

const light = {
  isDark: false,
  bg: '#F3F6F4',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  faint: '#94A3B8',
  primary: '#2B7A5B',
  primarySoft: '#E2EFE8',
  onPrimary: '#FFFFFF',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  good: '#2E8B57',
  border: '#E2E9E5',
  chip: '#E8EEEA',
  track: '#E9EFEB',
};

const dark: typeof light = {
  isDark: true,
  bg: '#0C1210',
  card: '#141C19',
  text: '#ECF6F0',
  muted: '#94A3B8',
  faint: '#64748B',
  primary: '#5FB892',
  primarySoft: '#1B3128',
  onPrimary: '#08211A',
  danger: '#F87171',
  dangerSoft: '#3A1A1F',
  good: '#6CC59A',
  border: '#212C27',
  chip: '#1C2722',
  track: '#1C2722',
};

export type Colors = typeof light;

export const useColors = (): Colors => (useColorScheme() === 'dark' ? dark : light);

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

/** Soft card shadow on light theme; flat on dark (borders do the job). */
export const cardShadow = (c: Colors) =>
  c.isDark
    ? { borderWidth: 1, borderColor: c.border }
    : { elevation: 2, shadowColor: '#1E293B', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } };
