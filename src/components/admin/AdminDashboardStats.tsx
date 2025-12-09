import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Building2, Users } from 'lucide-react';

const stats = [
  { label: 'Total Incidents', value: 247, icon: AlertTriangle, color: 'text-amber-400' },
  { label: 'Resolved Cases', value: 198, icon: CheckCircle, color: 'text-green-400' },
  { label: 'Active Campuses', value: 9, icon: Building2, color: 'text-blue-400' },
  { label: 'Registered Users', value: 1432, icon: Users, color: 'text-purple-400' },
];

const AdminDashboardStats = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label} className="bg-white/10 backdrop-blur border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-200">{s.label}</p>
                <p className="text-3xl font-bold text-white">{s.value}</p>
              </div>
              <s.icon className={`h-10 w-10 ${s.color} opacity-50`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminDashboardStats;
