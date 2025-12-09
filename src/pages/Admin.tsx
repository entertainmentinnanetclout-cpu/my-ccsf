import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Shield, BarChart3, FileText, Users, Bell, Settings, LogOut, 
  Menu, X, MapPin, AlertTriangle, TrendingUp, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import AdminDashboardStats from '@/components/admin/AdminDashboardStats';
import AllIncidentsList from '@/components/admin/AllIncidentsList';
import CampusOverview from '@/components/admin/CampusOverview';
import AnnouncementManager from '@/components/admin/AnnouncementManager';
import AlertManager from '@/components/admin/AlertManager';
import StaffChat from '@/components/shared/StaffChat';

const Admin = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">My CCSF</h1>
                <p className="text-xs text-purple-300">SuperAdmin Portal</p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-4">
              <span className="text-sm text-purple-200">
                {user?.user_metadata?.full_name || user?.email}
              </span>
              <Button variant="ghost" size="sm" className="text-purple-200 hover:text-white hover:bg-white/10" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </nav>

            {/* Mobile Menu Toggle */}
            <Button variant="ghost" size="sm" className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <nav className="md:hidden mt-4 pb-2 flex flex-col gap-2">
              <Button variant="ghost" size="sm" className="justify-start text-purple-200" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </nav>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">SuperAdmin Dashboard</h2>
          <p className="text-purple-200">Nationwide oversight and system administration</p>
        </div>

        {/* Dashboard Stats */}
        <AdminDashboardStats />

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6 mt-8">
          <TabsList className="bg-white/10 backdrop-blur border border-white/10">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/20 text-white">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="incidents" className="data-[state=active]:bg-white/20 text-white">
              <FileText className="h-4 w-4 mr-2" />
              All Cases
            </TabsTrigger>
            <TabsTrigger value="campuses" className="data-[state=active]:bg-white/20 text-white">
              <Building2 className="h-4 w-4 mr-2" />
              Campuses
            </TabsTrigger>
            <TabsTrigger value="announcements" className="data-[state=active]:bg-white/20 text-white">
              <Bell className="h-4 w-4 mr-2" />
              Announcements
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-white/20 text-white">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-white/20 text-white">
              <Users className="h-4 w-4 mr-2" />
              Staff Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <CampusOverview />
          </TabsContent>

          <TabsContent value="incidents">
            <AllIncidentsList />
          </TabsContent>

          <TabsContent value="campuses">
            <CampusOverview detailed />
          </TabsContent>

          <TabsContent value="announcements">
            <AnnouncementManager />
          </TabsContent>

          <TabsContent value="alerts">
            <AlertManager />
          </TabsContent>

          <TabsContent value="chat">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Staff Communication</CardTitle>
                <CardDescription className="text-purple-200">Chat with campus office staff nationwide</CardDescription>
              </CardHeader>
              <CardContent>
                <StaffChat isAdmin />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
