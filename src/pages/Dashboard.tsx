import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, FlaskConical, Home, LifeBuoy, LogOut, MapPin, Plus, Radar, Shield, ShieldCheck, UsersRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { MobileBottomNav } from '@/components/shared/MobileBottomNav';
import { AcademicFraudLaunchCard } from '@/components/shared/AcademicFraudLaunchCard';
import { CommunityHub } from '@/components/community/CommunityHub';
import { ReportIncident } from '@/components/student/ReportIncident';
import { EmergencyReport } from '@/components/student/EmergencyReport';
import { SafetyMobilityHub } from '@/components/student/SafetyMobilityHub';
import { StudentDashboardHome } from '@/components/student/StudentDashboardHome';
import { StudentChat } from '@/components/student/StudentChat';
import { MyCaseReports } from '@/components/student/MyCaseReports';
import { BRAND } from '@/brand';
import { CAMPUS_LABELS } from '@/config/pilot';
import { readReportDraft, reportDraftKey, writeReportDraft } from '@/lib/reportDraftStorage';
import type { CampusLocation } from '@/types/pilot';

type StudentView = 'home' | 'report' | 'mycases' | 'safety' | 'community' | 'messages';
const STUDENT_VIEWS = new Set<StudentView>(['home', 'report', 'mycases', 'safety', 'community', 'messages']);

