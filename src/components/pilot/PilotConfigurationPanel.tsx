import { useState } from 'react';
import { Loader2, PlusCircle, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CAMPUS_LABELS, PILOT_CAMPUS_VALUES } from '@/config/pilot';
import { createPilotProgram, createPilotScenario, updatePilotProgram } from '@/services/pilot/pilotAdminService';
import type { CampusLocation, PilotProgram, PilotScenarioType } from '@/types/pilot';

export function PilotConfigurationPanel({
  programs,
  selectedProgram,
  onRefresh,
}: {
  programs: PilotProgram[];
  selectedProgram: PilotProgram | null;
  onRefresh: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [retentionDays, setRetentionDays] = useState('30');
  const [campuses, setCampuses] = useState<CampusLocation[]>([]);
  const [scenarioTitle, setScenarioTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [scenarioType, setScenarioType] = useState<PilotScenarioType>('standard_report');

  const createProgram = async () => {
    if (!name.trim() || campuses.length === 0) return;
    setLoading(true);
    try {
      await createPilotProgram({
        name: name.trim(),
        description: description.trim() || null,
        status: 'draft',
        eligible_campuses: campuses,
        retention_days: Number(retentionDays) || 30,
      });
      setName('');
      setDescription('');
      setCampuses([]);
      await onRefresh();
      toast({ title: 'Pilot programme created' });
    } catch (error) {
      toast({ title: 'Programme creation failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const createScenario = async () => {
    if (!selectedProgram || !scenarioTitle.trim() || !instructions.trim()) return;
    setLoading(true);
    try {
      await createPilotScenario({
        program_id: selectedProgram.id,
        title: scenarioTitle.trim(),
        instructions: instructions.trim(),
        scenario_type: scenarioType,
        requires_location: ['location_test', 'live_tracking_test', 'emergency_simulation'].includes(scenarioType),
        requires_live_tracking: scenarioType === 'live_tracking_test',
        requires_attachment: scenarioType === 'attachment_test',
        requires_notification: ['notification_test', 'end_to_end'].includes(scenarioType),
        requires_resource_download: scenarioType === 'resource_download',
      });
      setScenarioTitle('');
      setInstructions('');
      await onRefresh();
      toast({ title: 'Pilot scenario created' });
    } catch (error) {
      toast({ title: 'Scenario creation failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleCampus = (campus: CampusLocation, checked: boolean) => {
    setCampuses((current) => checked ? [...current, campus] : current.filter((item) => item !== campus));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" /> Programme Configuration</CardTitle><CardDescription>Create a controlled programme. It remains draft until explicitly activated.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Programme name</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} /></div>
          <div className="space-y-2"><Label>Retention days</Label><Input type="number" min={7} max={90} value={retentionDays} onChange={(event) => setRetentionDays(event.target.value)} /></div>
          <div className="space-y-2">
            <Label>Eligible campuses</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {PILOT_CAMPUS_VALUES.map((campus) => <Label key={campus} className="flex items-center gap-2 rounded-lg border p-3"><Checkbox checked={campuses.includes(campus)} onCheckedChange={(checked) => toggleCampus(campus, checked === true)} />{CAMPUS_LABELS[campus]}</Label>)}
            </div>
          </div>
          <Button className="w-full" onClick={createProgram} disabled={loading || !name.trim() || campuses.length === 0}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Create Draft Programme</Button>
          {selectedProgram && <div className="flex flex-wrap gap-2 border-t pt-4"><Button size="sm" variant="outline" onClick={() => void updatePilotProgram(selectedProgram.id, { status: 'active', starts_at: new Date().toISOString() }).then(onRefresh)}>Activate</Button><Button size="sm" variant="outline" onClick={() => void updatePilotProgram(selectedProgram.id, { status: 'paused' }).then(onRefresh)}>Pause</Button><Button size="sm" variant="outline" onClick={() => void updatePilotProgram(selectedProgram.id, { status: 'completed', ends_at: new Date().toISOString() }).then(onRefresh)}>Complete</Button></div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Scenario Configuration</CardTitle><CardDescription>{selectedProgram ? `Add a test scenario to ${selectedProgram.name}.` : 'Select or create a programme first.'}</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Scenario title</Label><Input value={scenarioTitle} onChange={(event) => setScenarioTitle(event.target.value)} /></div>
          <div className="space-y-2"><Label>Scenario type</Label><Select value={scenarioType} onValueChange={(value) => setScenarioType(value as PilotScenarioType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['standard_report','emergency_simulation','location_test','live_tracking_test','attachment_test','notification_test','resource_download','end_to_end'].map((value) => <SelectItem key={value} value={value}>{value.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Participant instructions</Label><Textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={5} /></div>
          <Button className="w-full" onClick={createScenario} disabled={loading || !selectedProgram || !scenarioTitle.trim() || !instructions.trim()}><PlusCircle className="mr-2 h-4 w-4" /> Add Scenario</Button>
          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Feature requirements are derived from the selected scenario type and remain inside Pilot tables and services.</div>
        </CardContent>
      </Card>
    </div>
  );
}
