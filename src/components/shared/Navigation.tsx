import { Link, useLocation } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Menu, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PILOT_ENABLED, PILOT_ROUTES } from '@/config/pilot';

const Navigation = () => {
  const location = useLocation();
  const { isSuperAdmin, isCampusAdmin, isStudent } = useAuth();
  const pilotPath = isSuperAdmin ? PILOT_ROUTES.admin : isCampusAdmin ? PILOT_ROUTES.campus : PILOT_ROUTES.landing;

  if (location.pathname !== '/') return null;

  return (
    <div className="absolute right-4 top-4 z-[60]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Open portal navigation">
            <Menu className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild><Link to="/">Home</Link></DropdownMenuItem>
          {isStudent && <DropdownMenuItem asChild><Link to="/dashboard">Student Dashboard</Link></DropdownMenuItem>}
          {isSuperAdmin && <DropdownMenuItem asChild><Link to="/admin">Super Admin Console</Link></DropdownMenuItem>}
          {isCampusAdmin && <DropdownMenuItem asChild><Link to="/security">Campus Admin Portal</Link></DropdownMenuItem>}
          {(isCampusAdmin || isSuperAdmin) && (
            <>
              <DropdownMenuItem asChild><Link to="/office">Office</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/judiciary">Judiciary</Link></DropdownMenuItem>
            </>
          )}
          {PILOT_ENABLED && (isStudent || isCampusAdmin || isSuperAdmin) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={pilotPath} className="font-semibold"><ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" /> Controlled Pilot Mode</Link>
              </DropdownMenuItem>
            </>
          )}
          {(isStudent || isCampusAdmin || isSuperAdmin) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/profile">Profile</Link></DropdownMenuItem>
            </>
          )}
          {!isStudent && !isCampusAdmin && !isSuperAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/auth">Institutional sign in</Link></DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default Navigation;
