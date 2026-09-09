import tutLogoForDarkTheme from '@/assets/tut-logo.png';
import tutLogoForLightTheme from '@/assets/tut_light_theme.png';

export const BRAND = {
  productName: 'Campus Safety App',
  productLongName: 'Campus Safety App',
  institutionName: 'Tshwane University of Technology',
  accessibilityLabel: 'Tshwane University of Technology',
  assets: {
    tutLogoForDarkTheme,
    tutLogoForLightTheme,
  },
} as const;

export function getTutLogo(theme?: string) {
  return theme === 'dark'
    ? BRAND.assets.tutLogoForDarkTheme
    : BRAND.assets.tutLogoForLightTheme;
}
