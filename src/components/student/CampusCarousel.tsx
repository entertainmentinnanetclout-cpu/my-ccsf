import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CarouselSkeleton } from '@/components/shared/LoadingSkeletons';
import { triggerHaptic } from '@/hooks/useHapticFeedback';

interface CarouselImage {
  id: string;
  image_url: string;
  title: string;
  category: string;
}

interface CarouselItem {
  id: string;
  image: string;
  title: string;
  type: string;
}

interface CampusCarouselProps {
  campus?: string;
}

const DEFAULT_SLIDE_ID = 'institutional-safety-slide';

function isDeployableImageUrl(url: string) {
  return Boolean(url) && !/^\/?src\//i.test(url);
}

function formatCampusName(campus?: string) {
  if (!campus) return 'TUT Campus';

  return campus
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace('Garankuwa', 'Ga-Rankuwa')
    .replace('Emalahleni', 'eMalahleni');
}

export const CampusCarousel = ({ campus }: CampusCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [dbImages, setDbImages] = useState<CarouselImage[]>([]);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(() => new Set());
  const [isLoading, setIsLoading] = useState(true);

  const fetchCarouselImages = useCallback(async () => {
    setIsLoading(true);

    let query = supabase
      .from('carousel_images')
      .select('id, image_url, title, category')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (campus) {
      query = query.in('campus', [campus, 'all']);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Unable to load campus carousel images', error);
      setDbImages([]);
    } else {
      setDbImages((data ?? []).filter((item) => isDeployableImageUrl(item.image_url)));
    }

    setFailedImageIds(new Set());
    setIsLoading(false);
  }, [campus]);

  useEffect(() => {
    void fetchCarouselImages();

    const channel = supabase
      .channel(`carousel-images-${campus ?? 'current-campus'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'carousel_images',
        },
        () => {
          void fetchCarouselImages();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [campus, fetchCarouselImages]);

  const carouselItems = useMemo<CarouselItem[]>(() => {
    const availableImages = dbImages
      .filter((item) => !failedImageIds.has(item.id))
      .map((item) => ({
        id: item.id,
        image: item.image_url,
        title: item.title,
        type: item.category,
      }));

    if (availableImages.length > 0) return availableImages;

    return [{
      id: DEFAULT_SLIDE_ID,
      image: '/og-image.png',
      title: `${formatCampusName(campus)} Safety`,
      type: 'Campus Community Safety Forum',
    }];
  }, [campus, dbImages, failedImageIds]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [campus, dbImages]);

  useEffect(() => {
    if (currentIndex >= carouselItems.length) setCurrentIndex(0);
  }, [carouselItems.length, currentIndex]);

  useEffect(() => {
    if (isHovered || carouselItems.length < 2) return;

    const timer = window.setInterval(() => {
      setCurrentIndex((previous) => (previous + 1) % carouselItems.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [carouselItems.length, isHovered]);

  const goToPrevious = () => {
    triggerHaptic('light');
    setCurrentIndex((previous) => (previous - 1 + carouselItems.length) % carouselItems.length);
  };

  const goToNext = () => {
    triggerHaptic('light');
    setCurrentIndex((previous) => (previous + 1) % carouselItems.length);
  };

  if (isLoading) return <CarouselSkeleton />;

  const currentItem = carouselItems[currentIndex] ?? carouselItems[0];
  const hasMultipleItems = carouselItems.length > 1;

  return (
    <div
      className="relative h-[180px] w-full overflow-hidden rounded-xl shadow-lg xs:h-[200px] sm:h-[280px] sm:rounded-2xl sm:shadow-large md:h-[350px] lg:h-[400px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid="campus-carousel"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentItem.id}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0"
        >
          <img
            src={currentItem.image}
            alt={currentItem.title}
            className={currentItem.id === DEFAULT_SLIDE_ID
              ? 'h-full w-full bg-white object-contain object-center'
              : 'h-full w-full object-cover object-center'}
            loading={currentIndex === 0 ? 'eager' : 'lazy'}
            onError={() => {
              if (currentItem.id !== DEFAULT_SLIDE_ID) {
                setFailedImageIds((previous) => new Set(previous).add(currentItem.id));
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
          <div className="absolute inset-x-0 bottom-0 p-2 xs:p-3 sm:p-4 md:p-6">
            <span className="mb-1 inline-block rounded-full bg-primary/80 px-1.5 py-0.5 text-[10px] text-primary-foreground xs:mb-2 xs:px-2 xs:py-1 xs:text-xs">
              {currentItem.type}
            </span>
            <h3 className="text-sm font-bold leading-tight text-white xs:text-base sm:text-lg md:text-2xl">
              {currentItem.title}
            </h3>
          </div>

          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2 rounded-2xl bg-background/95 px-4 py-3 shadow-large sm:gap-3 sm:px-6 sm:py-4"
                >
                  <Shield className="h-6 w-6 animate-pulse text-primary sm:h-8 sm:w-8" />
                  <span className="text-lg font-bold text-foreground sm:text-xl md:text-2xl">Protected By CCSF</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {hasMultipleItems && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-1 top-1/2 z-10 h-7 w-7 -translate-y-1/2 rounded-full bg-background/60 text-foreground hover:bg-background/80 xs:left-2 xs:h-8 xs:w-8 sm:h-10 sm:w-10"
            onClick={goToPrevious}
            aria-label="Show previous campus image"
          >
            <ChevronLeft className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-6 sm:w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 z-10 h-7 w-7 -translate-y-1/2 rounded-full bg-background/60 text-foreground hover:bg-background/80 xs:right-2 xs:h-8 xs:w-8 sm:h-10 sm:w-10"
            onClick={goToNext}
            aria-label="Show next campus image"
          >
            <ChevronRight className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-6 sm:w-6" />
          </Button>

          <div className="absolute bottom-2 right-2 z-10 flex gap-0.5 xs:bottom-3 xs:right-3 xs:gap-1 sm:bottom-4 sm:right-4 sm:gap-1.5">
            {carouselItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setCurrentIndex(index)}
                aria-label={`Show campus image ${index + 1} of ${carouselItems.length}`}
                aria-current={index === currentIndex ? 'true' : undefined}
                className={`h-1 rounded-full transition-all xs:h-1.5 sm:h-2 ${
                  index === currentIndex
                    ? 'w-3 bg-white xs:w-4 sm:w-6'
                    : 'w-1 bg-white/50 hover:bg-white/70 xs:w-1.5 sm:w-2'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
