import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Newspaper, Clock, ChevronRight } from 'lucide-react';
import campusEntrance from '@/assets/campus-polokwane-entrance.jpg';
import campusSecurity from '@/assets/campus-security-staff.jpg';
import campusHall from '@/assets/campus-tut-hall.jpg';

const newsItems = [
  {
    id: 1,
    title: 'New Security Measures at Main Gate',
    summary: 'Enhanced biometric access control system installed for improved campus security.',
    image: campusEntrance,
    category: 'Security',
    date: '2 hours ago',
  },
  {
    id: 2,
    title: 'Safety Workshop Next Week',
    summary: 'Join us for a comprehensive personal safety awareness workshop at the Student Center.',
    image: campusSecurity,
    category: 'Events',
    date: '5 hours ago',
  },
  {
    id: 3,
    title: 'CCTV Upgrade Complete',
    summary: 'All campus buildings now equipped with HD surveillance cameras for 24/7 monitoring.',
    image: campusHall,
    category: 'Infrastructure',
    date: '1 day ago',
  },
];

export const NewsFeed = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Campus News Feed</h2>
      </div>

      <div className="grid gap-3 sm:gap-4">
        {newsItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="overflow-hidden cursor-pointer hover:shadow-large transition-all group active:scale-[0.99]">
              <CardContent className="p-0">
                <div className="flex gap-3 sm:gap-4">
                  <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 flex-shrink-0 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 py-2 sm:py-3 pr-2 sm:pr-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />{item.date}
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-2">{item.title}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{item.summary}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
