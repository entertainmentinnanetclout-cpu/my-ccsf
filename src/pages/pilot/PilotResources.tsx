import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
  Loader2,
  PhoneCall,
  Printer,
  RefreshCw,
  Settings2,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PilotBanner } from '@/components/pilot/PilotBanner';
import { PilotUserGuideDialog } from '@/components/pilot/PilotUserGuideDialog';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PILOT_ROUTES } from '@/config/pilot';
import { usePilotMode } from '@/contexts/PilotModeContext';
import { usePilotGuide } from '@/hooks/pilot/usePilotGuide';
import { useToast } from '@/hooks/use-toast';
import { recordPilotFeatureTest } from '@/services/pilot/pilotCoreService';
import {
  loadPilotSafetyDocument,
  PILOT_SAFETY_GUIDE_FALLBACK,
} from '@/services/pilot/pilotExperienceService';
import type { PilotSafetyDocument } from '@/types/pilotExperience';

const resources = [
  {
    title: 'Standard Reporting',
    points: [
      'Choose the approved scenario that best matches the test you are completing.',
      'Give a clear title and description without including unrelated personal information.',
      'Confirm the readable building, gate, residence, street or landmark description.',
      'Attach only relevant test evidence and never place yourself at risk to capture media.',
      'Keep the case reference number and follow authorised status updates in My Cases.',
    ],
  },
  {
    title: 'Emergency Reporting',
    points: [
      'Emergency Test is a simulated workflow and does not dispatch CPS, SAPS or an ambulance.',
      'The form requires current location, a readable location result and explicit consent.',
      'Your registered student identity and campus are attached automatically.',
      'No long written explanation, category choice or attachment is required.',
      'For an actual emergency, contact verified emergency services immediately.',
    ],
  },
  {
    title: 'Location Permission Guide',
    points: [
      'Use the secure HTTPS version of My CCSF and allow location only when prompted by the Pilot.',
      'The app requests a high-accuracy fix first and may use a network fallback when necessary.',
      'Confirm that the readable address and accuracy appear reasonable before submitting.',
      'Coordinates are retained as supporting technical evidence, not the primary student-facing description.',
      'Stop live tracking when the authorised location scenario is complete.',
    ],
  },
  {
    title: 'Campus Safety Checklist',
    points: [
      'Move through well-lit, familiar routes and avoid isolated shortcuts after hours.',
      'Keep valuables concealed and report suspicious activity early through verified channels.',
      'Respect residence, access-control, parking and emergency-lane rules.',
      'Protect victim dignity: do not publish incident names, images or rumours on social media.',
      'Preserve evidence safely and allow authorised CPS or SAPS personnel to investigate.',
    ],
  },
  {
    title: 'Case Tracking and Notifications',
    points: [
      'Open the complete case card to see the status, timeline, location, evidence and assigned staff member.',
      'Unread staff updates appear in Support and remain linked to your authenticated profile.',
      'Do not create duplicate cases merely because a status has not changed immediately.',
      'Use the review system for Pilot usability feedback, not as a replacement for a safety report.',
      'Keep your phone number and emergency contact details updated in your student profile.',
    ],
  },
  {
    title: 'Privacy, Consent and Reviews',
    points: [
      'Pilot records are isolated from production incident and feedback tables.',
      'Private evidence and review screenshots use controlled access rather than public links.',
      'Emergency consent covers sharing your current location and registered profile with authorised Pilot staff.',
      'You can edit a review while unresolved and read an authorised staff response.',
      'Use factual, respectful feedback and avoid naming unrelated students or alleged offenders.',
    ],
  },
];

const supportContacts = [
  { label: 'Cellphone emergency', value: '112' },
  { label: 'SAPS emergency', value: '10111' },
  { label: 'Ambulance / fire', value: '10177' },
  { label: 'TUT Contact Centre', value: '086 110 2421' },
  { label: 'GBV Command Centre', value: '0800 428 428' },
];

