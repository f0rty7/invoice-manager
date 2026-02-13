import { MD3LightTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// Azure-inspired primary + green tertiary matching Angular Material palette
const colors = {
  primary: '#0078D4',
  onPrimary: '#FFFFFF',
  primaryContainer: '#D4E8FC',
  onPrimaryContainer: '#001D36',
  secondary: '#535F70',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#D7E3F7',
  onSecondaryContainer: '#101C2B',
  tertiary: '#2E7D32',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#B8F5B0',
  onTertiaryContainer: '#002204',
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  background: '#F8FAFE',
  onBackground: '#1A1C1E',
  surface: '#F8FAFE',
  onSurface: '#1A1C1E',
  surfaceVariant: '#DFE2EB',
  onSurfaceVariant: '#43474E',
  outline: '#73777F',
  outlineVariant: '#C3C6CF',
  elevation: {
    level0: 'transparent',
    level1: '#EEF3FB',
    level2: '#E6EDF8',
    level3: '#DEE7F5',
    level4: '#DCE5F4',
    level5: '#D6E1F2',
  },
  surfaceDisabled: 'rgba(26, 28, 30, 0.12)',
  onSurfaceDisabled: 'rgba(26, 28, 30, 0.38)',
  backdrop: 'rgba(44, 49, 55, 0.4)',
};

const fontConfig = {
  fontFamily: 'Inter_400Regular',
};

const fonts = configureFonts({
  config: {
    ...fontConfig,
    displayLarge: { ...fontConfig, fontSize: 57, lineHeight: 64, fontWeight: '400' as const },
    displayMedium: { ...fontConfig, fontSize: 45, lineHeight: 52, fontWeight: '400' as const },
    displaySmall: { ...fontConfig, fontSize: 36, lineHeight: 44, fontWeight: '400' as const },
    headlineLarge: { ...fontConfig, fontSize: 32, lineHeight: 40, fontWeight: '400' as const },
    headlineMedium: { ...fontConfig, fontSize: 28, lineHeight: 36, fontWeight: '400' as const },
    headlineSmall: { ...fontConfig, fontSize: 24, lineHeight: 32, fontWeight: '400' as const },
    titleLarge: { ...fontConfig, fontSize: 22, lineHeight: 28, fontWeight: '500' as const },
    titleMedium: { ...fontConfig, fontSize: 16, lineHeight: 24, fontWeight: '500' as const },
    titleSmall: { ...fontConfig, fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
    bodyLarge: { ...fontConfig, fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
    bodyMedium: { ...fontConfig, fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
    bodySmall: { ...fontConfig, fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
    labelLarge: { ...fontConfig, fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
    labelMedium: { ...fontConfig, fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
    labelSmall: { ...fontConfig, fontSize: 11, lineHeight: 16, fontWeight: '500' as const },
  },
});

export const theme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...colors,
  },
  fonts,
};

// Re-export commonly used color tokens for StyleSheet usage
export const appColors = colors;
