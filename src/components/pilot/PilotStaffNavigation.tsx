import { LayoutDashboard, MessageSquareText, Settings2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PILOT_ROUTES } from '@/config/pilot';

export function PilotStaffNavigation() {
  const location = useLocation();
  const { userRole } = useAuth();
  if (userRole !== 'security' && userRole !== 'admin') return null;

  const dashboard = userRole === 'admin' ? PILOT_ROUTES.admin : PILOT_ROUTES.campus;
  const reviews = userRole === 'admin' ? PILOT_ROUTES.adminReviews : PILOT_ROUTES.campusReviews;
  const items = [
    { href: dashboard, label: 'Pilot Operations', icon: LayoutDashboard },
    { href: reviews, label: 'Reviews', icon: MessageSquareText },
    ...(userRole === 'admin' ? [{ href: PILOT_ROUTES.adminContent, label: 'Content', icon: Settings2 }] : []),
  ];

  return (
    <nav className="border-b border-border bg-card/95 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-6" aria-label="Pilot staff navigation">
      <div className="mx-auto flex w-full max-w-7xl gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map(({ href, label, icon: Icon }) => {
          const active = location.pathname === href;
          return (
            <Link
              key={href}
              to={href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? 'bg-[#002F6C] text-white shadow-md' : 'border border-border bg-background text-foreground hover:border-primary hover:bg-primary/5'}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
