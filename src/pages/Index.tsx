import { Link } from 'react-router-dom';
import { Shield, Users, UserCog, AlertTriangle, Bell, MapPin, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-10 w-10 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">My CCSF</h1>
              <p className="text-xs text-blue-300">Campus Community Safety Forum</p>
            </div>
          </div>
          <Link to="/auth">
            <Button variant="outline" className="border-blue-400 text-blue-400 hover:bg-blue-400/10">
              Sign In
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
          Campus Safety,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            Reimagined
          </span>
        </h2>
        <p className="text-xl text-blue-200 mb-12 max-w-2xl mx-auto">
          A nationwide incident reporting and campus safety management system. 
          Report incidents, receive alerts, and stay connected with your campus security team.
        </p>

        {/* Portal Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {/* Student Portal */}
          <Card className="bg-white/10 border-white/20 backdrop-blur-lg hover:bg-white/15 transition-all group">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Users className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-white text-xl">Student Portal</CardTitle>
              <CardDescription className="text-blue-200">
                Report incidents, view announcements, and access safety resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/auth?role=student">
                <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                  Enter Portal <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Campus Office Portal */}
          <Card className="bg-white/10 border-white/20 backdrop-blur-lg hover:bg-white/15 transition-all group">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-white text-xl">Campus Office</CardTitle>
              <CardDescription className="text-blue-200">
                Manage campus incidents, visitor logs, and security shifts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/auth?role=security">
                <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                  Enter Portal <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* SuperAdmin Portal */}
          <Card className="bg-white/10 border-white/20 backdrop-blur-lg hover:bg-white/15 transition-all group">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-violet-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <UserCog className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-white text-xl">SuperAdmin</CardTitle>
              <CardDescription className="text-blue-200">
                Nationwide oversight, case management, and system administration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/auth?role=admin">
                <Button className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700">
                  Enter Portal <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Incident Reporting</h3>
            <p className="text-blue-200 text-sm">Quick and easy incident reporting with optional anonymity</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <Bell className="h-6 w-6 text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Real-time Alerts</h3>
            <p className="text-blue-200 text-sm">Stay informed with instant notifications and announcements</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Multi-Campus</h3>
            <p className="text-blue-200 text-sm">Nationwide coverage across all campus locations</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t border-white/10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-400" />
            <span className="text-white font-semibold">My CCSF</span>
          </div>
          <p className="text-blue-300 text-sm">
            © {new Date().getFullYear()} Campus Community Safety Forum. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
