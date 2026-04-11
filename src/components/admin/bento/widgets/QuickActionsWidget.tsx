import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  MessageSquare, 
  FileText, 
  Users,
  Plus,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

interface QuickActionsWidgetProps {
  widgetId: string;
}

const actions = [
  {
    icon: Bell,
    label: 'Announcement',
    color: 'text-primary',
    action: () => toast.info('Navigate to Announcements'),
  },
  {
    icon: MessageSquare,
    label: 'Message',
    color: 'text-primary',
    action: () => toast.info('Navigate to Staff Communication'),
  },
  {
    icon: FileText,
    label: 'Report',
    color: 'text-success',
    action: () => toast.info('Generate Report'),
  },
  {
    icon: Download,
    label: 'Export',
    color: 'text-warning',
    action: () => toast.info('Export Data'),
  },
];

export const QuickActionsWidget = ({ widgetId }: QuickActionsWidgetProps) => {
  return (
    <div className="h-full flex flex-col">
      <h4 className="text-sm font-semibold mb-3">Quick Actions</h4>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {actions.map((action, index) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full h-full flex flex-col gap-1 py-3 hover:bg-muted/50"
              onClick={action.action}
            >
              <action.icon className={`h-4 w-4 ${action.color}`} />
              <span className="text-xs">{action.label}</span>
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
