import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { Search, AlertCircle, BarChart3, FileText, Loader2, MapPin, Clock, User, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type Incident = Database['public']['Tables']['incidents']['Row'];
type IncidentStatus = Database['public']['Enums']['incident_status'];

const CAMPUSES = [
  { value: 'all', label: 'All Campuses' },
  { value: 'pretoria_west_main', label: 'Pretoria West (Main)' },
  { value: 'arcadia', label: 'Arcadia Campus' },
  { value: 'arts', label: 'Arts Campus' },
  { value: 'giyani', label: 'Giyani Campus' },
  { value: 'mbombela', label: 'Mbombela Campus' },
  { value: 'polokwane', label: 'Polokwane Campus' },
  { value: 'garankuwa', label: 'Ga-Rankuwa Campus' },
  { value: 'soshanguve_south', label: 'Soshanguve South' },
  { value: 'soshanguve_north', label: 'Soshanguve North' },
  { value: 'emalahleni', label: 'eMalahleni Campus' },
];

export const OfficeView = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'reports' | 'stats'>('reports');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncidents();

    const channel = supabase
      .channel('office-embed-incidents')
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
    const matchesCampus = campusFilter === 'all' || incident.campus === campusFilter;
    return matchesSearch && matchesStatus && matchesCategory && matchesCampus;
  });

  const getStats = (data: Incident[]) => ({
    total: data.length,
    pending: data.filter(i => i.status === 'pending').length,
    investigating: data.filter(i => i.status === 'assigned').length,
    resolved: data.filter(i => i.status === 'resolved').length,
  });

  const displayedIncidents = filteredIncidents;
  const stats = getStats(displayedIncidents);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Theft': 'bg-destructive/20 text-destructive border-destructive',
      'Robbery': 'bg-destructive/20 text-destructive border-destructive',
      'Armed robbery': 'bg-destructive/20 text-destructive border-destructive',
      'Assault common': 'bg-destructive/20 text-destructive border-destructive',
      'Assault GBH': 'bg-destructive/20 text-destructive border-destructive',
      'Murder': 'bg-destructive/20 text-destructive border-destructive',
      'Vandalism': 'bg-warning/20 text-warning-foreground border-warning',
      'Trespassing': 'bg-primary/20 text-primary border-primary',
    };
    return colors[category] || 'bg-muted text-muted-foreground border-muted';
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

  const getCampusLabel = (campus: string | null) => {
    if (!campus) return 'Unknown';
    return CAMPUSES.find(c => c.value === campus)?.label || campus.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-6">
      {/* Header bar with title + tab toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Campus Office Overview
          </h2>
          <p className="text-sm text-muted-foreground">All campuses — Super Admin view</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'reports' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('reports')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Reports
          </Button>
          <Button
            variant={activeTab === 'stats' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('stats')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Statistics
          </Button>
        </div>
      </div>

      {activeTab === 'stats' ? (
        <div className="space-y-6">
          {/* Overall stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-6 shadow-large">
              <h3 className="text-sm text-muted-foreground">Total Reports</h3>
              <p className="text-3xl font-bold text-primary">{getStats(incidents).total}</p>
            </Card>
            <Card className="p-6 shadow-large">
              <h3 className="text-sm text-muted-foreground">Pending</h3>
              <p className="text-3xl font-bold text-warning">{getStats(incidents).pending}</p>
            </Card>
            <Card className="p-6 shadow-large">
              <h3 className="text-sm text-muted-foreground">Investigating</h3>
              <p className="text-3xl font-bold text-primary">{getStats(incidents).investigating}</p>
            </Card>
            <Card className="p-6 shadow-large">
              <h3 className="text-sm text-muted-foreground">Resolved</h3>
              <p className="text-3xl font-bold text-green-600">{getStats(incidents).resolved}</p>
            </Card>
          </div>

          {/* Per-campus breakdown */}
          <h3 className="text-lg font-semibold">Per-Campus Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CAMPUSES.filter(c => c.value !== 'all').map(campus => {
              const campusIncidents = incidents.filter(i => i.campus === campus.value);
              const campusStats = getStats(campusIncidents);
              if (campusStats.total === 0) return null;
              return (
                <Card key={campus.value} className="p-4 shadow-large">
                  <h4 className="font-semibold text-sm mb-2">{campus.label}</h4>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <p className="text-lg font-bold text-primary">{campusStats.total}</p>
                      <p className="text-muted-foreground">Total</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-warning">{campusStats.pending}</p>
                      <p className="text-muted-foreground">Pending</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-primary">{campusStats.investigating}</p>
                      <p className="text-muted-foreground">Active</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600">{campusStats.resolved}</p>
                      <p className="text-muted-foreground">Resolved</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Filters */}
          <Card className="p-4 shadow-large">
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
              <Select value={campusFilter} onValueChange={setCampusFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter by campus" />
                </SelectTrigger>
                <SelectContent>
                  {CAMPUSES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            </div>
          </Card>

          {/* Summary badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-sm">Total: {stats.total}</Badge>
            <Badge variant="outline" className="text-sm bg-warning/10">Pending: {stats.pending}</Badge>
            <Badge variant="outline" className="text-sm bg-primary/10">Active: {stats.investigating}</Badge>
            <Badge variant="outline" className="text-sm bg-green-500/10">Resolved: {stats.resolved}</Badge>
          </div>

          {/* Reports List */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : displayedIncidents.length === 0 ? (
              <Card className="p-8 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No reports match your filters</p>
              </Card>
            ) : (
              displayedIncidents.map((incident, index) => (
                <motion.div
                  key={incident.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.5), duration: 0.3 }}
                >
                  <Card className="p-6 shadow-large hover:shadow-xl transition-all">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold">{incident.title}</h3>
                          <Badge variant="outline" className={getCategoryColor(incident.category)}>
                            {incident.category}
                          </Badge>
                          <Badge variant="outline" className={getStatusColor(incident.status)}>
                            {incident.status.toUpperCase()}
                          </Badge>
                          {incident.campus && (
                            <Badge variant="secondary" className="text-xs">
                              <Building2 className="h-3 w-3 mr-1" />
                              {getCampusLabel(incident.campus)}
                            </Badge>
                          )}
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
          </div>
        </>
      )}
    </div>
  );
};
