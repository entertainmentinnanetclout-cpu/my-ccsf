import ccsfLogo from '@/assets/cps-ccsf-official-source.png';
import tutLogoForDarkTheme from '@/assets/tut-logo.png';
import tutLogoForLightTheme from '@/assets/tut_light_theme.png';

export const BRAND = {
  productName: 'Campus Safety App',
  productLongName: 'Campus Safety App',
  institutionName: 'Tshwane University of Technology',
  partnershipLabel: 'Campus Community Safety Forum in partnership with Tshwane University of Technology',
  assets: {
    ccsfLogo,
    tutLogoForDarkTheme,
    tutLogoForLightTheme,
  },
} as const;

export function getTutLogo(theme?: string) {
  return theme === 'dark'
    ? BRAND.assets.tutLogoForDarkTheme
    : BRAND.assets.tutLogoForLightTheme;
}
