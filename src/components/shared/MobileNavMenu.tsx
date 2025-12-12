import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface NavItem {
  view: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

interface MobileNavMenuProps {
  items: NavItem[];
  activeView: string;
  onViewChange: (view: string) => void;
  title?: string;
}

export const MobileNavMenu = ({ items, activeView, onViewChange, title = 'Navigation' }: MobileNavMenuProps) => {
  const [open, setOpen] = useState(false);

  const handleViewChange = (view: string) => {
    onViewChange(view);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="md:hidden flex items-center gap-2 bg-card/95 backdrop-blur-sm"
        >
          <Menu className="h-4 w-4" />
          <span className="text-sm font-medium">
            {items.find(item => item.view === activeView)?.label || 'Menu'}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center">{title}</SheetTitle>
        </SheetHeader>
        <nav className="grid grid-cols-2 gap-3 pb-6">
          {items.map(({ view, icon: Icon, label }) => (
            <motion.button
              key={view}
              onClick={() => handleViewChange(view)}
              className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
                activeView === view
                  ? 'bg-primary text-primary-foreground shadow-medium'
                  : 'bg-muted hover:bg-muted/80'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium text-sm">{label}</span>
            </motion.button>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
};
