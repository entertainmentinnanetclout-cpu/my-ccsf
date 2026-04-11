import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Video, VideoOff, Wifi } from 'lucide-react';
import { motion } from 'framer-motion';

const mockCameras = [
  { id: 1, name: 'Gate 1 - Main Entrance', status: 'online', location: 'Building A' },
  { id: 2, name: 'Parking Lot A', status: 'online', location: 'External' },
  { id: 3, name: 'Library Hall', status: 'offline', location: 'Building B' },
  { id: 4, name: 'Sports Complex', status: 'online', location: 'Building C' },
  { id: 5, name: 'Residence Block 1', status: 'online', location: 'Residence' },
  { id: 6, name: 'Cafeteria', status: 'online', location: 'Building A' },
];

export const CCTVStatus = () => {
  const onlineCount = mockCameras.filter(c => c.status === 'online').length;
  const offlineCount = mockCameras.filter(c => c.status === 'offline').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            CCTV Status
          </span>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-success">
              <Wifi className="h-4 w-4" /> {onlineCount} Online
            </span>
            <span className="flex items-center gap-1 text-destructive">
              <VideoOff className="h-4 w-4" /> {offlineCount} Offline
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {mockCameras.map((camera, index) => (
            <motion.div
              key={camera.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`p-3 rounded-lg border ${
                camera.status === 'online'
                  ? 'bg-success/5 border-success/20 dark:bg-success/10 dark:border-success/30'
                  : 'bg-destructive/5 border-destructive/20 dark:bg-destructive/10 dark:border-destructive/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{camera.name}</p>
                  <p className="text-xs text-muted-foreground">{camera.location}</p>
                </div>
                {camera.status === 'online' ? (
                  <Video className="h-4 w-4 text-success" />
                ) : (
                  <VideoOff className="h-4 w-4 text-destructive" />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
