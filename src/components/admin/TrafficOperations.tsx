import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Camera,
  CarFront,
  CheckCircle2,
  CircleParking,
  Clock3,
  DoorOpen,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
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
import { RoadSafetyNotices } from '@/components/traffic/RoadSafetyNotices';
import {
  listTrafficPermitTemplates,
  listTrafficStudentPermits,
  listTrafficVisitorPasses,
  subscribeToTrafficOperations,
  trafficErrorMessage,
  updateStudentPermitStatus,
  updateVisitorPassStatus,
  uploadTrafficPermitTemplate,
} from '@/services/trafficService';
import {
  TRAFFIC_PASS_STATUS_LABELS,
  TRAFFIC_STUDENT_STATUS_LABELS,
  type TrafficCampus,
  type TrafficPassStatus,
  type TrafficPermitKind,
  type TrafficPermitTemplate,
  type TrafficStudentPermit,
  type TrafficStudentPermitStatus,
  type TrafficVisitorPass,
} from '@/types/traffic';

export function TrafficOperations({ campus }: { campus?: TrafficCampus }) {
  const { userProfile } = useAuth();
  const [visitorPasses, setVisitorPasses] = useState<TrafficVisitorPass[]>([]);
  const [studentPermits, setStudentPermits] = useState<TrafficStudentPermit[]>([]);
  const [templates, setTemplates] = useState<TrafficPermitTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [gateName, setGateName] = useState('Main gate');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [visitors, students, permitTemplates] = await Promise.all([
        listTrafficVisitorPasses(campus),
        listTrafficStudentPermits(campus),
        listTrafficPermitTemplates(campus),
      ]);
      setVisitorPasses(visitors);
      setStudentPermits(students);
      setTemplates(permitTemplates);
      setBackendMessage(null);
    } catch (error) {
      setBackendMessage(trafficErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [campus]);

  useEffect(() => {
    void load();
    return subscribeToTrafficOperations(() => void load(), campus);
  }, [campus, load]);

  const filteredVisitors = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return visitorPasses;
    return visitorPasses.filter((pass) => [
      pass.reference_code,
      pass.visitor_name,
      pass.vehicle_registration,
      pass.host_name,
    ].some((value) => value.toLowerCase().includes(normalized)));
  }, [searchTerm, visitorPasses]);

  const changeVisitorStatus = async (
    passId: string,
    status: TrafficPassStatus,
    notes?: string,
  ) => {
    setBusyId(passId);
    try {
      await updateVisitorPassStatus({ passId, status, gateName, notes });
      toast.success('Visitor pass updated to ' + TRAFFIC_PASS_STATUS_LABELS[status] + '.');
      await load();
    } catch (error) {
      toast.error(trafficErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const changeStudentStatus = async (
    permitId: string,
    status: TrafficStudentPermitStatus,
    notes?: string,
  ) => {
    setBusyId(permitId);
    try {
      await updateStudentPermitStatus({ permitId, status, notes });
      toast.success('Student permit updated to ' + TRAFFIC_STUDENT_STATUS_LABELS[status] + '.');
      await load();
    } catch (error) {
      toast.error(trafficErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const totals = {
    pendingVisitors: visitorPasses.filter((pass) => pass.status === 'pending').length,
    approvedToday: visitorPasses.filter((pass) => pass.status === 'approved').length,
    onCampus: visitorPasses.filter((pass) => pass.status === 'checked_in').length,
    pendingStudents: studentPermits.filter((permit) => permit.status === 'pending').length,
  };

  return (
    <div className="space-y-6" data-testid="traffic-operations">
      <Card className="overflow-hidden border-[#F2A900]/60">
        <CardContent className="flex flex-col justify-between gap-5 bg-gradient-to-r from-[#002F6C] to-[#1A0D2B] p-6 text-white lg:flex-row lg:items-center">
          <div>
            <Badge className="bg-[#F2A900] text-[#002F6C]">Traffic department ú operational preview</Badge>
            <h2 className="mt-3 text-3xl font-black">Traffic Operations</h2>
            <p className="mt-2 text-sm text-white/70">
              Review parking requests, process gate access, issue student permits and onboard the official circular ticket image.
            </p>
          </div>
          <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </Button>
        </CardContent>
      </Card>

      {backendMessage && (
        <Alert className="border-orange-400/60 bg-orange-50 text-orange-950">
          <Clock3 className="h-4 w-4" />
          <AlertTitle>Supabase Traffic migration awaiting deployment</AlertTitle>
          <AlertDescription>{backendMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Clock3} label="Visitor requests pending" value={totals.pendingVisitors} />
        <StatCard icon={ShieldCheck} label="Approved for gate review" value={totals.approvedToday} />
        <StatCard icon={DoorOpen} label="Visitors on campus" value={totals.onCampus} />
        <StatCard icon={CircleParking} label="Student permits pending" value={totals.pendingStudents} />
      </div>

      <Tabs defaultValue="visitors">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-4">
          <TabsTrigger value="visitors">Visitor access</TabsTrigger>
          <TabsTrigger value="students">Student permits</TabsTrigger>
          <TabsTrigger value="templates">Permit template</TabsTrigger>
          <TabsTrigger value="safety">Road safety</TabsTrigger>
        </TabsList>

        <TabsContent value="visitors" className="mt-5 space-y-4">
          <Card>
            <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_240px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search reference, visitor, vehicle or host" />
              </div>
              <Input value={gateName} onChange={(event) => setGateName(event.target.value)} placeholder="Gate name" aria-label="Gate name for check-in events" />
            </CardContent>
          </Card>
          {isLoading ? <LoadingCard /> : filteredVisitors.length === 0 ? <EmptyCard message="No visitor parking requests are available for this campus." /> : (
            <div className="grid gap-4">
              {filteredVisitors.map((pass) => (
                <Card key={pass.id}>
                  <CardContent className="grid gap-4 p-5 xl:grid-cols-[1fr_auto] xl:items-center">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Info label="Reference" value={pass.reference_code} mono />
                      <Info label="Visitor" value={pass.visitor_name} />
                      <Info label="Vehicle" value={pass.vehicle_registration} />
                      <Info label="Host" value={pass.host_name} />
                      <Info label="Visit" value={pass.visit_date + ' ú ' + pass.expected_arrival.slice(0, 5)} />
                      <Info label="Campus" value={CAMPUS_LABELS[pass.campus]} />
                      <Info label="Phone" value={pass.visitor_phone} />
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Status</p>
                        <Badge className="mt-1" variant={pass.status === 'rejected' ? 'destructive' : pass.status === 'pending' ? 'outline' : 'default'}>
                          {TRAFFIC_PASS_STATUS_LABELS[pass.status]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 xl:max-w-64 xl:justify-end">
                      {pass.status === 'pending' && (
                        <>
                          <Button size="sm" disabled={busyId === pass.id} onClick={() => void changeVisitorStatus(pass.id, 'approved')}>
                            <CheckCircle2 className="mr-1 h-4 w-4" />Approve
                          </Button>
                          <Button size="sm" variant="destructive" disabled={busyId === pass.id} onClick={() => void changeVisitorStatus(pass.id, 'rejected', 'Request not approved. Contact Traffic for assistance.')}>
                            <XCircle className="mr-1 h-4 w-4" />Reject
                          </Button>
                        </>
                      )}
                      {pass.status === 'approved' && (
                        <Button size="sm" disabled={busyId === pass.id || !gateName.trim()} onClick={() => void changeVisitorStatus(pass.id, 'checked_in')}>
                          <DoorOpen className="mr-1 h-4 w-4" />Check in
                        </Button>
                      )}
                      {pass.status === 'checked_in' && (
                        <Button size="sm" variant="outline" disabled={busyId === pass.id} onClick={() => void changeVisitorStatus(pass.id, 'checked_out')}>
                          Check out
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="students" className="mt-5">
          {isLoading ? <LoadingCard /> : studentPermits.length === 0 ? <EmptyCard message="No student parking permit requests are available." /> : (
            <div className="grid gap-4 md:grid-cols-2">
              {studentPermits.map((permit) => (
                <Card key={permit.id}>
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Vehicle registration</p>
                        <p className="mt-1 text-xl font-black">{permit.vehicle_registration}</p>
                        <p className="text-sm text-muted-foreground">{[permit.vehicle_make, permit.vehicle_colour].filter(Boolean).join(' ú ') || 'Vehicle details not supplied'}</p>
                      </div>
                      <Badge variant={permit.status === 'rejected' ? 'destructive' : permit.status === 'pending' ? 'outline' : 'default'}>
                        {TRAFFIC_STUDENT_STATUS_LABELS[permit.status]}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Info label="Campus" value={CAMPUS_LABELS[permit.campus]} />
                      <Info label="Permit number" value={permit.permit_number ?? 'Not issued'} mono />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {permit.status === 'pending' && (
                        <>
                          <Button size="sm" disabled={busyId === permit.id} onClick={() => void changeStudentStatus(permit.id, 'active')}>
                            <CheckCircle2 className="mr-1 h-4 w-4" />Activate
                          </Button>
                          <Button size="sm" variant="destructive" disabled={busyId === permit.id} onClick={() => void changeStudentStatus(permit.id, 'rejected', 'Permit request not approved.')}>Reject</Button>
                        </>
                      )}
                      {permit.status === 'active' && (
                        <Button size="sm" variant="outline" disabled={busyId === permit.id} onClick={() => void changeStudentStatus(permit.id, 'suspended', 'Permit suspended by Traffic.')}>Suspend</Button>
                      )}
                      {permit.status === 'suspended' && (
                        <Button size="sm" disabled={busyId === permit.id} onClick={() => void changeStudentStatus(permit.id, 'active', 'Permit reactivated by Traffic.')}>Reactivate</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-5">
          <PermitTemplateOnboarding
            campus={campus}
            userId={userProfile?.id}
            templates={templates}
            onUploaded={load}
          />
        </TabsContent>

        <TabsContent value="safety" className="mt-5">
          <RoadSafetyNotices campus={campus} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PermitTemplateOnboarding({
  campus,
  userId,
  templates,
  onUploaded,
}: {
  campus?: TrafficCampus;
  userId?: string;
  templates: TrafficPermitTemplate[];
  onUploaded: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('Official circular parking permit');
  const [notes, setNotes] = useState('White circular permit with black institutional text.');
  const [permitKind, setPermitKind] = useState<TrafficPermitKind>('student');
  const [selectedCampus, setSelectedCampus] = useState<TrafficCampus | 'all'>(campus ?? 'all');
  const [isUploading, setIsUploading] = useState(false);
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : null, [file]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || !userId) return;
    setIsUploading(true);
    try {
      await uploadTrafficPermitTemplate({
        file,
        campus: selectedCampus === 'all' ? null : selectedCampus,
        createdBy: userId,
        name,
        notes,
        permitKind,
      });
      setFile(null);
      toast.success('Permit photo uploaded as a draft template.');
      await onUploaded();
    } catch (error) {
      toast.error(trafficErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5" />Onboard the physical permit</CardTitle>
          <p className="text-sm text-muted-foreground">
            Photograph or upload the real white circular ticket. It remains a private draft until the institutional layout is verified and activated.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="traffic-template-photo">Permit photo</Label>
              <Input id="traffic-template-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="traffic-template-name">Template name</Label>
              <Input id="traffic-template-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Permit type</Label>
                <Select value={permitKind} onValueChange={(value) => setPermitKind(value as TrafficPermitKind)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="student">Student</SelectItem><SelectItem value="visitor">Visitor</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Campus</Label>
                <Select value={selectedCampus} onValueChange={(value) => setSelectedCampus(value as TrafficCampus | 'all')} disabled={Boolean(campus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {!campus && <SelectItem value="all">All campuses</SelectItem>}
                    {PILOT_CAMPUS_VALUES.map((value) => <SelectItem key={value} value={value}>{CAMPUS_LABELS[value]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="traffic-template-notes">Verification notes</Label>
              <Textarea id="traffic-template-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} />
            </div>
            <Button type="submit" disabled={!file || !userId || isUploading}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Upload draft template
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <CardContent className="flex min-h-80 items-center justify-center bg-muted/30 p-6">
            {previewUrl ? (
              <img src={previewUrl} alt="Selected circular permit template preview" className="aspect-square max-h-72 rounded-full border-8 border-white object-cover shadow-xl" />
            ) : (
              <div className="flex aspect-square w-full max-w-64 flex-col items-center justify-center rounded-full border-8 border-black bg-white p-8 text-center text-black shadow-xl">
                <CarFront className="h-8 w-8" />
                <p className="mt-3 text-lg font-black">WHITE CIRCLE</p>
                <p className="mt-1 text-xs font-bold">BLACK TEXT TEMPLATE</p>
                <Badge variant="outline" className="mt-4 border-black text-black">Awaiting photo</Badge>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Uploaded drafts ({templates.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {templates.length === 0 ? <p className="text-sm text-muted-foreground">No permit templates uploaded yet.</p> : templates.slice(0, 6).map((template) => (
              <div key={template.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div><p className="text-sm font-bold">{template.name}</p><p className="text-xs text-muted-foreground">{template.permit_kind} ú {template.campus ? CAMPUS_LABELS[template.campus] : 'all campuses'}</p></div>
                <Badge variant="outline">{template.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof CarFront; label: string; value: number }) {
  return <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-black">{value}</p><p className="text-xs font-semibold text-muted-foreground">{label}</p></div></CardContent></Card>;
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p><p className={mono ? 'mt-1 font-mono text-sm font-bold' : 'mt-1 text-sm font-semibold'}>{value}</p></div>;
}

function LoadingCard() {
  return <Card><CardContent className="flex min-h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></CardContent></Card>;
}

function EmptyCard({ message }: { message: string }) {
  return <Card className="border-dashed"><CardContent className="flex min-h-40 items-center justify-center p-8 text-center text-sm text-muted-foreground">{message}</CardContent></Card>;
}
