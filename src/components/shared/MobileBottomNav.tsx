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
      <div className="bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-2 py-1.5">
          {displayItems.map(({ view, icon: Icon, label }) => {
            const isActive = activeView === view;
            return (
              <motion.button
                key={view}
                onClick={() => onViewChange(view)}
                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-xl min-w-[56px] transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
                whileTap={{ scale: 0.9 }}
              >
                <div className={`relative p-1 rounded-lg transition-colors ${isActive ? 'bg-primary/10' : ''}`}>
                  <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
                  {isActive && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                    />
                  )}
                </div>
                <span className={`text-[10px] font-medium leading-tight ${isActive ? 'text-primary' : ''}`}>
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
