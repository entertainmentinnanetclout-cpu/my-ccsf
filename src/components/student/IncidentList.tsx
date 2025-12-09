import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const mockIncidents = [
  { id: '1', title: 'Suspicious person near library', category: 'suspicious_activity', status: 'pending', date: '2024-01-15' },
  { id: '2', title: 'Laptop stolen from lab', category: 'theft', status: 'resolved', date: '2024-01-10' },
  { id: '3', title: 'Vandalism in parking lot', category: 'vandalism', status: 'in_progress', date: '2024-01-08' },
];

const statusIcons = { pending: Clock, in_progress: AlertTriangle, resolved: CheckCircle, rejected: XCircle };
const statusColors = { pending: 'bg-amber-100 text-amber-800', in_progress: 'bg-blue-100 text-blue-800', resolved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' };

const IncidentList = () => {
  return (
    <div className="space-y-4">
      {mockIncidents.length === 0 ? (
        <Card className="bg-white/70"><CardContent className="p-8 text-center text-slate-500">No incidents reported yet.</CardContent></Card>
      ) : (
        mockIncidents.map((incident) => {
          const StatusIcon = statusIcons[incident.status as keyof typeof statusIcons];
          return (
            <Card key={incident.id} className="bg-white/70 backdrop-blur hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{incident.title}</CardTitle>
                  <Badge className={statusColors[incident.status as keyof typeof statusColors]}>
                    <StatusIcon className="h-3 w-3 mr-1" />{incident.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="capitalize">{incident.category.replace('_', ' ')}</span>
                  <span>•</span>
                  <span>{incident.date}</span>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default IncidentList;
