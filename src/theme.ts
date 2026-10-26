import { Platform } from 'react-native';

const color = (name: string, native: string) =>
  Platform.OS === 'web' ? `var(--color-${name})` : native;

// Веб получает цвета из globals.css, Expo Go — те же значения напрямую.
export const colors = {
  page: color('page', '#0a0a0b'),
  surface: color('surface', '#191a1c'),
  surfaceRaised: color('surface-raised', '#242528'),
  border: color('border', '#36383c'),
  borderSoft: color('border-soft', '#303236'),
  text: color('text', '#f2f2f3'),
  teamText: color('team-text', '#ffffff'),
  muted: color('muted', '#a4a5a8'),
  accent: color('accent', '#d5d6d8'),
  accentStrong: color('accent-strong', '#4a4c50'),
  chip: color('chip', '#292b2e'),
  chipText: color('chip-text', '#c8c9cb'),
  live: color('live', '#6ecbff'),
  warning: color('warning', '#fbbf24'),
  errorBg: color('error-bg', '#2b1c1e'),
  errorBorder: color('error-border', '#6b393d'),
  errorText: color('error-text', '#fecdd3'),
  winnerStart: color('winner-start', '#1e3829'),
  winnerEnd: color('winner-end', '#1b2820'),
  winnerBorder: color('winner-border', '#3d7252'),
  winnerGlow: color('winner-glow', 'rgba(66, 156, 92, 0.27)'),
  drawGlow: color('draw-glow', 'rgba(188, 193, 201, 0.22)'),
  liveGlow: color('live-glow', 'rgba(85, 177, 230, 0.27)'),
  loserStart: color('loser-start', '#3a2224'),
  loserEnd: color('loser-end', '#2a1d1f'),
  loserBorder: color('loser-border', '#7c4549'),
  loserGlow: color('loser-glow', 'rgba(201, 83, 91, 0.25)'),
  starActive: color('star-active', '#f59e0b'),
  starInactive: color('star-inactive', '#a4a5a8'),
};
