import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Home, LifeBuoy, LogOut, Map, MapPin, Plus, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { MobileBottomNav } from '@/components/shared/MobileBottomNav';
import { ReportIncident } from '@/components/student/ReportIncident';
import { EmergencyReport } from '@/components/student/EmergencyReport';
import { CampusMap } from '@/components/student/CampusMap';
import { StudentDashboardHome } from '@/components/student/StudentDashboardHome';
import { StudentChat } from '@/components/student/StudentChat';
import { MyCaseReports } from '@/components/student/MyCaseReports';

type StudentView = 'home' | 'report' | 'mycases' | 'map' | 'messages';
const STUDENT_VIEWS = new Set<StudentView>(['home', 'report', 'mycases', 'map', 'messages']);

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get('tab') as StudentView | null;
  const [activeView, setActiveView] = useState<StudentView>(
    requestedView && STUDENT_VIEWS.has(requestedView) ? requestedView : 'home',
  );
  const [userCampus, setUserCampus] = useState('Campus');
  const [userCampusId, setUserCampusId] = useState<string | null>(null);

  useEffect(() => {
    const requested = searchParams.get('tab') as StudentView | null;
    if (requested && STUDENT_VIEWS.has(requested)) setActiveView(requested);
    if (!requested) setActiveView('home');
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    const checkProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('campus')
        .eq('id', user.id)
        .single();

      if (cancelled || error) return;
      if (data?.campus) {
        setUserCampusId(data.campus);
        const campusDisplayNames: Record<string, string> = {
          pretoria_west_main: 'Pretoria West Campus',
          arcadia: 'Arcadia Campus',
          arts: 'Arts Campus',
          giyani: 'Giyani Campus',
          mbombela: 'Mbombela Campus',
          polokwane: 'Polokwane Campus',
          garankuwa: 'Ga-Rankuwa Campus',
          soshanguve_south: 'Soshanguve South Campus',
          soshanguve_north: 'Soshanguve North Campus',
          emalahleni: 'Emalahleni Campus',
        };
        setUserCampus(campusDisplayNames[data.campus] || 'Campus');
      }
    };

    void checkProfile();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const changeView = (view: StudentView) => {
    setActiveView(view);
    const next = new URLSearchParams(searchParams);
    if (view === 'home') next.delete('tab');
    else next.set('tab', view);
    setSearchParams(next, { replace: true });
  };

  const navItems = [
    { view: 'home', icon: Home, label: 'Home' },
    { view: 'mycases', icon: FileText, label: 'My Cases' },
    { view: 'report', icon: Plus, label: 'Report' },
    { view: 'map', icon: Map, label: 'Map' },
    { view: 'messages', icon: LifeBuoy, label: 'Support' },
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="ready-dashboard">
      <EmergencyReport />

      <div className="relative">
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="sticky top-0 z-40 border-b border-border border-t-4 border-t-[#F2A900] bg-background shadow-soft dark:bg-primary"
        >
          <div className="w-full px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <motion.div className="relative" whileHover={{ scale: 1.1, rotate: 5 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                  <InstitutionBrand size="header" />
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 animate-pulse rounded-full border-2 border-background bg-success dark:border-primary" aria-hidden="true" />
                </motion.div>
                <div className="hidden sm:block">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary dark:text-white" aria-hidden="true" />
                    <h1 className="text-lg font-bold text-primary dark:text-white sm:text-xl">Campus Safety Forum</h1>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground dark:text-white/80 sm:text-sm">CCSF Student Portal</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <motion.div className="hidden items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 shadow-sm dark:border-white/20 dark:bg-white/10 lg:flex" whileHover={{ scale: 1.02 }}>
                  <MapPin className="h-4 w-4 text-primary dark:text-white" aria-hidden="true" />
                  <span className="text-sm font-semibold text-primary dark:text-white">{userCampus}</span>
                </motion.div>
                <ThemeToggle />
                <NotificationBell />
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="ghost" size="icon" onClick={signOut} className="hidden sm:flex" aria-label="Sign out of CCSF">
                    <LogOut className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.header>
      </div>

      <main className="w-full pb-20 md:pb-6">
        <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }} className="mb-4 px-4 sm:mb-6">
          <Card className="hidden bg-card/95 p-2 shadow-elevated backdrop-blur-sm md:block sm:p-3">
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2" role="tablist" aria-label="Student portal sections">
              {navItems.map(({ view, icon: Icon, label }) => (
                <motion.div key={view} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    role="tab"
                    aria-selected={activeView === view}
                    variant={activeView === view ? 'default' : 'ghost'}
                    onClick={() => changeView(view as StudentView)}
                    className={`w-full px-1 text-xs transition-all sm:px-3 sm:text-sm ${activeView === view ? 'bg-gradient-to-r from-primary to-secondary shadow-lg' : 'hover:bg-primary/10'}`}
                    size="sm"
                  >
                    <Icon className={`h-4 w-4 ${activeView === view ? '' : 'lg:mr-2'}`} aria-hidden="true" />
                    <span className="hidden lg:inline">{label}</span>
                  </Button>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div key={activeView} initial={{ opacity: 0, x: 20, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -20, scale: 0.97 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
          {activeView === 'home' && <StudentDashboardHome campus={userCampusId || undefined} />}
          <div className="px-4">
            {activeView === 'mycases' && <MyCaseReports />}
            {activeView === 'report' && <ReportIncident />}
            {activeView === 'map' && <CampusMap />}
            {activeView === 'messages' && <StudentChat onNavigate={changeView} />}
          </div>
        </motion.div>

        <footer className="mt-8 pb-6 text-center sm:mt-12">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2">
            <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">Powered By Campus Protection Service</p>
          </motion.div>
        </footer>
      </main>

      <MobileBottomNav items={navItems} activeView={activeView} onViewChange={(view) => changeView(view as StudentView)} />
    </div>
  );
};

export default Dashboard;
