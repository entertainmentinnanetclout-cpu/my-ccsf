import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { Shield, LayoutDashboard, AlertCircle, Megaphone, MessageSquare, MapPin, Users, BarChart3, Settings } from 'lucide-react';
import ccsfLogo from '@/assets/ccsf-logo.png';
import { CampusDashboard } from '@/components/admin/CampusDashboard';
import { AdminIncidents } from '@/components/admin/AdminIncidents';
import { AdminAnnouncements } from '@/components/admin/AdminAnnouncements';
import { ResolveCases } from '@/components/admin/ResolveCases';
import { StaffCommunication } from '@/components/admin/StaffCommunication';
import { RealTimeIncidents } from '@/components/admin/RealTimeIncidents';
import { CampusAnalytics } from '@/components/admin/CampusAnalytics';
import { OfficerSettings } from '@/components/admin/OfficerSettings';
import { MasterSyncProvider, useMasterSync } from '@/contexts/MasterSyncContext';
import { CasesProvider } from '@/contexts/CasesContext';
import { MasterSyncButton } from '@/components/admin/MasterSyncButton';
import { VirtualStudentList } from '@/components/shared/VirtualStudentList';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { MobileNavMenu } from '@/components/shared/MobileNavMenu';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
type CampusLocation = Database['public']['Enums']['campus_location'];
const campusDisplayNames: Record<string, string> = {
  'pretoria_west_main': 'Pretoria West',
  'arcadia': 'Arcadia',
  'arts': 'Arts',
  'giyani': 'Giyani',
  'mbombela': 'Mbombela',
  'polokwane': 'Polokwane',
  'garankuwa': 'Ga-Rankuwa',
  'soshanguve_south': 'Soshanguve South',
  'soshanguve_north': 'Soshanguve North',
  'emalahleni': 'Emalahleni'
};
const Security = () => {
  const {
    userProfile,
    signOut
  } = useAuth();
  const [activeView, setActiveView] = useState<'overview' | 'incidents' | 'announcements' | 'communication' | 'students' | 'analytics' | 'settings'>('overview');
  const [campusStudentCount, setCampusStudentCount] = useState(0);
  const [campusIncidentCount, setCampusIncidentCount] = useState(0);
  const navItems = [{
    view: 'overview',
    icon: LayoutDashboard,
    label: 'Overview'
  }, {
    view: 'incidents',
    icon: AlertCircle,
    label: 'Incidents'
  }, {
    view: 'analytics',
    icon: BarChart3,
    label: 'Analytics'
  }, {
    view: 'students',
    icon: Users,
    label: 'Students'
  }, {
    view: 'announcements',
    icon: Megaphone,
    label: 'Announcements'
  }, {
    view: 'communication',
    icon: MessageSquare,
    label: 'Comms'
  }, {
    view: 'settings',
    icon: Settings,
    label: 'Settings'
  }];
  const userCampus = userProfile?.campus ? campusDisplayNames[userProfile.campus] || userProfile.campus : 'Campus';
  useEffect(() => {
    const fetchCampusStats = async () => {
      if (!userProfile?.campus) return;
      const campusValue = userProfile.campus as CampusLocation;

      // Fetch campus student count (will be filtered by RLS)
      const {
        count: studentCount
      } = await supabase.from('profiles').select('*', {
        count: 'exact',
        head: true
      }).eq('campus', campusValue);
      setCampusStudentCount(studentCount || 0);

      // Fetch campus incident count (will be filtered by RLS)
      const {
        count: incidentCount
      } = await supabase.from('incidents').select('*', {
        count: 'exact',
        head: true
      }).eq('campus', campusValue);
      setCampusIncidentCount(incidentCount || 0);
    };
    fetchCampusStats();
  }, [userProfile?.campus]);
  return <MasterSyncProvider>
      <CasesProvider>
      <div className="min-h-screen bg-gradient-admin admin-theme" data-testid="ready-campus-admin">
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
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Logo and Title */}
              <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                <motion.img src={ccsfLogo} alt="CCSF Logo" className="h-10 w-auto object-contain flex-shrink-0 logo-glow" whileHover={{
                  scale: 1.1,
                  rotate: -5
                }} transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20
                }} />
                <div className="hidden sm:block min-w-0">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-white animate-pulse flex-shrink-0" />
                    <h1 className="text-base md:text-lg font-bold text-white whitespace-nowrap">CCSF Portal</h1>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate max-w-[100px] md:max-w-[150px]">{userCampus}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Stats and Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
                <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-white/10 rounded-lg">
                  <div className="text-center">
                    <p className="text-lg font-bold text-white leading-none">{campusStudentCount}</p>
                    <p className="text-[10px] text-white/70 uppercase tracking-wide">Students</p>
                  </div>
                  <div className="w-px h-8 bg-white/20" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-white leading-none">{campusIncidentCount}</p>
                    <p className="text-[10px] text-white/70 uppercase tracking-wide">Cases</p>
                  </div>
                </div>
                <ThemeToggle />
                <MasterSyncButton />
                <NotificationBell />
                <motion.div whileHover={{
                  scale: 1.05
                }} whileTap={{
                  scale: 0.95
                }}>
                  <Button variant="destructive" size="sm" className="text-xs px-2 sm:px-3" onClick={() => signOut()}>
                    <span className="hidden sm:inline">Sign Out</span>
                    <span className="sm:hidden">Exit</span>
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Real-Time Incidents - Filtered by Campus */}
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
              <MobileNavMenu items={navItems} activeView={activeView} onViewChange={view => setActiveView(view as typeof activeView)} title="Campus Admin" />
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
            {activeView === 'overview' && <CampusDashboard />}
            {activeView === 'incidents' && <div className="space-y-6">
                <AdminIncidents />
                <ResolveCases />
              </div>}
            {activeView === 'analytics' && <CampusAnalytics />}
            {activeView === 'students' && <CampusStudentsList campus={userProfile?.campus} />}
            {activeView === 'announcements' && <AdminAnnouncements />}
            {activeView === 'communication' && <StaffCommunication />}
            {activeView === 'settings' && <OfficerSettings />}
          </motion.div>

          {/* Footer */}
          <footer className="mt-12 pb-6 text-center text-sm text-muted-foreground">
            <p className="text-sm font-bold text-primary-foreground">Powered By Campus Protection Service</p>
          </footer>
        </main>
      </div>
      </CasesProvider>
    </MasterSyncProvider>;
};

