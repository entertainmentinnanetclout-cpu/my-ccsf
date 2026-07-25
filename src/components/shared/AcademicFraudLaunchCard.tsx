import { ArrowRight, FileWarning, GraduationCap, Paperclip, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const ACADEMIC_FRAUD_REPORT_TYPES = [
  'Paid mark-change offers',
  'Courses or enrolment access for sale',
  'Fake sick letters or medical notes',
  'Fake WIL placements or placement fees',
  'Fake academic records or certificates',
  'Impersonated admin services or registrations',
] as const;

export function AcademicFraudLaunchCard({
  onStart,
  pilotHref,
  className,
}: {
  onStart?: () => void;
  pilotHref?: string;
  className?: string;
}) {
  const action = (
    <>
      <ShieldAlert className="mr-2 h-4 w-4" />
      Report in Pilot Mode
      <ArrowRight className="ml-2 h-4 w-4" />
    </>
  );

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-[#D7193F]/35 bg-card shadow-large',
        className,
      )}
      data-testid="academic-fraud-reporting-section"
    >
      <div className="border-b-4 border-[#F2A900] bg-gradient-to-r from-[#002F6C] via-[#0055A5] to-[#002F6C] p-5 text-white sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3 text-[#F2A900]">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#F2A900]">Digital academic-scam prevention</p>
              <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">Report academic fraud and fake admin services</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/85">
                Use the isolated Pilot workflow for suspicious online offers. Do not pay, confront the person, or circulate unverified allegations publicly.
              </p>
            </div>
          </div>
          {pilotHref ? (
            <Button asChild className="shrink-0 bg-[#F2A900] font-extrabold text-[#002F6C] hover:bg-[#F2A900]/90">
              <Link to={pilotHref}>{action}</Link>
            </Button>
          ) : (
            <Button onClick={onStart} className="shrink-0 bg-[#F2A900] font-extrabold text-[#002F6C] hover:bg-[#F2A900]/90">
              {action}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[1fr_0.42fr]">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {ACADEMIC_FRAUD_REPORT_TYPES.map((type) => (
            <div key={type} className="flex items-start gap-2 rounded-xl border bg-muted/25 p-3 text-sm font-semibold">
              <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-[#D7193F]" />
              <span>{type}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-[#0055A5]/25 bg-[#EEF4FA] p-4 text-[#172033] dark:bg-[#002F6C]/30 dark:text-foreground">
          <div className="flex items-center gap-2 font-extrabold text-[#002F6C] dark:text-[#F2A900]">
            <Paperclip className="h-4 w-4" /> Evidence supported
          </div>
          <p className="mt-2 text-sm leading-6">
            Attach screenshots, PDFs, payment requests, usernames, phone numbers, links, voice-note or video evidence, and transaction references.
          </p>
        </div>
      </div>
    </section>
  );
}
