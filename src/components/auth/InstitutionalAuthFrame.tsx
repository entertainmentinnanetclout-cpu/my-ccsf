import type { ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  LockKeyhole,
  MapPin,
  Shield,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { BRAND } from '@/brand';
import { PILOT_WARNING } from '@/config/pilot';

export function InstitutionalAuthFrame({
  mode,
  eyebrow,
  title,
  description,
  children,
}: {
  mode: 'official' | 'pilot';
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const pilot = mode === 'pilot';

  return (
    <div className="min-h-screen border-t-4 border-t-[#F2A900] bg-background text-foreground" data-testid={`institutional-auth-${mode}`}>
      <header className="border-b border-border bg-background/95 shadow-soft backdrop-blur-xl dark:bg-[#002F6C]/95">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <InstitutionBrand size="header" />
            <div className="hidden min-w-0 sm:block">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 shrink-0 text-[#002F6C] dark:text-white" aria-hidden="true" />
                <h1 className="truncate text-base font-bold text-[#002F6C] dark:text-white sm:text-xl">{BRAND.productLongName}</h1>
              </div>
              <p className="truncate text-xs font-semibold text-muted-foreground dark:text-white/80 sm:text-sm">
                {pilot ? 'Controlled Pilot Access' : 'Official Institutional Access'}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <section className="border-b-4 border-b-[#002F6C] bg-[#F2A900] px-4 py-3 text-center sm:px-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#002F6C] sm:text-sm">
          {BRAND.institutionName} · {pilot ? 'Controlled Testing Environment' : 'Campus Safety Services'}
        </p>
      </section>

      <main className="relative overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,47,108,0.10),transparent_36rem)]" />
        <div className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-border bg-card shadow-[0_32px_90px_-50px_rgba(0,47,108,0.9)] lg:grid-cols-[1.08fr_0.92fr]">
          <section className="relative flex flex-col justify-between overflow-hidden bg-[#002F6C] p-7 text-white sm:p-10 lg:p-12">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_48%,rgba(242,169,0,0.10))]" />
            <div className="relative">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#F2A900]/50 bg-[#F2A900]/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-[#F2A900]">
                {pilot ? <ShieldCheck className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                {eyebrow}
              </div>
              <h2 className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">{title}</h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/80 sm:text-base">{description}</p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {pilot ? (
                  <>
                    <AccessPoint icon={ShieldCheck} title="Role verified" description="Existing official account permissions remain authoritative." />
                    <AccessPoint icon={MapPin} title="Campus scoped" description="Campus teams only see authorised Pilot information." />
                    <AccessPoint icon={CheckCircle2} title="Pilot isolated" description="Simulation data remains outside production cases." />
                    <AccessPoint icon={LockKeyhole} title="Invitation controlled" description="Student Pilot participation requires an approved programme." />
                  </>
                ) : (
                  <>
                    <AccessPoint icon={UserCheck} title="Role-aware access" description="Students, campus teams and super-admins open the correct portal." />
                    <AccessPoint icon={MapPin} title="Campus governance" description="Campus-scoped operations remain protected by database policy." />
                    <AccessPoint icon={ShieldCheck} title="Secure reporting" description="Safety reports and evidence remain protected within CCSF." />
                    <AccessPoint icon={LockKeyhole} title="Audited actions" description="Authorised operational actions are recorded for accountability." />
                  </>
                )}
              </div>
            </div>

            <div className={`relative mt-10 rounded-2xl border p-4 text-sm text-white ${pilot ? 'border-[#F2A900]/45 bg-[#F2A900]/10' : 'border-white/15 bg-white/5'}`}>
              <div className="flex items-start gap-3">
                {pilot ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#F2A900]" /> : <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[#F2A900]" />}
                <div>
                  <p className="font-bold text-[#F2A900]">{pilot ? 'Simulation only' : 'Official CCSF portal'}</p>
                  <p className="mt-1 leading-6 text-white/80">
                    {pilot ? PILOT_WARNING : 'Use this portal for authorised campus safety reporting, case tracking and institutional operations.'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-card p-7 sm:p-10 lg:p-12">{children}</section>
        </div>
      </main>

      <footer className="px-4 pb-8 text-center sm:px-6">
        <p className="text-xs font-semibold text-muted-foreground sm:text-sm">
          {BRAND.productLongName} · {BRAND.institutionName}
        </p>
      </footer>
    </div>
  );
}

function AccessPoint({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <Icon className="h-5 w-5 text-[#F2A900]" aria-hidden="true" />
      <p className="mt-3 font-bold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-white/70">{description}</p>
    </div>
  );
}
