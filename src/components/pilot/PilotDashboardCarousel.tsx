import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  MessageSquareText,
  Pause,
  Play,
  Shield,
  Siren,
} from 'lucide-react';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';
import { CarouselSkeleton } from '@/components/shared/LoadingSkeletons';
import { Button } from '@/components/ui/button';
import type { PilotCarouselAction, PilotCarouselIcon, PilotCarouselSlide } from '@/types/pilotExperience';

const ICONS: Record<PilotCarouselIcon, typeof Shield> = {
  shield: Shield,
  report: FileText,
  emergency: Siren,
  location: MapPin,
  cases: FileText,
  reviews: MessageSquareText,
  guide: BookOpen,
  limitations: AlertTriangle,
};

export function PilotDashboardCarousel({
  slides,
  loading,
  onAction,
}: {
  slides: PilotCarouselSlide[];
  loading: boolean;
  onAction: (action: PilotCarouselAction) => void;
}) {
  const reduceMotion = useReducedMotion();
  const touchStart = useRef<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [manualPause, setManualPause] = useState(false);
  const [interactionPause, setInteractionPause] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());

  const orderedSlides = useMemo(
    () => [...slides].sort((left, right) => left.display_order - right.display_order || left.created_at.localeCompare(right.created_at)),
    [slides],
  );

  useEffect(() => {
    setCurrentIndex((current) => Math.min(current, Math.max(orderedSlides.length - 1, 0)));
  }, [orderedSlides.length]);

  const paused = manualPause || interactionPause || Boolean(reduceMotion);

  useEffect(() => {
    if (paused || orderedSlides.length < 2) return;
    const timer = window.setInterval(() => {
      setCurrentIndex((current) => (current + 1) % orderedSlides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [orderedSlides.length, paused]);

  const showPrevious = () => {
    if (!orderedSlides.length) return;
    setCurrentIndex((current) => (current - 1 + orderedSlides.length) % orderedSlides.length);
  };

  const showNext = () => {
    if (!orderedSlides.length) return;
    setCurrentIndex((current) => (current + 1) % orderedSlides.length);
  };

  const handleTouchEnd = (endX: number) => {
    if (touchStart.current === null) return;
    const difference = touchStart.current - endX;
    touchStart.current = null;
    if (Math.abs(difference) < 45) return;
    if (difference > 0) showNext();
    else showPrevious();
  };

  if (loading) return <CarouselSkeleton />;

  if (!orderedSlides.length) {
    return (
      <div className="flex aspect-[2/1] min-h-56 items-center justify-center rounded-2xl border border-dashed border-primary/30 bg-muted/40 p-8 text-center" data-testid="pilot-carousel-empty-state">
        <div>
          <Shield className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-4 text-lg font-bold">Pilot information slides are being prepared</p>
          <p className="mt-2 text-sm text-muted-foreground">Reporting and safety workflows remain available from the navigation and quick actions.</p>
        </div>
      </div>
    );
  }

  const current = orderedSlides[currentIndex] ?? orderedSlides[0];
  const Icon = ICONS[current.icon_key] ?? Shield;
  const showImage = Boolean(current.image_url) && !failedImages.has(current.id);

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-[#002F6C]/15 bg-[#002F6C] shadow-large"
      aria-roledescription="carousel"
      aria-label="My CCSF Pilot information carousel"
      onMouseEnter={() => setInteractionPause(true)}
      onMouseLeave={() => setInteractionPause(false)}
      onFocusCapture={() => setInteractionPause(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInteractionPause(false);
      }}
      onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
      data-testid="pilot-dashboard-carousel"
    >
      <div className="aspect-[2/1] min-h-[260px] sm:min-h-[340px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.article
            key={current.id}
            initial={reduceMotion ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: reduceMotion ? 0 : 0.35 }}
            className="absolute inset-0 grid lg:grid-cols-[1.18fr_0.82fr]"
            aria-label={`${currentIndex + 1} of ${orderedSlides.length}: ${current.title}`}
          >
            <div className="relative z-10 flex flex-col justify-between p-6 text-white sm:p-8 lg:p-10">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#F2A900]">{current.eyebrow}</p>
                  <div className="rounded-xl bg-white/95 px-3 py-2 shadow-sm"><InstitutionBrand size="compact" /></div>
                </div>
                <div className="mt-7 flex items-start gap-4">
                  <div className="rounded-2xl bg-[#F2A900] p-4 text-[#002F6C] shadow-lg">
                    <Icon className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="max-w-3xl text-2xl font-extrabold leading-tight sm:text-3xl lg:text-4xl">{current.title}</h2>
                    <p className="mt-4 max-w-3xl text-sm leading-6 text-white/85 sm:text-base sm:leading-7">{current.description}</p>
                  </div>
                </div>
              </div>

              {current.action_key !== 'none' && current.button_label && (
                <Button
                  className="mt-6 w-fit bg-[#F2A900] font-bold text-[#002F6C] hover:bg-[#F2A900]/90"
                  onClick={() => onAction(current.action_key)}
                >
                  {current.button_label}<ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="relative hidden overflow-hidden bg-white/5 lg:block">
              {showImage ? (
                <img
                  src={current.image_url as string}
                  alt={current.image_alt || current.title}
                  className={`h-full w-full ${current.image_fit === 'cover' ? 'object-cover' : 'bg-white object-contain p-8'}`}
                  loading={currentIndex === 0 ? 'eager' : 'lazy'}
                  onError={() => setFailedImages((existing) => new Set(existing).add(current.id))}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(242,169,0,0.22),transparent_60%)]">
                  <Icon className="h-40 w-40 text-[#F2A900]/30" aria-hidden="true" />
                </div>
              )}
              <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#002F6C] to-transparent" />
            </div>
          </motion.article>
        </AnimatePresence>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-white/10 bg-[#001F49]/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={showPrevious} aria-label="Show previous Pilot slide" disabled={orderedSlides.length < 2}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={showNext} aria-label="Show next Pilot slide" disabled={orderedSlides.length < 2}>
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={() => setManualPause((currentPause) => !currentPause)}
            aria-label={manualPause ? 'Resume automatic Pilot slide rotation' : 'Pause automatic Pilot slide rotation'}
            aria-pressed={manualPause}
            disabled={orderedSlides.length < 2 || Boolean(reduceMotion)}
          >
            {manualPause ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </Button>
        </div>

        <div className="flex max-w-[55%] items-center justify-end gap-1.5 overflow-x-auto" aria-label="Choose Pilot carousel slide">
          {orderedSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Show slide ${index + 1}: ${slide.title}`}
              aria-current={index === currentIndex ? 'true' : undefined}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 shrink-0 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A900] ${index === currentIndex ? 'w-7 bg-[#F2A900]' : 'w-2 bg-white/45 hover:bg-white/75'}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
