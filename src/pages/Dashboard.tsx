import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Shield, Plus, LogOut, Map, MessageCircle, Home, MapPin, FileText } from 'lucide-react';
import tutLogo from '@/assets/tut-logo.png';
import { ReportIncident } from '@/components/student/ReportIncident';
import { EmergencyReport } from '@/components/student/EmergencyReport';
import { CampusMap } from '@/components/student/CampusMap';
import { CampusCarousel } from '@/components/student/CampusCarousel';
import { NewsFeed } from '@/components/student/NewsFeed';
import { StudentChat } from '@/components/student/StudentChat';
import { MyCaseReports } from '@/components/student/MyCaseReports';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { MobileBottomNav } from '@/components/shared/MobileBottomNav';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [activeView, setActiveView] = useState<'home' | 'report' | 'mycases' | 'map' | 'messages'>('home');
  const [userCampus, setUserCampus] = useState<string>('Campus');
  const [userCampusId, setUserCampusId] = useState<string | null>(null);

  useEffect(() => {
    const checkProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('campus')
          .eq('id', user.id)
          .single();

        if (data?.campus) {
          setUserCampusId(data.campus);
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
            'emalahleni': 'Emalahleni Campus',
          };
          setUserCampus(campusDisplayNames[data.campus] || 'Campus');
        }
      }
    };

    checkProfile();
  }, [user]);
  const navItems = [
    { view: 'home', icon: Home, label: 'Home' },
    { view: 'mycases', icon: FileText, label: 'My Cases' },
    { view: 'report', icon: Plus, label: 'Report' },
    { view: 'map', icon: Map, label: 'Map' },
    { view: 'messages', icon: MessageCircle, label: 'Messages' },
  ];

  return (
    <div className="min-h-screen bg-background user-theme" data-testid="ready-dashboard">
      <EmergencyReport />

      {/* Header with Cleaner Design */}
      <div className="relative">
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="sticky top-0 z-40 bg-white border-b border-border shadow-soft"
        >
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <motion.div
                  className="relative"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <img
                    src={tutLogo}
                    alt="TUT Logo"
                    className="h-10 sm:h-12 w-auto object-contain"
                  />
                </motion.div>
                <div className="hidden sm:block">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <h1 className="text-lg sm:text-xl font-bold text-foreground">Campus Safety Forum</h1>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-wider">CCSF Student Portal</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <motion.div 
                  className="hidden lg:flex items-center gap-2 px-4 py-2 bg-muted rounded-full border border-border"
                  whileHover={{ scale: 1.02 }}
                >
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{userCampus}</span>
                </motion.div>

                <ThemeToggle />
                <NotificationBell />

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline"
                    size="icon" 
                    onClick={signOut} 
                    className="hidden sm:flex border-border"
                  >
                    <LogOut className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.header>

      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-20 md:pb-6">
        {/* Welcome Banner - Institutional Yellow */}
        {activeView === 'home' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 mb-6 p-6 rounded-2xl bg-warning/10 border border-warning/20 flex flex-col md:flex-row items-center justify-between gap-4"
          >
            <div>
              <h2 className="text-xl font-bold text-foreground">Welcome to CCSF Portal</h2>
              <p className="text-muted-foreground">Your safety is our priority. Access campus safety resources and report incidents.</p>
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-white shrink-0">
              Get Started
            </Button>
          </motion.div>
        )}

        {/* Navigation - Desktop Tabs + Mobile Menu */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mb-4 sm:mb-6"
        >

          {/* Desktop Navigation Tabs */}
          <Card className="hidden md:block p-1.5 shadow-soft bg-white border-border">
            <div className="grid grid-cols-5 gap-1">
              {navItems.map(({ view, icon: Icon, label }) => (
                <motion.div 
                  key={view}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant={activeView === view ? 'default' : 'ghost'}
                    onClick={() => setActiveView(view as typeof activeView)}
                    className={`w-full transition-all text-xs sm:text-sm ${
                      activeView === view 
                        ? 'bg-primary text-white shadow-md'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    size="sm"
                  >
                    <Icon className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">{label}</span>
                  </Button>
                </motion.div>
              ))}
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
              <CampusCarousel campus={userCampusId || undefined} />
              <NewsFeed />
            </div>
          )}
          {activeView === 'mycases' && <MyCaseReports />}
          {activeView === 'report' && <ReportIncident />}
          {activeView === 'map' && <CampusMap />}
          {activeView === 'messages' && <StudentChat />}
        </motion.div>

        {/* Footer - Clean */}
        <footer className="mt-8 sm:mt-12 pb-6 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full border border-border"
          >
            <Shield className="h-4 w-4 text-primary" />
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">Powered By Campus Protection Service</p>
          </motion.div>
        </footer>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        items={navItems}
        activeView={activeView}
        onViewChange={(view) => setActiveView(view as typeof activeView)}
      />
    </div>
  );
};

export default Dashboard;
