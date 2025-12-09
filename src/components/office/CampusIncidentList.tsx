import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, Eye } from 'lucide-react';

const mockIncidents = [
  { id: '1', title: 'Break-in attempt at Admin Building', category: 'theft', status: 'pending', reporter: 'Anonymous', date: '2024-01-15' },
  { id: '2', title: 'Fire alarm triggered - Block C', category: 'fire', status: 'in_progress', reporter: 'John Student', date: '2024-01-14' },
];

const CampusIncidentList = () => {
  return (
    <Card className="bg-white/70 backdrop-blur">
      <CardHeader><CardTitle>Campus Incidents</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {mockIncidents.map((i) => (
          <div key={i.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">{i.title}</h4>
              <p className="text-sm text-slate-500">{i.category} • {i.reporter} • {i.date}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={i.status === 'pending' ? 'secondary' : 'default'}>{i.status}</Badge>
              <Button size="sm" variant="outline"><Eye className="h-4 w-4 mr-1" />View</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default CampusIncidentList;
