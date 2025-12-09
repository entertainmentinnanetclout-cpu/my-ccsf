import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, AlertCircle, TrendingUp, Users } from 'lucide-react';
import { AnimatedCounter } from '../AnimatedCounter';

const mockSummaryData = {
  totals: { total: 125, pending: 32, assigned: 45, resolved: 40, escalated: 8 },
  campuses: [
    { name: 'Main', cases: 30, types: { Violence: 10, GBV: 5, Theft: 8, Other: 5, Misconduct: 2 } },
    { name: 'Arcadia', cases: 20, types: { Violence: 5, GBV: 3, Theft: 7, Other: 4, Misconduct: 1 } },
    { name: 'Arts', cases: 15, types: { Violence: 4, GBV: 2, Theft: 5, Other: 3, Misconduct: 1 } },
    { name: 'North', cases: 18, types: { Violence: 6, GBV: 4, Theft: 4, Other: 3, Misconduct: 1 } },
    { name: 'South', cases: 12, types: { Violence: 3, GBV: 1, Theft: 5, Other: 2, Misconduct: 1 } },
    { name: 'Mbombela', cases: 22, types: { Violence: 8, GBV: 5, Theft: 6, Other: 2, Misconduct: 1 } },
    { name: 'Polokwane', cases: 8, types: { Violence: 2, GBV: 1, Theft: 3, Other: 1, Misconduct: 1 } },
  ],
  caseTypes: [
    { name: 'Violence', value: 38 },
    { name: 'GBV', value: 21 },
    { name: 'Theft', value: 38 },
    { name: 'Other', value: 20 },
    { name: 'Misconduct', value: 8 },
  ],
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

export const TrafficSummary = () => {
  const [activeTab, setActiveTab] = useState('Summary');
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);

  const CampusChart = ({ data }: { data: Record<string, number> }) => (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={Object.entries(data).map(([name, value]) => ({ name, value }))}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {['Summary', 'Traffic Safe', 'Staff Commands'].map((tab) => (
          <Button key={tab} variant={activeTab === tab ? 'default' : 'outline'} onClick={() => setActiveTab(tab)}>
            {tab}
          </Button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {activeTab === 'Summary' && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold"><AnimatedCounter to={mockSummaryData.totals.total} /></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    <Clock className="h-4 w-4 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold"><AnimatedCounter to={mockSummaryData.totals.pending} /></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Assigned</CardTitle>
                    <AlertCircle className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold"><AnimatedCounter to={mockSummaryData.totals.assigned} /></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold"><AnimatedCounter to={mockSummaryData.totals.resolved} /></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Escalated</CardTitle>
                    <TrendingUp className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold"><AnimatedCounter to={mockSummaryData.totals.escalated} /></div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {mockSummaryData.campuses.map((campus) => (
                  <Card key={campus.name}>
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        {campus.name}
                        <Button size="sm" onClick={() => setSelectedCampus(selectedCampus === campus.name ? null : campus.name)}>
                          Details
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{campus.cases} Cases</div>
                      {selectedCampus === campus.name && <CampusChart data={campus.types} />}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
                  <Card>
                    <CardHeader><CardTitle>Cases per Campus</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={mockSummaryData.campuses}>
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="cases" fill="hsl(var(--primary))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
                  <Card>
                    <CardHeader><CardTitle>Case Distribution</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={mockSummaryData.caseTypes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="hsl(var(--primary))">
                            {mockSummaryData.caseTypes.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          )}
          {activeTab === 'Traffic Safe' && (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Traffic Safe content goes here.</p>
              </CardContent>
            </Card>
          )}
          {activeTab === 'Staff Commands' && (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Staff Commands content goes here.</p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
