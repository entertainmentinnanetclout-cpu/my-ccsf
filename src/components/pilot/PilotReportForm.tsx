import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Camera, CheckCircle2, FileText, Loader2, MapPin, Navigation, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PilotBanner } from '@/components/pilot/PilotBanner';
import { PILOT_MAX_ATTACHMENTS, PILOT_ROUTES } from '@/config/pilot';
import { captureBrowserPosition, normalizeGeolocationError } from '@/lib/browserGeolocation';
import {
  createPilotReport,
  insertPilotLocationEvent,
  recordPilotFeatureTest,
  uploadPilotAttachments,
  validatePilotFiles,
} from '@/services/pilot/pilotCoreService';
import type { IncidentCategory, PilotParticipant, PilotScenario, PilotSession } from '@/types/pilot';

const categories: { value: IncidentCategory; label: string }[] = [
  { value: 'Rape', label: 'Rape' },
  { value: 'Sexual assault', label: 'Sexual Assault' },
  { value: 'Gbv', label: 'Gender-Based Violence' },
  { value: 'Murder', label: 'Murder' },
  { value: 'Attempted murder', label: 'Attempted Murder' },
  { value: 'Assault common', label: 'Common Assault' },
  { value: 'Assault GBH', label: 'Assault GBH' },
  { value: 'Fraud', label: 'Fraud' },
  { value: 'Theft', label: 'Theft' },
  { value: 'Robbery', label: 'Robbery' },
  { value: 'Armed robbery', label: 'Armed Robbery' },
  { value: 'Arson', label: 'Arson' },
  { value: 'Malicious damage to property', label: 'Malicious Damage to Property' },
  { value: 'Trespassing', label: 'Trespassing' },
  { value: 'Reckless and negligent driving', label: 'Reckless and Negligent Driving' },
  { value: 'Driving under the influence of alcohol', label: 'Driving Under the Influence' },
  { value: 'Public violence', label: 'Public Violence' },
  { value: 'Sports and Rec Events Act Violation', label: 'Sports and Recreation Event Violation' },
  { value: 'Crimmen enjuria (Hate speech)', label: 'Crimen Injuria / Hate Speech' },
  { value: 'Cyber related crime (bullying etc.)', label: 'Cyber Crime / Bullying' },
  { value: 'Vandalism', label: 'Vandalism' },
];

