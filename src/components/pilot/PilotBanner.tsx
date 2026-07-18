import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { PILOT_WARNING } from '@/config/pilot';
import { cn } from '@/lib/utils';

export function PilotBanner({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-xl border border-amber-300 bg-amber-50 text-amber-950 shadow-sm dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100',
        compact ? 'p-3' : 'p-4 md:p-5',
        className,
      )}
      data-testid="pilot-demo-warning"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-amber-200 p-2 dark:bg-amber-900/70">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold">Controlled Pilot — Simulation Only</p>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
              <ShieldCheck className="h-3 w-3" /> No dispatch
            </span>
          </div>
          <p className={cn('mt-1 leading-relaxed', compact ? 'text-xs' : 'text-sm')}>{PILOT_WARNING}</p>
        </div>
      </div>
    </div>
  );
}
