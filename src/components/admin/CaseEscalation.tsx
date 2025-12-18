import React, { useState, useMemo } from 'react';
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
  User,
  Calendar,
  Siren,
  Scale,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

type PoliceService = 'saps' | 'metro_police';

interface EscalationData {
  caseId: string;
  policeService: PoliceService;
  priority: 'low' | 'medium' | 'high' | 'critical';
  contactOfficer: string;
  contactPhone: string;
  referenceNumber?: string;
  additionalNotes: string;
  escalatedAt: string;
  status: 'pending' | 'sent' | 'acknowledged' | 'in_progress' | 'resolved';
}

const POLICE_SERVICES = [
  { 
    id: 'saps' as PoliceService, 
    name: 'South African Police Service (SAPS)', 
    icon: Shield,
    description: 'National police force for serious crimes',
    color: 'bg-blue-500'
  },
  { 
    id: 'metro_police' as PoliceService, 
    name: 'Metro Police', 
    icon: Building2,
    description: 'Municipal police for local incidents',
    color: 'bg-green-500'
  }
];

const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-slate-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
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
  
  // Escalation form state
  const [escalationForm, setEscalationForm] = useState({
    policeService: '' as PoliceService | '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    contactOfficer: '',
    contactPhone: '',
    referenceNumber: '',
    additionalNotes: ''
  });

  // Mock escalation history - in future this would come from Supabase
  const [escalationHistory, setEscalationHistory] = useState<EscalationData[]>([]);

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

  const handleOpenEscalate = (caseItem: typeof cases[0]) => {
    setSelectedCase(caseItem);
    setEscalationForm({
      policeService: '',
      priority: caseItem.category.includes('Murder') || caseItem.category.includes('Rape') ? 'critical' : 'high',
      contactOfficer: '',
      contactPhone: '',
      referenceNumber: '',
      additionalNotes: ''
    });
    setIsEscalateDialogOpen(true);
  };

  const handleSubmitEscalation = async () => {
    if (!selectedCase || !escalationForm.policeService) {
      toast.error('Please select a police service');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create escalation record (future: this will call the SAPS API)
      const escalation: EscalationData = {
        caseId: selectedCase.id,
        policeService: escalationForm.policeService,
        priority: escalationForm.priority,
        contactOfficer: escalationForm.contactOfficer,
        contactPhone: escalationForm.contactPhone,
        referenceNumber: escalationForm.referenceNumber || `ESC-${Date.now()}`,
        additionalNotes: escalationForm.additionalNotes,
        escalatedAt: new Date().toISOString(),
        status: 'pending'
      };

      // Log the escalation action
      if (user) {
        await supabase.from('admin_logs').insert({
          admin_id: user.id,
          incident_id: selectedCase.id,
          action: 'case_escalated',
          details: {
            police_service: escalation.policeService,
            priority: escalation.priority,
            reference_number: escalation.referenceNumber
          }
        });
      }

      // Add to local history
      setEscalationHistory(prev => [escalation, ...prev]);
      
      toast.success(
        `Case escalated to ${escalation.policeService === 'saps' ? 'SAPS' : 'Metro Police'}`,
        { description: `Reference: ${escalation.referenceNumber}` }
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
      <Badge className={`${level?.color} text-white`}>
        {level?.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      sent: 'bg-blue-500',
      acknowledged: 'bg-purple-500',
      in_progress: 'bg-orange-500',
      resolved: 'bg-green-500'
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
            Escalate serious incidents to SAPS or Metro Police
          </p>
        </div>
        <Button variant="outline" onClick={refreshCases}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Cases
        </Button>
      </motion.div>

      {/* Police Service Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {POLICE_SERVICES.map((service) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
          >
            <Card className="border-2 border-dashed hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-full ${service.color}`}>
                  <service.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{service.name}</h3>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  API Ready
                </Badge>
              </CardContent>
            </Card>
          </motion.div>
        ))}
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
            Escalation History
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
                  escalatableCases.map((caseItem, index) => (
                    <motion.div
                      key={caseItem.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="hover:shadow-md transition-shadow">
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
                                <span className="flex items-center gap-1">
                                  <Badge variant="destructive" className="text-xs">
                                    {caseItem.category}
                                  </Badge>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(caseItem.created_at), 'dd MMM yyyy')}
                                </span>
                                {caseItem.location_description && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {caseItem.location_description}
                                  </span>
                                )}
                                <Badge variant="outline" className="capitalize">
                                  {caseItem.status}
                                </Badge>
                              </div>
                            </div>
                            <Button 
                              onClick={() => handleOpenEscalate(caseItem)}
                              className="shrink-0"
                              variant="default"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Escalate
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
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
                Track the status of escalated cases
              </CardDescription>
            </CardHeader>
            <CardContent>
              {escalationHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No escalations recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {escalationHistory.map((escalation, index) => (
                    <motion.div
                      key={`${escalation.caseId}-${index}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <Card className="bg-muted/50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="font-medium">
                                {escalation.policeService === 'saps' ? 'SAPS' : 'Metro Police'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Ref: {escalation.referenceNumber}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(escalation.escalatedAt), 'dd MMM yyyy HH:mm')}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {getPriorityBadge(escalation.priority)}
                              {getStatusBadge(escalation.status)}
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
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Police Service Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Select Police Service *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {POLICE_SERVICES.map((service) => (
                  <motion.button
                    key={service.id}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setEscalationForm(prev => ({ ...prev, policeService: service.id }))}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      escalationForm.policeService === service.id 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${service.color}`}>
                        <service.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground">{service.description}</p>
                      </div>
                      {escalationForm.policeService === service.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Priority Level */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority Level *</Label>
              <Select 
                value={escalationForm.priority} 
                onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => 
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

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactOfficer" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact Officer
                </Label>
                <Input
                  id="contactOfficer"
                  placeholder="Officer name (optional)"
                  value={escalationForm.contactOfficer}
                  onChange={(e) => setEscalationForm(prev => ({ ...prev, contactOfficer: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contact Phone
                </Label>
                <Input
                  id="contactPhone"
                  placeholder="Phone number (optional)"
                  value={escalationForm.contactPhone}
                  onChange={(e) => setEscalationForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                />
              </div>
            </div>

            {/* Reference Number */}
            <div className="space-y-2">
              <Label htmlFor="referenceNumber" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                External Reference Number
              </Label>
              <Input
                id="referenceNumber"
                placeholder="Police case reference (auto-generated if empty)"
                value={escalationForm.referenceNumber}
                onChange={(e) => setEscalationForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
              />
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="additionalNotes">Additional Notes</Label>
              <Textarea
                id="additionalNotes"
                placeholder="Any additional information for the police..."
                rows={4}
                value={escalationForm.additionalNotes}
                onChange={(e) => setEscalationForm(prev => ({ ...prev, additionalNotes: e.target.value }))}
              />
            </div>

            {/* API Integration Notice */}
            <Card className="bg-muted/50 border-dashed">
              <CardContent className="p-4 flex items-start gap-3">
                <ExternalLink className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">MySAPS API Integration</p>
                  <p className="text-xs text-muted-foreground">
                    This escalation will be recorded locally. Once the MySAPS API is integrated, 
                    cases will be automatically submitted to the police system.
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
              disabled={!escalationForm.policeService || isSubmitting}
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
