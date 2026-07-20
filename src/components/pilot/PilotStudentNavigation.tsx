import { BookOpen, FileText, Home, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { usePilotMode } from '@/contexts/PilotModeContext';
import { PILOT_ROUTES } from '@/config/pilot';

export function PilotStudentNavigation() {
  const location = useLocation();
  const { session } = usePilotMode();

  const items = [
    { href: PILOT_ROUTES.landing, label: 'Pilot Dashboard', icon: Home, active: location.pathname === PILOT_ROUTES.landing },
    ...(session?.id ? [{ href: PILOT_ROUTES.session(session.id), label: 'Active Session', icon: ShieldCheck, active: location.pathname === PILOT_ROUTES.session(session.id) }] : []),
    { href: PILOT_ROUTES.landing, label: 'My Cases', icon: FileText, active: location.pathname.startsWith('/pilot/report/') },
    { href: PILOT_ROUTES.resources, label: 'Safety Resources', icon: BookOpen, active: location.pathname === PILOT_ROUTES.resources },
  ];

  return (
    <nav className="border-b border-border bg-card/95 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-6" aria-label="Student Pilot navigation">
      <div className="mx-auto flex w-full max-w-7xl snap-x snap-mandatory gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={`${label}-${href}`}
            to={href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-w-fit snap-start items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? 'bg-[#002F6C] text-white shadow-md' : 'border border-border bg-background text-foreground hover:border-primary hover:bg-primary/5'}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
