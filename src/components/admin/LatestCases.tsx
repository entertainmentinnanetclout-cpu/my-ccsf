import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Search, Filter, RefreshCw, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { Database } from '@/integrations/supabase/types';

type Incident = Database['public']['Tables']['incidents']['Row'];

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

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  assigned: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  resolved: 'bg-green-500/20 text-green-600 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-600 border-red-500/30',
};

export const LatestCases = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const fetchIncidents = async () => {
    setLoading(true);
    let query = supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter as Database['public']['Enums']['incident_status']);
    }

    const { data, error } = await query;

    if (!error && data) {
      setIncidents(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter]);

  const filteredIncidents = incidents.filter((incident) => {
    const searchLower = search.toLowerCase();
    return (
      incident.id.toLowerCase().includes(searchLower) ||
      incident.title.toLowerCase().includes(searchLower) ||
      incident.category.toLowerCase().includes(searchLower) ||
      (incident.campus && campusDisplayNames[incident.campus]?.toLowerCase().includes(searchLower)) ||
      (incident.location_description?.toLowerCase().includes(searchLower))
    );
  });

  return (
    <motion.div
      className="bg-card p-4 rounded-lg shadow-large"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold text-foreground">Reported Incidents</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {filteredIncidents.length} cases
          </Badge>
          <Button variant="ghost" size="icon" onClick={fetchIncidents} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, title, category, campus..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
            <tr>
              <th scope="col" className="px-4 py-3">ID</th>
              <th scope="col" className="px-4 py-3">Title</th>
              <th scope="col" className="px-4 py-3">Category</th>
              <th scope="col" className="px-4 py-3">Campus</th>
              <th scope="col" className="px-4 py-3">Date</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Loading incidents...
                </td>
              </tr>
            ) : filteredIncidents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No incidents found
                </td>
              </tr>
            ) : (
              filteredIncidents.map((incident) => (
                <motion.tr
                  key={incident.id}
                  className="bg-card border-b hover:bg-muted/30 transition-colors"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    {incident.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3 max-w-[150px] truncate" title={incident.title}>
                    {incident.title}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {incident.category}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {incident.campus ? campusDisplayNames[incident.campus] || incident.campus : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {format(new Date(incident.created_at), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs capitalize ${statusColors[incident.status]}`}>
                      {incident.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => setSelectedIncident(incident)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg bg-background">
                        <DialogHeader>
                          <DialogTitle>{incident.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Category</p>
                              <p className="font-medium">{incident.category}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Status</p>
                              <Badge variant="outline" className={`capitalize ${statusColors[incident.status]}`}>
                                {incident.status}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Campus</p>
                              <p className="font-medium">
                                {incident.campus ? campusDisplayNames[incident.campus] || incident.campus : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Reported</p>
                              <p className="font-medium">
                                {format(new Date(incident.created_at), 'PPp')}
                              </p>
                            </div>
                          </div>
                          {incident.location_description && (
                            <div>
                              <p className="text-muted-foreground text-sm">Location</p>
                              <p className="text-sm">{incident.location_description}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-muted-foreground text-sm">Description</p>
                            <p className="text-sm whitespace-pre-wrap">{incident.description}</p>
                          </div>
                          {incident.resolution_notes && (
                            <div>
                              <p className="text-muted-foreground text-sm">Resolution Notes</p>
                              <p className="text-sm whitespace-pre-wrap">{incident.resolution_notes}</p>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
