import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Shield, Home, Search, AlertCircle, BarChart3, FileText, Loader2, MapPin, Clock, User } from 'lucide-react';
import tutLogo from '@/assets/tut-logo.png';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type Incident = Database['public']['Tables']['incidents']['Row'];
type IncidentStatus = Database['public']['Enums']['incident_status'];

const Office = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<'reports' | 'stats'>('reports');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    investigating: 0,
    resolved: 0,
  });

  useEffect(() => {
    fetchIncidents();
    
    // Real-time subscription
    const channel = supabase
      .channel('office-incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        fetchIncidents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchIncidents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error fetching incidents', description: error.message, variant: 'destructive' });
    } else if (data) {
      setIncidents(data);
      setStats({
        total: data.length,
        pending: data.filter(i => i.status === 'pending').length,
        investigating: data.filter(i => i.status === 'assigned').length,
        resolved: data.filter(i => i.status === 'resolved').length,
      });
    }
    setLoading(false);
  };

  const updateIncidentStatus = async (id: string, status: IncidentStatus) => {
    const { error } = await supabase
      .from('incidents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error updating status', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Status updated successfully' });
      fetchIncidents();
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || incident.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'theft': return 'bg-destructive/20 text-destructive border-destructive';
      case 'assault': return 'bg-destructive/20 text-destructive border-destructive';
      case 'vandalism': return 'bg-warning/20 text-warning-foreground border-warning';
      case 'harassment': return 'bg-warning/20 text-warning-foreground border-warning';
      case 'suspicious_activity': return 'bg-primary/20 text-primary border-primary';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/20 text-warning-foreground border-warning';
      case 'assigned': return 'bg-primary/20 text-primary border-primary';
      case 'rejected': return 'bg-destructive/20 text-destructive border-destructive';
      case 'resolved': return 'bg-success/20 text-success border-success';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <Card className="p-6 shadow-large">
              <h3 className="text-sm text-muted-foreground">Total Reports</h3>
              <p className="text-3xl font-bold text-primary">{stats.total}</p>
            </Card>
            <Card className="p-6 shadow-large">
              <h3 className="text-sm text-muted-foreground">Pending</h3>
              <p className="text-3xl font-bold text-warning">{stats.pending}</p>
            </Card>
            <Card className="p-6 shadow-large">
              <h3 className="text-sm text-muted-foreground">Investigating</h3>
              <p className="text-3xl font-bold text-primary">{stats.investigating}</p>
            </Card>
            <Card className="p-6 shadow-large">
              <h3 className="text-sm text-muted-foreground">Resolved</h3>
              <p className="text-3xl font-bold text-success">{stats.resolved}</p>
            </Card>
          </motion.div>
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
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="theft">Theft</SelectItem>
                      <SelectItem value="assault">Assault</SelectItem>
                      <SelectItem value="vandalism">Vandalism</SelectItem>
                      <SelectItem value="harassment">Harassment</SelectItem>
                      <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
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
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredIncidents.length === 0 ? (
                <Card className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No reports match your filters</p>
                </Card>
              ) : (
                filteredIncidents.map((incident, index) => (
                  <motion.div
                    key={incident.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                  >
                    <Card className="p-6 shadow-large hover:shadow-xl transition-all">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <h3 className="text-lg font-semibold">{incident.title}</h3>
                                <Badge variant="outline" className={getCategoryColor(incident.category)}>
                                  {incident.category.replace('_', ' ').toUpperCase()}
                                </Badge>
                                <Badge variant="outline" className={getStatusColor(incident.status)}>
                                  {incident.status.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{incident.description}</p>
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(incident.created_at), 'MMM d, yyyy h:mm a')}
                                </span>
                                {incident.location_description && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {incident.location_description}
                                    </span>
                                  </>
                                )}
                                {incident.campus && (
                                  <>
                                    <span>•</span>
                                    <span>Campus: {incident.campus.replace('_', ' ')}</span>
                                  </>
                                )}
                                {incident.is_anonymous && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      Anonymous
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 min-w-[140px]">
                          {incident.status === 'pending' && (
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => updateIncidentStatus(incident.id, 'assigned')}
                            >
                              Assign
                            </Button>
                          )}
                          {incident.status !== 'resolved' && incident.status !== 'rejected' && (
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              className="w-full"
                              onClick={() => updateIncidentStatus(incident.id, 'resolved')}
                            >
                              Mark Resolved
                            </Button>
                          )}
                          {incident.status === 'pending' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full text-destructive"
                              onClick={() => updateIncidentStatus(incident.id, 'rejected')}
                            >
                              Reject
                            </Button>
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