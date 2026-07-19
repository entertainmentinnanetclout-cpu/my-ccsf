import { motion } from 'framer-motion';
import { ArrowLeft, LogOut, MapPin, Shield, ShieldCheck } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';
import { BRAND } from '@/brand';
import { CAMPUS_LABELS } from '@/config/pilot';
import type { CampusLocation } from '@/types/pilot';

type PilotPortalContext = {
  portalLabel: string;
  bannerTitle: string;
  bannerDescription: string;
  officialHref: string;
  officialLabel: string;
};

function resolvePortalContext(pathname: string): PilotPortalContext {
  if (pathname.startsWith('/admin/pilot')) {
    return {
      portalLabel: 'CCSF Super-Admin Pilot Portal',
      bannerTitle: 'Controlled Pilot Administration',
      bannerDescription: 'Cross-campus programme governance, reporting, analytics, retention and audit controls.',
      officialHref: '/admin',
      officialLabel: 'Official Admin Portal',
    };
  }

  if (pathname.startsWith('/security/pilot')) {
    return {
      portalLabel: 'CCSF Campus Pilot Portal',
      bannerTitle: 'Campus Pilot Operations',
      bannerDescription: 'Campus-scoped simulated reports, participants, workflow testing and controlled exports.',
      officialHref: '/security',
      officialLabel: 'Official Campus Portal',
    };
  }

  return {
    portalLabel: 'CCSF Student Pilot Portal',
    bannerTitle: 'Controlled Student Pilot',
    bannerDescription: 'A protected simulation environment for testing the campus safety reporting journey.',
    officialHref: '/dashboard',
    officialLabel: 'Student Dashboard',
  };
}

export default function PilotInstitutionalLayout() {
  const location = useLocation();
  const { userProfile, signOut } = useAuth();
  const context = resolvePortalContext(location.pathname);
  const campus = userProfile?.campus as CampusLocation | null | undefined;
  const campusLabel = campus ? CAMPUS_LABELS[campus] : null;

  return (
    <div className="pilot-institutional-shell min-h-screen bg-background" data-testid="pilot-institutional-layout">
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="sticky top-0 z-50 border-b border-border border-t-4 border-t-[#F2A900] bg-background/95 shadow-soft backdrop-blur-xl dark:bg-[#002F6C]/95"
      >
        <div className="w-full px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <motion.div className="relative shrink-0" whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
                <InstitutionBrand size="header" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500 dark:border-[#002F6C]" aria-hidden="true" />
              </motion.div>

              <div className="hidden min-w-0 sm:block">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 shrink-0 text-[#002F6C] dark:text-white" aria-hidden="true" />
                  <h1 className="truncate text-base font-bold text-[#002F6C] dark:text-white sm:text-xl">{BRAND.productLongName}</h1>
                </div>
                <p className="truncate text-xs font-semibold text-muted-foreground dark:text-white/80 sm:text-sm">{context.portalLabel}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {campusLabel && (
                <div className="hidden items-center gap-2 rounded-full border border-border bg-muted px-3 py-2 text-sm font-semibold text-[#002F6C] shadow-sm dark:border-white/20 dark:bg-white/10 dark:text-white lg:flex">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {campusLabel}
                </div>
              )}

              <div className="hidden items-center gap-2 rounded-full border border-[#F2A900]/70 bg-[#F2A900]/15 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#002F6C] dark:text-[#F2A900] md:flex">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Pilot
              </div>

              <ThemeToggle />

              <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
                <Link to={context.officialHref}><ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />{context.officialLabel}</Link>
              </Button>

              <Button variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Sign out of CCSF">
                <LogOut className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <section className="relative overflow-hidden border-b-4 border-b-[#002F6C] bg-[#F2A900] px-4 py-5 sm:px-6">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,47,108,0.06)_50%,transparent_75%)] bg-[length:240%_240%]" />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#002F6C]/70">{BRAND.institutionName}</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#002F6C] sm:text-2xl">{context.bannerTitle}</h2>
            <p className="mt-1 max-w-3xl text-sm font-medium text-[#002F6C]/85">{context.bannerDescription}</p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#002F6C]/20 bg-white/35 px-3 py-2 text-xs font-bold text-[#002F6C]">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Simulation only · No emergency dispatch
          </div>
        </div>
      </section>

      <main className="pilot-premium-surface w-full pb-8"><Outlet /></main>

      <footer className="px-4 pb-8 pt-4 text-center sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/55 px-4 py-2 text-xs font-semibold text-muted-foreground sm:text-sm">
          <Shield className="h-4 w-4 text-[#002F6C] dark:text-[#F2A900]" aria-hidden="true" />
          {BRAND.productLongName} · {BRAND.institutionName} · Controlled Pilot Environment
        </div>
      </footer>
    </div>
  );
}
