import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, AlertTriangle, Users } from 'lucide-react';

const campuses = [
  { id: '1', name: 'Pretoria West Main', incidents: 12, staff: 8, status: 'normal' },
  { id: '2', name: 'Arcadia', incidents: 5, staff: 4, status: 'normal' },
  { id: '3', name: 'Arts', incidents: 3, staff: 3, status: 'normal' },
  { id: '4', name: 'Giyani', incidents: 8, staff: 5, status: 'alert' },
  { id: '5', name: 'Mbombela', incidents: 2, staff: 4, status: 'normal' },
  { id: '6', name: 'Polokwane', incidents: 6, staff: 6, status: 'normal' },
  { id: '7', name: 'Garankuwa', incidents: 4, staff: 4, status: 'normal' },
  { id: '8', name: 'Soshanguve South', incidents: 9, staff: 5, status: 'alert' },
  { id: '9', name: 'Soshanguve North', incidents: 7, staff: 5, status: 'normal' },
];

const CampusOverview = ({ detailed = false }: { detailed?: boolean }) => {
  return (
    <div className={detailed ? 'space-y-4' : 'grid md:grid-cols-3 gap-4'}>
      {campuses.map((c) => (
        <Card key={c.id} className="bg-white/10 backdrop-blur border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center justify-between">
              <span className="flex items-center gap-2"><Building2 className="h-4 w-4" />{c.name}</span>
              {c.status === 'alert' && <Badge variant="destructive">Alert</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm text-purple-200">
              <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{c.incidents} incidents</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.staff} staff</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CampusOverview;
