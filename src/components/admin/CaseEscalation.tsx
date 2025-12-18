import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useCases } from '@/contexts/CasesContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Shield, 
  AlertTriangle, 
  Send, 
  Search, 
  Filter, 
  Building2, 
  Phone, 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  MapPin,
  Calendar,
  Siren,
  Scale,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

type PoliceService = 'saps' | 'metro_police';

interface PoliceStation {
  id: string;
  campus: string;
  station_name: string;
  station_type: PoliceService;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
}

interface EscalationRecord {
  id: string;
  incident_id: string;
  escalated_by: string;
  agency_type: PoliceService;
  police_station: string;
  police_station_address: string | null;
  police_station_phone: string | null;
  cas_number: string | null;
  priority: string;
  status: string;
  notes: string | null;
  created_at: string;
  incidents?: {
    title: string;
    category: string;
    campus: string | null;
  };
}

const PRIORITY_LEVELS = [
  { value: 'normal', label: 'Normal', color: 'bg-slate-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' }
];

const ESCALATABLE_CATEGORIES = [
  'Rape', 'Sexual assault', 'Gbv', 'Murder', 'Attempted murder', 
  'Assault GBH', 'Robbery', 'Armed robbery', 'Arson', 'Public violence'
];

export const CaseEscalation: React.FC = () => {
  const { cases, loading, refreshCases } = useCases();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCase, setSelectedCase] = useState<typeof cases[0] | null>(null);
  const [isEscalateDialogOpen, setIsEscalateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Police stations and escalation history from DB
  const [policeStations, setPoliceStations] = useState<PoliceStation[]>([]);
  const [escalationHistory, setEscalationHistory] = useState<EscalationRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // Escalation form state
  const [escalationForm, setEscalationForm] = useState({
    policeService: '' as PoliceService | '',
    policeStationId: '',
    priority: 'urgent' as 'normal' | 'urgent' | 'critical',
    casNumber: '',
    notes: ''
  });

  // Fetch police stations and escalation history
  useEffect(() => {
    const fetchData = async () => {
      setLoadingHistory(true);
      try {
        // Fetch all police stations
        const { data: stations } = await supabase
          .from('campus_police_stations')
          .select('*')
          .order('is_primary', { ascending: false });
        
        if (stations) {
          setPoliceStations(stations as PoliceStation[]);
        }

        // Fetch escalation history
        const { data: escalations } = await supabase
          .from('case_escalations')
          .select(`
            *,
            incidents (title, category, campus)
          `)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (escalations) {
          setEscalationHistory(escalations as EscalationRecord[]);
        }
      } catch (error) {
        console.error('Error fetching escalation data:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchData();
  }, []);

  // Get stations for the selected case's campus
  const availableStations = useMemo(() => {
    if (!selectedCase?.campus) return policeStations;
    return policeStations.filter(
      s => s.campus === selectedCase.campus || s.campus === 'all'
    );
  }, [selectedCase, policeStations]);

  // Filter stations by selected service type
  const filteredStations = useMemo(() => {
    if (!escalationForm.policeService) return availableStations;
    return availableStations.filter(s => s.station_type === escalationForm.policeService);
  }, [availableStations, escalationForm.policeService]);

  // Auto-select primary station when service is selected
  useEffect(() => {
    if (escalationForm.policeService && filteredStations.length > 0) {
      const primaryStation = filteredStations.find(s => s.is_primary) || filteredStations[0];
      setEscalationForm(prev => ({ ...prev, policeStationId: primaryStation.id }));
    }
  }, [escalationForm.policeService, filteredStations]);

  // Filter cases that are eligible for escalation
  const escalatableCases = useMemo(() => {
    return cases.filter(c => {
      const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           c.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const isEscalatable = ESCALATABLE_CATEGORIES.includes(c.category);
      
      return matchesSearch && matchesCategory && matchesStatus && isEscalatable;
    });
  }, [cases, searchQuery, categoryFilter, statusFilter]);

  // Check if case is already escalated
  const isAlreadyEscalated = (caseId: string) => {
    return escalationHistory.some(e => e.incident_id === caseId && e.status !== 'resolved' && e.status !== 'rejected');
  };

  const handleOpenEscalate = (caseItem: typeof cases[0]) => {
    setSelectedCase(caseItem);
    const isCritical = caseItem.category.includes('Murder') || caseItem.category.includes('Rape');
    setEscalationForm({
      policeService: '',
      policeStationId: '',
      priority: isCritical ? 'critical' : 'urgent',
      casNumber: '',
      notes: ''
    });
    setIsEscalateDialogOpen(true);
  };

  const handleSubmitEscalation = async () => {
    if (!selectedCase || !escalationForm.policeService || !escalationForm.policeStationId || !user) {
      toast.error('Please select a police service and station');
      return;
    }

    const selectedStation = policeStations.find(s => s.id === escalationForm.policeStationId);
    if (!selectedStation) {
      toast.error('Invalid police station selected');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Insert escalation record
      const { data: escalation, error } = await supabase
        .from('case_escalations')
        .insert({
          incident_id: selectedCase.id,
          escalated_by: user.id,
          agency_type: escalationForm.policeService,
          police_station: selectedStation.station_name,
          police_station_address: selectedStation.address,
          police_station_phone: selectedStation.phone,
          cas_number: escalationForm.casNumber || null,
          priority: escalationForm.priority,
          status: 'pending',
          notes: escalationForm.notes || null
        })
        .select(`
          *,
          incidents (title, category, campus)
        `)
        .single();

      if (error) throw error;

      // Log the escalation action
      await supabase.from('admin_logs').insert({
        admin_id: user.id,
        incident_id: selectedCase.id,
        action: 'case_escalated',
        details: {
          police_service: escalationForm.policeService,
          police_station: selectedStation.station_name,
          priority: escalationForm.priority,
          escalation_id: escalation?.id
        }
      });

      // Add to local history
      if (escalation) {
        setEscalationHistory(prev => [escalation as EscalationRecord, ...prev]);
      }
      
      toast.success(
        `Case escalated to ${selectedStation.station_name}`,
        { description: `Priority: ${escalationForm.priority.toUpperCase()}` }
      );
      
      setIsEscalateDialogOpen(false);
      setSelectedCase(null);
    } catch (error) {
      console.error('Error escalating case:', error);
      toast.error('Failed to escalate case');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const level = PRIORITY_LEVELS.find(p => p.value === priority);
    return (
      <Badge className={`${level?.color || 'bg-slate-500'} text-white`}>
        {level?.label || priority}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      submitted: 'bg-blue-500',
      acknowledged: 'bg-purple-500',
      in_progress: 'bg-orange-500',
      resolved: 'bg-green-500',
      rejected: 'bg-red-500'
    };
    return (
      <Badge className={`${colors[status] || 'bg-slate-500'} text-white capitalize`}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Siren className="h-7 w-7 text-destructive animate-pulse" />
            Case Escalation Center
          </h2>
          <p className="text-muted-foreground mt-1">
            Escalate serious incidents to nearest SAPS or Metro Police station
          </p>
        </div>
        <Button variant="outline" onClick={refreshCases}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Cases
        </Button>
      </motion.div>

      {/* Police Service Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="border-2 border-dashed hover:border-primary/50 transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">South African Police Service (SAPS)</h3>
                <p className="text-sm text-muted-foreground">National police force - MySAPS API ready</p>
              </div>
              <Badge variant="outline" className="text-xs">
                {policeStations.filter(s => s.station_type === 'saps').length} Stations
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Card className="border-2 border-dashed hover:border-primary/50 transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Metro Police</h3>
                <p className="text-sm text-muted-foreground">Municipal police for local incidents</p>
              </div>
              <Badge variant="outline" className="text-xs">
                {policeStations.filter(s => s.station_type === 'metro_police').length} Stations
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="cases" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cases" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Escalatable Cases
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Escalation History ({escalationHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search cases..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {ESCALATABLE_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Cases List */}
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              <AnimatePresence>
                {escalatableCases.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No escalatable cases found</p>
                    </CardContent>
                  </Card>
                ) : (
                  escalatableCases.map((caseItem, index) => {
                    const alreadyEscalated = isAlreadyEscalated(caseItem.id);
                    return (
                      <motion.div
                        key={caseItem.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className={`hover:shadow-md transition-shadow ${alreadyEscalated ? 'opacity-60' : ''}`}>
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                                  <div>
                                    <h4 className="font-semibold line-clamp-1">{caseItem.title}</h4>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {caseItem.description}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                  <Badge variant="destructive" className="text-xs">
                                    {caseItem.category}
                                  </Badge>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(caseItem.created_at), 'dd MMM yyyy')}
                                  </span>
                                  {caseItem.campus && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {caseItem.campus.replace(/_/g, ' ')}
                                    </span>
                                  )}
                                  <Badge variant="outline" className="capitalize">
                                    {caseItem.status}
                                  </Badge>
                                  {alreadyEscalated && (
                                    <Badge variant="secondary">Already Escalated</Badge>
                                  )}
                                </div>
                              </div>
                              <Button 
                                onClick={() => handleOpenEscalate(caseItem)}
                                className="shrink-0"
                                variant={alreadyEscalated ? "outline" : "default"}
                                disabled={alreadyEscalated}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                {alreadyEscalated ? 'Escalated' : 'Escalate'}
                                {!alreadyEscalated && <ChevronRight className="h-4 w-4 ml-1" />}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Escalations
              </CardTitle>
              <CardDescription>
                Track the status of cases escalated to police
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : escalationHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No escalations recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {escalationHistory.map((escalation, index) => (
                    <motion.div
                      key={escalation.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="bg-muted/50">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <p className="font-medium">{escalation.incidents?.title || 'Unknown Case'}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-2">
                                {escalation.agency_type === 'saps' ? (
                                  <Shield className="h-4 w-4" />
                                ) : (
                                  <Building2 className="h-4 w-4" />
                                )}
                                {escalation.police_station}
                              </p>
                              {escalation.police_station_phone && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {escalation.police_station_phone}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(escalation.created_at), 'dd MMM yyyy HH:mm')}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {getPriorityBadge(escalation.priority)}
                              {getStatusBadge(escalation.status)}
                              {escalation.cas_number && (
                                <Badge variant="outline" className="text-xs">
                                  CAS: {escalation.cas_number}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Escalation Dialog */}
      <Dialog open={isEscalateDialogOpen} onOpenChange={setIsEscalateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Siren className="h-5 w-5 text-destructive" />
              Escalate Case to Police
            </DialogTitle>
            <DialogDescription>
              {selectedCase && (
                <span className="text-sm">
                  Escalating: <strong>{selectedCase.title}</strong>
                  {selectedCase.campus && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({selectedCase.campus.replace(/_/g, ' ')})
                    </span>
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Police Service Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Select Police Service *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setEscalationForm(prev => ({ ...prev, policeService: 'saps', policeStationId: '' }))}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    escalationForm.policeService === 'saps' 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-500">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">SAPS</p>
                      <p className="text-xs text-muted-foreground">South African Police Service</p>
                    </div>
                    {escalationForm.policeService === 'saps' && (
                      <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />
                    )}
                  </div>
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setEscalationForm(prev => ({ ...prev, policeService: 'metro_police', policeStationId: '' }))}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    escalationForm.policeService === 'metro_police' 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-green-500">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">Metro Police</p>
                      <p className="text-xs text-muted-foreground">Municipal Police</p>
                    </div>
                    {escalationForm.policeService === 'metro_police' && (
                      <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />
                    )}
                  </div>
                </motion.button>
              </div>
            </div>

            {/* Police Station Selection */}
            {escalationForm.policeService && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <Label>Nearest Police Station *</Label>
                <Select 
                  value={escalationForm.policeStationId} 
                  onValueChange={(value) => setEscalationForm(prev => ({ ...prev, policeStationId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select station" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStations.map(station => (
                      <SelectItem key={station.id} value={station.id}>
                        <div className="flex items-center gap-2">
                          <span>{station.station_name}</span>
                          {station.is_primary && (
                            <Badge variant="secondary" className="text-xs">Primary</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {escalationForm.policeStationId && (
                  <div className="text-sm text-muted-foreground mt-2 p-3 bg-muted rounded-lg">
                    {(() => {
                      const station = policeStations.find(s => s.id === escalationForm.policeStationId);
                      return station ? (
                        <div className="space-y-1">
                          {station.address && (
                            <p className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {station.address}
                            </p>
                          )}
                          {station.phone && (
                            <p className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              {station.phone}
                            </p>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </motion.div>
            )}

            {/* Priority Level */}
            <div className="space-y-2">
              <Label>Priority Level *</Label>
              <Select 
                value={escalationForm.priority} 
                onValueChange={(value: 'normal' | 'urgent' | 'critical') => 
                  setEscalationForm(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_LEVELS.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${level.color}`} />
                        {level.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* CAS Number */}
            <div className="space-y-2">
              <Label htmlFor="casNumber" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                CAS Number (Optional)
              </Label>
              <Input
                id="casNumber"
                placeholder="Enter if you have a police case number"
                value={escalationForm.casNumber}
                onChange={(e) => setEscalationForm(prev => ({ ...prev, casNumber: e.target.value }))}
              />
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information for the police..."
                rows={3}
                value={escalationForm.notes}
                onChange={(e) => setEscalationForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            {/* API Integration Notice */}
            <Card className="bg-muted/50 border-dashed">
              <CardContent className="p-4 flex items-start gap-3">
                <ExternalLink className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">MySAPS API Integration</p>
                  <p className="text-xs text-muted-foreground">
                    This escalation will be recorded in the system. Once the MySAPS API is integrated, 
                    cases will be automatically submitted to SAPS systems.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEscalateDialogOpen(false)}
              disabled={isSubmitting}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitEscalation}
              disabled={!escalationForm.policeService || !escalationForm.policeStationId || isSubmitting}
            >
              {isSubmitting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Escalate Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
