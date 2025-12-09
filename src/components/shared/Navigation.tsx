import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Navigation = () => {
  const { userRole, isSuperAdmin, isCampusAdmin, isStudent } = useAuth();

  return (
    <div className="absolute top-4 right-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <Menu className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <Link to="/">Home</Link>
          </DropdownMenuItem>
          {isStudent && (
            <DropdownMenuItem asChild>
              <Link to="/dashboard">Student Dashboard</Link>
            </DropdownMenuItem>
          )}
          {isSuperAdmin && (
            <DropdownMenuItem asChild>
              <Link to="/admin">Super Admin Console</Link>
            </DropdownMenuItem>
          )}
          {isCampusAdmin && (
            <DropdownMenuItem asChild>
              <Link to="/security">Campus Admin Portal</Link>
            </DropdownMenuItem>
          )}
          {(isCampusAdmin || isSuperAdmin) && (
            <>
              <DropdownMenuItem asChild>
                <Link to="/office">Office</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/judiciary">Judiciary</Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem asChild>
            <Link to="/profile">Profile</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default Navigation;
