import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Shield, Users, FileText, Clock, LogOut, Menu, X,
  AlertTriangle, CheckCircle, UserPlus, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import CampusIncidentList from '@/components/office/CampusIncidentList';
import VisitorLog from '@/components/office/VisitorLog';
import ShiftManagement from '@/components/office/ShiftManagement';
import StaffChat from '@/components/shared/StaffChat';

const Office = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Mock stats for the campus
  const stats = {
    activeIncidents: 5,
    visitorsToday: 12,
    onDutyStaff: 3,
    pendingCases: 2,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">My CCSF</h1>
                <p className="text-xs text-slate-500">Campus Office Portal</p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-4">
              <span className="text-sm text-slate-600">
                {user?.user_metadata?.full_name || user?.email}
              </span>
              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </nav>

            {/* Mobile Menu Toggle */}
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <nav className="md:hidden mt-4 pb-2 flex flex-col gap-2">
              <Button variant="ghost" size="sm" className="justify-start text-red-600" onClick={handleSignOut}>
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
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Campus Office Dashboard</h2>
          <p className="text-slate-600">Manage incidents, visitors, and security operations for your campus.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/70 backdrop-blur border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Active Incidents</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.activeIncidents}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/70 backdrop-blur border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Visitors Today</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.visitorsToday}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/70 backdrop-blur border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Staff On Duty</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.onDutyStaff}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/70 backdrop-blur border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Pending Cases</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.pendingCases}</p>
                </div>
                <Clock className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="incidents" className="space-y-6">
          <TabsList className="bg-white/70 backdrop-blur">
            <TabsTrigger value="incidents">
              <FileText className="h-4 w-4 mr-2" />
              Incidents
            </TabsTrigger>
            <TabsTrigger value="visitors">
              <UserPlus className="h-4 w-4 mr-2" />
              Visitors
            </TabsTrigger>
            <TabsTrigger value="shifts">
              <Calendar className="h-4 w-4 mr-2" />
              Shifts
            </TabsTrigger>
            <TabsTrigger value="chat">
              <Users className="h-4 w-4 mr-2" />
              Staff Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incidents">
            <CampusIncidentList />
          </TabsContent>

          <TabsContent value="visitors">
            <VisitorLog />
          </TabsContent>

          <TabsContent value="shifts">
            <ShiftManagement />
          </TabsContent>

          <TabsContent value="chat">
            <StaffChat />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Office;
