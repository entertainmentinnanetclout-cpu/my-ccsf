import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  { image: '/placeholder.svg', title: 'Welcome to Campus Safety' },
  { image: '/placeholder.svg', title: 'Security Operations Center' },
  { image: '/placeholder.svg', title: 'Campus Main Entrance' },
  { image: '/placeholder.svg', title: 'Our Security Team' },
  { image: '/placeholder.svg', title: 'Campus Courtyard' },
];

export const Slider = () => {
  const [index, setIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      setIndex((prev) => (prev + 1) % slides.length);
    }
    if (touchStart - touchEnd < -75) {
      setIndex((prev) => (prev - 1 + slides.length) % slides.length);
    }
  };

  const goToPrevious = () => {
    setIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setIndex((prev) => (prev + 1) % slides.length);
  };

  return (
    <div
      className="relative h-40 xs:h-48 sm:h-56 md:h-64 lg:h-72 w-full overflow-hidden rounded-lg sm:rounded-xl touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={(e) => setTouchEnd(e.targetTouches[0].clientX)}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className="absolute inset-0"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.5 }}
        >
          <img
            src={slides[index].image}
            alt={slides[index].title}
            className="w-full h-full object-cover object-center"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-2 xs:bottom-3 sm:bottom-4 left-2 xs:left-3 sm:left-4 right-2 xs:right-3 sm:right-4">
            <p className="text-white text-xs xs:text-sm sm:text-base md:text-lg font-semibold drop-shadow-lg line-clamp-2">
              {slides[index].title}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      <button
        onClick={goToPrevious}
        className="absolute left-1 xs:left-2 top-1/2 -translate-y-1/2 h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 rounded-full bg-black/40 hover:bg-black/60 active:bg-black/70 flex items-center justify-center text-white transition-colors z-10"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-1 xs:right-2 top-1/2 -translate-y-1/2 h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 rounded-full bg-black/40 hover:bg-black/60 active:bg-black/70 flex items-center justify-center text-white transition-colors z-10"
        aria-label="Next slide"
      >
        <ChevronRight className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5" />
      </button>

      <div className="absolute bottom-1 xs:bottom-2 left-1/2 -translate-x-1/2 flex gap-1 xs:gap-1.5 sm:gap-2 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-1 xs:h-1.5 sm:h-2 rounded-full transition-all ${
              i === index ? 'w-3 xs:w-4 sm:w-6 bg-white' : 'w-1 xs:w-1.5 sm:w-2 bg-white/50'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
