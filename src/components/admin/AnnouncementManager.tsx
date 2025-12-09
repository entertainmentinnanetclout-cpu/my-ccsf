import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';

const mockAnnouncements = [
  { id: '1', title: 'Campus Safety Week', scope: 'Global', date: '2024-01-15' },
  { id: '2', title: 'Emergency Drill Notice', scope: 'Pretoria West Main', date: '2024-01-12' },
];

const AnnouncementManager = () => {
  return (
    <Card className="bg-white/10 backdrop-blur border-white/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white">Manage Announcements</CardTitle>
        <Button className="bg-purple-600 hover:bg-purple-700"><Plus className="h-4 w-4 mr-2" />New Announcement</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {mockAnnouncements.map((a) => (
          <div key={a.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div><h4 className="font-medium text-white">{a.title}</h4><p className="text-sm text-purple-200">{a.scope} • {a.date}</p></div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="text-purple-200 hover:text-white"><Edit className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AnnouncementManager;
