import { useTheme } from 'next-themes';
import { BRAND, getTutLogo } from '@/brand';
import { cn } from '@/lib/utils';

type BrandSize = 'compact' | 'header' | 'auth' | 'splash';

const sizeStyles: Record<BrandSize, string> = {
  compact: 'h-7 sm:h-8',
  header: 'h-9 sm:h-11',
  auth: 'h-12 sm:h-14',
  splash: 'h-14 sm:h-16',
};

interface InstitutionBrandProps {
  size?: BrandSize;
  className?: string;
  /** @deprecated Retained only so existing call sites do not break during the CI cleanup. */
  ccsfClassName?: string;
  tutClassName?: string;
  themeOverride?: string;
}

export function InstitutionBrand(props: InstitutionBrandProps) {
  const {
    size = 'header',
    className,
    tutClassName,
    themeOverride,
  } = props;
  const { resolvedTheme, theme } = useTheme();
  const activeTheme = themeOverride ?? resolvedTheme ?? theme;

  return (
    <div
      className={cn('flex max-w-full items-center', className)}
      role="img"
      aria-label={BRAND.accessibilityLabel}
      data-testid="institution-brand"
    >
      <img
        src={getTutLogo(activeTheme)}
        alt=""
        aria-hidden="true"
        className={cn(
          'w-auto max-w-full shrink-0 object-contain',
          sizeStyles[size],
          tutClassName,
        )}
        decoding="async"
      />
    </div>
  );
}
