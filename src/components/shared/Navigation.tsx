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
  const { userRole } = useAuth();

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
          <DropdownMenuItem asChild>
            <Link to="/dashboard">Dashboard</Link>
          </DropdownMenuItem>
          {userRole === 'admin' && (
            <DropdownMenuItem asChild>
              <Link to="/admin">Admin</Link>
            </DropdownMenuItem>
          )}
          {userRole === 'security' && (
            <DropdownMenuItem asChild>
              <Link to="/security">Security</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link to="/profile">Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/judiciary">Judiciary</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default Navigation;
