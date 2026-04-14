import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { NewsFeedSkeleton } from '@/components/shared/LoadingSkeletons';
import { triggerHaptic } from '@/hooks/useHapticFeedback';
import PullToRefresh from '@/components/shared/PullToRefresh';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
  expires_at: string | null;
}

export const NewsFeed = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();

    // Real-time subscription for announcements
    const channel = supabase
      .channel('announcements-feed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
        },
        () => {
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, content, priority, created_at, expires_at')
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setAnnouncements(data);
    }
    setIsLoading(false);
  }, []);

  const handleRefresh = useCallback(async () => {
    await fetchAnnouncements();
  }, [fetchAnnouncements]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-destructive text-destructive-foreground';
      case 'high':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes} min ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else if (diffInDays === 1) {
      return '1 day ago';
    } else {
      return `${diffInDays} days ago`;
    }
  };

  const handleCardClick = () => {
    triggerHaptic('light');
  };

  if (isLoading) {
    return <NewsFeedSkeleton />;
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="h-5 w-5 text-primary dark:text-white" />
          <h2 className="text-lg font-semibold text-foreground dark:text-white">Campus News Feed</h2>
        </div>

        {announcements.length === 0 ? (
          <Card className="p-6">
            <div className="flex flex-col items-center justify-center text-center py-6">
              <Megaphone className="h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="font-medium text-foreground mb-1">No Announcements</h3>
              <p className="text-sm text-muted-foreground">
                There are no current announcements. Check back later for updates.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {announcements.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className="overflow-hidden cursor-pointer hover:shadow-large transition-all group active:scale-[0.99] bg-card"
                  onClick={handleCardClick}
                >
                  <CardContent className="p-0">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getPriorityColor(item.priority)}>
                              {item.priority === 'urgent' ? 'Urgent' : item.priority === 'high' ? 'Important' : 'Notice'}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(item.created_at)}
                            </span>
                          </div>
                          <h3 className="font-semibold text-sm sm:text-base text-card-foreground line-clamp-2">
                            {item.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                            {item.content}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
};
