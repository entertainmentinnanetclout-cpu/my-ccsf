import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CampusCarousel } from '@/components/student/CampusCarousel';
import { NewsFeed } from '@/components/student/NewsFeed';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_WELCOME_MESSAGE = 'Welcome | Re a le amogela | Nemukelekile';

export function StudentDashboardHome({ campus, showCarousel = true }: { campus?: string; showCarousel?: boolean }) {
  const [welcomeMessage, setWelcomeMessage] = useState(DEFAULT_WELCOME_MESSAGE);

  useEffect(() => {
    let isCurrent = true;

    const fetchWelcomeMessage = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'welcome_banner_text')
        .maybeSingle();

      if (isCurrent && typeof data?.value === 'string' && data.value.trim()) {
        setWelcomeMessage(data.value);
      }
    };

    void fetchWelcomeMessage();

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="student-dashboard-home">
      {showCarousel && (
        <div className="px-4">
          <CampusCarousel campus={campus} />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative mb-4 w-full overflow-hidden border-b-4 border-[#002F6C] bg-[#F2A900] px-6 py-4"
      >
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,47,108,0.05)_50%,transparent_75%)] bg-[length:250%_250%] animate-gradient-x" />
        <div className="relative z-10 text-center">
          <h2 className="text-lg font-bold uppercase tracking-tight text-[#002F6C] sm:text-xl">
            {welcomeMessage}
          </h2>
        </div>
      </motion.div>

      <div className="px-4">
        <NewsFeed />
      </div>
    </div>
  );
}
