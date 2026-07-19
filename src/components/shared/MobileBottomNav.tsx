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
  ariaLabel?: string;
}

export const MobileBottomNav = ({
  items,
  activeView,
  onViewChange,
  maxItems,
  ariaLabel = 'Portal sections',
}: MobileBottomNavProps) => {
  const displayItems = typeof maxItems === 'number' ? items.slice(0, maxItems) : items;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden" aria-label={ariaLabel}>
      <div className="border-t border-border/70 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.1)] backdrop-blur-xl">
        <div className="flex snap-x snap-mandatory items-stretch gap-1 overflow-x-auto px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {displayItems.map(({ view, icon: Icon, label }) => {
            const isActive = activeView === view;
            return (
              <motion.button
                key={view}
                type="button"
                onClick={() => onViewChange(view)}
                className={`flex min-h-12 min-w-[68px] flex-1 snap-center flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${isActive ? 'text-primary' : 'text-muted-foreground hover:bg-muted/60'}`}
                whileTap={{ scale: 0.94 }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={label}
              >
                <div className={`relative rounded-lg p-1 transition-colors ${isActive ? 'bg-primary/10' : ''}`}>
                  <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} aria-hidden="true" />
                  {isActive && <span className="absolute -top-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" aria-hidden="true" />}
                </div>
                <span className={`max-w-[72px] truncate text-[10px] font-semibold leading-tight ${isActive ? 'text-primary' : ''}`}>{label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
