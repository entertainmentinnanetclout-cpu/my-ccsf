import { BookOpen, FileText, Home, MessageSquareText, PlusCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { usePilotMode } from '@/contexts/PilotModeContext';
import { PILOT_ROUTES } from '@/config/pilot';

export function PilotStudentNavigation() {
  const location = useLocation();
  const { session } = usePilotMode();
  const sessionPath = session?.id ? PILOT_ROUTES.session(session.id) : PILOT_ROUTES.landing;
  const reportPath = session?.id ? `${sessionPath}?tab=scenarios` : PILOT_ROUTES.landing;
  const casesPath = session?.id ? `${sessionPath}?tab=reports` : PILOT_ROUTES.landing;
  const selectedTab = new URLSearchParams(location.search).get('tab');

  const items = [
    {
      href: PILOT_ROUTES.landing,
      label: 'Pilot Dashboard',
      icon: Home,
      active: location.pathname === PILOT_ROUTES.landing,
    },
    {
      href: reportPath,
      label: 'Report Incident',
      icon: PlusCircle,
      active: location.pathname === sessionPath && selectedTab !== 'reports',
    },
    {
      href: casesPath,
      label: 'My Cases',
      icon: FileText,
      active: location.pathname.startsWith('/pilot/report/') || (location.pathname === sessionPath && selectedTab === 'reports'),
    },
    {
      href: PILOT_ROUTES.reviews,
      label: 'Reviews',
      icon: MessageSquareText,
      active: location.pathname === PILOT_ROUTES.reviews,
    },
    {
      href: PILOT_ROUTES.resources,
      label: 'Safety Resources',
      icon: BookOpen,
      active: location.pathname === PILOT_ROUTES.resources,
    },
  ];

  return (
    <nav className="border-b border-border bg-card/95 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-6" aria-label="Student Pilot navigation">
      <div className="mx-auto flex w-full max-w-7xl snap-x snap-mandatory gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={label}
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
