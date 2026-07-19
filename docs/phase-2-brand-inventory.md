# Phase 2/2.5 Brand Inventory

Completed: 19 July 2026

## Approved direction

- Keep the existing application colour system unchanged.
- Replace the old CCSF shield artwork completely.
- Present CCSF alongside the existing TUT light- and dark-theme logos.
- Keep TUT wording where it correctly identifies the institution, campus, email domain or operational context.

## Canonical sources

| Source | Purpose |
|---|---|
| `src/assets/Campus safety forum logo design(1).png` | User-supplied canonical CCSF source |
| `src/brand/index.ts` | Product, institution and asset names |
| `src/components/shared/InstitutionBrand.tsx` | Responsive CCSF + theme-aware TUT lockup |
| `public/ccsf-logo.png` | Exact public copy of the supplied CCSF source |
| `public/favicon.png` | Browser icon derived from the supplied source |
| `public/app-icon.png` | General application icon |
| `public/app-icon-192.png` | PWA 192 px icon |
| `public/app-icon-512.png` | PWA 512 px icon |
| `public/og-image.png` | Social sharing image |

## Surface coverage

| Surface | Result |
|---|---|
| Login and profile completion | Shared co-brand lockup |
| Student dashboard | Shared compact co-brand lockup |
| Campus security and office portals | Shared co-brand lockup |
| Super-admin and judiciary portals | Shared co-brand lockup |
| Pilot authentication and all Pilot role shells | Shared co-brand lockup |
| Splash screen and install prompt | Canonical CCSF mark with TUT identity |
| Browser, Apple touch, PWA and push notification icons | Canonical CCSF mark |
| Open Graph and X/Twitter metadata | Canonical product name and co-brand artwork |

## Removed legacy material

- The former 2.45 MB monochrome `CCSF APP / NEXT LEVEL SECURITY` raster was replaced.
- The TUT-text-only favicon was replaced.
- `.brand-assets/logo.hex.part01` was deleted.
- The empty public `chatgpt-brand-transfer` bucket is removed by a forward-only migration.
- Direct theme selection and repeated TUT imports were removed from ten screens.
- Phase 2.5 removed the generated interim CCSF SVG/PNG placeholders and made the supplied PNG authoritative.

## Usage rules

- Do not recolour either organisation's logo in component code or CSS.
- Use `InstitutionBrand` for application chrome; do not reimplement theme switching per page.
- Keep the source artwork unchanged; do not trace, redraw, recolour or crop the supplied CCSF logo.
- Keep a clear space of at least one quarter of the CCSF shield width around the lockup.
- Preserve each source asset's aspect ratio and use `object-contain` for responsive scaling.
- The TUT mark must use the existing dark-theme or light-theme source selected by `InstitutionBrand`.
