import { useState } from 'react';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  Home,
  MapPin,
  MessageSquareText,
  ShieldAlert,
  Siren,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const GUIDE_STEPS = [
  {
    icon: Home,
    title: 'Navigate the Pilot dashboard',
    description: 'Use Home for the carousel and quick actions, My Cases for progress, Report for test submissions, Reviews for feedback, Safety Guide for learning material and Support for staff notifications.',
    accent: 'Dashboard',
  },
  {
    icon: FileText,
    title: 'Submit a standard report',
    description: 'Select an authorised scenario, describe the test incident, confirm the readable location and attach only relevant test evidence when requested.',
    accent: 'Standard reporting',
  },
  {
    icon: Siren,
    title: 'Use Emergency Test correctly',
    description: 'Emergency Test is deliberately short. Share your current location, read the consent statement and submit. Your registered student profile is attached automatically.',
    accent: 'Emergency reporting',
  },
  {
    icon: MapPin,
    title: 'Understand location permissions',
    description: 'The app requests a high-accuracy position first, shows a readable address and stores coordinates and accuracy as supporting technical evidence inside the isolated Pilot.',
    accent: 'Location',
  },
  {
    icon: FileText,
    title: 'Track a case from start to finish',
    description: 'Open any case card to see the reference number, current status, assigned staff member, timeline notes, evidence and authorised campus-security updates.',
    accent: 'Case tracking',
  },
  {
    icon: Bell,
    title: 'Read staff notifications',
    description: 'Authorised Pilot staff can send case-linked updates. Unread messages appear in Support and remain tied to your authenticated student account.',
    accent: 'Notifications',
  },
  {
    icon: MessageSquareText,
    title: 'Submit a Pilot review',
    description: 'Choose quick feedback, add a 1-5 star rating and explain what worked or failed. You can edit unresolved reviews and read authorised responses.',
    accent: 'Reviews',
  },
  {
    icon: ShieldAlert,
    title: 'Know the Pilot limitations',
    description: 'The Pilot tests digital workflows only. It does not replace Campus Protection Services authority, SAPS, ambulance services or established emergency procedures.',
    accent: 'Important limitation',
  },
] as const;

export function PilotUserGuideDialog({
  open,
  step,
  saving,
  onStepChange,
  onClose,
  onSkip,
  onComplete,
}: {
  open: boolean;
  step: number;
  saving: boolean;
  onStepChange: (step: number) => void;
  onClose: (doNotShowAgain: boolean) => Promise<void> | void;
  onSkip: () => Promise<void> | void;
  onComplete: () => Promise<void> | void;
}) {
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);
  const current = GUIDE_STEPS[step] ?? GUIDE_STEPS[0];
  const Icon = current.icon;
  const isFirst = step === 0;
  const isLast = step === GUIDE_STEPS.length - 1;

  const requestClose = async () => {
    await onClose(doNotShowAgain);
    setDoNotShowAgain(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && open && !saving) void requestClose();
      }}
    >
      <DialogContent className="max-w-2xl overflow-hidden p-0" data-testid="pilot-user-guide-dialog">
        <div className="relative bg-gradient-to-br from-[#002F6C] via-[#004A8F] to-[#002F6C] px-6 py-7 text-white sm:px-8">
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A900]"
            onClick={() => void requestClose()}
            aria-label="Close Pilot guide"
            disabled={saving}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.18em] text-[#F2A900]">
            <span>{current.accent}</span>
            <span aria-hidden="true">•</span>
            <span>Step {step + 1} of {GUIDE_STEPS.length}</span>
          </div>
          <div className="mt-5 flex items-start gap-4">
            <div className="rounded-2xl bg-[#F2A900] p-4 text-[#002F6C] shadow-lg">
              <Icon className="h-8 w-8" aria-hidden="true" />
            </div>
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="pr-8 text-2xl font-extrabold text-white sm:text-3xl">{current.title}</DialogTitle>
              <DialogDescription className="text-base leading-7 text-white/85">{current.description}</DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6 sm:px-8">
          <div className="grid grid-cols-8 gap-2" aria-label={`Guide progress: step ${step + 1} of ${GUIDE_STEPS.length}`}>
            {GUIDE_STEPS.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => onStepChange(index)}
                aria-label={`Open guide step ${index + 1}: ${item.title}`}
                aria-current={index === step ? 'step' : undefined}
                className={`h-2 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${index <= step ? 'bg-[#F2A900]' : 'bg-muted'}`}
              />
            ))}
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/45 p-4">
            <Checkbox
              id="pilot-guide-do-not-show"
              checked={doNotShowAgain}
              onCheckedChange={(checked) => setDoNotShowAgain(checked === true)}
              disabled={saving}
            />
            <div>
              <Label htmlFor="pilot-guide-do-not-show" className="cursor-pointer font-semibold">Do not show automatically again</Label>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">The choice is saved against your Pilot profile and applies on your other devices. You can reopen or reset the guide from Safety Guide.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 border-t bg-muted/30 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Button variant="ghost" onClick={() => void onSkip()} disabled={saving}>Skip guide</Button>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => onStepChange(Math.max(step - 1, 0))}
              disabled={saving || isFirst}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />Previous
            </Button>
            {isLast ? (
              <Button className="flex-1 sm:flex-none" onClick={() => void onComplete()} disabled={saving}>
                Finish guide
              </Button>
            ) : (
              <Button
                className="flex-1 sm:flex-none"
                onClick={() => onStepChange(Math.min(step + 1, GUIDE_STEPS.length - 1))}
                disabled={saving}
              >
                Next<ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const PILOT_GUIDE_STEP_COUNT = GUIDE_STEPS.length;
