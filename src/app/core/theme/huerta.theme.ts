import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const HuertaTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f4f8f4',
      100: '#e8f1e8',
      200: '#d3e3d5',
      300: '#b6ceb9',
      400: '#7fa68a',
      500: '#4f805f',
      600: '#3a6b4b',
      700: '#285b3a',
      800: '#183d29',
      900: '#122f20',
      950: '#091a11',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.700}',
          contrastColor: '{surface.0}',
          hoverColor: '{primary.800}',
          activeColor: '{primary.900}',
        },
        surface: {
          0: '#fffef9',
          50: '#faf9f3',
          100: '#f3f3ec',
          200: '#e8ebe4',
          300: '#d9ded7',
          400: '#aeb8b0',
          500: '#7b887f',
          600: '#526158',
          700: '#3c4941',
          800: '#29352d',
          900: '#1d2921',
          950: '#101812',
        },
        formField: {
          background: '{surface.0}',
          disabledBackground: '{surface.100}',
          filledBackground: '{surface.50}',
          filledHoverBackground: '{surface.100}',
          filledFocusBackground: '{surface.0}',
          borderColor: '{surface.300}',
          hoverBorderColor: '{primary.500}',
          focusBorderColor: '{primary.700}',
          color: '{surface.900}',
          disabledColor: '{surface.500}',
          placeholderColor: '{surface.500}',
          iconColor: '{surface.600}',
          borderRadius: '0.72rem',
        },
        overlay: {
          select: {
            background: '{surface.0}',
            borderColor: '{surface.300}',
            color: '{surface.900}',
            borderRadius: '0.85rem',
          },
        },
        list: {
          option: {
            focusBackground: '{primary.50}',
            selectedBackground: '{primary.100}',
            selectedFocusBackground: '{primary.200}',
            color: '{surface.800}',
            focusColor: '{primary.800}',
            selectedColor: '{primary.800}',
            selectedFocusColor: '{primary.900}',
          },
        },
        highlight: {
          background: '{primary.100}',
          focusBackground: '{primary.200}',
          color: '{primary.800}',
          focusColor: '{primary.900}',
        },
        text: {
          color: '{surface.900}',
          hoverColor: '{primary.800}',
          mutedColor: '{surface.600}',
          hoverMutedColor: '{surface.700}',
        },
      },
    },
  },
});
