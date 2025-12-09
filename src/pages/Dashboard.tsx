import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Shield, Plus, List, LogOut, Menu, Map, MessageCircle, Home, MapPin } from 'lucide-react';
import tutLogo from '@/assets/tut-logo.png';
import { ReportIncident } from '@/components/student/ReportIncident';
import { IncidentList } from '@/components/student/IncidentList';
import { EmergencyReport } from '@/components/student/EmergencyReport';
import { CampusMap } from '@/components/student/CampusMap';
import { CampusCarousel } from '@/components/student/CampusCarousel';
import { NewsFeed } from '@/components/student/NewsFeed';
import { StudentChat } from '@/components/student/StudentChat';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [activeView, setActiveView] = useState<'home' | 'report' | 'incidents' | 'map' | 'messages'>('home');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [userCampus, setUserCampus] = useState<string>('Polokwane Campus');

  useEffect(() => {
    const checkProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('campus')
          .eq('id', user.id)
          .single();

        if (data?.campus) {
          const campusDisplayNames: Record<string, string> = {
            'pretoria_west_main': 'Pretoria West Campus',
            'arcadia': 'Arcadia Campus',
            'arts': 'Arts Campus',
            'giyani': 'Giyani Campus',
            'mbombela': 'Mbombela Campus',
            'polokwane': 'Polokwane Campus',
            'garankuwa': 'Ga-Rankuwa Campus',
            'soshanguve_south': 'Soshanguve South Campus',
            'soshanguve_north': 'Soshanguve North Campus',
          };
          setUserCampus(campusDisplayNames[data.campus] || 'Polokwane Campus');
        }
      }
    };

    checkProfile();
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-primary user-theme" data-testid="ready-dashboard">
      <EmergencyReport />

      {/* Header */}
      <div className="relative">
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="sticky top-0 z-40 bg-gradient-to-r from-secondary/95 to-primary/95 border-b border-white/10 shadow-large backdrop-blur-md"
        >
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <motion.img
                  src={tutLogo}
                  alt="TUT Logo"
                  className="h-8 sm:h-10 logo-glow"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                />
                <div className="hidden sm:block">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-white animate-pulse" />
                    <h1 className="text-lg sm:text-xl font-bold text-white">Campus Community Safety Forum</h1>
                  </div>
                  <p className="text-xs sm:text-sm text-white/70">CCSF Student Portal</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full">
                  <MapPin className="h-3.5 w-3.5 text-white" />
                  <span className="text-xs sm:text-sm font-medium text-white">{userCampus}</span>
                </div>

                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="default" size="icon" onClick={signOut} className="hidden sm:flex">
                    <LogOut className="h-5 w-5" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="default"
                    size="icon"
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="sm:hidden"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.header>

        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full right-2 sm:right-4 z-50 mt-2 w-48 p-2 bg-card rounded-2xl shadow-large sm:hidden"
          >
            <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-primary/10 rounded-lg">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{userCampus}</span>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={signOut} variant="destructive" className="w-full">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 pb-6">
        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Card className="p-1.5 sm:p-2 mb-4 sm:mb-6 shadow-large">
            <div className="grid grid-cols-5 gap-1 sm:gap-2">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant={activeView === 'home' ? 'default' : 'ghost'}
                  onClick={() => setActiveView('home')}
                  className="w-full transition-all text-xs sm:text-sm px-1 sm:px-3"
                  size="sm"
                >
                  <Home className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Home</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant={activeView === 'incidents' ? 'default' : 'ghost'}
                  onClick={() => setActiveView('incidents')}
                  className="w-full transition-all text-xs sm:text-sm px-1 sm:px-3"
                  size="sm"
                >
                  <List className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Incidents</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant={activeView === 'report' ? 'default' : 'ghost'}
                  onClick={() => setActiveView('report')}
                  className="w-full transition-all text-xs sm:text-sm px-1 sm:px-3"
                  size="sm"
                >
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Report</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant={activeView === 'map' ? 'default' : 'ghost'}
                  onClick={() => setActiveView('map')}
                  className="w-full transition-all text-xs sm:text-sm px-1 sm:px-3"
                  size="sm"
                >
                  <Map className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Map</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant={activeView === 'messages' ? 'default' : 'ghost'}
                  onClick={() => setActiveView('messages')}
                  className="w-full transition-all text-xs sm:text-sm px-1 sm:px-3"
                  size="sm"
                >
                  <MessageCircle className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Messages</span>
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
          {activeView === 'home' && (
            <div className="space-y-4 sm:space-y-6">
              <CampusCarousel />
              <NewsFeed />
            </div>
          )}
          {activeView === 'incidents' && <IncidentList />}
          {activeView === 'report' && <ReportIncident />}
          {activeView === 'map' && <CampusMap />}
          {activeView === 'messages' && <StudentChat />}
        </motion.div>

        {/* Footer */}
        <footer className="mt-8 sm:mt-12 pb-6 text-center text-xs sm:text-sm">
          <p className="text-white font-medium">Powered By Campus Protection Service</p>
        </footer>
      </main>
    </div>
  );
};

export default Dashboard;
