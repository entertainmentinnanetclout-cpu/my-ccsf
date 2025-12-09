import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { 
  Users, Clock, CheckCircle, AlertCircle, TrendingUp, 
  Video, VideoOff, Wifi, AlertTriangle, Eye, BarChart3 
} from 'lucide-react';
import { Slider } from './Slider';
import { LatestCases } from './LatestCases';
import { EmergencyCases } from './EmergencyCases';
import { AnimatedCounter } from './AnimatedCounter';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const mockStats = {
  total: 125, pending: 32, assigned: 45, resolved: 40, escalated: 8
};

const mockAlerts = [
  { id: 1, type: 'warning', message: 'Unusual activity detected near Gate 3', time: '5 min ago' },
  { id: 2, type: 'info', message: 'Security patrol completed in Sector A', time: '15 min ago' },
  { id: 3, type: 'success', message: 'All CCTV cameras operational', time: '30 min ago' },
];

const mockCameras = [
  { id: 1, name: 'Gate 1 - Main Entrance', status: 'online', location: 'Building A' },
  { id: 2, name: 'Parking Lot A', status: 'online', location: 'External' },
  { id: 3, name: 'Library Hall', status: 'offline', location: 'Building B' },
  { id: 4, name: 'Sports Complex', status: 'online', location: 'Building C' },
  { id: 5, name: 'Residence Block 1', status: 'online', location: 'Residence' },
  { id: 6, name: 'Cafeteria', status: 'online', location: 'Building A' },
];

const mockCampuses = [
  { name: 'Main', cases: 30 },
  { name: 'Arcadia', cases: 20 },
  { name: 'Arts', cases: 15 },
  { name: 'North', cases: 18 },
  { name: 'South', cases: 12 },
  { name: 'Mbombela', cases: 22 },
  { name: 'Polokwane', cases: 8 },
];

const caseTypes = [
  { name: 'Violence', value: 38 },
  { name: 'GBV', value: 21 },
  { name: 'Theft', value: 38 },
  { name: 'Other', value: 20 },
  { name: 'Misconduct', value: 8 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

const StatCard = ({ title, value, icon: Icon, color, delay = 0 }: { 
  title: string; value: number; icon: React.ElementType; color: string; delay?: number 
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
  >
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold"><AnimatedCounter to={value} /></p>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export const AdminOverview = () => {
  const onlineCameras = mockCameras.filter(c => c.status === 'online').length;
  const offlineCameras = mockCameras.filter(c => c.status === 'offline').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard title="Total Cases" value={mockStats.total} icon={Users} color="bg-primary" delay={0} />
        <StatCard title="Pending" value={mockStats.pending} icon={Clock} color="bg-amber-500" delay={0.1} />
        <StatCard title="Assigned" value={mockStats.assigned} icon={AlertCircle} color="bg-blue-500" delay={0.2} />
        <StatCard title="Resolved" value={mockStats.resolved} icon={CheckCircle} color="bg-green-500" delay={0.3} />
        <StatCard title="Escalated" value={mockStats.escalated} icon={TrendingUp} color="bg-destructive" delay={0.4} />
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {/* Alerts Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Live Alerts ({mockAlerts.length})
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-background">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Live Alerts
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {mockAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${
                    alert.type === 'warning' 
                      ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800' 
                      : alert.type === 'success'
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                      : 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800'
                  }`}
                >
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* CCTV Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Video className="h-4 w-4" />
              CCTV
              <span className="text-green-600">{onlineCameras}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-destructive">{offlineCameras}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-background">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  CCTV Status
                </span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-green-600">
                    <Wifi className="h-4 w-4" /> {onlineCameras} Online
                  </span>
                  <span className="flex items-center gap-1 text-destructive">
                    <VideoOff className="h-4 w-4" /> {offlineCameras} Offline
                  </span>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
              {mockCameras.map((camera) => (
                <div
                  key={camera.id}
                  className={`p-3 rounded-lg border ${
                    camera.status === 'online'
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                      : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{camera.name}</p>
                      <p className="text-xs text-muted-foreground">{camera.location}</p>
                    </div>
                    {camera.status === 'online' ? (
                      <Video className="h-4 w-4 text-green-600" />
                    ) : (
                      <VideoOff className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Campus Stats Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Campus Stats
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl bg-background">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Campus Statistics
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium mb-3">Cases per Campus</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={mockCampuses}>
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="cases" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-3">Case Distribution</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie 
                      data={caseTypes} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {caseTypes.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Slider />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <LatestCases />
        </div>
        <div>
          <EmergencyCases />
        </div>
      </div>
    </div>
  );
};
