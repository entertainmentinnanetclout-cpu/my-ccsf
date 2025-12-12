import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Shield, Home, Search, AlertCircle, BarChart3, FileText } from 'lucide-react';
import tutLogo from '@/assets/tut-logo.png';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';

const mockReports = [
  { id: 'RPT-001', title: 'Suspicious activity near library', description: 'Unknown person loitering', status: 'pending', severity: 'medium', location: 'Library', reporter: { name: 'John Doe', residence: 'Block A' } },
  { id: 'RPT-002', title: 'Theft reported in parking lot', description: 'Vehicle break-in', status: 'investigating', severity: 'high', location: 'Parking Lot B', reporter: { name: 'Jane Smith', residence: 'Block C' } },
  { id: 'RPT-003', title: 'Fire alarm triggered', description: 'False alarm in dormitory', status: 'resolved', severity: 'critical', location: 'Dormitory 3', reporter: { name: 'Mike Johnson', residence: 'Block B' } },
];

const Office = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'reports' | 'stats'>('reports');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const filteredReports = mockReports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || report.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-500 border-red-500';
      case 'high': return 'bg-orange-500/20 text-orange-500 border-orange-500';
      case 'medium': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500';
      case 'low': return 'bg-green-500/20 text-green-500 border-green-500';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-500/20 text-blue-500 border-blue-500';
      case 'investigating': return 'bg-purple-500/20 text-purple-500 border-purple-500';
      case 'escalated': return 'bg-red-500/20 text-red-500 border-red-500';
      case 'resolved': return 'bg-green-500/20 text-green-500 border-green-500';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-admin admin-theme">
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="sticky top-0 z-50 bg-primary border-b border-white/10 shadow-large"
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
                <p className="text-sm text-white/90 font-semibold">Campus Office Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant={activeView === 'reports' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveView('reports')}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Reports
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant={activeView === 'stats' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveView('stats')}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Statistics
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" size="icon" onClick={() => navigate('/')}>
                  <Home className="h-5 w-5" />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {activeView === 'stats' ? (
          <Card className="p-6 shadow-large">
            <h2 className="text-xl font-bold mb-4">Statistics Dashboard</h2>
            <p className="text-muted-foreground">Office statistics will be displayed here.</p>
          </Card>
        ) : (
          <>
            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <Card className="p-4 mb-6 shadow-large">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search reports..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="escalated">Escalated</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Filter by severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            </motion.div>

            {/* Reports List */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="space-y-4"
            >
              {filteredReports.length === 0 ? (
                <Card className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No reports match your filters</p>
                </Card>
              ) : (
                filteredReports.map((report, index) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                  >
                    <Card className="p-6 shadow-large hover:shadow-xl transition-all">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold">{report.title}</h3>
                                <Badge variant="outline" className={getSeverityColor(report.severity)}>
                                  {report.severity.toUpperCase()}
                                </Badge>
                                <Badge variant="outline" className={getStatusColor(report.status)}>
                                  {report.status.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{report.description}</p>
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span>ID: {report.id}</span>
                                <span>•</span>
                                <span>Reporter: {report.reporter.name}</span>
                                <span>•</span>
                                <span>Location: {report.location}</span>
                                <span>•</span>
                                <span>Residence: {report.reporter.residence}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 min-w-[140px]">
                          {report.status === 'pending' && (
                            <Button size="sm" className="w-full">Assign Officer</Button>
                          )}
                          {(report.status === 'investigating' || report.status === 'pending') && (
                            <Button size="sm" variant="outline" className="w-full">Escalate</Button>
                          )}
                          {report.status !== 'resolved' && (
                            <Button size="sm" variant="secondary" className="w-full">Mark Resolved</Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </motion.div>

            {/* Footer */}
            <footer className="mt-12 pb-6 text-center text-sm text-muted-foreground">
              <p>Powered By Campus Protection Service</p>
            </footer>
          </>
        )}
      </main>
    </div>
  );
};

export default Office;
