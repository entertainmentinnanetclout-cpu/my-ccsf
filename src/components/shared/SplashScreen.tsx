import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Eye, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import ccsfLogo from '@/assets/ccsf-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

// High-quality safety/security themed video URLs (free stock videos)
const SAFETY_VIDEOS = [
  'https://cdn.pixabay.com/video/2020/05/26/40029-424930032_large.mp4', // Security camera footage style
  'https://cdn.pixabay.com/video/2019/11/08/28922-372070036_large.mp4', // City surveillance 
  'https://cdn.pixabay.com/video/2021/04/17/71354-540098154_large.mp4', // Security monitoring
];

// Create a simple startup sound using Web Audio API
const playStartupSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
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
    playTone(523.25, 0, 0.4, 0.8);
    playTone(659.25, 0.15, 0.4, 0.7);
    playTone(783.99, 0.3, 0.5, 0.9);
    playTone(1046.50, 0.5, 0.8, 0.6);
    
  } catch (e) {
    console.log('Audio not available');
  }
};

const SplashScreen = ({ onComplete, minDuration = 4500 }: SplashScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [currentVideoIndex] = useState(() => Math.floor(Math.random() * SAFETY_VIDEOS.length));
  const audioPlayedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!audioPlayedRef.current) {
      audioPlayedRef.current = true;
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

  const handleVideoLoad = () => {
    setVideoLoaded(true);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const floatingIcons = [
    { Icon: Shield, delay: 0, x: -140, y: -100 },
    { Icon: Lock, delay: 0.3, x: 150, y: -80 },
    { Icon: Eye, delay: 0.6, x: -120, y: 110 },
    { Icon: AlertTriangle, delay: 0.9, x: 130, y: 90 },
  ];

  const securityStats = [
    { label: 'Active Cameras', value: '247' },
    { label: 'Response Time', value: '<2min' },
    { label: 'Coverage', value: '100%' },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
    >
      {/* HQ Video Background */}
      <div className="absolute inset-0 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover scale-110"
          autoPlay
          loop
          muted={isMuted}
          playsInline
          onLoadedData={handleVideoLoad}
          style={{
            filter: 'brightness(0.3) saturate(0.8) contrast(1.1)',
          }}
        >
          <source src={SAFETY_VIDEOS[currentVideoIndex]} type="video/mp4" />
        </video>
        
        {/* Video overlay gradient */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% 0%, rgba(220, 38, 38, 0.25) 0%, transparent 60%),
              radial-gradient(ellipse 60% 40% at 100% 100%, rgba(153, 27, 27, 0.3) 0%, transparent 50%),
              radial-gradient(ellipse 50% 30% at 0% 100%, rgba(185, 28, 28, 0.2) 0%, transparent 50%),
              linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.8) 100%)
            `,
          }}
        />

        {/* Scan line effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
          }}
        />

        {/* Moving scan line */}
        <motion.div
          className="absolute left-0 right-0 h-[2px] pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(220, 38, 38, 0.5), transparent)',
            boxShadow: '0 0 20px rgba(220, 38, 38, 0.3)',
          }}
          animate={{
            top: ['0%', '100%', '0%'],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      {/* Mute/Unmute control */}
      <motion.button
        className="absolute top-6 right-6 z-50 p-3 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 hover:bg-black/60 transition-all"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        onClick={toggleMute}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isMuted ? (
          <VolumeX className="h-5 w-5 text-white/70" />
        ) : (
          <Volume2 className="h-5 w-5 text-white" />
        )}
      </motion.button>

      {/* HUD-style corners */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top left corner */}
        <motion.div 
          className="absolute top-4 left-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="w-24 h-24">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-red-500 to-transparent" />
            <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-red-500 to-transparent" />
          </div>
          <div className="mt-2 ml-1">
            <p className="text-[10px] font-mono text-red-400/80">CCSF_SECURE_v2.4</p>
            <p className="text-[8px] font-mono text-neutral-500">SYSTEM ONLINE</p>
          </div>
        </motion.div>

        {/* Top right corner */}
        <motion.div 
          className="absolute top-4 right-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="w-24 h-24">
            <div className="absolute top-0 right-0 w-full h-[2px] bg-gradient-to-l from-red-500 to-transparent" />
            <div className="absolute top-0 right-0 w-[2px] h-full bg-gradient-to-b from-red-500 to-transparent" />
          </div>
          <div className="mt-2 mr-1 text-right">
            <motion.p 
              className="text-[10px] font-mono text-green-400"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ● LIVE
            </motion.p>
            <p className="text-[8px] font-mono text-neutral-500">
              {new Date().toLocaleTimeString()}
            </p>
          </div>
        </motion.div>

        {/* Bottom corners */}
        <motion.div 
          className="absolute bottom-4 left-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="w-24 h-24">
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-red-500 to-transparent" />
            <div className="absolute bottom-0 left-0 w-[2px] h-full bg-gradient-to-t from-red-500 to-transparent" />
          </div>
        </motion.div>

        <motion.div 
          className="absolute bottom-4 right-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="w-24 h-24">
            <div className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-l from-red-500 to-transparent" />
            <div className="absolute bottom-0 right-0 w-[2px] h-full bg-gradient-to-t from-red-500 to-transparent" />
          </div>
        </motion.div>
      </div>

      {/* Security stats HUD */}
      <motion.div
        className="absolute bottom-24 left-8 hidden md:flex flex-col gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        {securityStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            className="flex items-center gap-3 text-left"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + index * 0.1 }}
          >
            <div className="w-1 h-6 bg-red-500/50 rounded-full" />
            <div>
              <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-sm font-mono text-white font-bold">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Cyber grid overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(220, 38, 38, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(220, 38, 38, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
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
              opacity: [0, 0.7, 0.7, 0],
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
            <Icon className="h-7 w-7 text-red-500/60 drop-shadow-lg" />
          </motion.div>
        ))}

        {/* Glowing ring around logo */}
        <motion.div
          className="absolute inset-0 -m-8"
          style={{
            borderRadius: '50%',
            border: '2px solid rgba(220, 38, 38, 0.3)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.div
          className="absolute inset-0 -m-12"
          style={{
            borderRadius: '50%',
            border: '1px solid rgba(220, 38, 38, 0.2)',
          }}
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.3,
          }}
        />

        {/* Shield pulse animation - replaces simple 3D rotate */}
        <motion.div
          className="relative"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Outer pulse rings */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full"
              style={{
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '50%',
              }}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{
                scale: [1, 1.8 + i * 0.4],
                opacity: [0.5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.6,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Shield glow backdrop */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(220, 38, 38, 0.4) 0%, transparent 70%)',
              filter: 'blur(25px)',
            }}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Shield heartbeat pulse */}
          <motion.img
            src={ccsfLogo}
            alt="CCSF Logo"
            className="w-40 h-40 object-contain relative z-10"
            style={{
              filter: 'drop-shadow(0 0 30px rgba(220, 38, 38, 0.6)) drop-shadow(0 0 60px rgba(220, 38, 38, 0.3))',
            }}
            animate={{
              scale: [1, 1.08, 1, 1.05, 1],
              filter: [
                'drop-shadow(0 0 30px rgba(220, 38, 38, 0.6)) drop-shadow(0 0 60px rgba(220, 38, 38, 0.3))',
                'drop-shadow(0 0 50px rgba(220, 38, 38, 0.9)) drop-shadow(0 0 80px rgba(220, 38, 38, 0.5))',
                'drop-shadow(0 0 30px rgba(220, 38, 38, 0.6)) drop-shadow(0 0 60px rgba(220, 38, 38, 0.3))',
                'drop-shadow(0 0 40px rgba(220, 38, 38, 0.7)) drop-shadow(0 0 70px rgba(220, 38, 38, 0.4))',
                'drop-shadow(0 0 30px rgba(220, 38, 38, 0.6)) drop-shadow(0 0 60px rgba(220, 38, 38, 0.3))',
              ],
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
        className="relative z-10 mt-12 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <motion.div
          className="relative inline-block"
        >
          {/* Glitch effect layers */}
          <motion.h1
            className="text-5xl md:text-6xl font-bold tracking-tight absolute inset-0 text-red-500/20"
            animate={{
              x: [-2, 2, -2],
              opacity: [0.5, 0.3, 0.5],
            }}
            transition={{
              duration: 0.1,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          >
            My CCSF
          </motion.h1>
          <motion.h1
            className="text-5xl md:text-6xl font-bold tracking-tight absolute inset-0 text-cyan-500/20"
            animate={{
              x: [2, -2, 2],
              opacity: [0.5, 0.3, 0.5],
            }}
            transition={{
              duration: 0.1,
              repeat: Infinity,
              repeatDelay: 3,
              delay: 0.05,
            }}
          >
            My CCSF
          </motion.h1>
          <h1
            className="text-5xl md:text-6xl font-bold tracking-tight relative"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #e5e5e5 30%, #ffffff 50%, #a3a3a3 80%, #ffffff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 60px rgba(255,255,255,0.15)',
            }}
          >
            My CCSF
          </h1>
        </motion.div>
        
        <motion.div
          className="mt-4 flex items-center justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-red-500/50" />
          <p className="text-neutral-400 text-sm tracking-[0.2em] uppercase font-light">
            Campus Community Safety Forum
          </p>
          <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-red-500/50" />
        </motion.div>

        <motion.p
          className="mt-3 text-neutral-500 text-xs tracking-wider"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          Tshwane University of Technology
        </motion.p>
      </motion.div>

      {/* Premium progress bar */}
      <motion.div
        className="relative z-10 mt-10 w-64"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <div 
          className="h-[3px] rounded-full overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.08)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          <motion.div
            className="h-full rounded-full relative overflow-hidden"
            style={{
              background: 'linear-gradient(90deg, #991b1b 0%, #dc2626 50%, #ef4444 100%)',
              boxShadow: '0 0 20px rgba(220, 38, 38, 0.5)',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              }}
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <motion.p
            className="text-neutral-500 text-xs font-mono"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Initializing security protocols...
          </motion.p>
          <p className="text-red-400 text-xs font-mono font-bold">{Math.round(progress)}%</p>
        </div>
      </motion.div>

      {/* Bottom tagline */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <p className="text-neutral-600 text-[10px] font-mono tracking-widest uppercase">
          Protecting • Monitoring • Responding
        </p>
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;
