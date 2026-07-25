import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  BookOpen,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Loader2,
  MapPinned,
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PILOT_ROUTES } from '@/config/pilot';
import { usePilotMode } from '@/contexts/PilotModeContext';
import { usePilotGuide } from '@/hooks/pilot/usePilotGuide';
import { useToast } from '@/hooks/use-toast';
import { recordPilotFeatureTest } from '@/services/pilot/pilotCoreService';
import {
  isPublicPilotResource,
  loadPilotResourceDocuments,
  PILOT_RESOURCE_DOCUMENT_FALLBACKS,
  PILOT_SAFETY_GUIDE_FALLBACK,
} from '@/services/pilot/pilotExperienceService';
import type { PilotSafetyDocument } from '@/types/pilotExperience';

const resources = [
  {
    title: 'Academic Fraud & Fake Admin Services',
    points: [
      'Report paid mark-change offers, courses or enrolment access for sale.',
      'Report fake sick letters, WIL placements, academic records or certificates.',
      'Report people impersonating university administration or registration services.',
      'Keep screenshots, usernames, phone numbers, links, payment requests and dates.',
      'Do not pay, confront the person or circulate unverified allegations publicly.',
    ],
  },
  {
    title: 'Standard Reporting',
    points: [
      'Choose the approved scenario that matches what you are reporting.',
      'Give a clear factual description without unrelated personal information.',
      'Use a readable building, gate, residence, street or landmark when location is required.',
      'Attach only relevant evidence and never place yourself at risk to capture media.',
      'Keep the case reference number and follow authorised updates in My Cases.',
    ],
  },
  {
    title: 'Campus & Residence Navigation',
    points: [
      'The Pilot home shows both managed safety information and campus/residence images.',
      'Use the Building Structure Guide for Building 1-60 and verified service routes.',
      'Confirm time-sensitive rooms with reception, CPS or Facilities before travelling.',
      'Use the App User Guide for Official and Pilot navigation instructions.',
      'Internal CCSF staffing, finances and operating documents are not public resources.',
    ],
  },
  {
    title: 'Privacy, Evidence & Emergency Boundaries',
    points: [
      'Private evidence is accessed through controlled links rather than public URLs.',
      'Keep original files and avoid editing evidence that may support a formal process.',
      'The Pilot is an isolated testing environment and does not dispatch emergency services.',
      'For immediate danger use verified CPS, SAPS, medical or emergency channels.',
      'Protect victim dignity and do not publish private media or rumours.',
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

const fileExtension = (resourceDocument: PilotSafetyDocument) => {
  const name = resourceDocument.file_name ?? resourceDocument.download_url;
  return name.split('.').pop()?.toUpperCase() ?? 'FILE';
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return null;
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
};

export default function PilotResources() {
  const { toast } = useToast();
  const { program, session } = usePilotMode();
  const guide = usePilotGuide({ autoOpen: false });
  const [documents, setDocuments] = useState<PilotSafetyDocument[]>(PILOT_RESOURCE_DOCUMENT_FALLBACKS);
  const [documentLoading, setDocumentLoading] = useState(true);

  useEffect(() => {
    let current = true;
    const load = async () => {
      if (!program) return;
      setDocumentLoading(true);
      const next = await loadPilotResourceDocuments(program.id);
      if (current) {
        setDocuments(next.filter(isPublicPilotResource));
        setDocumentLoading(false);
      }
    };
    void load();
    return () => { current = false; };
  }, [program]);

  const primaryDocument = useMemo(
    () => documents.find((resourceDocument) => resourceDocument.document_type === 'safety_guide') ?? PILOT_SAFETY_GUIDE_FALLBACK,
    [documents],
  );

  const recordDownload = async (resourceDocument: PilotSafetyDocument, action: 'download' | 'open') => {
    if (!program || !session) return;
    await recordPilotFeatureTest({
      programId: program.id,
      sessionId: session.id,
      featureKey: `resource_${resourceDocument.document_type}_${action}`,
      outcome: 'passed',
      metadata: {
        resource_count: documents.length,
        document_id: resourceDocument.id,
        document_title: resourceDocument.title,
        document_version: resourceDocument.version,
        document_url: resourceDocument.download_url,
        file_type: fileExtension(resourceDocument),
      },
    }).catch(() => undefined);
  };

  const downloadDocument = async (resourceDocument: PilotSafetyDocument) => {
    await recordDownload(resourceDocument, 'download');
    const anchor = window.document.createElement('a');
    anchor.href = resourceDocument.download_url;
    anchor.download = resourceDocument.file_name ?? `CCSF-public-resource-v${resourceDocument.version}`;
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    toast({ title: `${resourceDocument.title} download started` });
  };

  const openDocument = async (resourceDocument: PilotSafetyDocument) => {
    await recordDownload(resourceDocument, 'open');
    window.open(resourceDocument.download_url, '_blank', 'noopener,noreferrer');
  };

  const printResources = async () => {
    if (program && session) {
      await recordPilotFeatureTest({
        programId: program.id,
        sessionId: session.id,
        featureKey: 'campus_guide_document_library_print',
        outcome: 'passed',
        metadata: { resource_count: documents.length },
      }).catch(() => undefined);
    }
    window.print();
  };

  return (
    <div className="min-h-screen bg-background print:bg-white" data-testid="pilot-safety-guide-page">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col justify-between gap-3 print:hidden sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild><Link to={PILOT_ROUTES.landing}><ArrowLeft className="mr-2 h-4 w-4" />Pilot Home</Link></Button>
            <Button variant="outline" asChild data-testid="resources-official-portal"><Link to="/dashboard"><ArrowLeftRight className="mr-2 h-4 w-4" />Official Student Portal</Link></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={guide.openGuide} disabled={guide.loading}><BookOpen className="mr-2 h-4 w-4" />Open User Guide</Button>
            <Button variant="outline" onClick={() => void printResources()}><Printer className="mr-2 h-4 w-4" />Print This Page</Button>
            <Button onClick={() => void downloadDocument(primaryDocument)} disabled={documentLoading}>
              {documentLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download Campus Handbook
            </Button>
          </div>
        </div>

        <PilotBanner className="mb-6 print:hidden" />

        <Card className="mb-8 overflow-hidden border-[#F2A900]/50 shadow-large">
          <CardContent className="grid gap-6 bg-gradient-to-br from-[#002F6C] via-[#0055A5] to-[#002F6C] p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-5 w-fit rounded-xl bg-white p-3"><InstitutionBrand size="header" themeOverride="light" /></div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#F2A900]">My CCSF public student resources</p>
              <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Campus Guide, Building Directory & App User Guide</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85 sm:text-base">
                Download student-facing TUT and CCSF branded information for campus navigation, Building 1-60, student services, app use, academic-scam reporting, evidence protection and safety guidance.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-white/10 px-3 py-2">{documents.length} public documents</span>
                <span className="rounded-full bg-white/10 px-3 py-2">Premium branded PDFs</span>
                <span className="rounded-full bg-white/10 px-3 py-2">Student-safe content only</span>
              </div>
            </div>
            <ShieldCheck className="hidden h-32 w-32 text-[#F2A900]/35 lg:block" aria-hidden="true" />
          </CardContent>
        </Card>

        <Card className="mb-8 border-[#0055A5]/30 shadow-md print:hidden" data-testid="pilot-document-library">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Downloadable public documents</CardTitle>
            <CardDescription>Internal operating structures, staffing allocations, finances and governance records are deliberately excluded from this student library.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {documents.map((resourceDocument) => {
              const DocumentIcon = resourceDocument.document_type === 'quick_reference' ? MapPinned : resourceDocument.document_type === 'other' ? BookOpen : ShieldCheck;
              const size = formatFileSize(resourceDocument.file_size_bytes);
              return (
                <article key={resourceDocument.id} className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="rounded-xl bg-[#002F6C]/10 p-3 text-[#002F6C] dark:bg-[#F2A900]/15 dark:text-[#F2A900]"><DocumentIcon className="h-7 w-7" /></div>
                    <div className="flex flex-wrap justify-end gap-2"><Badge variant="secondary">{fileExtension(resourceDocument)}</Badge><Badge variant="outline">v{resourceDocument.version}</Badge></div>
                  </div>
                  <h2 className="mt-4 text-lg font-extrabold leading-snug">{resourceDocument.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{resourceDocument.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground"><span>Published {resourceDocument.publication_date}</span>{size && <span>• {size}</span>}</div>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <Button onClick={() => void downloadDocument(resourceDocument)}><Download className="mr-2 h-4 w-4" />Download</Button>
                    <Button variant="outline" onClick={() => void openDocument(resourceDocument)}><ExternalLink className="mr-2 h-4 w-4" />Open document</Button>
                  </div>
                </article>
              );
            })}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.38fr]">
          <div className="grid gap-6 sm:grid-cols-2">
            {resources.map((resource) => (
              <Card key={resource.title} className="break-inside-avoid shadow-md print:border-gray-300 print:shadow-none">
                <CardHeader><CardTitle className="flex items-center gap-2"><FileCheck2 className="h-5 w-5" />{resource.title}</CardTitle><CardDescription>Public student guidance</CardDescription></CardHeader>
                <CardContent><ul className="space-y-3">{resource.points.map((point) => <li key={point} className="flex gap-2 text-sm leading-6"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" /><span>{point}</span></li>)}</ul></CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-6">
            <Card className="shadow-md print:hidden">
              <CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" />Pilot Guide Settings</CardTitle><CardDescription>Your guide preference follows your Pilot profile across devices.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg bg-muted p-3 text-sm">
                  {guide.loading ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading guide preference</span> : guide.preferences?.guide_completed_at ? <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />Guide completed</span> : guide.preferences?.guide_dismissed_at ? <span>Automatic guide is dismissed. It can still be opened manually.</span> : <span>Automatic first-login guide is enabled.</span>}
                </div>
                <Button className="w-full" variant="outline" onClick={guide.openGuide} disabled={guide.loading}><BookOpen className="mr-2 h-4 w-4" />Reopen Guide</Button>
                <Button className="w-full" variant="outline" onClick={() => void guide.resetGuide()} disabled={guide.saving}><RefreshCw className="mr-2 h-4 w-4" />Reset Guide Across Devices</Button>
              </CardContent>
            </Card>

            <Card className="border-red-300 bg-red-50 shadow-md dark:bg-red-950/25">
              <CardHeader><CardTitle className="flex items-center gap-2"><PhoneCall className="h-5 w-5" />Actual Emergency Contacts</CardTitle><CardDescription>Use verified emergency services for a real incident.</CardDescription></CardHeader>
              <CardContent className="space-y-2">
                {supportContacts.map((contact) => <a key={contact.label} href={`tel:${contact.value.replace(/\s/g, '')}`} className="flex items-center justify-between rounded-lg border bg-background p-3 text-sm transition hover:border-primary"><span>{contact.label}</span><strong>{contact.value}</strong></a>)}
                <p className="pt-2 text-xs leading-5 text-muted-foreground">Use the campus-specific CPS number displayed through verified TUT or My CCSF channels. The Pilot itself does not dispatch emergency services.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <PilotUserGuideDialog open={guide.open} step={guide.step} saving={guide.saving} onStepChange={guide.setStep} onClose={guide.closeGuide} onSkip={guide.skipGuide} onComplete={guide.completeGuide} />
    </div>
  );
}
