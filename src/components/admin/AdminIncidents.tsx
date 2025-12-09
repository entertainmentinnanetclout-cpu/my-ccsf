import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { IncidentDetailsModal } from './IncidentDetailsModal';
import { AlertTriangle, MapPin, Clock, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EMERGENCY_CATEGORIES = [
  'Rape', 'Sexual assault', 'Gbv', 'Murder', 'Attempted murder',
  'Armed robbery', 'Assault GBH', 'Public violence'
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' }
];

export const AdminIncidents = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<any[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchIncidents();
    const channel = supabase
      .channel('admin-incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, fetchIncidents)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    filterIncidents();
  }, [incidents, searchTerm, statusFilter]);

  const fetchIncidents = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });
    setIncidents(data || []);
    setIsLoading(false);
  };

  const filterIncidents = () => {
    let filtered = [...incidents];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === statusFilter);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(i => 
        i.title.toLowerCase().includes(term) ||
        i.description.toLowerCase().includes(term) ||
        i.category.toLowerCase().includes(term) ||
        i.location_description?.toLowerCase().includes(term)
      );
    }
    
    setFilteredIncidents(filtered);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'border-l-amber-500 bg-amber-500/5',
      assigned: 'border-l-blue-500 bg-blue-500/5',
      resolved: 'border-l-emerald-500 bg-emerald-500/5',
      rejected: 'border-l-red-500 bg-red-500/5'
    };
    return colors[status] || '';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
      assigned: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
      resolved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
      rejected: 'bg-red-500/10 text-red-600 border-red-500/30'
    };
    return (
      <Badge variant="outline" className={styles[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const counts = {
    total: incidents.length,
    pending: incidents.filter(i => i.status === 'pending').length,
    assigned: incidents.filter(i => i.status === 'assigned').length,
    resolved: incidents.filter(i => i.status === 'resolved').length
  };

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Cases</p>
            <p className="text-2xl font-bold">{counts.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4">
            <p className="text-sm text-amber-600">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{counts.pending}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4">
            <p className="text-sm text-blue-600">Assigned</p>
            <p className="text-2xl font-bold text-blue-600">{counts.assigned}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="p-4">
            <p className="text-sm text-emerald-600">Resolved</p>
            <p className="text-2xl font-bold text-emerald-600">{counts.resolved}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search incidents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Incidents List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Loading incidents...
            </CardContent>
          </Card>
        ) : filteredIncidents.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'No incidents match your filters' 
                : 'No incidents reported yet'}
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence>
            {filteredIncidents.map((incident, index) => {
              const isEmergency = EMERGENCY_CATEGORIES.includes(incident.category);
              return (
                <motion.div
                  key={incident.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    onClick={() => setSelectedIncidentId(incident.id)} 
                    className={`cursor-pointer hover:shadow-lg transition-all border-l-4 ${getStatusColor(incident.status)} ${isEmergency ? 'ring-1 ring-red-500/30' : ''}`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-base">
                        <div className="flex items-center gap-2">
                          {isEmergency && (
                            <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
                          )}
                          <span className="line-clamp-1">{incident.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {incident.category}
                          </Badge>
                          {getStatusBadge(incident.status)}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {incident.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        {incident.location_description && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="line-clamp-1 max-w-[200px]">{incident.location_description}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {selectedIncidentId && (
        <IncidentDetailsModal
          incidentId={selectedIncidentId}
          isOpen={!!selectedIncidentId}
          onClose={() => setSelectedIncidentId(null)}
        />
      )}
    </>
  );
};
