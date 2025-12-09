import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Shield, LayoutDashboard, AlertCircle, Megaphone, Home, MessageSquare, CheckSquare, MapPin, Users } from 'lucide-react';
import tutLogo from '@/assets/tut-logo.png';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminIncidents } from '@/components/admin/AdminIncidents';
import { AdminAnnouncements } from '@/components/admin/AdminAnnouncements';
import { AlertsPanel } from '@/components/admin/Dashboard/AlertsPanel';
import { TrafficSummary } from '@/components/admin/Dashboard/TrafficSummary';
import { CCTVStatus } from '@/components/admin/Dashboard/CCTVStatus';
import { ResolveCases } from '@/components/admin/ResolveCases';
import { StaffCommunication } from '@/components/admin/StaffCommunication';
import { RealTimeIncidents } from '@/components/admin/RealTimeIncidents';
import { ResidenceSection } from '@/components/student/ResidenceSection';
import { CasesProvider } from '@/contexts/CasesContext';
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
  const [activeView, setActiveView] = useState<'overview' | 'incidents' | 'announcements' | 'summary' | 'resolve' | 'communication' | 'residences' | 'students'>('overview');
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
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="default" size="icon" onClick={() => navigate('/')}>
                    <Home className="h-5 w-5" />
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
            <Card className="p-2 mb-6 shadow-large">
              <div className="grid grid-cols-2 md:grid-cols-8 gap-2">
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
                  <Button variant={activeView === 'students' ? 'default' : 'ghost'} onClick={() => setActiveView('students')} className="w-full transition-all">
                    <Users className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Students</span>
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
                    <CheckSquare className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Resolve</span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant={activeView === 'communication' ? 'default' : 'ghost'} onClick={() => setActiveView('communication')} className="w-full transition-all">
                    <MessageSquare className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Comms</span>
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
            {activeView === 'overview' && <AdminOverview />}
            {activeView === 'incidents' && <AdminIncidents />}
            {activeView === 'students' && <CampusStudentsList campus={userProfile?.campus} />}
            {activeView === 'announcements' && <AdminAnnouncements />}
            {activeView === 'summary' && (
              <div className="space-y-4">
                <AlertsPanel />
                <TrafficSummary />
                <CCTVStatus />
              </div>
            )}
            {activeView === 'resolve' && <ResolveCases />}
            {activeView === 'communication' && <StaffCommunication />}
            {activeView === 'residences' && <ResidenceSection />}
          </motion.div>

          {/* Footer */}
          <footer className="mt-12 pb-6 text-center text-sm text-muted-foreground">
            <p>Powered By Campus Protection Service</p>
          </footer>
        </main>
      </div>
    </CasesProvider>
  );
};

// Campus Students List Component
const CampusStudentsList = ({ campus }: { campus: string | null | undefined }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!campus) return;

      const campusValue = campus as CampusLocation;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, student_number, phone_number, residence')
        .eq('campus', campusValue)
        .order('full_name', { ascending: true });

      if (!error && data) {
        setStudents(data);
      }
      setLoading(false);
    };

    fetchStudents();
  }, [campus]);

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Loading students...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-large">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Users className="h-5 w-5" />
        Campus Students ({students.length})
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3">Name</th>
              <th className="text-left py-2 px-3">Student Number</th>
              <th className="text-left py-2 px-3">Email</th>
              <th className="text-left py-2 px-3">Phone</th>
              <th className="text-left py-2 px-3">Residence</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b hover:bg-muted/50">
                <td className="py-2 px-3">{student.full_name || 'N/A'}</td>
                <td className="py-2 px-3">{student.student_number || 'N/A'}</td>
                <td className="py-2 px-3">{student.email}</td>
                <td className="py-2 px-3">{student.phone_number || 'N/A'}</td>
                <td className="py-2 px-3">{student.residence || 'N/A'}</td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-muted-foreground">
                  No students found for this campus
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default Security;
