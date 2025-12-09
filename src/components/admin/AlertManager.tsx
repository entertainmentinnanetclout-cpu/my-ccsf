import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const mockAlerts = [
  { id: '1', title: 'Parking Area Security', type: 'warning', active: true, campus: 'Global' },
  { id: '2', title: 'Water Outage', type: 'info', active: false, campus: 'Arcadia' },
];

const AlertManager = () => {
  return (
    <Card className="bg-white/10 backdrop-blur border-white/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white">Manage Alerts</CardTitle>
        <Button className="bg-red-600 hover:bg-red-700"><Plus className="h-4 w-4 mr-2" />New Alert</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {mockAlerts.map((a) => (
          <div key={a.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-5 w-5 ${a.active ? 'text-amber-400' : 'text-slate-400'}`} />
              <div><h4 className="font-medium text-white">{a.title}</h4><p className="text-sm text-purple-200">{a.campus}</p></div>
            </div>
            <Badge variant={a.active ? 'default' : 'secondary'}>{a.active ? 'Active' : 'Inactive'}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AlertManager;
