import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { Shield, LayoutDashboard, AlertCircle, Megaphone, MessageSquare, MapPin, Users, BarChart3, Settings } from 'lucide-react';
import tutLogo from '@/assets/tut-logo.png';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminIncidents } from '@/components/admin/AdminIncidents';
import { AdminAnnouncements } from '@/components/admin/AdminAnnouncements';
import { ResolveCases } from '@/components/admin/ResolveCases';
import { StaffCommunication } from '@/components/admin/StaffCommunication';
import { RealTimeIncidents } from '@/components/admin/RealTimeIncidents';
import { IncidentAnalytics } from '@/components/admin/IncidentAnalytics';
import { OfficerSettings } from '@/components/admin/OfficerSettings';
import { MasterSyncProvider, useMasterSync } from '@/contexts/MasterSyncContext';
import { CasesProvider } from '@/contexts/CasesContext';
import { MasterSyncButton } from '@/components/admin/MasterSyncButton';
import { VirtualStudentList } from '@/components/shared/VirtualStudentList';
import { NotificationBell } from '@/components/shared/NotificationBell';
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
  'emalahleni': 'Emalahleni',
};

const Security = () => {
  const navigate = useNavigate();
  const { userProfile, signOut } = useAuth();
  const [activeView, setActiveView] = useState<'overview' | 'incidents' | 'announcements' | 'communication' | 'students' | 'analytics' | 'settings'>('overview');
  const [campusStudentCount, setCampusStudentCount] = useState(0);
  const [campusIncidentCount, setCampusIncidentCount] = useState(0);

  const userCampus = userProfile?.campus ? campusDisplayNames[userProfile.campus] || userProfile.campus : 'Campus';

  useEffect(() => {
    const fetchCampusStats = async () => {
      if (!userProfile?.campus) return;

      const campusValue = userProfile.campus as CampusLocation;

      // Fetch campus student count (will be filtered by RLS)
      const { count: studentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('campus', campusValue);

      setCampusStudentCount(studentCount || 0);

      // Fetch campus incident count (will be filtered by RLS)
      const { count: incidentCount } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('campus', campusValue);

      setCampusIncidentCount(incidentCount || 0);
    };

    fetchCampusStats();
  }, [userProfile?.campus]);

  return (
    <MasterSyncProvider>
      <CasesProvider>
      <div className="min-h-screen bg-gradient-admin admin-theme" data-testid="ready-campus-admin">
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
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white/90 font-semibold">Campus Admin Portal</p>
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {userCampus}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-4 mr-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{campusStudentCount}</p>
                    <p className="text-xs text-white/70">Students</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{campusIncidentCount}</p>
                    <p className="text-xs text-white/70">Incidents</p>
                  </div>
                </div>
                <MasterSyncButton />
                <NotificationBell />
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="destructive" size="sm" onClick={() => signOut()}>
                    Sign Out
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
          {/* Navigation Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <Card className="p-3 mb-6 shadow-large">
              <div className="flex flex-wrap justify-center gap-2">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant={activeView === 'overview' ? 'default' : 'ghost'} onClick={() => setActiveView('overview')} className="transition-all">
                    <LayoutDashboard className="h-4 w-4 mr-2" />Overview
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant={activeView === 'incidents' ? 'default' : 'ghost'} onClick={() => setActiveView('incidents')} className="transition-all">
                    <AlertCircle className="h-4 w-4 mr-2" />Incidents
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant={activeView === 'analytics' ? 'default' : 'ghost'} onClick={() => setActiveView('analytics')} className="transition-all">
                    <BarChart3 className="h-4 w-4 mr-2" />Analytics
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant={activeView === 'students' ? 'default' : 'ghost'} onClick={() => setActiveView('students')} className="transition-all">
                    <Users className="h-4 w-4 mr-2" />Students
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant={activeView === 'announcements' ? 'default' : 'ghost'} onClick={() => setActiveView('announcements')} className="transition-all">
                    <Megaphone className="h-4 w-4 mr-2" />Announcements
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant={activeView === 'communication' ? 'default' : 'ghost'} onClick={() => setActiveView('communication')} className="transition-all">
                    <MessageSquare className="h-4 w-4 mr-2" />Comms
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant={activeView === 'settings' ? 'default' : 'ghost'} onClick={() => setActiveView('settings')} className="transition-all">
                    <Settings className="h-4 w-4 mr-2" />Settings
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
            {activeView === 'overview' && <AdminOverview />}
            {activeView === 'incidents' && (
              <div className="space-y-6">
                <AdminIncidents />
                <ResolveCases />
              </div>
            )}
            {activeView === 'analytics' && <IncidentAnalytics />}
            {activeView === 'students' && <CampusStudentsList campus={userProfile?.campus} />}
            {activeView === 'announcements' && <AdminAnnouncements />}
            {activeView === 'communication' && <StaffCommunication />}
            {activeView === 'settings' && <OfficerSettings />}
          </motion.div>

          {/* Footer */}
          <footer className="mt-12 pb-6 text-center text-sm text-muted-foreground">
            <p>Powered By Campus Protection Service</p>
          </footer>
        </main>
      </div>
      </CasesProvider>
    </MasterSyncProvider>
  );
};

// Campus Students List Component using MasterSync + Virtual Scrolling
const CampusStudentsList = ({ campus }: { campus: string | null | undefined }) => {
  const { profiles, isLoading, profilesPagination, loadMoreProfiles, getProfilesByCampus } = useMasterSync();
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // Get students for the current campus
  const campusStudents = useMemo(() => {
    if (!campus) return [];
    return getProfilesByCampus(campus);
  }, [campus, getProfilesByCampus]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-[400px] bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-large">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Campus Students ({campusStudents.length})
        </h2>
        {profilesPagination.hasMore && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadMoreProfiles}
            className="gap-2"
          >
            Load More
          </Button>
        )}
      </div>
      <VirtualStudentList 
        students={campusStudents} 
        height={500}
        onStudentClick={(student) => setSelectedStudent(student)}
      />
      
      {/* Student Details Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Details
            </DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-3">
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
              {selectedStudent.emergency_contact_name && (
                <div className="pt-3 border-t">
                  <p className="text-sm font-medium mb-2">Emergency Contact</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{selectedStudent.emergency_contact_name}</span>
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{selectedStudent.emergency_contact_phone || 'N/A'}</span>
                    <span className="text-muted-foreground">Relationship:</span>
                    <span>{selectedStudent.emergency_contact_relationship || 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default Security;
