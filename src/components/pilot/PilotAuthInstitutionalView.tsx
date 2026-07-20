import type { FormEvent, ReactNode } from 'react';
import { ArrowLeft, Loader2, MapPin, ShieldCheck } from 'lucide-react';
import { InstitutionalAuthFrame } from '@/components/auth/InstitutionalAuthFrame';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CAMPUS_LABELS, PILOT_CAMPUS_VALUES } from '@/config/pilot';
import type { CampusLocation } from '@/types/pilot';

type PilotAuthView = 'login' | 'signup' | 'forgot-password';

export function PilotAuthInstitutionalView({
  view,
  email,
  password,
  confirmPassword,
  fullName,
  studentNumber,
  campus,
  consentAccepted,
  errors,
  loading,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onFullNameChange,
  onStudentNumberChange,
  onCampusChange,
  onConsentChange,
  onSubmit,
  onViewChange,
  onOfficialPortal,
}: {
  view: PilotAuthView;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  studentNumber: string;
  campus: CampusLocation | '';
  consentAccepted: boolean;
  errors: Record<string, string>;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onStudentNumberChange: (value: string) => void;
  onCampusChange: (value: CampusLocation) => void;
  onConsentChange: (value: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onViewChange: (view: PilotAuthView) => void;
  onOfficialPortal: () => void;
}) {
  const heading = view === 'signup'
    ? {
        title: 'Join the student Pilot',
        description: 'Create a student account and enter the Pilot dashboard immediately. No email confirmation is required.',
      }
    : view === 'forgot-password'
      ? {
          title: 'Recover your account',
          description: 'Enter the email linked to your CCSF account.',
        }
      : {
          title: 'Pilot sign in',
          description: 'Existing students use their CCSF or Pilot account credentials.',
        };

  return (
    <InstitutionalAuthFrame
      mode="pilot"
      eyebrow="Controlled Pilot Mode"
      title="Help test the My CCSF student safety application"
      description="Students can register directly for controlled Pilot testing. Verified campus-security and super-admin accounts continue to use administratively assigned access."
    >
      <Button variant="ghost" className="mb-6 -ml-3" onClick={onOfficialPortal}>
        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Official portal
      </Button>

      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="px-0 pt-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#002F6C] dark:text-[#F2A900]">Student Pilot access</p>
          <CardTitle className="mt-2 text-2xl sm:text-3xl">{heading.title}</CardTitle>
          <CardDescription className="text-sm leading-6">{heading.description}</CardDescription>
        </CardHeader>

        <CardContent className="px-0">
          <form className="space-y-5" onSubmit={onSubmit} noValidate>
            {view === 'signup' && (
              <>
                <Field label="Full name" error={errors.fullName}>
                  <Input
                    id="pilot-full-name"
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => onFullNameChange(event.target.value)}
                    className="h-12"
                    aria-invalid={Boolean(errors.fullName)}
                  />
                </Field>

                <Field label="Student number" error={errors.studentNumber} optional>
                  <Input
                    id="pilot-student-number"
                    autoComplete="off"
                    value={studentNumber}
                    onChange={(event) => onStudentNumberChange(event.target.value)}
                    className="h-12"
                    aria-invalid={Boolean(errors.studentNumber)}
                  />
                </Field>

                <Field label="Campus" error={errors.campus}>
                  <Select value={campus} onValueChange={(value) => onCampusChange(value as CampusLocation)}>
                    <SelectTrigger id="pilot-campus" className="h-12" aria-invalid={Boolean(errors.campus)}>
                      <SelectValue placeholder="Select your TUT campus" />
                    </SelectTrigger>
                    <SelectContent>
                      {PILOT_CAMPUS_VALUES.map((value) => (
                        <SelectItem key={value} value={value}>
                          <span className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" aria-hidden="true" />
                            {CAMPUS_LABELS[value]}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </>
            )}

            <Field label="Email address" error={errors.email}>
              <Input
                id="pilot-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="name@example.com"
                className="h-12"
                aria-invalid={Boolean(errors.email)}
              />
            </Field>

            {view !== 'forgot-password' && (
              <Field label="Password" error={errors.password}>
                <Input
                  id="pilot-password"
                  type="password"
                  autoComplete={view === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  className="h-12"
                  aria-invalid={Boolean(errors.password)}
                />
              </Field>
            )}

            {view === 'signup' && (
              <>
                <Field label="Confirm password" error={errors.confirmPassword}>
                  <Input
                    id="pilot-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => onConfirmPasswordChange(event.target.value)}
                    className="h-12"
                    aria-invalid={Boolean(errors.confirmPassword)}
                  />
                </Field>

                <div className="rounded-2xl border border-[#002F6C]/20 bg-[#002F6C]/5 p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="pilot-signup-consent"
                      checked={consentAccepted}
                      onCheckedChange={(checked) => onConsentChange(checked === true)}
                      aria-invalid={Boolean(errors.consent)}
                    />
                    <Label htmlFor="pilot-signup-consent" className="leading-relaxed">
                      I consent to participate in the controlled CCSF Pilot and understand that Pilot reports are test records. Pilot Mode does not contact CPS, SAPS, an ambulance or another external emergency service.
                    </Label>
                  </div>
                  {errors.consent && <p className="mt-2 text-sm font-medium text-destructive" role="alert">{errors.consent}</p>}
                </div>
              </>
            )}

            <Button type="submit" className="h-12 w-full bg-gradient-to-r from-[#002F6C] to-[#0055A5] text-base font-bold text-white shadow-lg" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {view === 'login' && 'Enter Pilot Mode'}
              {view === 'signup' && 'Create account and enter Pilot'}
              {view === 'forgot-password' && 'Send recovery email'}
            </Button>
          </form>

          <div className="mt-4 flex flex-col items-center gap-1 text-sm">
            {view === 'login' && <Button variant="link" onClick={() => onViewChange('signup')}>New student? Create a Pilot account</Button>}
            {view === 'login' && <Button variant="link" onClick={() => onViewChange('forgot-password')}>Forgot your password?</Button>}
            {view === 'signup' && <Button variant="link" onClick={() => onViewChange('login')}>Already registered? Sign in</Button>}
            {view === 'forgot-password' && <Button variant="link" onClick={() => onViewChange('login')}>Back to Pilot sign in</Button>}
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-muted/45 p-4 text-xs leading-5 text-muted-foreground">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#002F6C] dark:text-[#F2A900]" />
              <p>Student registration creates only a student role, records Pilot consent and enrols the account into the active Pilot programme for the selected campus. It cannot create campus-security or super-admin access.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </InstitutionalAuthFrame>
  );
}

function Field({
  label,
  error,
  optional = false,
  children,
}: {
  label: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}{optional ? ' (optional)' : ''}</Label>
      {children}
      {error && <p className="text-sm font-medium text-destructive" role="alert">{error}</p>}
    </div>
  );
}