const Dashboard = () => {
  const navigate = useNavigate();
  const { userProfile, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get('tab') as StudentView | null;
  const viewStorageKey = userProfile?.id ? reportDraftKey('official', userProfile.id, 'dashboard-view') : null;
  const [activeView, setActiveView] = useState<StudentView>(() => {
    if (requestedView && STUDENT_VIEWS.has(requestedView)) return requestedView;
    if (viewStorageKey) {
      const saved = readReportDraft<StudentView>(viewStorageKey);
      if (saved && STUDENT_VIEWS.has(saved)) return saved;
    }
    return 'home';
  });
  const campus = userProfile?.campus as CampusLocation | null | undefined;
  const campusLabel = campus ? CAMPUS_LABELS[campus] : 'Campus assignment pending';

  useEffect(() => {
    const requested = searchParams.get('tab') as StudentView | null;
    if (requested && STUDENT_VIEWS.has(requested)) {
      setActiveView(requested);
      if (viewStorageKey) writeReportDraft(viewStorageKey, requested);
      return;
    }

    if (viewStorageKey) {
      const saved = readReportDraft<StudentView>(viewStorageKey);
      setActiveView(saved && STUDENT_VIEWS.has(saved) ? saved : 'home');
    }
  }, [searchParams, viewStorageKey]);

  const changeView = (view: StudentView) => {
    setActiveView(view);
    if (viewStorageKey) writeReportDraft(viewStorageKey, view);
    const next = new URLSearchParams(searchParams);
    if (view === 'home') next.delete('tab');
    else next.set('tab', view);
    setSearchParams(next, { replace: true });
  };

  const navItems = [
    { view: 'home', icon: Home, label: 'Home' },
    { view: 'mycases', icon: FileText, label: 'My Cases' },
    { view: 'report', icon: Plus, label: 'Report' },
    { view: 'safety', icon: Radar, label: 'Safety' },
    { view: 'community', icon: UsersRound, label: 'Community' },
    { view: 'messages', icon: LifeBuoy, label: 'Support' },
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="ready-dashboard">
      <EmergencyReport />

      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="sticky top-0 z-40 border-b border-border border-t-4 border-t-[#F2A900] bg-background shadow-soft dark:bg-primary"
      >
        <div className="w-full px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <motion.div className="relative shrink-0" whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                <InstitutionBrand size="header" />
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-success dark:border-primary" aria-hidden="true" />
              </motion.div>
              <div className="hidden min-w-0 sm:block">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 shrink-0 text-primary dark:text-white" aria-hidden="true" />
                  <h1 className="truncate text-lg font-bold text-primary dark:text-white sm:text-xl">{BRAND.productLongName}</h1>
                </div>
                <p className="text-xs font-medium text-muted-foreground dark:text-white/80 sm:text-sm">CCSF Student Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Button asChild size="sm" className="border border-[#F2A900]/70 bg-[#D7193F] px-2 font-extrabold text-white shadow-md hover:bg-[#B91435] sm:px-3" data-testid="open-pilot-mode">
                <Link to="/pilot"><FlaskConical className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Open Pilot</span></Link>
              </Button>
              <motion.div className="hidden items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 shadow-sm dark:border-white/20 dark:bg-white/10 lg:flex" whileHover={{ scale: 1.02 }}>
                <MapPin className="h-4 w-4 text-primary dark:text-white" aria-hidden="true" />
                <span className="text-sm font-semibold text-primary dark:text-white">{campusLabel}</span>
              </motion.div>
              <ThemeToggle />
              <NotificationBell />
              <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                <Button variant="ghost" size="icon" onClick={() => void signOut()} className="hidden sm:flex" aria-label="Sign out of CCSF"><LogOut className="h-5 w-5" aria-hidden="true" /></Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="w-full pb-24 md:pb-6">
        <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }} className="mb-4 px-4 sm:mb-6">
          <Card className="hidden bg-card/95 p-2 shadow-elevated backdrop-blur-sm md:block sm:p-3">
            <div className="grid grid-cols-6 gap-1.5 sm:gap-2" role="tablist" aria-label="Student portal sections">
              {navItems.map(({ view, icon: Icon, label }) => (
                <motion.div key={view} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                  <Button role="tab" aria-selected={activeView === view} variant={activeView === view ? 'default' : 'ghost'} onClick={() => changeView(view as StudentView)} className={`w-full px-1 text-xs transition-all sm:px-3 sm:text-sm ${activeView === view ? 'bg-gradient-to-r from-primary to-secondary shadow-lg' : 'hover:bg-primary/10'}`} size="sm">
                    <Icon className={`h-4 w-4 ${activeView === view ? '' : 'lg:mr-2'}`} aria-hidden="true" /><span className="hidden lg:inline">{label}</span>
                  </Button>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div key={activeView} initial={{ opacity: 0, x: 20, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -20, scale: 0.97 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
          {activeView === 'home' && (
            <div className="space-y-5">
              <div className="px-4">
                <Card className="overflow-hidden border-[#F2A900]/55 shadow-large">
                  <CardContent className="flex flex-col justify-between gap-5 bg-gradient-to-r from-[#002F6C] via-[#07366D] to-[#1A0D2B] p-5 text-white sm:flex-row sm:items-center sm:p-6">
                    <div><div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#F2A900]"><ShieldCheck className="h-4 w-4" />New student safety layer</div><h2 className="mt-2 text-xl font-black sm:text-2xl">In-Transit, Night Travel, Track This Phone and Campus Radar</h2><p className="mt-2 max-w-3xl text-sm text-white/70">Use opt-in live location, tappable campus profiles, the existing GPS map and one-tap official safety alerts from a single organised hub.</p></div>
                    <Button className="shrink-0 bg-[#F2A900] font-extrabold text-[#002F6C] hover:bg-[#F2A900]/90" onClick={() => changeView('safety')}><Radar className="mr-2 h-5 w-5" />Open Safety Hub</Button>
                  </CardContent>
                </Card>
              </div>
              <StudentDashboardHome campus={campus || undefined} />
            </div>
          )}
          <div className="space-y-6 px-4">
            {activeView === 'mycases' && <MyCaseReports />}
            {activeView === 'report' && <><AcademicFraudLaunchCard pilotHref="/pilot?open=academic-fraud" /><ReportIncident /></>}
            {activeView === 'safety' && campus && <SafetyMobilityHub campus={campus} />}
            {activeView === 'safety' && !campus && <Card><CardContent className="p-8 text-center"><Radar className="mx-auto h-10 w-10 text-primary" /><h2 className="mt-4 text-xl font-bold">Complete your campus profile first</h2><p className="mt-2 text-sm text-muted-foreground">Safety Mobility needs your verified campus for routing, Radar and campus-specific support.</p><Button asChild className="mt-5"><Link to="/profile-completion">Complete profile</Link></Button></CardContent></Card>}
            {activeView === 'community' && userProfile && (
              <CommunityHub
                environment="official"
                identity={{
                  userId: userProfile.id,
                  fullName: userProfile.full_name ?? 'TUT Student',
                  email: userProfile.email,
                  campus: userProfile.campus,
                  profileCompleted: userProfile.profile_completed,
                }}
                onCompleteProfile={() => navigate('/profile-completion')}
              />
            )}
            {activeView === 'messages' && <StudentChat onNavigate={changeView} />}
          </div>
        </motion.div>

        <footer className="mt-8 pb-6 text-center sm:mt-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2"><Shield className="h-4 w-4 text-primary" aria-hidden="true" /><p className="text-xs font-semibold text-muted-foreground sm:text-sm">{BRAND.productLongName} · {BRAND.institutionName}</p></div>
        </footer>
      </main>

      <MobileBottomNav items={navItems} activeView={activeView} onViewChange={(view) => changeView(view as StudentView)} ariaLabel="Student portal sections" />
    </div>
  );
};

export default Dashboard;