export default function PilotResources() {
  const { toast } = useToast();
  const { program, session } = usePilotMode();
  const guide = usePilotGuide({ autoOpen: false });
  const [document, setDocument] = useState<PilotSafetyDocument>(PILOT_SAFETY_GUIDE_FALLBACK);
  const [documentLoading, setDocumentLoading] = useState(true);

  useEffect(() => {
    let current = true;
    const load = async () => {
      if (!program) return;
      setDocumentLoading(true);
      const next = await loadPilotSafetyDocument(program.id);
      if (current) {
        setDocument(next);
        setDocumentLoading(false);
      }
    };
    void load();
    return () => { current = false; };
  }, [program]);

  const recordDownload = async (featureKey: string) => {
    if (!program || !session) return;
    await recordPilotFeatureTest({
      programId: program.id,
      sessionId: session.id,
      featureKey,
      outcome: 'passed',
      metadata: {
        resource_count: resources.length,
        document_version: document.version,
        document_url: document.download_url,
      },
    }).catch(() => undefined);
  };

  const downloadPdf = async () => {
    await recordDownload('safety_guide_pdf_download');
    const anchor = window.document.createElement('a');
    anchor.href = document.download_url;
    anchor.download = `CCSF-Pilot-Safety-Guide-v${document.version}.pdf`;
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    toast({ title: 'CCSF Safety Guide download started' });
  };

  const printResources = async () => {
    await recordDownload('safety_resource_print_pdf');
    window.print();
  };

  return (
    <div className="min-h-screen bg-background print:bg-white" data-testid="pilot-safety-guide-page">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="print:hidden">
          <PilotBanner className="mb-6" />
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <Button variant="outline" asChild><Link to={PILOT_ROUTES.landing}><ArrowLeft className="mr-2 h-4 w-4" />Pilot Home</Link></Button>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={guide.openGuide} disabled={guide.loading}><BookOpen className="mr-2 h-4 w-4" />Open User Guide</Button>
              <Button variant="outline" onClick={() => void printResources()}><Printer className="mr-2 h-4 w-4" />Print This Page</Button>
              <Button onClick={() => void downloadPdf()} disabled={documentLoading}>
                {documentLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download Safety PDF
              </Button>
            </div>
          </div>
        </div>

        <Card className="mb-8 overflow-hidden border-[#F2A900]/50 shadow-large">
          <CardContent className="grid gap-6 bg-gradient-to-br from-[#002F6C] via-[#004A8F] to-[#002F6C] p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-5 w-fit rounded-xl bg-white p-3"><InstitutionBrand size="header" /></div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#F2A900]">CCSF Pilot Safety Guide</p>
              <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Safety resources students can keep</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85 sm:text-base">Use the interactive guide for first-time orientation and download the premium A4 handbook for reporting, privacy, location and safety guidance.</p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-white/10 px-3 py-2">Version {document.version}</span>
                <span className="rounded-full bg-white/10 px-3 py-2">Published {document.publication_date}</span>
                <span className="rounded-full bg-white/10 px-3 py-2">A4 print-ready PDF</span>
              </div>
            </div>
            <ShieldCheck className="hidden h-32 w-32 text-[#F2A900]/35 lg:block" aria-hidden="true" />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.38fr]">
          <div className="grid gap-6 sm:grid-cols-2">
            {resources.map((resource) => (
              <Card key={resource.title} className="break-inside-avoid shadow-md print:border-gray-300 print:shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileCheck2 className="h-5 w-5" />{resource.title}</CardTitle>
                  <CardDescription>Controlled Pilot guidance</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {resource.points.map((point) => <li key={point} className="flex gap-3 text-sm leading-relaxed"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary print:bg-black" />{point}</li>)}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-6">
            <Card className="border-[#F2A900]/50 shadow-md print:hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" />Premium Safety PDF</CardTitle>
                <CardDescription>{document.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={() => void downloadPdf()} disabled={documentLoading}><Download className="mr-2 h-4 w-4" />Download PDF</Button>
                <Button variant="outline" className="w-full" asChild><a href={document.download_url} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open PDF</a></Button>
              </CardContent>
            </Card>

            <Card className="shadow-md print:hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" />Pilot Guide Settings</CardTitle>
                <CardDescription>Your guide preference is stored against your Pilot profile and follows you across devices.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg bg-muted p-3 text-sm">
                  {guide.loading ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading guide preference</span>
                  ) : guide.preferences?.guide_completed_at ? (
                    <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />Guide completed</span>
                  ) : guide.preferences?.guide_dismissed_at ? (
                    <span>Automatic guide is dismissed. It can still be opened manually.</span>
                  ) : (
                    <span>Automatic first-login guide is enabled.</span>
                  )}
                </div>
                <Button className="w-full" variant="outline" onClick={guide.openGuide} disabled={guide.loading}><BookOpen className="mr-2 h-4 w-4" />Reopen Guide</Button>
                <Button className="w-full" variant="outline" onClick={() => void guide.resetGuide()} disabled={guide.saving}><RefreshCw className="mr-2 h-4 w-4" />Reset Guide Across Devices</Button>
              </CardContent>
            </Card>

            <Card className="border-red-300 bg-red-50 shadow-md dark:bg-red-950/25">
              <CardHeader><CardTitle className="flex items-center gap-2"><PhoneCall className="h-5 w-5" />Actual Emergency Contacts</CardTitle><CardDescription>Use verified emergency services for a real incident.</CardDescription></CardHeader>
              <CardContent className="space-y-2">
                {supportContacts.map((contact) => (
                  <a key={contact.label} href={`tel:${contact.value.replace(/\s/g, '')}`} className="flex items-center justify-between rounded-lg border bg-background p-3 text-sm transition hover:border-primary">
                    <span>{contact.label}</span><strong>{contact.value}</strong>
                  </a>
                ))}
                <p className="pt-2 text-xs leading-5 text-muted-foreground">Use the campus-specific CPS number displayed through verified TUT or My CCSF channels. The Pilot itself does not dispatch emergency services.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <PilotUserGuideDialog
        open={guide.open}
        step={guide.step}
        saving={guide.saving}
        onStepChange={guide.setStep}
        onClose={guide.closeGuide}
        onSkip={guide.skipGuide}
        onComplete={guide.completeGuide}
      />
    </div>
  );
}
