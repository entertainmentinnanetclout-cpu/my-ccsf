import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Shield, LayoutDashboard, AlertCircle, Megaphone, Home, MessageSquare, CheckSquare } from 'lucide-react';
import tutLogo from '@/assets/tut-logo.png';

const Admin = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'overview' | 'incidents' | 'announcements' | 'summary' | 'resolve' | 'communication' | 'residences'>('overview');

  return (
    <div className="min-h-screen bg-gradient-admin admin-theme" data-testid="ready-admin">
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="sticky top-0 z-50 bg-gradient-to-r from-secondary/95 to-primary/95 border-b border-white/10 shadow-large backdrop-blur-md"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.img
                src={tutLogo}
                alt="TUT Logo"
                className="h-10 logo-glow"
                whileHover={{ scale: 1.1, rotate: -5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-white animate-pulse" />
                  <h1 className="text-xl font-bold text-white">Campus Community Safety Forum</h1>
                </div>
                <p className="text-sm text-white/90 font-semibold">CCSF Admin Console</p>
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
              <Button variant="default" size="icon" onClick={() => navigate('/')}>
                <Home className="h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <Card className="p-2 mb-6 shadow-large">
            <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant={activeView === 'overview' ? 'default' : 'ghost'} onClick={() => setActiveView('overview')} className="w-full transition-all">
                  <LayoutDashboard className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Overview</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant={activeView === 'incidents' ? 'default' : 'ghost'} onClick={() => setActiveView('incidents')} className="w-full transition-all">
                  <AlertCircle className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Incidents</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant={activeView === 'announcements' ? 'default' : 'ghost'} onClick={() => setActiveView('announcements')} className="w-full transition-all">
                  <Megaphone className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Announcements</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant={activeView === 'summary' ? 'default' : 'ghost'} onClick={() => setActiveView('summary')} className="w-full transition-all">
                  <LayoutDashboard className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Summary</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant={activeView === 'resolve' ? 'default' : 'ghost'} onClick={() => setActiveView('resolve')} className="w-full transition-all">
                  <CheckSquare className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Resolve Cases</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant={activeView === 'communication' ? 'default' : 'ghost'} onClick={() => setActiveView('communication')} className="w-full transition-all">
                  <MessageSquare className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Communication</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant={activeView === 'residences' ? 'default' : 'ghost'} onClick={() => setActiveView('residences')} className="w-full transition-all">
                  <Shield className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Residences</span>
                </Button>
              </motion.div>
            </div>
          </Card>
        </motion.div>

        {/* Content Views */}
        <motion.div
          key={activeView}
          initial={{ opacity: 0, x: 20, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -20, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <Card className="p-6 shadow-large">
            <h2 className="text-xl font-bold mb-4 capitalize">{activeView}</h2>
            <p className="text-muted-foreground">Admin {activeView} content will be displayed here.</p>
          </Card>
        </motion.div>

        {/* Footer */}
        <footer className="mt-12 pb-6 text-center text-sm text-muted-foreground">
          <p>Powered By Campus Protection Service</p>
        </footer>
      </main>
    </div>
  );
};

export default Admin;
