import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Filter, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { useMasterSync } from '@/contexts/MasterSyncContext';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

const formatCampusName = (campus: string) => {
  return campus
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const EmergencyCases = () => {
  const { incidents, isLoading } = useMasterSync();
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState<string>('all');

  // Filter for active emergency cases (pending or assigned)
  const cases = useMemo(() => {
    return incidents.filter(i => i.status === 'pending' || i.status === 'assigned');
  }, [incidents]);

  // Get unique campuses from cases
  const campuses = useMemo(() => {
    return [...new Set(cases.map(c => c.campus).filter(Boolean))];
  }, [cases]);

  // Filter cases by selected campus
  const filteredCases = useMemo(() => {
    return selectedCampus === 'all' 
      ? cases 
      : cases.filter(c => c.campus === selectedCampus);
  }, [cases, selectedCampus]);

  // Prepare chart data
  const casesByCampus = useMemo(() => {
    return campuses.map(campus => ({
      name: formatCampusName(campus || 'Unknown'),
      value: cases.filter(c => c.campus === campus).length,
    }));
  }, [cases, campuses]);

  const casesByCategory = useMemo(() => {
    return Object.entries(
      cases.reduce((acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));
  }, [cases]);

  const casesByStatus = useMemo(() => [
    { name: 'Pending', value: cases.filter(c => c.status === 'pending').length },
    { name: 'Assigned', value: cases.filter(c => c.status === 'assigned').length },
  ], [cases]);

  if (isLoading) {
    return (
      <motion.div
        className="bg-card p-4 rounded-lg shadow-large"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        className="bg-card p-4 rounded-lg shadow-large"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Emergency Cases ({filteredCases.length})
          </h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowAnalytics(true)}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Button>
        </div>

        {cases.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No active emergency cases</p>
        ) : (
          <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto">
            <AnimatePresence>
              {filteredCases.slice(0, 5).map((c) => (
                <motion.div
                  key={c.id}
                  className="p-4 rounded-lg bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    boxShadow: [
                      '0 0 0 0 rgba(239, 68, 68, 0.7)',
                      '0 0 0 10px rgba(239, 68, 68, 0)',
                      '0 0 0 0 rgba(239, 68, 68, 0)',
                    ],
                  }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{c.category}</span>
                    <span className="text-sm">{format(new Date(c.created_at), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="text-sm mt-2">
                    {c.campus ? formatCampusName(c.campus) : 'Unknown Campus'} - {c.title}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs opacity-80">{c.location_description || 'No location'}</span>
                    <span className="font-semibold capitalize">{c.status}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Analytics Dialog */}
      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Emergency Cases Analytics
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Campus Filter */}
            <div className="flex items-center gap-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by campus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campuses</SelectItem>
                  {campuses.map(campus => (
                    <SelectItem key={campus} value={campus || ''}>
                      {formatCampusName(campus || 'Unknown')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cases by Campus */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">Cases by Campus</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={casesByCampus}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Cases by Category */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">Cases by Category</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={casesByCategory}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {casesByCategory.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Cases by Status */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">Cases by Status</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={casesByStatus} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Stats */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                    <span>Total Active Cases</span>
                    <span className="font-bold text-destructive text-xl">{cases.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                    <span>Pending Cases</span>
                    <span className="font-bold text-yellow-500 text-xl">
                      {cases.filter(c => c.status === 'pending').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                    <span>Assigned Cases</span>
                    <span className="font-bold text-blue-500 text-xl">
                      {cases.filter(c => c.status === 'assigned').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                    <span>Campuses Affected</span>
                    <span className="font-bold text-primary text-xl">{campuses.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
