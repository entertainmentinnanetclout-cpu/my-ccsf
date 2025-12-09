import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, LogOut } from 'lucide-react';

const mockVisitors = [
  { id: '1', name: 'Mary Johnson', purpose: 'Meeting', host: 'Prof. Smith', checkedIn: '09:00', checkedOut: null },
  { id: '2', name: 'Peter Williams', purpose: 'Delivery', host: 'Admin Office', checkedIn: '10:30', checkedOut: '11:00' },
];

const VisitorLog = () => {
  return (
    <Card className="bg-white/70 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Visitor Log</CardTitle>
        <Button><UserPlus className="h-4 w-4 mr-2" />Check In Visitor</Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left p-2">Name</th><th className="text-left p-2">Purpose</th><th className="text-left p-2">Host</th><th className="text-left p-2">In</th><th className="text-left p-2">Out</th><th className="p-2"></th></tr></thead>
            <tbody>
              {mockVisitors.map((v) => (
                <tr key={v.id} className="border-b">
                  <td className="p-2 font-medium">{v.name}</td>
                  <td className="p-2">{v.purpose}</td>
                  <td className="p-2">{v.host}</td>
                  <td className="p-2">{v.checkedIn}</td>
                  <td className="p-2">{v.checkedOut || '-'}</td>
                  <td className="p-2">{!v.checkedOut && <Button size="sm" variant="outline"><LogOut className="h-3 w-3 mr-1" />Out</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default VisitorLog;
