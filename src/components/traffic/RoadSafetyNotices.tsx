import { useEffect, useState } from 'react';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listTrafficRoadSafetyNotices } from '@/services/trafficService';
import {
  DEFAULT_TRAFFIC_NOTICES,
  type TrafficCampus,
  type TrafficRoadSafetyNotice,
} from '@/types/traffic';

export function RoadSafetyNotices({ campus }: { campus?: TrafficCampus }) {
  const [notices, setNotices] = useState<Array<
    Pick<TrafficRoadSafetyNotice, 'id' | 'title' | 'summary' | 'severity' | 'campus'>
  >>(DEFAULT_TRAFFIC_NOTICES);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let current = true;
    void listTrafficRoadSafetyNotices(campus)
      .then((data) => {
        if (!current) return;
        if (data.length > 0) setNotices(data);
        setIsLive(true);
      })
      .catch(() => {
        if (current) setIsLive(false);
      });
    return () => {
      current = false;
    };
  }, [campus]);

  return (
    <Card className="border-[#002F6C]/15 shadow-sm" data-testid="traffic-road-safety">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldAlert className="h-5 w-5 text-[#D7193F]" />
            Road safety and parking rules
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow campus signs and instructions from authorised Traffic and CPS staff.
          </p>
        </div>
        <Badge variant={isLive ? 'secondary' : 'outline'}>
          {isLive ? 'Live notices' : 'Baseline guidance'}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {notices.map((notice) => {
          const Icon = notice.severity === 'urgent'
            ? ShieldAlert
            : notice.severity === 'caution'
              ? AlertTriangle
              : Info;
          return (
            <div key={notice.id} className="rounded-xl border bg-muted/30 p-4">
              <Icon className={notice.severity === 'urgent' ? 'h-5 w-5 text-destructive' : 'h-5 w-5 text-[#F2A900]'} />
              <h3 className="mt-3 font-bold">{notice.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{notice.summary}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
