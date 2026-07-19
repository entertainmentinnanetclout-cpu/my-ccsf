import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { AlertCircle, Calendar, Clock, FileText, Gavel, Home, Loader2, RefreshCw, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CaseUpdate {
  id: string;
  incident_id: string;
  title: string;
  description: string | null;
  update_type: string;
  scheduled_date: string | null;
  created_at: string;
  incident?: {
    title: string;
    status: string;
  };
}

const Judiciary = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [caseUpdates, setCaseUpdates] = useState<CaseUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCaseUpdates = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { data: updates, error: updatesError } = await supabase
      .from('case_updates')
      .select('id, incident_id, title, description, update_type, scheduled_date, created_at')
      .order('created_at', { ascending: false });

    if (updatesError) {
      setError('Judiciary case updates could not be loaded.');
      setLoading(false);
      return;
    }

    const incidentIds = [...new Set((updates || []).map((update) => update.incident_id))];
    if (incidentIds.length === 0) {
      setCaseUpdates([]);
      setLoading(false);
      return;
    }

    const { data: incidents, error: incidentsError } = await supabase
      .from('incidents')
      .select('id, title, status')
      .in('id', incidentIds);

    if (incidentsError) {
      setError('Related incident details could not be loaded.');
      setLoading(false);
      return;
    }

    const incidentMap = new Map((incidents || []).map((incident) => [incident.id, incident]));
    setCaseUpdates((updates || []).map((update) => ({
      ...update,
      incident: incidentMap.get(update.incident_id),
    })));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void fetchCaseUpdates();

    const channel = supabase
      .channel(`judiciary-case-updates-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'case_updates' }, () => void fetchCaseUpdates())
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Live judiciary updates are temporarily unavailable.');
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchCaseUpdates, user]);

  const upcomingHearings = useMemo(() => caseUpdates.filter((update) =>
    update.update_type === 'hearing'
    && update.scheduled_date
    && new Date(update.scheduled_date) > new Date()
  ), [caseUpdates]);

  const recentUpdates = useMemo(() => caseUpdates.filter((update) =>
    update.update_type !== 'hearing' || !update.scheduled_date
  ), [caseUpdates]);

  const getUpdateTypeColor = (type: string) => {
    switch (type) {
      case 'hearing': return 'border-primary bg-primary/20 text-primary';
      case 'resolution': return 'border-success bg-success/20 text-success';
      case 'escalation': return 'border-destructive bg-destructive/20 text-destructive';
      default: return 'border-muted bg-muted text-muted-foreground';
    }
  };

  const getUpdateTypeIcon = (type: string) => {
    if (type === 'hearing') return <Gavel className="h-4 w-4" aria-hidden="true" />;
    if (type === 'resolution') return <FileText className="h-4 w-4" aria-hidden="true" />;
    return <Clock className="h-4 w-4" aria-hidden="true" />;
  };

  const staffHome = userRole === 'admin' ? '/admin' : '/security';

  return (
    <div className="min-h-screen bg-background">
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="sticky top-0 z-50 border-b border-white/10 bg-primary shadow-large"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <motion.div className="text-white" whileHover={{ scale: 1.05 }}><InstitutionBrand size="header" /></motion.div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Gavel className="h-5 w-5 shrink-0 text-white" aria-hidden="true" />
                  <h1 className="truncate text-base font-bold text-white sm:text-xl">Campus Community Safety Forum</h1>
                </div>
                <p className="text-xs font-semibold text-white/90 sm:text-sm">Judiciary Portal</p>
              </div>
            </div>
            <Button variant="outline" size="icon" aria-label="Return to staff portal" onClick={() => navigate(staffHome)}>
              <Home className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-6">
        {!user ? (
          <Card className="p-8 text-center">
            <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
            <h2 className="mb-2 font-semibold">Sign In Required</h2>
            <p className="mb-4 text-muted-foreground">Sign in with an authorised CCSF staff account.</p>
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          </Card>
        ) : loading ? (
          <div className="flex items-center justify-center py-12" role="status" aria-label="Loading judiciary case updates">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          </div>
        ) : error ? (
          <Card className="p-8 text-center" role="alert">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" aria-hidden="true" />
            <h2 className="font-semibold">Judiciary portal unavailable</h2>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={() => void fetchCaseUpdates()}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
            </Button>
          </Card>
        ) : (
          <Tabs defaultValue="updates" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="updates" className="flex items-center gap-2"><FileText className="h-4 w-4" aria-hidden="true" />Case Updates</TabsTrigger>
              <TabsTrigger value="hearings" className="flex items-center gap-2"><Calendar className="h-4 w-4" aria-hidden="true" />Scheduled Hearings{upcomingHearings.length > 0 && <Badge variant="destructive" className="ml-1">{upcomingHearings.length}</Badge>}</TabsTrigger>
            </TabsList>

            <TabsContent value="updates" className="space-y-4">
              {recentUpdates.length === 0 ? (
                <Card className="p-8 text-center"><AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" /><h2 className="mb-2 font-semibold">No Case Updates</h2><p className="text-muted-foreground">No judiciary updates are currently available within your authorised campus scope.</p></Card>
              ) : recentUpdates.map((update, index) => (
                <motion.div key={update.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card className="shadow-large">
                    <CardHeader className="pb-2"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-2">{getUpdateTypeIcon(update.update_type)}<CardTitle className="truncate text-base">{update.title}</CardTitle></div><Badge variant="outline" className={getUpdateTypeColor(update.update_type)}>{update.update_type.toUpperCase()}</Badge></div></CardHeader>
                    <CardContent>{update.incident && <p className="mb-2 text-sm text-primary">Re: {update.incident.title}</p>}{update.description && <p className="mb-3 whitespace-pre-wrap text-sm text-muted-foreground">{update.description}</p>}<div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3 w-3" aria-hidden="true" />{format(new Date(update.created_at), 'MMM d, yyyy h:mm a')}</div></CardContent>
                  </Card>
                </motion.div>
              ))}
            </TabsContent>

            <TabsContent value="hearings" className="space-y-4">
              {upcomingHearings.length === 0 ? (
                <Card className="p-8 text-center"><Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" /><h2 className="mb-2 font-semibold">No Scheduled Hearings</h2><p className="text-muted-foreground">No upcoming hearings are currently scheduled within your authorised campus scope.</p></Card>
              ) : upcomingHearings.map((hearing, index) => (
                <motion.div key={hearing.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card className="border-l-4 border-l-primary shadow-large">
                    <CardHeader className="pb-2"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><Gavel className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><CardTitle className="truncate text-base">{hearing.title}</CardTitle></div><Badge className="bg-primary">HEARING</Badge></div></CardHeader>
                    <CardContent>{hearing.incident && <p className="mb-2 text-sm text-primary">Case: {hearing.incident.title}</p>}{hearing.description && <p className="mb-3 whitespace-pre-wrap text-sm text-muted-foreground">{hearing.description}</p>}<div className="flex items-center gap-4 rounded-lg bg-muted/50 p-3"><Calendar className="h-5 w-5 text-primary" aria-hidden="true" /><div><p className="font-semibold">{format(new Date(hearing.scheduled_date!), 'EEEE, MMMM d, yyyy')}</p><p className="text-sm text-muted-foreground">{format(new Date(hearing.scheduled_date!), 'h:mm a')}</p></div></div></CardContent>
                  </Card>
                </motion.div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Judiciary;
