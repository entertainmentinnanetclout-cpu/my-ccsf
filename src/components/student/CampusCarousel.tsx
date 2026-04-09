import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Shield, ImageOff } from 'lucide-react';
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

interface CampusCarouselProps {
  campus?: string;
}

export const CampusCarousel = ({ campus }: CampusCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [dbImages, setDbImages] = useState<CarouselImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCarouselImages();

    // Real-time subscription for carousel updates
    const channel = supabase
      .channel('carousel-images-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'carousel_images',
        },
        () => {
          fetchCarouselImages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campus]);

  const fetchCarouselImages = async () => {
    setIsLoading(true);
    
    let query = supabase
      .from('carousel_images')
      .select('id, image_url, title, category')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    // If campus is specified, get images for that campus or 'all' campus
    if (campus) {
      query = query.or(`campus.eq.${campus},campus.eq.all`);
    }

    const { data, error } = await query;

    if (!error && data) {
      setDbImages(data);
    }
    setIsLoading(false);
  };

  // Use database images only - filter out broken local paths
  const carouselItems = dbImages
    .filter(img => !img.image_url.startsWith('/src/') && !img.image_url.startsWith('src/'))
    .map(img => ({ 
      image: img.image_url, 
      title: img.title, 
      type: img.category 
    }));

  useEffect(() => {
    if (isHovered || carouselItems.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % carouselItems.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isHovered, carouselItems.length]);

  // Reset index when images change
  useEffect(() => {
    setCurrentIndex(0);
  }, [dbImages]);

  const goToPrevious = () => {
    triggerHaptic('light');
    setCurrentIndex((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);
  };
  
  const goToNext = () => {
    triggerHaptic('light');
    setCurrentIndex((prev) => (prev + 1) % carouselItems.length);
  };

  if (isLoading) {
    return <CarouselSkeleton />;
  }

  // Show empty state if no images
  if (carouselItems.length === 0) {
    return (
      <div className="w-full h-[180px] xs:h-[200px] sm:h-[280px] md:h-[350px] lg:h-[400px] rounded-xl sm:rounded-2xl bg-muted flex flex-col items-center justify-center">
        <ImageOff className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-sm">No campus images available</p>
        <p className="text-muted-foreground text-xs mt-1">Images will appear once uploaded by admin</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-[180px] xs:h-[200px] sm:h-[280px] md:h-[350px] lg:h-[400px] rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-large"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0"
        >
          <img
            src={carouselItems[currentIndex].image}
            alt={carouselItems[currentIndex].title}
            className="w-full h-full object-cover object-center"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.dataset.fallback) {
                target.dataset.fallback = 'true';
                target.src = 'https://placehold.co/800x400/1a1a2e/ffffff?text=Campus+Image';
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
          <div className="absolute bottom-0 left-0 right-0 p-2 xs:p-3 sm:p-4 md:p-6">
            <span className="inline-block px-1.5 xs:px-2 py-0.5 xs:py-1 bg-primary/80 text-primary-foreground text-[10px] xs:text-xs rounded-full mb-1 xs:mb-2">
              {carouselItems[currentIndex].type}
            </span>
            <h3 className="text-white text-sm xs:text-base sm:text-lg md:text-2xl font-bold leading-tight">
              {carouselItems[currentIndex].title}
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
                  className="flex items-center gap-2 sm:gap-3 bg-background/95 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-large"
                >
                  <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-pulse" />
                  <span className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">Protected By CCSF</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      <Button
        variant="ghost"
        size="icon"
        className="absolute left-1 xs:left-2 top-1/2 -translate-y-1/2 bg-background/60 hover:bg-background/80 text-foreground rounded-full z-10 h-7 w-7 xs:h-8 xs:w-8 sm:h-10 sm:w-10"
        onClick={goToPrevious}
      >
        <ChevronLeft className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-6 sm:w-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 xs:right-2 top-1/2 -translate-y-1/2 bg-background/60 hover:bg-background/80 text-foreground rounded-full z-10 h-7 w-7 xs:h-8 xs:w-8 sm:h-10 sm:w-10"
        onClick={goToNext}
      >
        <ChevronRight className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-6 sm:w-6" />
      </Button>

      <div className="absolute bottom-2 xs:bottom-3 sm:bottom-4 right-2 xs:right-3 sm:right-4 flex gap-0.5 xs:gap-1 sm:gap-1.5 z-10">
        {carouselItems.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-1 xs:h-1.5 sm:h-2 rounded-full transition-all ${
              index === currentIndex ? 'bg-white w-3 xs:w-4 sm:w-6' : 'bg-white/50 hover:bg-white/70 w-1 xs:w-1.5 sm:w-2'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
