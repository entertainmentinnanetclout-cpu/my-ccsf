import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Home, FileText, Plus, Map, MessageCircle, User, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import ReportIncident from '@/components/student/ReportIncident';
import MyCaseReports from '@/components/student/MyCaseReports';
import CampusMap from '@/components/student/CampusMap';
import Chatbot from '@/components/student/Chatbot';
import Profile from '@/pages/Profile';
import StudentHome from '@/components/student/StudentHome';

const Dashboard = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('home');
  const [userCampus, setUserCampus] = useState('Campus');
  const [welcomeMessage, setWelcomeMessage] = useState('Your safety matters. Report incidents, stay informed, and help keep your campus community secure.');

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
            'pretoria_west_main': 'Pretoria West (Main Campus)',
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

      if (typeof data?.value === 'string' && data.value.trim()) {
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

  const renderContent = () => {
    switch (activeView) {
      case 'home': return <StudentHome onNavigate={setActiveView} />;
      case 'report': return <ReportIncident onSuccess={() => setActiveView('mycases')} />;
      case 'mycases': return <MyCaseReports />;
      case 'map': return <CampusMap />;
      case 'messages': return <Chatbot />;
      case 'profile': return <Profile />;
      default: return <StudentHome onNavigate={setActiveView} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">My CCSF</h1>
            <p className="text-sm text-muted-foreground">{userCampus}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setActiveView('profile')}>
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 pb-24">
        {activeView === 'home' && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <p className="text-sm">{welcomeMessage}</p>
              <ChevronRight className="h-5 w-5 text-primary shrink-0" />
            </CardContent>
          </Card>
        )}
        {renderContent()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t bg-card z-50">
        <div className="container mx-auto px-2 py-2 grid grid-cols-5 gap-1">
          {navItems.map(({ view, icon: Icon, label }) => (
            <Button
              key={view}
              variant={activeView === view ? 'secondary' : 'ghost'}
              className="flex-col h-auto py-2 gap-1"
              onClick={() => setActiveView(view)}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
