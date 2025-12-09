import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, MapPin } from 'lucide-react';

const mockIncidents = [
  { id: '1', title: 'Vehicle break-in', campus: 'Pretoria West Main', status: 'pending', severity: 'high', date: '2024-01-15' },
  { id: '2', title: 'Medical emergency', campus: 'Arcadia', status: 'resolved', severity: 'critical', date: '2024-01-14' },
  { id: '3', title: 'Graffiti on building', campus: 'Soshanguve South', status: 'in_progress', severity: 'low', date: '2024-01-13' },
];

const AllIncidentsList = () => {
  return (
    <Card className="bg-white/10 backdrop-blur border-white/20">
      <CardHeader><CardTitle className="text-white">All Cases Nationwide</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {mockIncidents.map((i) => (
          <div key={i.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div>
              <h4 className="font-medium text-white">{i.title}</h4>
              <p className="text-sm text-purple-200 flex items-center gap-1"><MapPin className="h-3 w-3" />{i.campus} • {i.date}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={i.severity === 'critical' ? 'destructive' : 'secondary'}>{i.severity}</Badge>
              <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10"><Eye className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AllIncidentsList;
