// Design System Constants
export const Colors = {
  // Primary Colors
  primary: '#3b82f6',
  primaryDark: '#1d4ed8',
  primaryLight: '#dbeafe',
  
  // Semantic Colors
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  
  // Grayscale
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray500: '#6b7280',
  gray900: '#111827',
  
  // Text
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  
  // Background
  background: '#ffffff',
  surface: '#f9fafb',
  card: '#f3f4f6'
} as const;

export const Typography = {
  h1: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32
  },
  h2: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24
  }
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
} as const;

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16
} as const;

export const Animation = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500
  },
  easing: 'ease-in-out' as const
} as const;