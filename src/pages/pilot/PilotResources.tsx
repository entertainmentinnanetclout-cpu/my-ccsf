import { ArrowLeft, Download, FileCheck2, PhoneCall, Printer, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PilotBanner } from '@/components/pilot/PilotBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PILOT_ROUTES } from '@/config/pilot';
import { usePilotMode } from '@/contexts/PilotModeContext';
import { recordPilotFeatureTest } from '@/services/pilot/pilotCoreService';
import { useToast } from '@/hooks/use-toast';

const resources = [
  {
    title: 'Emergency Reporting Checklist',
    points: [
      'Move to a safe location before using a digital reporting tool.',
      'For an actual emergency, use institutionally verified CPS or emergency contacts immediately.',
      'State the exact campus, building, gate, residence or nearest landmark.',
      'Describe what is happening now and whether anyone needs urgent medical assistance.',
      'Do not place yourself at risk to capture photographs or video.',
    ],
  },
  {
    title: 'Evidence and Privacy Guide',
    points: [
      'Upload only material relevant to the controlled test scenario.',
      'Do not upload real confidential evidence during the Pilot unless formally authorised.',
      'Remove unrelated personal information from test documents.',
      'Pilot attachments are private and are accessed through short-lived signed links.',
      'Pilot files follow the programme retention and deletion process.',
    ],
  },
  {
    title: 'Location Permission Guide',
    points: [
      'Grant location permission only when you understand why it is requested.',
      'Check that the displayed position and accuracy are reasonable.',
      'Stop Pilot live tracking when the location scenario is complete.',
      'Pilot tracking uses a separate browser key and isolated database table.',
      'A real emergency requires direct contact with verified emergency services.',
    ],
  },
];

export default function PilotResources() {
  const { toast } = useToast();
  const { program, session } = usePilotMode();

  const recordDownload = async (featureKey: string) => {
    if (!program || !session) return;
    await recordPilotFeatureTest({
      programId: program.id,
      sessionId: session.id,
      featureKey,
      outcome: 'passed',
      metadata: { resource_count: resources.length },
    }).catch(() => undefined);
  };

  const printResources = async () => {
    await recordDownload('safety_resource_print_pdf');
    window.print();
  };

  const downloadText = async () => {
    await recordDownload('safety_resource_download');
    const content = resources.map((resource) => `${resource.title}\n${resource.points.map((point) => `• ${point}`).join('\n')}`).join('\n\n');
    const blob = new Blob([`CCSF Controlled Pilot Safety Resources\n\n${content}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'CCSF-Controlled-Pilot-Safety-Resources.txt';
    anchor.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Safety resource downloaded' });
  };

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="print:hidden">
          <PilotBanner className="mb-6" />
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <Button variant="outline" asChild><Link to={PILOT_ROUTES.landing}><ArrowLeft className="mr-2 h-4 w-4" /> Pilot Home</Link></Button>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void downloadText()}><Download className="mr-2 h-4 w-4" /> Download</Button>
              <Button onClick={() => void printResources()}><Printer className="mr-2 h-4 w-4" /> Print / Save as PDF</Button>
            </div>
          </div>
        </div>

        <div className="mb-8 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary print:text-black" />
          <h1 className="mt-3 text-3xl font-bold">CCSF Controlled Pilot Safety Resources</h1>
          <p className="mt-2 text-muted-foreground print:text-gray-700">Simulation guidance for testing the digital safety workflow.</p>
        </div>

        <div className="grid gap-6">
          {resources.map((resource) => (
            <Card key={resource.title} className="break-inside-avoid shadow-md print:border-gray-300 print:shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileCheck2 className="h-5 w-5" /> {resource.title}</CardTitle>
                <CardDescription>Controlled Pilot guidance</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {resource.points.map((point) => <li key={point} className="flex gap-3 text-sm leading-relaxed"><span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary print:bg-black" />{point}</li>)}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6 border-amber-300 bg-amber-50 print:border-black print:bg-white">
          <CardContent className="flex items-start gap-3 py-5">
            <PhoneCall className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div><p className="font-bold">Actual emergency</p><p className="text-sm">This document does not replace emergency contact procedures. Use institutionally verified CPS and emergency-service details for a real incident.</p></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
