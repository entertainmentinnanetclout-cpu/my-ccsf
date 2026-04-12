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
          <AlertTriangle className="h-5 w-5 text-warning" />
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
                  ? 'bg-warning/5 border-warning/20 dark:bg-warning/10 dark:border-warning/30' 
                  : alert.type === 'success'
                  ? 'bg-success/5 border-success/20 dark:bg-success/10 dark:border-success/30'
                  : 'bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30'
              }`}
            >
              <div className="flex items-start gap-2">
                {alert.type === 'warning' && <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />}
                {alert.type === 'success' && <CheckCircle className="h-4 w-4 text-success mt-0.5" />}
                {alert.type === 'info' && <Clock className="h-4 w-4 text-primary mt-0.5" />}
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
