import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const mockAlerts = [
  { id: 1, type: 'warning', message: 'Unusual activity detected near Gate 3', time: '5 min ago' },
  { id: 2, type: 'info', message: 'Security patrol completed in Sector A', time: '15 min ago' },
  { id: 3, type: 'success', message: 'All CCTV cameras operational', time: '30 min ago' },
];

export const AlertsPanel = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Live Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockAlerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-3 rounded-lg border ${
                alert.type === 'warning' 
                  ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800' 
                  : alert.type === 'success'
                  ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                  : 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800'
              }`}
            >
              <div className="flex items-start gap-2">
                {alert.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />}
                {alert.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />}
                {alert.type === 'info' && <Clock className="h-4 w-4 text-blue-500 mt-0.5" />}
                <div className="flex-1">
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
