import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import tutLogo from '@/assets/tut-logo.png';

const Judiciary = () => {
  return (
    <div className="min-h-screen bg-gradient-admin admin-theme">
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="sticky top-0 z-50 bg-gradient-to-r from-secondary/95 to-primary/95 border-b border-white/10 shadow-large backdrop-blur-md"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <motion.img
              src={tutLogo}
              alt="TUT Logo"
              className="h-10 logo-glow"
            />
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-white animate-pulse" />
                <h1 className="text-xl font-bold text-white">Campus Community Safety Forum</h1>
              </div>
              <p className="text-sm text-white/90 font-semibold">Judiciary Portal</p>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-6">
        <Card className="p-6 shadow-large">
          <h2 className="text-xl font-bold mb-4">Judiciary</h2>
          <p className="text-muted-foreground">Judiciary content will be displayed here.</p>
        </Card>
      </main>
    </div>
  );
};

export default Judiciary;
