import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Shield, LayoutDashboard, AlertCircle, Megaphone, MessageSquare, BarChart3, Images, Users, Siren, Building2, Wifi, HeartHandshake } from 'lucide-react';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';
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
import { MobileBottomNav } from '@/components/shared/MobileBottomNav';
import { MasterSyncProvider } from '@/contexts/MasterSyncContext';
import { CasesProvider } from '@/contexts/CasesContext';
import { MasterSyncButton } from '@/components/admin/MasterSyncButton';
import { OfficeView } from '@/components/admin/OfficeView';
import { WifiAccessPointManager } from '@/components/admin/WifiAccessPointManager';
import { CommunityAdminDashboard } from '@/components/community/CommunityAdminDashboard';

const Admin = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'overview' | 'incidents' | 'analytics' | 'announcements' | 'communication' | 'carousel' | 'admins' | 'community' | 'escalation' | 'office' | 'wifi'>('overview');
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
  }, {
    view: 'community',
    icon: HeartHandshake,
    label: 'Community'
  }, {
    view: 'wifi',
    icon: Wifi,
    label: 'WiFi APs'
  }, {
    view: 'office',
    icon: Building2,
    label: 'Campus Office'
  }];
  return <CasesProvider>
    <MasterSyncProvider>
      <div className="min-h-screen bg-background" data-testid="ready-admin">
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
                <motion.div className="text-white" whileHover={{
                scale: 1.1,
                rotate: -5
              }} transition={{
                type: "spring",
                stiffness: 300,
                damping: 20
              }}>
                  <InstitutionBrand size="header" />
                </motion.div>
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

        <div className="container mx-auto px-4 py-6">
          <RealTimeIncidents />
        </div>

        <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
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
            {activeView === 'overview' && <AdminOverview onOpenIncidents={() => setActiveView('incidents')} onOpenAnalytics={() => setActiveView('analytics')} />}
            {activeView === 'incidents' && <AdminIncidents />}
            {activeView === 'escalation' && <CaseEscalation />}
            {activeView === 'analytics' && <IncidentAnalytics />}
            {activeView === 'announcements' && <AdminAnnouncements />}
            {activeView === 'communication' && <StaffCommunication />}
            {activeView === 'carousel' && <CarouselManager />}
            {activeView === 'admins' && <CampusAdminManager />}
            {activeView === 'community' && <CommunityAdminDashboard environment="official" />}
            {activeView === 'wifi' && <WifiAccessPointManager />}
            {activeView === 'office' && <OfficeView />}
          </motion.div>

          <footer className="mt-12 pb-6 text-center text-sm text-muted-foreground">
            <p className="font-bold text-primary">Powered By Campus Protection Service</p>
          </footer>
        </main>
        <MobileBottomNav
          items={navItems}
          activeView={activeView}
          onViewChange={(view) => setActiveView(view as typeof activeView)}
        />
      </div>
    </MasterSyncProvider>
  </CasesProvider>;
};
export default Admin;
