import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

const mockShifts = [
  { id: '1', staff: 'Guard A', start: '06:00', end: '14:00', status: 'completed' },
  { id: '2', staff: 'Guard B', start: '14:00', end: '22:00', status: 'active' },
  { id: '3', staff: 'Guard C', start: '22:00', end: '06:00', status: 'upcoming' },
];

const ShiftManagement = () => {
  return (
    <Card className="bg-white/70 backdrop-blur">
      <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Shift Schedule</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {mockShifts.map((s) => (
          <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">{s.staff}</p>
              <p className="text-sm text-slate-500">{s.start} - {s.end}</p>
            </div>
            <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ShiftManagement;
