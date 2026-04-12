import { motion } from 'framer-motion';

interface NavItem {
  view: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

interface MobileBottomNavProps {
  items: NavItem[];
  activeView: string;
  onViewChange: (view: string) => void;
  maxItems?: number;
}

export const MobileBottomNav = ({ items, activeView, onViewChange, maxItems = 5 }: MobileBottomNavProps) => {
  const displayItems = items.slice(0, maxItems);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-white border-t border-border shadow-large pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-2 py-2">
          {displayItems.map(({ view, icon: Icon, label }) => {
            const isActive = activeView === view;
            return (
              <motion.button
                key={view}
                onClick={() => onViewChange(view)}
                className={`flex flex-col items-center justify-center gap-1 py-1 px-3 min-w-[64px] transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
                whileTap={{ scale: 0.92 }}
              >
                <div className={`relative p-1.5 rounded-xl transition-all ${isActive ? 'bg-primary text-white shadow-md' : ''}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider leading-tight ${isActive ? 'text-primary' : 'text-muted-foreground/70'}`}>
                  {label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