// Campus Students List Component using MasterSync + Virtual Scrolling
const CampusStudentsList = ({
  campus
}: {
  campus: string | null | undefined;
}) => {
  const {
    profiles,
    isLoading,
    profilesPagination,
    loadMoreProfiles,
    getProfilesByCampus
  } = useMasterSync();
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // Get students for the current campus
  const campusStudents = useMemo(() => {
    if (!campus) return [];
    return getProfilesByCampus(campus);
  }, [campus, getProfilesByCampus]);
  if (isLoading) {
    return <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-[400px] bg-muted rounded"></div>
        </div>
      </Card>;
  }
  return <Card className="p-6 shadow-large">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Campus Students ({campusStudents.length})
        </h2>
        {profilesPagination.hasMore && <Button variant="outline" size="sm" onClick={loadMoreProfiles} className="gap-2">
            Load More
          </Button>}
      </div>
      <VirtualStudentList students={campusStudents} height={500} onStudentClick={student => setSelectedStudent(student)} />
      
      {/* Student Details Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Details
            </DialogTitle>
          </DialogHeader>
          {selectedStudent && <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{selectedStudent.full_name || 'N/A'}</span>
                <span className="text-muted-foreground">Student Number:</span>
                <span className="font-medium">{selectedStudent.student_number || 'N/A'}</span>
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium truncate">{selectedStudent.email}</span>
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">{selectedStudent.phone_number || 'N/A'}</span>
                <span className="text-muted-foreground">Residence:</span>
                <span className="font-medium">{selectedStudent.residence || 'N/A'}</span>
                <span className="text-muted-foreground">Course:</span>
                <span className="font-medium">{selectedStudent.course || 'N/A'}</span>
                <span className="text-muted-foreground">Year:</span>
                <span className="font-medium">{selectedStudent.year_of_study || 'N/A'}</span>
              </div>
              {selectedStudent.emergency_contact_name && <div className="pt-3 border-t">
                  <p className="text-sm font-medium mb-2">Emergency Contact</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{selectedStudent.emergency_contact_name}</span>
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{selectedStudent.emergency_contact_phone || 'N/A'}</span>
                    <span className="text-muted-foreground">Relationship:</span>
                    <span>{selectedStudent.emergency_contact_relationship || 'N/A'}</span>
                  </div>
                </div>}
            </div>}
        </DialogContent>
      </Dialog>
    </Card>;
};
export default Security;