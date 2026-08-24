import { FormEvent, useState } from 'react';
import { CalendarDays, Check, Clipboard, Loader2, LockKeyhole, Search, Send, TicketCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { CAMPUS_LABELS, PILOT_CAMPUS_VALUES } from '@/config/pilot';
import {
  createVisitorParkingRequest,
  trackVisitorParkingRequest,
  trafficErrorMessage,
} from '@/services/trafficService';
import {
  TRAFFIC_PASS_STATUS_LABELS,
  type TrafficCampus,
  type VisitorParkingRequest,
  type VisitorPassReceipt,
  type VisitorPassTracking,
} from '@/types/traffic';
import { TrafficPassBadge } from './TrafficPassBadge';

const latestTrackingKey = 'ccsf_traffic_latest_visitor_pass';

const localToday = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const initialForm: VisitorParkingRequest = {
  visitorName: '',
  visitorEmail: '',
  visitorPhone: '',
  vehicleRegistration: '',
  vehicleMake: '',
  vehicleColour: '',
  campus: 'pretoria_west_main',
  hostName: '',
  hostDepartment: '',
  visitPurpose: '',
  visitDate: localToday(),
  expectedArrival: '08:00',
};

export function VisitorParkingBooking() {
  const [form, setForm] = useState<VisitorParkingRequest>(initialForm);
  const [receipt, setReceipt] = useState<VisitorPassReceipt | null>(null);
  const [trackedPass, setTrackedPass] = useState<VisitorPassTracking | null>(null);
  const [referenceCode, setReferenceCode] = useState('');
  const [trackingToken, setTrackingToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setField = <Key extends keyof VisitorParkingRequest>(
    key: Key,
    value: VisitorParkingRequest[Key],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const submitRequest = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const nextReceipt = await createVisitorParkingRequest(form);
      setReceipt(nextReceipt);
      setReferenceCode(nextReceipt.referenceCode);
      setTrackingToken(nextReceipt.trackingToken);
      const tracked = await trackVisitorParkingRequest(nextReceipt.referenceCode, nextReceipt.trackingToken);
      setTrackedPass(tracked);
      localStorage.setItem(latestTrackingKey, JSON.stringify({
        referenceCode: nextReceipt.referenceCode,
        trackingToken: nextReceipt.trackingToken,
      }));
      toast.success('Visitor parking request sent to Traffic.');
    } catch (error) {
      setErrorMessage(trafficErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const trackRequest = async (event: FormEvent) => {
    event.preventDefault();
    setIsTracking(true);
    setErrorMessage(null);
    try {
      const tracked = await trackVisitorParkingRequest(referenceCode, trackingToken);
      setTrackedPass(tracked);
      if (!tracked) setErrorMessage('No request matched that reference and private tracking token.');
    } catch (error) {
      setErrorMessage(trafficErrorMessage(error));
    } finally {
      setIsTracking(false);
    }
  };

  const restoreLatest = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(latestTrackingKey) ?? '{}') as {
        referenceCode?: string;
        trackingToken?: string;
      };
      if (!saved.referenceCode || !saved.trackingToken) {
        toast.info('No visitor request is saved on this device.');
        return;
      }
      setReferenceCode(saved.referenceCode);
      setTrackingToken(saved.trackingToken);
      toast.success('Latest tracking details restored.');
    } catch {
      toast.error('Saved tracking details could not be restored.');
    }
  };

  const copyTracking = async () => {
    if (!receipt) return;
    await navigator.clipboard.writeText(
      'Reference: ' + receipt.referenceCode + '\nPrivate token: ' + receipt.trackingToken,
    );
    toast.success('Private tracking details copied.');
  };

  const displayPass = trackedPass ?? (receipt ? {
    passId: receipt.passId,
    referenceCode: receipt.referenceCode,
    visitorName: form.visitorName,
    vehicleRegistration: form.vehicleRegistration.toUpperCase(),
    campus: form.campus,
    visitDate: form.visitDate,
    expectedArrival: form.expectedArrival,
    passStatus: receipt.passStatus,
    decisionNotes: null,
    approvedAt: null,
    checkedInAt: null,
    checkedOutAt: null,
    submittedAt: receipt.submittedAt,
  } satisfies VisitorPassTracking : null);

  return (
    <Tabs defaultValue="book" className="w-full" data-testid="traffic-visitor-booking">
      <TabsList className="grid h-auto w-full grid-cols-2">
        <TabsTrigger value="book" className="gap-2 py-2.5"><Send className="h-4 w-4" />Book visitor parking</TabsTrigger>
        <TabsTrigger value="track" className="gap-2 py-2.5"><Search className="h-4 w-4" />Track a request</TabsTrigger>
      </TabsList>

      <TabsContent value="book" className="mt-5">
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TicketCheck className="h-5 w-5" />Visitor parking request</CardTitle>
              <p className="text-sm text-muted-foreground">
                Submit before travelling. Traffic approval and identification at the gate are still required.
              </p>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitRequest}>
                <Field label="Visitor full name" required>
                  <Input value={form.visitorName} onChange={(event) => setField('visitorName', event.target.value)} maxLength={120} required />
                </Field>
                <Field label="Mobile number" required>
                  <Input type="tel" value={form.visitorPhone} onChange={(event) => setField('visitorPhone', event.target.value)} maxLength={24} required />
                </Field>
                <Field label="Email address">
                  <Input type="email" value={form.visitorEmail} onChange={(event) => setField('visitorEmail', event.target.value)} maxLength={160} />
                </Field>
                <Field label="Campus" required>
                  <Select value={form.campus} onValueChange={(value) => setField('campus', value as TrafficCampus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PILOT_CAMPUS_VALUES.map((campus) => <SelectItem key={campus} value={campus}>{CAMPUS_LABELS[campus]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Vehicle registration" required>
                  <Input className="uppercase" value={form.vehicleRegistration} onChange={(event) => setField('vehicleRegistration', event.target.value)} maxLength={20} required />
                </Field>
                <Field label="Vehicle make / model">
                  <Input value={form.vehicleMake} onChange={(event) => setField('vehicleMake', event.target.value)} maxLength={80} />
                </Field>
                <Field label="Vehicle colour">
                  <Input value={form.vehicleColour} onChange={(event) => setField('vehicleColour', event.target.value)} maxLength={40} />
                </Field>
                <Field label="Person you are visiting" required>
                  <Input value={form.hostName} onChange={(event) => setField('hostName', event.target.value)} maxLength={120} required />
                </Field>
                <Field label="Host department">
                  <Input value={form.hostDepartment} onChange={(event) => setField('hostDepartment', event.target.value)} maxLength={120} />
                </Field>
                <Field label="Visit date" required>
                  <Input type="date" min={localToday()} value={form.visitDate} onChange={(event) => setField('visitDate', event.target.value)} required />
                </Field>
                <Field label="Expected arrival" required>
                  <Input type="time" value={form.expectedArrival} onChange={(event) => setField('expectedArrival', event.target.value)} required />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Purpose of visit" required>
                    <Textarea value={form.visitPurpose} onChange={(event) => setField('visitPurpose', event.target.value)} maxLength={500} required />
                  </Field>
                </div>
                {errorMessage && <Alert variant="destructive" className="sm:col-span-2"><AlertTitle>Request not submitted</AlertTitle><AlertDescription>{errorMessage}</AlertDescription></Alert>}
                <Alert className="border-[#F2A900]/60 bg-[#F2A900]/10 sm:col-span-2">
                  <LockKeyhole className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    Submitting does not grant entry. Traffic must approve the request, and gate staff may inspect identification and the vehicle.
                  </AlertDescription>
                </Alert>
                <Button type="submit" disabled={isSubmitting} className="sm:col-span-2">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send parking request
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {displayPass ? (
              <>
                <TrafficPassBadge
                  kind="visitor"
                  name={displayPass.visitorName}
                  reference={displayPass.referenceCode}
                  vehicleRegistration={displayPass.vehicleRegistration}
                  campusLabel={CAMPUS_LABELS[displayPass.campus]}
                  validDate={displayPass.visitDate + ' ú ' + displayPass.expectedArrival.slice(0, 5)}
                  status={displayPass.passStatus}
                  developmentPreview
                />
                <Card>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge>{TRAFFIC_PASS_STATUS_LABELS[displayPass.passStatus]}</Badge>
                    </div>
                    {receipt && (
                      <>
                        <p className="text-sm font-semibold">Save the private token. It is shown only when the request is created.</p>
                        <p className="break-all rounded-lg bg-muted p-3 font-mono text-xs">{receipt.trackingToken}</p>
                        <Button type="button" variant="outline" className="w-full" onClick={() => void copyTracking()}>
                          <Clipboard className="mr-2 h-4 w-4" />Copy tracking details
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
                  <CalendarDays className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 font-bold">Your request preview appears here</h3>
                  <p className="mt-2 text-sm text-muted-foreground">The final circular ticket layout will be matched to the official physical permit during onboarding.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="track" className="mt-5">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Track visitor parking</CardTitle>
              <p className="text-sm text-muted-foreground">Use the reference and private token issued when the request was created.</p>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={trackRequest}>
                <Field label="Reference code" required>
                  <Input className="uppercase" value={referenceCode} onChange={(event) => setReferenceCode(event.target.value)} placeholder="VIS-260824-ABC123" required />
                </Field>
                <Field label="Private tracking token" required>
                  <Input type="password" value={trackingToken} onChange={(event) => setTrackingToken(event.target.value)} required />
                </Field>
                {errorMessage && <Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" disabled={isTracking} className="flex-1">
                    {isTracking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Track request
                  </Button>
                  <Button type="button" variant="outline" onClick={restoreLatest}>Restore this device</Button>
                </div>
              </form>
            </CardContent>
          </Card>
          {trackedPass ? (
            <div className="space-y-4">
              <TrafficPassBadge
                kind="visitor"
                name={trackedPass.visitorName}
                reference={trackedPass.referenceCode}
                vehicleRegistration={trackedPass.vehicleRegistration}
                campusLabel={CAMPUS_LABELS[trackedPass.campus]}
                validDate={trackedPass.visitDate + ' ú ' + trackedPass.expectedArrival.slice(0, 5)}
                status={trackedPass.passStatus}
                developmentPreview
              />
              {trackedPass.passStatus === 'approved' && (
                <Alert className="border-emerald-500/50 bg-emerald-50 text-emerald-950">
                  <Check className="h-4 w-4" /><AlertTitle>Approved for gate review</AlertTitle>
                  <AlertDescription>Bring identification. Final entry remains subject to verification and campus conditions.</AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <Card className="border-dashed"><CardContent className="flex min-h-72 items-center justify-center p-8 text-center text-sm text-muted-foreground">A verified request status will appear here.</CardContent></Card>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}{required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}</Label>
      {children}
    </div>
  );
}
