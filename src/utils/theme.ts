import { extendTheme } from '@mui/joy/styles';

/** Inspirato — café terracota como primario (legible); dorado del logo como acento */
export const brandColors = {
  coffee: '#B0694D',
  coffeeDark: '#7D4835',
  gold: '#C9A227',
  champagne: '#FBF9F4',
  ivory: '#F6F2E9',
  charcoal: '#1A1816',
} as const;

export const crmTheme = extendTheme({
  fontFamily: {
    body: '"Mont", "Inter", system-ui, sans-serif',
    display: '"Mont", "Inter", system-ui, sans-serif',
  },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          50: '#FDF6F3',
          100: '#F5E6DC',
          200: '#E8C9B8',
          300: '#D9A68E',
          400: '#C4856A',
          500: '#B0694D',
          600: '#9A5A42',
          700: '#7D4835',
          800: '#633829',
          900: '#4A2A1F',
        },
        neutral: {
          50: '#FBF9F4',
          100: '#F6F2E9',
          200: '#EBE5D8',
          300: '#D9D1C0',
          400: '#A39A8C',
          500: '#736B60',
          600: '#524C44',
          700: '#352F2A',
          800: '#1F1C19',
          900: '#121110',
        },
        background: {
          body: '#FBF9F4',
          surface: '#FFFFFF',
          popup: '#FFFFFF',
          level1: '#F6F2E9',
          level2: '#EDE7DA',
          level3: '#E4DCCB',
        },
        text: {
          primary: '#1A1816',
          secondary: '#524C44',
          tertiary: '#736B60',
        },
        success: {
          50: '#EDF7F1',
          100: '#D4EDE0',
          200: '#A8D9C0',
          300: '#6DBF96',
          400: '#4CAF7D',
          500: '#3D9A6A',
          600: '#2F7D55',
          700: '#256343',
          800: '#1C4D34',
          900: '#143A27',
        },
        danger: {
          500: '#C45C4A',
        },
        warning: {
          500: '#D4A04A',
        },
      },
    },
  },
  radius: {
    xs: '6px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
  },
  shadow: {
    xs: '0 1px 2px rgba(26, 24, 22, 0.04)',
    sm: '0 2px 8px rgba(26, 24, 22, 0.06)',
    md: '0 4px 16px rgba(26, 24, 22, 0.08)',
    lg: '0 8px 24px rgba(26, 24, 22, 0.10)',
  },
});
