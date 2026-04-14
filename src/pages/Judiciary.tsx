import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Shield, Home, Gavel, Calendar, Clock, User, FileText, AlertCircle, Loader2 } from 'lucide-react';
import tutLogo from '@/assets/tut-logo.png';
import tutLogoLight from '@/assets/tut_light_theme.png';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useTheme } from 'next-themes';
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
  const { theme } = useTheme();
  const { user } = useAuth();
  const [caseUpdates, setCaseUpdates] = useState<CaseUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCaseUpdates();
    }
  }, [user]);

  const fetchCaseUpdates = async () => {
    setLoading(true);
    
    // Fetch case updates for incidents the user reported
    const { data: updates, error } = await supabase
      .from('case_updates')
      .select(`
        id,
        incident_id,
        title,
        description,
        update_type,
        scheduled_date,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (!error && updates) {
      // Fetch related incidents
      const incidentIds = [...new Set(updates.map(u => u.incident_id))];
      const { data: incidents } = await supabase
        .from('incidents')
        .select('id, title, status, reporter_id')
        .in('id', incidentIds);

      const incidentsMap = new Map(incidents?.map(i => [i.id, i]) || []);
      
      // Filter to only show updates for incidents the user reported
      const userUpdates = updates
        .filter(update => {
          const incident = incidentsMap.get(update.incident_id);
          return incident?.reporter_id === user?.id;
        })
        .map(update => ({
          ...update,
          incident: incidentsMap.get(update.incident_id) as { title: string; status: string } | undefined
        }));

      setCaseUpdates(userUpdates);
    }
    setLoading(false);
  };

  const getUpdateTypeColor = (type: string) => {
    switch (type) {
      case 'hearing': return 'bg-primary/20 text-primary border-primary';
      case 'resolution': return 'bg-success/20 text-success border-success';
      case 'escalation': return 'bg-destructive/20 text-destructive border-destructive';
      case 'note': return 'bg-muted text-muted-foreground border-muted';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getUpdateTypeIcon = (type: string) => {
    switch (type) {
      case 'hearing': return <Gavel className="h-4 w-4" />;
      case 'resolution': return <FileText className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const upcomingHearings = caseUpdates.filter(
    u => u.update_type === 'hearing' && u.scheduled_date && new Date(u.scheduled_date) > new Date()
  );

  const recentUpdates = caseUpdates.filter(u => u.update_type !== 'hearing' || !u.scheduled_date);

  return (
    <div className="min-h-screen bg-background">
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
                src={theme === 'dark' ? tutLogo : tutLogoLight}
                alt="TUT Logo"
                className="h-10 logo-glow"
              />
              <div>
                <div className="flex items-center gap-2">
                  <Gavel className="h-5 w-5 text-white" />
                  <h1 className="text-xl font-bold text-white">Campus Community Safety Forum</h1>
                </div>
                <p className="text-sm text-white/90 font-semibold">Judiciary Portal</p>
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={() => navigate('/')}>
              <Home className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-6">
        {!user ? (
          <Card className="p-8 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Sign In Required</h3>
            <p className="text-muted-foreground mb-4">Please sign in to view your case updates and hearings.</p>
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          </Card>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="updates" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="updates" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Case Updates
              </TabsTrigger>
              <TabsTrigger value="hearings" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Scheduled Hearings
                {upcomingHearings.length > 0 && (
                  <Badge variant="destructive" className="ml-1">{upcomingHearings.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="updates" className="space-y-4">
              {recentUpdates.length === 0 ? (
                <Card className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Case Updates</h3>
                  <p className="text-muted-foreground">
                    There are no updates for your reported incidents yet.
                  </p>
                </Card>
              ) : (
                recentUpdates.map((update, index) => (
                  <motion.div
                    key={update.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="shadow-large">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getUpdateTypeIcon(update.update_type)}
                            <CardTitle className="text-base">{update.title}</CardTitle>
                          </div>
                          <Badge variant="outline" className={getUpdateTypeColor(update.update_type)}>
                            {update.update_type.toUpperCase()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {update.incident && (
                          <p className="text-sm text-primary mb-2">
                            Re: {update.incident.title}
                          </p>
                        )}
                        {update.description && (
                          <p className="text-sm text-muted-foreground mb-3">{update.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(update.created_at), 'MMM d, yyyy h:mm a')}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </TabsContent>

            <TabsContent value="hearings" className="space-y-4">
              {upcomingHearings.length === 0 ? (
                <Card className="p-8 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Scheduled Hearings</h3>
                  <p className="text-muted-foreground">
                    You have no upcoming hearings scheduled.
                  </p>
                </Card>
              ) : (
                upcomingHearings.map((hearing, index) => (
                  <motion.div
                    key={hearing.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="shadow-large border-l-4 border-l-primary">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Gavel className="h-5 w-5 text-primary" />
                            <CardTitle className="text-base">{hearing.title}</CardTitle>
                          </div>
                          <Badge className="bg-primary">HEARING</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {hearing.incident && (
                          <p className="text-sm text-primary mb-2">
                            Case: {hearing.incident.title}
                          </p>
                        )}
                        {hearing.description && (
                          <p className="text-sm text-muted-foreground mb-3">{hearing.description}</p>
                        )}
                        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                          <Calendar className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-semibold">
                              {format(new Date(hearing.scheduled_date!), 'EEEE, MMMM d, yyyy')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(hearing.scheduled_date!), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Judiciary;