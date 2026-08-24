import { CarFront, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  TRAFFIC_PASS_STATUS_LABELS,
  TRAFFIC_STUDENT_STATUS_LABELS,
  type TrafficPassStatus,
  type TrafficStudentPermitStatus,
} from '@/types/traffic';

interface TrafficPassBadgeProps {
  kind: 'visitor' | 'student';
  name: string;
  reference: string;
  vehicleRegistration: string;
  campusLabel: string;
  validDate: string;
  status: TrafficPassStatus | TrafficStudentPermitStatus;
  developmentPreview?: boolean;
}

export function TrafficPassBadge({
  kind,
  name,
  reference,
  vehicleRegistration,
  campusLabel,
  validDate,
  status,
  developmentPreview = false,
}: TrafficPassBadgeProps) {
  const statusLabel = kind === 'visitor'
    ? TRAFFIC_PASS_STATUS_LABELS[status as TrafficPassStatus]
    : TRAFFIC_STUDENT_STATUS_LABELS[status as TrafficStudentPermitStatus];
  const isApproved = status === 'approved' || status === 'active' || status === 'checked_in';

  return (
    <div
      className={cn(
        'relative mx-auto flex aspect-square w-full max-w-[310px] flex-col items-center justify-center overflow-hidden rounded-full border-[10px] bg-white p-8 text-center text-black shadow-[0_18px_45px_rgba(0,0,0,0.2)]',
        isApproved ? 'border-emerald-600' : 'border-black',
      )}
      aria-label={kind === 'visitor' ? 'Digital visitor parking pass' : 'Digital student parking permit'}
      data-testid="traffic-digital-permit"
    >
      <div className="absolute inset-3 rounded-full border-2 border-black/25" aria-hidden="true" />
      <div className="relative z-10 flex flex-col items-center">
        {kind === 'visitor' ? <CarFront className="mb-2 h-8 w-8" /> : <ShieldCheck className="mb-2 h-8 w-8" />}
        <p className="text-[10px] font-black uppercase tracking-[0.22em]">TUT ú CCSF Traffic</p>
        <h3 className="mt-1 text-xl font-black uppercase">{kind === 'visitor' ? 'Visitor' : 'Student'}</h3>
        <p className="mt-2 max-w-[210px] truncate text-sm font-bold">{name}</p>
        <p className="mt-1 text-2xl font-black tracking-wider">{vehicleRegistration}</p>
        <p className="mt-1 text-xs font-semibold">{campusLabel}</p>
        <p className="text-xs">{validDate}</p>
        <p className="mt-2 font-mono text-xs font-bold">{reference}</p>
        <Badge
          variant="outline"
          className={cn(
            'mt-2 border-black bg-white text-[10px] uppercase text-black',
            isApproved && 'border-emerald-700 bg-emerald-50 text-emerald-900',
          )}
        >
          {statusLabel}
        </Badge>
      </div>
      {developmentPreview && (
        <div className="absolute inset-x-0 bottom-8 -rotate-12 bg-[#F2A900]/90 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#002F6C]">
          Format preview ú under development
        </div>
      )}
    </div>
  );
}
