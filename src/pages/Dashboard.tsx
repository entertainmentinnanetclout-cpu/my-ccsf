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
  const [welcomeMessage, setWelcomeMessage] = useState<string>('Welcome | Re a le amogela | Nemukelekile');

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

    const fetchSettings = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'welcome_banner_text')
        .maybeSingle();

      if (data?.value) {
        setWelcomeMessage(data.value);
      }
    };

    checkProfile();
    fetchSettings();
  }, [user]);
  const navItems = [
    { view: 'home', icon: Home, label: 'Home' },
    { view: 'mycases', icon: FileText, label: 'My Cases' },
    { view: 'report', icon: Plus, label: 'Report' },
    { view: 'map', icon: Map, label: 'Map' },
    { view: 'messages', icon: MessageCircle, label: 'Messages' },
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="ready-dashboard">
      <EmergencyReport />

      {/* Header with TUT Branding */}
      <div className="relative">
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="sticky top-0 z-40 bg-background dark:bg-primary border-b border-border border-t-4 border-t-[#F2A900] shadow-soft"
        >
          <div className="w-full px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <motion.div
                  className="relative"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <img
                    src={tutLogo}
                    alt="TUT Logo"
                    className="h-10 sm:h-12 w-auto object-contain dark:brightness-0 dark:invert"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-success rounded-full border-2 border-background dark:border-primary animate-pulse" />
                </motion.div>
                <div className="hidden sm:block">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary dark:text-white" />
                    <h1 className="text-lg sm:text-xl font-bold text-primary dark:text-white">Campus Safety Forum</h1>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground dark:text-white/80 font-medium">CCSF Student Portal</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <motion.div 
                  className="hidden lg:flex items-center gap-2 px-4 py-2 bg-muted dark:bg-white/10 rounded-full border border-border dark:border-white/20 shadow-sm"
                  whileHover={{ scale: 1.02 }}
                >
                  <MapPin className="h-4 w-4 text-primary dark:text-white" />
                  <span className="text-sm font-semibold text-primary dark:text-white">{userCampus}</span>
                </motion.div>

                <ThemeToggle />
                <NotificationBell />

                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="ghost"
                    size="icon" 
                    onClick={signOut} 
                    className="hidden sm:flex"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.header>

      </div>

      {/* Main Content */}
      <main className="w-full pb-20 md:pb-6">
        {/* Navigation - Desktop Tabs + Mobile Menu */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mb-4 sm:mb-6 px-4"
        >

          {/* Desktop Navigation Tabs */}
          <Card className="hidden md:block p-2 sm:p-3 shadow-elevated bg-card/95 backdrop-blur-sm border-border/50">
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {navItems.map(({ view, icon: Icon, label }) => (
                <motion.div 
                  key={view}
                  whileHover={{ scale: 1.05, y: -2 }} 
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant={activeView === view ? 'default' : 'ghost'}
                    onClick={() => setActiveView(view as typeof activeView)}
                    className={`w-full transition-all text-xs sm:text-sm px-1 sm:px-3 ${
                      activeView === view 
                        ? 'shadow-lg bg-gradient-to-r from-primary to-secondary' 
                        : 'hover:bg-primary/10'
                    }`}
                    size="sm"
                  >
                    <Icon className={`h-4 w-4 ${activeView === view ? '' : 'lg:mr-2'}`} />
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
              <div className="px-4">
                <CampusCarousel campus={userCampusId || undefined} />
              </div>

              {/* Welcome Banner - Now below Carousel */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full bg-[#F2A900] py-4 px-6 mb-4 overflow-hidden relative border-b-4 border-[#002F6C]"
              >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,47,108,0.05)_50%,transparent_75%)] bg-[length:250%_250%] animate-gradient-x" />
                <div className="relative z-10 text-center">
                  <h2 className="text-[#002F6C] text-lg sm:text-xl font-bold tracking-tight uppercase">
                    {welcomeMessage}
                  </h2>
                </div>
              </motion.div>

              <div className="px-4">
                <NewsFeed />
              </div>
            </div>
          )}
          <div className="px-4">
            {activeView === 'mycases' && <MyCaseReports />}
            {activeView === 'report' && <ReportIncident />}
            {activeView === 'map' && <CampusMap />}
            {activeView === 'messages' && <StudentChat />}
          </div>
        </motion.div>

        {/* Footer - Enhanced */}
        <footer className="mt-8 sm:mt-12 pb-6 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full border border-border"
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
