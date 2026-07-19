import { useTheme } from 'next-themes';
import { BRAND, getTutLogo } from '@/brand';
import { cn } from '@/lib/utils';

type BrandSize = 'compact' | 'header' | 'auth' | 'splash';

const sizeStyles: Record<BrandSize, { ccsf: string; tut: string; divider: string }> = {
  compact: {
    ccsf: 'h-7 sm:h-8',
    tut: 'h-5 sm:h-6',
    divider: 'h-6 sm:h-7',
  },
  header: {
    ccsf: 'h-9 sm:h-11',
    tut: 'h-7 sm:h-9',
    divider: 'h-8 sm:h-10',
  },
  auth: {
    ccsf: 'h-14 sm:h-16',
    tut: 'h-10 sm:h-12',
    divider: 'h-12 sm:h-14',
  },
  splash: {
    ccsf: 'h-24 sm:h-28',
    tut: 'h-12 sm:h-14',
    divider: 'h-16 sm:h-20',
  },
};

export function InstitutionBrand({
  size = 'header',
  className,
  ccsfClassName,
  tutClassName,
  themeOverride,
}: {
  size?: BrandSize;
  className?: string;
  ccsfClassName?: string;
  tutClassName?: string;
  themeOverride?: string;
}) {
  const { resolvedTheme, theme } = useTheme();
  const activeTheme = themeOverride ?? resolvedTheme ?? theme;
  const styles = sizeStyles[size];

  return (
    <div
      className={cn('flex max-w-full items-center gap-2 sm:gap-3', className)}
      role="img"
      aria-label={BRAND.partnershipLabel}
      data-testid="institution-brand"
    >
      <img
        src={BRAND.assets.ccsfLogo}
        alt=""
        aria-hidden="true"
        className={cn('w-auto shrink-0 object-contain', styles.ccsf, ccsfClassName)}
        decoding="async"
      />
      <span
        aria-hidden="true"
        className={cn('w-px shrink-0 bg-current opacity-25', styles.divider)}
      />
      <img
        src={getTutLogo(activeTheme)}
        alt=""
        aria-hidden="true"
        className={cn('min-w-0 max-w-[11rem] object-contain sm:max-w-[15rem]', styles.tut, tutClassName)}
        decoding="async"
      />
    </div>
  );
}
