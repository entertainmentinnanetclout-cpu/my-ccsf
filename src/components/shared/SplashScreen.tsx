import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';
import { BRAND } from '@/brand';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

export default function SplashScreen({ onComplete, minDuration = 1200 }: SplashScreenProps) {
  const reduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = reduceMotion ? Math.min(minDuration, 250) : minDuration;
    const startedAt = performance.now();
    let frame = 0;

    const update = (now: number) => {
      const elapsed = now - startedAt;
      setProgress(Math.min(100, Math.round((elapsed / duration) * 100)));
      if (elapsed < duration) frame = window.requestAnimationFrame(update);
    };

    frame = window.requestAnimationFrame(update);
    const timer = window.setTimeout(onComplete, duration);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [minDuration, onComplete, reduceMotion]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-hidden border-t-4 border-t-[#F2A900] bg-[#002F6C] px-6 text-white"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.28 }}
      role="status"
      aria-live="polite"
      aria-label="Starting My CCSF"
      data-testid="institutional-splash"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(242,169,0,0.16),transparent_34rem),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_42%,rgba(242,169,0,0.08))]" />
      <div className="relative w-full max-w-2xl text-center">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <InstitutionBrand size="splash" themeOverride="dark" className="justify-center text-white" />
        </motion.div>

        <div className="mx-auto mt-8 inline-flex items-center gap-2 rounded-full border border-[#F2A900]/45 bg-[#F2A900]/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#F2A900]">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Official institutional application
        </div>

        <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">{BRAND.productName}</h1>
        <p className="mt-2 text-sm font-semibold text-white/75 sm:text-base">{BRAND.productLongName} · {BRAND.institutionName}</p>

        <div className="mx-auto mt-9 max-w-md">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
            <motion.div className="h-full rounded-full bg-[#F2A900]" animate={{ width: `${progress}%` }} transition={{ duration: 0.08, ease: 'linear' }} />
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-white/65">
            {progress >= 100 ? <CheckCircle2 className="h-4 w-4 text-[#F2A900]" aria-hidden="true" /> : <span className="h-2 w-2 animate-pulse rounded-full bg-[#F2A900]" aria-hidden="true" />}
            {progress >= 100 ? 'Application ready' : 'Preparing secure portal access'}
          </div>
        </div>

        <button type="button" onClick={onComplete} className="mt-8 text-xs font-semibold text-white/55 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A900]">
          Continue now
        </button>
      </div>
    </motion.div>
  );
}
