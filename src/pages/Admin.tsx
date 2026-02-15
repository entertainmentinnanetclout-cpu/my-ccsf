import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Shield, LayoutDashboard, AlertCircle, Megaphone, MessageSquare, BarChart3, Images, Users, Siren } from 'lucide-react';
import tutLogo from '@/assets/tut-logo.png';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminIncidents } from '@/components/admin/AdminIncidents';
import { AdminAnnouncements } from '@/components/admin/AdminAnnouncements';
import { StaffCommunication } from '@/components/admin/StaffCommunication';
import { RealTimeIncidents } from '@/components/admin/RealTimeIncidents';
import { IncidentAnalytics } from '@/components/admin/IncidentAnalytics';
import { CarouselManager } from '@/components/admin/CarouselManager';
import { CampusAdminManager } from '@/components/admin/CampusAdminManager';
import { CaseEscalation } from '@/components/admin/CaseEscalation';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { MobileNavMenu } from '@/components/shared/MobileNavMenu';
import { MasterSyncProvider } from '@/contexts/MasterSyncContext';
import { CasesProvider } from '@/contexts/CasesContext';
import { MasterSyncButton } from '@/components/admin/MasterSyncButton';

const Admin = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'overview' | 'incidents' | 'analytics' | 'announcements' | 'communication' | 'carousel' | 'admins' | 'escalation'>('overview');
  const navItems = [{
    view: 'overview',
    icon: LayoutDashboard,
    label: 'Overview'
  }, {
    view: 'incidents',
    icon: AlertCircle,
    label: 'Incidents'
  }, {
    view: 'escalation',
    icon: Siren,
    label: 'Escalation'
  }, {
    view: 'analytics',
    icon: BarChart3,
    label: 'Analytics'
  }, {
    view: 'announcements',
    icon: Megaphone,
    label: 'Announcements'
  }, {
    view: 'communication',
    icon: MessageSquare,
    label: 'Staff Chat'
  }, {
    view: 'carousel',
    icon: Images,
    label: 'Carousel'
  }, {
    view: 'admins',
    icon: Users,
    label: 'Admins'
  }];
  return <CasesProvider>
    <MasterSyncProvider>
      <div className="min-h-screen bg-gradient-admin admin-theme" data-testid="ready-admin">
        {/* Header */}
        <motion.header initial={{
        y: -100,
        opacity: 0
      }} animate={{
        y: 0,
        opacity: 1
      }} transition={{
        duration: 0.5,
        ease: 'easeInOut'
      }} className="sticky top-0 z-50 bg-primary border-b border-white/10 shadow-large">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.img src={tutLogo} alt="TUT Logo" className="h-10 logo-glow" whileHover={{
                scale: 1.1,
                rotate: -5
              }} transition={{
                type: "spring",
                stiffness: 300,
                damping: 20
              }} />
                <div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-white animate-pulse" />
                    <h1 className="text-xl font-bold text-white">Campus Community Safety Forum</h1>
                  </div>
                  <p className="text-sm text-white/90 font-semibold">CCSF Admin Console</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <ThemeToggle />
                <MasterSyncButton />
                <NotificationBell />
                <motion.div whileHover={{
                scale: 1.08
              }} whileTap={{
                scale: 0.95
              }}>
                  <Button variant="destructive" size="sm" className="text-xs px-2 sm:px-3" onClick={async () => {
                  const {
                    supabase
                  } = await import('@/integrations/supabase/client');
                  await supabase.auth.signOut();
                  navigate('/auth');
                }}>
                    <span className="hidden sm:inline">Sign Out</span>
                    <span className="sm:hidden">Exit</span>
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Real-Time Incidents */}
        <div className="container mx-auto px-4 py-6">
          <RealTimeIncidents />
        </div>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          {/* Navigation - Desktop Tabs + Mobile Menu */}
          <motion.div initial={{
          opacity: 0,
          y: 25
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.2,
          duration: 0.4
        }} className="mb-6">
            {/* Mobile Navigation Menu */}
            <div className="flex justify-center md:hidden mb-4">
              <MobileNavMenu items={navItems} activeView={activeView} onViewChange={view => setActiveView(view as typeof activeView)} title="Super Admin" />
            </div>

            {/* Desktop Navigation Tabs */}
            <Card className="hidden md:block p-3 shadow-large">
              <div className="flex flex-wrap justify-center gap-2">
                {navItems.map(({
                view,
                icon: Icon,
                label
              }) => <motion.div key={view} whileHover={{
                scale: 1.05
              }} whileTap={{
                scale: 0.95
              }}>
                    <Button variant={activeView === view ? 'default' : 'ghost'} onClick={() => setActiveView(view as typeof activeView)} className="transition-all" size="sm">
                      <Icon className="h-4 w-4 lg:mr-2" />
                      <span className="hidden lg:inline">{label}</span>
                    </Button>
                  </motion.div>)}
              </div>
            </Card>
          </motion.div>

          {/* Content Views */}
          <motion.div key={activeView} initial={{
          opacity: 0,
          x: 20,
          scale: 0.97
        }} animate={{
          opacity: 1,
          x: 0,
          scale: 1
        }} exit={{
          opacity: 0,
          x: -20,
          scale: 0.97
        }} transition={{
          type: "spring",
          stiffness: 300,
          damping: 30
        }}>
            {activeView === 'overview' && <AdminOverview />}
            {activeView === 'incidents' && <AdminIncidents />}
            {activeView === 'escalation' && <CaseEscalation />}
            {activeView === 'analytics' && <IncidentAnalytics />}
            {activeView === 'announcements' && <AdminAnnouncements />}
            {activeView === 'communication' && <StaffCommunication />}
            {activeView === 'carousel' && <CarouselManager />}
            {activeView === 'admins' && <CampusAdminManager />}
          </motion.div>

          {/* Footer */}
          <footer className="mt-12 pb-6 text-center text-sm text-muted-foreground">
            <p className="font-bold text-primary-foreground">Powered By Campus Protection Service</p>
          </footer>
        </main>
      </div>
    </MasterSyncProvider>
  </CasesProvider>;
};
export default Admin;