import { motion } from 'framer-motion';
import { ArrowRight, Building2, Gamepad2, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function SafetyQuestLaunchCard() {
  const location = useLocation();
  const safetyQuestHref = location.pathname.startsWith('/pilot') ? '/pilot/safety-quest' : '/safety-quest';

  return (
    <Card className="group relative overflow-hidden border-[#F2A900]/45 bg-[#07152A] text-white shadow-large">
      <div className="absolute inset-0 bg-[url('/safety-quest-campus.jpg')] bg-cover bg-[position:52%_45%] opacity-45 transition duration-700 group-hover:scale-[1.02] group-hover:opacity-55" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#061326] via-[#061326]/95 to-[#061326]/35" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#061326]/75 via-transparent to-transparent" aria-hidden="true" />

      <div className="relative grid min-h-[22rem] items-end gap-8 p-5 sm:min-h-[20rem] sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#F2A900]/35 bg-[#F2A900]/12 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#FFD36A]">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            New · Interactive onboarding
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Safety Quest</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/70 sm:text-base">
            Meet the people behind campus safety, spot fraudulent service tactics, and unlock the route from the CPS office to Control—one practical question at a time.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5 text-xs font-extrabold text-white/80">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-3 py-2 backdrop-blur-sm"><Gamepad2 className="h-4 w-4 text-[#F2A900]" />8 checkpoints</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-3 py-2 backdrop-blur-sm"><Building2 className="h-4 w-4 text-[#F2A900]" />CPS · G-51</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-3 py-2 backdrop-blur-sm"><MapPin className="h-4 w-4 text-[#F2A900]" />Control · G-63</span>
          </div>
        </div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="flex lg:justify-end">
          <Button asChild size="lg" className="h-12 w-full bg-[#F2A900] px-6 font-black text-[#07152A] shadow-[0_15px_40px_rgba(242,169,0,0.24)] hover:bg-[#FFD36A] sm:w-auto">
            <Link to={safetyQuestHref}>
              <ShieldCheck className="mr-2 h-5 w-5" aria-hidden="true" />
              Enter Safety Quest
              <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </Card>
  );
}