interface CapturedLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export function PilotReportForm({
  scenario,
  participant,
  session,
  emergency = false,
}: {
  scenario: PilotScenario;
  participant: PilotParticipant;
  session: PilotSession;
  emergency?: boolean;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState(emergency ? 'Emergency simulation' : scenario.title);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IncidentCategory | ''>(scenario.expected_category ?? '');
  const [locationDescription, setLocationDescription] = useState('');
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [simulationConfirmed, setSimulationConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const requiresLocation = scenario.requires_location || scenario.requires_live_tracking;
  const requiresAttachment = scenario.requires_attachment;
  const canSubmit = useMemo(() => {
    if (!title.trim() || description.trim().length < 5 || !category) return false;
    if (emergency && !simulationConfirmed) return false;
    if (requiresLocation && !location) return false;
    if (requiresAttachment && files.length === 0) return false;
    return true;
  }, [title, description, category, emergency, simulationConfirmed, requiresLocation, location, requiresAttachment, files.length]);

  const captureLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);
    const started = performance.now();
    try {
      const { position, acquisition, permission } = await captureBrowserPosition();
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? null,
      });
      setLocationDescription((current) => current || `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
      toast({
        title: acquisition === 'network_fallback' ? 'Pilot location captured using network fallback' : 'Pilot location captured',
        description: `Accuracy: ${Math.round(position.coords.accuracy)} metres`,
      });
      await recordPilotFeatureTest({
        programId: participant.program_id,
        sessionId: session.id,
        featureKey: 'location_permission_capture',
        outcome: 'passed',
        durationMs: Math.round(performance.now() - started),
        metadata: {
          accuracy: position.coords.accuracy,
          acquisition,
          permission,
        },
      });
    } catch (caught) {
      const failure = normalizeGeolocationError(caught);
      setLocationError(failure.message);
      await recordPilotFeatureTest({
        programId: participant.program_id,
        sessionId: session.id,
        featureKey: 'location_permission_capture',
        outcome: failure.denied ? 'denied' : 'failed',
        durationMs: Math.round(performance.now() - started),
        errorCode: `${failure.code ?? 'unknown'}:${failure.message}`,
      }).catch(() => undefined);
      toast({
        title: failure.denied ? 'Location permission denied' : 'Location capture failed',
        description: failure.message,
        variant: 'destructive',
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const handleFiles = (nextFiles: File[]) => {
    try {
      validatePilotFiles(nextFiles);
      setFiles(nextFiles);
    } catch (caught) {
      toast({ title: 'Attachment not accepted', description: caught instanceof Error ? caught.message : 'Invalid attachment.', variant: 'destructive' });
    }
  };

  const submit = async () => {
    if (!canSubmit || !category) return;
    setLoading(true);
    const started = performance.now();
    try {
      const report = await createPilotReport({
        program_id: participant.program_id,
        session_id: session.id,
        participant_id: participant.id,
        scenario_id: scenario.id,
        campus: participant.campus,
        title: title.trim(),
        description: description.trim(),
        category,
        is_anonymous: anonymous,
        location_lat: location?.latitude ?? null,
        location_lng: location?.longitude ?? null,
        location_accuracy: location?.accuracy ?? null,
        location_description: locationDescription.trim() || null,
      });

      if (location) {
        await insertPilotLocationEvent({
          program_id: report.program_id,
          session_id: report.session_id,
          report_id: report.id,
          user_id: report.submitted_by,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          source: 'initial_fix',
        });
      }

      if (files.length) {
        const attachmentStarted = performance.now();
        try {
          await uploadPilotAttachments(report, files, report.submitted_by);
          await recordPilotFeatureTest({
            programId: report.program_id,
            sessionId: report.session_id,
            reportId: report.id,
            featureKey: 'attachment_upload',
            outcome: 'passed',
            durationMs: Math.round(performance.now() - attachmentStarted),
            metadata: { file_count: files.length },
          });
        } catch (attachmentError) {
          await recordPilotFeatureTest({
            programId: report.program_id,
            sessionId: report.session_id,
            reportId: report.id,
            featureKey: 'attachment_upload',
            outcome: 'failed',
            durationMs: Math.round(performance.now() - attachmentStarted),
            errorCode: attachmentError instanceof Error ? attachmentError.message : 'attachment_error',
          }).catch(() => undefined);
          throw attachmentError;
        }
      }

      await recordPilotFeatureTest({
        programId: report.program_id,
        sessionId: report.session_id,
        reportId: report.id,
        featureKey: emergency ? 'emergency_simulation_submission' : 'standard_report_submission',
        outcome: 'passed',
        durationMs: Math.round(performance.now() - started),
        metadata: { scenario_type: scenario.scenario_type },
      });

      toast({
        title: 'Simulation report created',
        description: `${report.reference_number}. No emergency service was dispatched.`,
      });
      navigate(PILOT_ROUTES.report(report.id));
    } catch (caught) {
      await recordPilotFeatureTest({
        programId: participant.program_id,
        sessionId: session.id,
        featureKey: emergency ? 'emergency_simulation_submission' : 'standard_report_submission',
        outcome: 'failed',
        durationMs: Math.round(performance.now() - started),
        errorCode: caught instanceof Error ? caught.message : 'submission_error',
      }).catch(() => undefined);
      toast({ title: 'Pilot submission failed', description: caught instanceof Error ? caught.message : 'Try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={emergency ? 'border-destructive/50 shadow-large' : 'shadow-large'}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className={emergency ? 'rounded-full bg-destructive/10 p-3 text-destructive' : 'rounded-full bg-primary/10 p-3 text-primary'}>
            {emergency ? <Siren className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
          </div>
          <div>
            <CardTitle>{emergency ? 'Emergency Button Simulation' : scenario.title}</CardTitle>
            <CardDescription>{scenario.instructions}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <PilotBanner compact />

        {emergency && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <Checkbox id="simulation-confirm" checked={simulationConfirmed} onCheckedChange={(checked) => setSimulationConfirmed(checked === true)} />
              <Label htmlFor="simulation-confirm" className="leading-relaxed">
                I understand this is a simulation. Pressing submit will not contact CPS, SAPS, an ambulance, security personnel or any emergency service.
              </Label>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`pilot-title-${scenario.id}`}>Simulation title</Label>
            <Input id={`pilot-title-${scenario.id}`} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label>Incident category being tested</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as IncidentCategory)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{categories.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`pilot-description-${scenario.id}`}>Simulation description</Label>
          <Textarea
            id={`pilot-description-${scenario.id}`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the fictional scenario and the steps you are testing. Do not enter details of a real active emergency."
            rows={5}
            maxLength={10000}
          />
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Location test {requiresLocation && <span className="text-destructive">required</span>}</p>
              <p className="text-sm text-muted-foreground">Coordinates are stored only in Pilot tables and can be deleted under the Pilot retention process.</p>
            </div>
            <Button type="button" variant="outline" onClick={captureLocation} disabled={locationLoading}>
              {locationLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}
              {locationLoading ? 'Finding location…' : location ? 'Capture again' : 'Capture Pilot location'}
            </Button>
          </div>
          {location && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-muted p-3 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)} · accuracy {Math.round(location.accuracy ?? 0)} m
            </div>
          )}
          {locationError && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{locationError}</span>
            </div>
          )}
          <div className="mt-3 space-y-2">
            <Label htmlFor={`pilot-location-${scenario.id}`}>Location description</Label>
            <Input id={`pilot-location-${scenario.id}`} value={locationDescription} onChange={(event) => setLocationDescription(event.target.value)} placeholder="Building, gate, residence or test location" />
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <p className="font-semibold">Attachment test {requiresAttachment && <span className="text-destructive">required</span>}</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Up to {PILOT_MAX_ATTACHMENTS} files. JPEG, PNG, WebP, MP4 or PDF. Maximum 10 MB each.</p>
          <Input
            className="mt-3"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf"
            onChange={(event) => handleFiles(Array.from(event.target.files ?? []))}
          />
          {files.length > 0 && <p className="mt-2 text-sm">{files.length} Pilot attachment{files.length === 1 ? '' : 's'} selected.</p>}
        </div>

        <div className="flex items-start gap-3">
          <Checkbox id={`pilot-anonymous-${scenario.id}`} checked={anonymous} onCheckedChange={(checked) => setAnonymous(checked === true)} />
          <Label htmlFor={`pilot-anonymous-${scenario.id}`} className="leading-relaxed">
            Display this simulated report as anonymous in participant-facing presentation. Authenticated ownership is still retained for RLS and audit purposes.
          </Label>
        </div>

        {!canSubmit && (
          <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            Complete all required simulation fields before submitting.
          </div>
        )}

        <Button className="w-full" size="lg" onClick={submit} disabled={!canSubmit || loading} variant={emergency ? 'destructive' : 'default'}>
          {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : emergency ? <Siren className="mr-2 h-5 w-5" /> : <MapPin className="mr-2 h-5 w-5" />}
          {emergency ? 'Submit Emergency Simulation' : 'Submit Simulated Report'}
        </Button>
      </CardContent>
    </Card>
  );
}
