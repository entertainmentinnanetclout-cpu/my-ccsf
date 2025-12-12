import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, AlertTriangle } from 'lucide-react';
import tutLogo from '@/assets/tut-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

// Create a simple startup sound using Web Audio API
const playStartupSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a pleasant startup chime
    const playTone = (frequency: number, startTime: number, duration: number, gain: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + startTime);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
      gainNode.gain.linearRampToValueAtTime(gain * 0.15, audioContext.currentTime + startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + startTime + duration);
      
      oscillator.start(audioContext.currentTime + startTime);
      oscillator.stop(audioContext.currentTime + startTime + duration);
    };

    // Pleasant ascending chime sequence
    playTone(523.25, 0, 0.4, 0.8);      // C5
    playTone(659.25, 0.15, 0.4, 0.7);   // E5
    playTone(783.99, 0.3, 0.5, 0.9);    // G5
    playTone(1046.50, 0.5, 0.8, 0.6);   // C6 (octave)
    
  } catch (e) {
    // Audio not supported or blocked, fail silently
    console.log('Audio not available');
  }
};

const SplashScreen = ({ onComplete, minDuration = 2500 }: SplashScreenProps) => {
  const [progress, setProgress] = useState(0);
  const audioPlayedRef = useRef(false);

  useEffect(() => {
    // Play startup sound once
    if (!audioPlayedRef.current) {
      audioPlayedRef.current = true;
      // Small delay to ensure smooth animation start
      setTimeout(playStartupSound, 300);
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, minDuration / 50);

    const timer = setTimeout(() => {
      onComplete();
    }, minDuration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [onComplete, minDuration]);

  const floatingIcons = [
    { Icon: Shield, delay: 0, x: -140, y: -100 },
    { Icon: Lock, delay: 0.3, x: 150, y: -80 },
    { Icon: Eye, delay: 0.6, x: -120, y: 110 },
    { Icon: AlertTriangle, delay: 0.9, x: 130, y: 90 },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
    >
      {/* Premium gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(220, 38, 38, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(153, 27, 27, 0.2) 0%, transparent 40%),
            radial-gradient(ellipse 50% 30% at 20% 90%, rgba(185, 28, 28, 0.15) 0%, transparent 40%),
            linear-gradient(180deg, #0a0a0a 0%, #171717 50%, #0f0f0f 100%)
          `,
        }}
      />

      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Animated glow orbs */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(220, 38, 38, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Secondary glow */}
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 60%)',
          filter: 'blur(40px)',
        }}
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      />

      {/* Main content container */}
      <div className="relative z-10" style={{ perspective: '1200px' }}>
        {/* Floating security icons */}
        {floatingIcons.map(({ Icon, delay, x, y }, index) => (
          <motion.div
            key={index}
            className="absolute left-1/2 top-1/2"
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{
              opacity: [0, 0.6, 0.6, 0],
              scale: [0.5, 1, 1, 0.8],
              x: [0, x, x * 1.1, x * 0.7],
              y: [0, y, y * 1.1, y * 0.7],
            }}
            transition={{
              duration: 2.5,
              delay,
              repeat: Infinity,
              repeatDelay: 0.3,
              ease: 'easeOut',
            }}
          >
            <Icon className="h-6 w-6 text-red-500/50" />
          </motion.div>
        ))}

        {/* 3D rotating logo - clean, no container shapes */}
        <motion.div
          className="relative"
          initial={{ rotateY: 0 }}
          animate={{ rotateY: 360 }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* TUT Logo - transparent, no circle */}
          <motion.img
            src={tutLogo}
            alt="TUT Logo"
            className="w-24 h-24 object-contain"
            style={{
              filter: 'drop-shadow(0 0 30px rgba(220, 38, 38, 0.6))',
            }}
            animate={{
              scale: [1, 1.08, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.div>
      </div>

      {/* App name with elegant typography */}
      <motion.div
        className="relative z-10 mt-10 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <motion.h1
          className="text-4xl md:text-5xl font-bold tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #a3a3a3 50%, #ffffff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 40px rgba(255,255,255,0.1)',
          }}
        >
          My CCSF
        </motion.h1>
        <motion.p
          className="mt-3 text-neutral-400 text-base tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Campus Community Safety Forum
        </motion.p>
      </motion.div>

      {/* Premium progress bar */}
      <motion.div
        className="relative z-10 mt-10 w-56"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <div 
          className="h-1 rounded-full overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.1)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #dc2626 0%, #ef4444 50%, #dc2626 100%)',
              boxShadow: '0 0 20px rgba(220, 38, 38, 0.5)',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <motion.p
          className="mt-3 text-center text-neutral-500 text-sm"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Securing your campus...
        </motion.p>
      </motion.div>

      {/* Decorative corner elements */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-red-600/20 rounded-tl-lg" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-red-600/20 rounded-tr-lg" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-red-600/20 rounded-bl-lg" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-red-600/20 rounded-br-lg" />
    </motion.div>
  );
};

export default SplashScreen;
