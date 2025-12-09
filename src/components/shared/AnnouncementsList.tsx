import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';

const mockAnnouncements = [
  { id: '1', title: 'Campus Safety Week', content: 'Join us for safety workshops and demonstrations.', priority: 'high', date: '2024-01-15' },
  { id: '2', title: 'New Emergency Procedures', content: 'Updated evacuation routes are now available.', priority: 'medium', date: '2024-01-12' },
];

const priorityColors = { low: 'bg-slate-100 text-slate-800', medium: 'bg-blue-100 text-blue-800', high: 'bg-red-100 text-red-800' };

const AnnouncementsList = () => {
  return (
    <div className="space-y-4">
      {mockAnnouncements.map((a) => (
        <Card key={a.id} className="bg-white/70 backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><Bell className="h-4 w-4" />{a.title}</CardTitle>
              <Badge className={priorityColors[a.priority as keyof typeof priorityColors]}>{a.priority}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-2">{a.content}</p>
            <p className="text-xs text-slate-400">{a.date}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AnnouncementsList;
