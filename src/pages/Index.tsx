import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import tutLogo from '@/assets/tut-logo.png';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-primary user-theme">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="text-center space-y-6 px-4"
      >
        <motion.img
          src={tutLogo}
          alt="TUT"
          className="h-20 mx-auto mb-8 logo-glow"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Shield className="h-16 w-16 mx-auto text-foreground drop-shadow-lg" />
        </motion.div>
        <motion.h1
          className="text-5xl font-bold text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          Campus Protection Services
        </motion.h1>
        <motion.p
          className="text-xl text-foreground/90 max-w-md mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          Report incidents, stay informed, and help keep our campus safe.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="flex flex-col items-center gap-4 mt-8 w-full max-w-md mx-auto"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full">
            <Button onClick={() => navigate('/dashboard')} size="lg" className="w-full">Student Portal</Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full">
            <Button onClick={() => navigate('/office')} size="lg" className="w-full">Campus Office Portal</Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full">
            <Button onClick={() => navigate('/admin')} size="lg" className="w-full">Super Admin Portal</Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Index;
