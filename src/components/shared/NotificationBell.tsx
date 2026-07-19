import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Bell, Check, Info, Loader2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_incident_id: string | null;
};

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (fetchError) {
      setError('Notifications could not be loaded.');
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    void fetchNotifications();

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const incoming = payload.new as Notification;
          setNotifications((current) => current.some((item) => item.id === incoming.id) ? current : [incoming, ...current]);
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Live notification updates are temporarily unavailable.');
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    const existing = notifications.find((item) => item.id === id);
    if (!existing || existing.is_read) return;

    setNotifications((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user?.id || '');

    if (updateError) {
      setNotifications((current) => current.map((item) => item.id === id ? existing : item));
      toast({ title: 'Notification was not updated', description: updateError.message, variant: 'destructive' });
    }
  };

  const markAllAsRead = async () => {
    if (!user || updating) return;
    setUpdating(true);
    const previous = notifications;
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (updateError) {
      setNotifications(previous);
      toast({ title: 'Notifications were not updated', description: updateError.message, variant: 'destructive' });
    }
    setUpdating(false);
  };

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-warning" aria-hidden="true" />;
      case 'error':
        return <X className="h-4 w-4 text-destructive" aria-hidden="true" />;
      case 'success':
        return <Check className="h-4 w-4 text-success" aria-hidden="true" />;
      default:
        return <Info className="h-4 w-4 text-primary" aria-hidden="true" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -right-1 -top-1" aria-hidden="true">
                <Badge variant="destructive" className="flex h-5 min-w-5 items-center justify-center p-0 px-1 text-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" aria-label="Notifications panel">
        <div className="flex items-center justify-between border-b p-3">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} disabled={updating}>
              {updating && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {loading ? (
            <div className="flex h-40 items-center justify-center" role="status">
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
              <span className="sr-only">Loading notifications</span>
            </div>
          ) : error ? (
            <div className="space-y-3 p-6 text-center" role="alert">
              <AlertCircle className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchNotifications} className="gap-2">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Retry
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="mx-auto mb-2 h-8 w-8 opacity-50" aria-hidden="true" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void markAsRead(notification.id)}
                  className={`block w-full p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${!notification.is_read ? 'bg-primary/5' : ''}`}
                  aria-label={`${notification.is_read ? '' : 'Unread notification: '}${notification.title}. ${notification.message}`}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex-shrink-0">{getIcon(notification.type)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{notification.title}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.is_read && <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
