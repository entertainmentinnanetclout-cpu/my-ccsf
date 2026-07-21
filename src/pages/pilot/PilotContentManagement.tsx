import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Download,
  FileText,
  Image,
  Loader2,
  MessageSquareText,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  Trash2,
  Upload,
} from 'lucide-react';
import { PilotBanner } from '@/components/pilot/PilotBanner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CAMPUS_LABELS } from '@/config/pilot';
import {
  ALL_PILOT_CAMPUSES,
  deletePilotCarouselSlide,
  deletePilotGuideStep,
  deletePilotReviewCategory,
  deletePilotReviewQuickCard,
  deletePilotSafetyDocument,
  loadPilotContentSnapshot,
  savePilotCarouselSlide,
  savePilotGuideStep,
  savePilotReviewCategory,
  savePilotReviewQuickCard,
  savePilotSafetyDocument,
  subscribeToPilotAdminContent,
  uploadPilotContentImage,
  uploadPilotSafetyPdf,
  type PilotContentSnapshot,
} from '@/services/pilot/pilotContentAdminService';
import { PILOT_SAFETY_GUIDE_FALLBACK } from '@/services/pilot/pilotExperienceService';
import type { CampusLocation } from '@/types/pilot';
import type { PilotCarouselAction, PilotCarouselIcon, PilotCarouselSlide, PilotGuideIcon, PilotGuideStep, PilotSafetyDocument } from '@/types/pilotExperience';
import type { PilotReviewCategoryOption, PilotReviewQuickCard, PilotReviewSentiment } from '@/types/pilotReviews';

const EMPTY_SNAPSHOT: PilotContentSnapshot = { slides: [], guideSteps: [], reviewCategories: [], quickCards: [], safetyDocuments: [] };
const now = () => new Date().toISOString();
const toLocalInput = (value: string | null) => value ? new Date(value).toISOString().slice(0, 16) : '';
const fromLocalInput = (value: string) => value ? new Date(value).toISOString() : null;

const newSlide = (userId: string | null): PilotCarouselSlide => ({
  id: '', program_id: null, title: '', description: '', eyebrow: 'My CCSF Pilot', icon_key: 'shield',
  image_url: null, image_alt: null, image_fit: 'contain', button_label: null, action_key: 'none',
  campus_targets: [...ALL_PILOT_CAMPUSES], display_order: 100, is_active: true, starts_at: null, expires_at: null,
  created_by: userId, updated_by: userId, created_at: now(), updated_at: now(),
});

const newGuideStep = (userId: string | null): PilotGuideStep => ({
  id: '', step_key: '', title: '', description: '', accent: 'Pilot guide', icon_key: 'shield', display_order: 8,
  is_active: true, created_by: userId, updated_by: userId, created_at: now(), updated_at: now(),
});

const newCategory = (userId: string | null): PilotReviewCategoryOption => ({
  key: '', label: '', description: '', display_order: 100, is_active: true,
  created_by: userId, updated_by: userId, created_at: now(), updated_at: now(),
});

const newQuickCard = (userId: string | null): PilotReviewQuickCard => ({
  id: '', label: '', category_key: 'other', sentiment: 'neutral', display_order: 100, is_active: true,
  created_by: userId, updated_by: userId, created_at: now(), updated_at: now(),
});

const newDocument = (userId: string | null): PilotSafetyDocument => ({
  ...PILOT_SAFETY_GUIDE_FALLBACK,
  id: '', version: '1.1', publication_date: new Date().toISOString().slice(0, 10), storage_path: null,
  file_name: null, file_size_bytes: null, campus_targets: [...ALL_PILOT_CAMPUSES], created_by: userId,
  updated_by: userId, created_at: now(), updated_at: now(),
});

export default function PilotContentManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [snapshot, setSnapshot] = useState<PilotContentSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slide, setSlide] = useState<PilotCarouselSlide | null>(null);
  const [guideStep, setGuideStep] = useState<PilotGuideStep | null>(null);
  const [category, setCategory] = useState<PilotReviewCategoryOption | null>(null);
  const [quickCard, setQuickCard] = useState<PilotReviewQuickCard | null>(null);
  const [document, setDocument] = useState<PilotSafetyDocument | null>(null);
  const [slideImage, setSlideImage] = useState<File | null>(null);
  const [safetyPdf, setSafetyPdf] = useState<File | null>(null);

  const refresh = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      setSnapshot(await loadPilotContentSnapshot());
    } catch (error) {
      toast({ title: 'Pilot content unavailable', description: error instanceof Error ? error.message : 'Unable to load content.', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => subscribeToPilotAdminContent(() => void refresh()), [refresh]);

  const activeSafetyDocument = useMemo(
    () => snapshot.safetyDocuments.filter((item) => item.document_type === 'safety_guide').sort((a, b) => b.publication_date.localeCompare(a.publication_date))[0] ?? null,
    [snapshot.safetyDocuments],
  );

  const execute = async (operation: () => Promise<unknown>, success: string, close: () => void) => {
    setSaving(true);
    try {
      await operation();
      toast({ title: success });
      close();
      await refresh();
    } catch (error) {
      toast({ title: 'Change was not saved', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const saveSlide = async () => {
    if (!slide || !slide.title.trim() || !slide.description.trim()) return;
    await execute(async () => {
      let imageUrl = slide.image_url;
      if (slideImage) imageUrl = await uploadPilotContentImage(slideImage);
      await savePilotCarouselSlide({
        ...slide,
        title: slide.title.trim(), description: slide.description.trim(), eyebrow: slide.eyebrow.trim(),
        image_url: imageUrl, image_alt: slide.image_alt?.trim() || null,
        button_label: slide.action_key === 'none' ? null : slide.button_label?.trim() || null,
        updated_by: user?.id ?? null,
      });
    }, slide.id ? 'Carousel slide updated' : 'Carousel slide created', () => { setSlide(null); setSlideImage(null); });
  };

  const saveGuide = () => guideStep && execute(
    () => savePilotGuideStep({ ...guideStep, step_key: guideStep.step_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'), title: guideStep.title.trim(), description: guideStep.description.trim(), accent: guideStep.accent.trim(), updated_by: user?.id ?? null }),
    guideStep.id ? 'Guide step updated' : 'Guide step created',
    () => setGuideStep(null),
  );

  const saveCategory = () => category && execute(
    () => savePilotReviewCategory({ ...category, key: category.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'), label: category.label.trim(), description: category.description.trim(), updated_by: user?.id ?? null }),
    'Review category saved',
    () => setCategory(null),
  );

  const saveCard = () => quickCard && execute(
    () => savePilotReviewQuickCard({ ...quickCard, label: quickCard.label.trim(), updated_by: user?.id ?? null }),
    'Quick-review card saved',
    () => setQuickCard(null),
  );

  const saveDocument = () => document && execute(async () => {
    let storagePath = document.storage_path;
    let fileName = document.file_name;
    let fileSize = document.file_size_bytes;
    if (safetyPdf) {
      const uploaded = await uploadPilotSafetyPdf(safetyPdf, document.version);
      storagePath = uploaded.storagePath;
      fileName = uploaded.fileName;
      fileSize = uploaded.fileSize;
    }
    await savePilotSafetyDocument({
      ...document,
      title: document.title.trim(), description: document.description.trim(), version: document.version.trim(),
      storage_path: storagePath, file_name: fileName, file_size_bytes: fileSize, updated_by: user?.id ?? null,
    });
  }, document.id ? 'Safety PDF version updated' : 'Safety PDF version created', () => { setDocument(null); setSafetyPdf(null); });

  if (loading) return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-primary" /></div>;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6" data-testid="pilot-content-management-page">
      <PilotBanner />
      <Card className="overflow-hidden border-primary/20 shadow-large">
        <CardHeader className="bg-gradient-to-r from-[#002F6C] to-[#004A8F] text-white">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl"><Settings2 className="h-6 w-6" />Pilot Content Management</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-white/80">Super-admin control for student carousel slides, guide content, review options and versioned Safety PDFs. Production content tables remain separate.</CardDescription>
            </div>
            <Button variant="secondary" onClick={() => void refresh(true)} disabled={refreshing}>{refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh</Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="carousel" className="space-y-5">
        <TabsList className="grid h-auto grid-cols-2 gap-2 p-2 lg:grid-cols-4">
          <TabsTrigger value="carousel"><Image className="mr-2 h-4 w-4" />Carousel</TabsTrigger>
          <TabsTrigger value="guide"><BookOpen className="mr-2 h-4 w-4" />User guide</TabsTrigger>
          <TabsTrigger value="reviews"><MessageSquareText className="mr-2 h-4 w-4" />Review options</TabsTrigger>
          <TabsTrigger value="pdf"><FileText className="mr-2 h-4 w-4" />Safety PDF</TabsTrigger>
        </TabsList>

        <TabsContent value="carousel" className="space-y-4">
          <SectionHeader title="Dashboard carousel" description="Manage image, heading, description, action, campus targeting, order, status and schedule." actionLabel="Add slide" onAction={() => setSlide(newSlide(user?.id ?? null))} />
          <div className="space-y-3">
            {snapshot.slides.map((item) => (
              <Card key={item.id}><CardContent className="flex flex-col justify-between gap-4 p-5 lg:flex-row lg:items-center">
                <div className="min-w-0"><div className="flex flex-wrap gap-2"><Badge>{item.display_order}</Badge><Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Active' : 'Inactive'}</Badge><Badge variant="outline">{item.campus_targets.length} campuses</Badge></div><p className="mt-3 font-bold">{item.title}</p><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p></div>
                <div className="flex gap-2"><Button variant="outline" onClick={() => setSlide({ ...item })}><Pencil className="mr-2 h-4 w-4" />Edit</Button><Button variant="destructive" onClick={() => { if (window.confirm('Delete this Pilot carousel slide?')) void execute(() => deletePilotCarouselSlide(item.id), 'Carousel slide deleted', () => undefined); }}><Trash2 className="h-4 w-4" /></Button></div>
              </CardContent></Card>
            ))}
            {!snapshot.slides.length && <EmptyState text="No Pilot carousel slides are configured." />}
          </div>
        </TabsContent>

        <TabsContent value="guide" className="space-y-4">
          <SectionHeader title="First-login user guide" description="Edit the ordered content shown to students across devices." actionLabel="Add step" onAction={() => setGuideStep(newGuideStep(user?.id ?? null))} />
          <div className="grid gap-4 md:grid-cols-2">
            {snapshot.guideSteps.map((item) => (
              <Card key={item.id}><CardHeader><div className="flex justify-between gap-3"><div><Badge variant="outline">Step {item.display_order + 1}</Badge><CardTitle className="mt-3 text-lg">{item.title}</CardTitle></div><Switch checked={item.is_active} onCheckedChange={(checked) => void execute(() => savePilotGuideStep({ ...item, is_active: checked }), 'Guide visibility updated', () => undefined)} /></div><CardDescription>{item.accent}</CardDescription></CardHeader><CardContent><p className="text-sm leading-6">{item.description}</p><div className="mt-4 flex gap-2"><Button variant="outline" onClick={() => setGuideStep({ ...item })}><Pencil className="mr-2 h-4 w-4" />Edit</Button><Button variant="destructive" onClick={() => { if (window.confirm('Delete this guide step?')) void execute(() => deletePilotGuideStep(item.id), 'Guide step deleted', () => undefined); }}><Trash2 className="h-4 w-4" /></Button></div></CardContent></Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>Review categories</CardTitle><CardDescription>Manage category labels, descriptions, order and availability.</CardDescription></div><Button size="sm" onClick={() => setCategory(newCategory(user?.id ?? null))}><Plus className="mr-2 h-4 w-4" />Add</Button></div></CardHeader><CardContent className="space-y-3">{snapshot.reviewCategories.map((item) => <div key={item.key} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><Badge variant="outline">{item.key}</Badge><Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Active' : 'Inactive'}</Badge></div><p className="mt-2 font-bold">{item.label}</p><p className="mt-1 text-sm text-muted-foreground">{item.description}</p></div><div className="flex gap-1"><Button size="icon" variant="outline" onClick={() => setCategory({ ...item })}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="destructive" onClick={() => { if (window.confirm('Delete this category? Existing reviews may require it, so deactivation is safer.')) void execute(() => deletePilotReviewCategory(item.key), 'Category deleted', () => undefined); }}><Trash2 className="h-4 w-4" /></Button></div></div></div>)}</CardContent></Card>
            <Card><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>Quick-review cards</CardTitle><CardDescription>Configure the cards students can select before submitting feedback.</CardDescription></div><Button size="sm" onClick={() => setQuickCard(newQuickCard(user?.id ?? null))}><Plus className="mr-2 h-4 w-4" />Add</Button></div></CardHeader><CardContent className="space-y-3">{snapshot.quickCards.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border p-4"><div><div className="flex gap-2"><Badge variant="outline">{item.category_key}</Badge><Badge variant={item.sentiment === 'negative' ? 'destructive' : item.sentiment === 'positive' ? 'default' : 'secondary'}>{item.sentiment}</Badge></div><p className="mt-2 font-bold">{item.label}</p></div><div className="flex gap-1"><Button size="icon" variant="outline" onClick={() => setQuickCard({ ...item })}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="destructive" onClick={() => { if (window.confirm('Delete this quick-review card?')) void execute(() => deletePilotReviewQuickCard(item.id), 'Quick card deleted', () => undefined); }}><Trash2 className="h-4 w-4" /></Button></div></div>)}</CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="pdf" className="space-y-4">
          <SectionHeader title="Versioned CCSF Safety PDF" description="Upload and schedule the handbook students download from the dashboard and Safety Guide tab." actionLabel="Add version" onAction={() => setDocument(newDocument(user?.id ?? null))} />
          {activeSafetyDocument && <Card className="border-[#F2A900]/50"><CardContent className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center"><div><Badge>Current version {activeSafetyDocument.version}</Badge><p className="mt-3 text-xl font-bold">{activeSafetyDocument.title}</p><p className="mt-1 text-sm text-muted-foreground">Published {activeSafetyDocument.publication_date} · {activeSafetyDocument.file_name || activeSafetyDocument.download_url}</p></div><Button variant="outline" onClick={() => setDocument({ ...activeSafetyDocument })}><Pencil className="mr-2 h-4 w-4" />Manage current version</Button></CardContent></Card>}
          <div className="space-y-3">{snapshot.safetyDocuments.map((item) => <Card key={item.id}><CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"><div><div className="flex gap-2"><Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Active' : 'Inactive'}</Badge><Badge variant="outline">v{item.version}</Badge></div><p className="mt-2 font-bold">{item.title}</p><p className="text-sm text-muted-foreground">{item.publication_date} · {item.file_name || item.download_url}</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => setDocument({ ...item })}><Pencil className="mr-2 h-4 w-4" />Edit</Button><Button variant="destructive" onClick={() => { if (window.confirm('Delete this Safety PDF version?')) void execute(() => deletePilotSafetyDocument(item.id), 'Safety PDF version deleted', () => undefined); }}><Trash2 className="h-4 w-4" /></Button></div></CardContent></Card>)}</div>
        </TabsContent>
      </Tabs>

      <SlideDialog value={slide} onChange={setSlide} image={slideImage} onImage={setSlideImage} saving={saving} onSave={() => void saveSlide()} />
      <GuideDialog value={guideStep} onChange={setGuideStep} saving={saving} onSave={() => void saveGuide()} />
      <CategoryDialog value={category} onChange={setCategory} saving={saving} onSave={() => void saveCategory()} />
      <QuickCardDialog value={quickCard} categories={snapshot.reviewCategories} onChange={setQuickCard} saving={saving} onSave={() => void saveCard()} />
      <DocumentDialog value={document} onChange={setDocument} pdf={safetyPdf} onPdf={setSafetyPdf} saving={saving} onSave={() => void saveDocument()} />
    </div>
  );
}

function SectionHeader({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
  return <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-xl font-extrabold">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div><Button onClick={onAction}><Plus className="mr-2 h-4 w-4" />{actionLabel}</Button></div>;
}
function EmptyState({ text }: { text: string }) { return <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{text}</div>; }
function CampusPicker({ value, onChange }: { value: CampusLocation[]; onChange: (value: CampusLocation[]) => void }) {
  return <div className="grid max-h-52 gap-2 overflow-y-auto rounded-xl border p-3 sm:grid-cols-2">{ALL_PILOT_CAMPUSES.map((campus) => <label key={campus} className="flex items-center gap-2 text-sm"><Checkbox checked={value.includes(campus)} onCheckedChange={(checked) => onChange(checked ? [...value, campus] : value.filter((item) => item !== campus))} />{CAMPUS_LABELS[campus]}</label>)}</div>;
}

function SlideDialog({ value, onChange, image, onImage, saving, onSave }: { value: PilotCarouselSlide | null; onChange: (value: PilotCarouselSlide | null) => void; image: File | null; onImage: (file: File | null) => void; saving: boolean; onSave: () => void }) {
  if (!value) return null;
  return <Dialog open onOpenChange={(open) => { if (!open) onChange(null); }}><DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{value.id ? 'Edit carousel slide' : 'Add carousel slide'}</DialogTitle><DialogDescription>Use approved branding assets and choose contain mode for logos.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Heading"><Input value={value.title} maxLength={140} onChange={(e) => onChange({ ...value, title: e.target.value })} /></Field><Field label="Eyebrow"><Input value={value.eyebrow} maxLength={80} onChange={(e) => onChange({ ...value, eyebrow: e.target.value })} /></Field><Field label="Description" wide><Textarea rows={4} value={value.description} maxLength={800} onChange={(e) => onChange({ ...value, description: e.target.value })} /></Field><Field label="Icon"><Select value={value.icon_key} onValueChange={(v) => onChange({ ...value, icon_key: v as PilotCarouselIcon })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['shield','report','emergency','location','cases','reviews','guide','limitations'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field><Field label="Button destination"><Select value={value.action_key} onValueChange={(v) => onChange({ ...value, action_key: v as PilotCarouselAction, button_label: v === 'none' ? null : value.button_label || 'Open' })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['none','report','emergency','cases','reviews','resources','support'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>{value.action_key !== 'none' && <Field label="Button label"><Input value={value.button_label ?? ''} maxLength={60} onChange={(e) => onChange({ ...value, button_label: e.target.value })} /></Field>}<Field label="Display order"><Input type="number" min={0} value={value.display_order} onChange={(e) => onChange({ ...value, display_order: Number(e.target.value) })} /></Field><Field label="Image fit"><Select value={value.image_fit} onValueChange={(v) => onChange({ ...value, image_fit: v as 'contain' | 'cover' })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="contain">Contain — logos/artwork</SelectItem><SelectItem value="cover">Cover — photography</SelectItem></SelectContent></Select></Field><Field label="Image URL"><Input value={value.image_url ?? ''} placeholder="https://..." onChange={(e) => onChange({ ...value, image_url: e.target.value || null })} /></Field><Field label="Image alt text"><Input value={value.image_alt ?? ''} onChange={(e) => onChange({ ...value, image_alt: e.target.value || null })} /></Field><Field label="Upload image" wide><Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => onImage(e.target.files?.[0] ?? null)} />{image && <p className="text-xs text-muted-foreground">Selected: {image.name}</p>}</Field><Field label="Starts at"><Input type="datetime-local" value={toLocalInput(value.starts_at)} onChange={(e) => onChange({ ...value, starts_at: fromLocalInput(e.target.value) })} /></Field><Field label="Expires at"><Input type="datetime-local" value={toLocalInput(value.expires_at)} onChange={(e) => onChange({ ...value, expires_at: fromLocalInput(e.target.value) })} /></Field><Field label="Campus targeting" wide><CampusPicker value={value.campus_targets} onChange={(campus_targets) => onChange({ ...value, campus_targets })} /></Field><label className="flex items-center gap-3"><Switch checked={value.is_active} onCheckedChange={(is_active) => onChange({ ...value, is_active })} /><span className="font-semibold">Active slide</span></label></div><DialogFooter><Button variant="outline" onClick={() => onChange(null)}>Cancel</Button><Button onClick={onSave} disabled={saving || !value.title.trim() || !value.description.trim() || !value.campus_targets.length || (value.action_key !== 'none' && !value.button_label?.trim())}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save slide</Button></DialogFooter></DialogContent></Dialog>;
}

function GuideDialog({ value, onChange, saving, onSave }: { value: PilotGuideStep | null; onChange: (value: PilotGuideStep | null) => void; saving: boolean; onSave: () => void }) {
  if (!value) return null;
  return <Dialog open onOpenChange={(open) => { if (!open) onChange(null); }}><DialogContent><DialogHeader><DialogTitle>Edit user-guide step</DialogTitle><DialogDescription>Changes appear across student devices after the next configuration refresh.</DialogDescription></DialogHeader><div className="space-y-4"><Field label="Step key"><Input value={value.step_key} disabled={Boolean(value.id)} onChange={(e) => onChange({ ...value, step_key: e.target.value })} /></Field><Field label="Title"><Input value={value.title} maxLength={140} onChange={(e) => onChange({ ...value, title: e.target.value })} /></Field><Field label="Accent"><Input value={value.accent} maxLength={80} onChange={(e) => onChange({ ...value, accent: e.target.value })} /></Field><Field label="Description"><Textarea rows={5} value={value.description} maxLength={900} onChange={(e) => onChange({ ...value, description: e.target.value })} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Icon"><Select value={value.icon_key} onValueChange={(v) => onChange({ ...value, icon_key: v as PilotGuideIcon })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['home','report','emergency','location','cases','notifications','reviews','limitations','shield'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field><Field label="Order"><Input type="number" min={0} max={99} value={value.display_order} onChange={(e) => onChange({ ...value, display_order: Number(e.target.value) })} /></Field></div><label className="flex items-center gap-3"><Switch checked={value.is_active} onCheckedChange={(is_active) => onChange({ ...value, is_active })} />Active step</label></div><DialogFooter><Button variant="outline" onClick={() => onChange(null)}>Cancel</Button><Button onClick={onSave} disabled={saving || !value.step_key.trim() || !value.title.trim() || !value.description.trim()}><Save className="mr-2 h-4 w-4" />Save step</Button></DialogFooter></DialogContent></Dialog>;
}

function CategoryDialog({ value, onChange, saving, onSave }: { value: PilotReviewCategoryOption | null; onChange: (value: PilotReviewCategoryOption | null) => void; saving: boolean; onSave: () => void }) {
  if (!value) return null;
  return <Dialog open onOpenChange={(open) => { if (!open) onChange(null); }}><DialogContent><DialogHeader><DialogTitle>Review category</DialogTitle><DialogDescription>Deactivate instead of deleting categories that already contain reviews.</DialogDescription></DialogHeader><div className="space-y-4"><Field label="Category key"><Input value={value.key} disabled={Boolean(value.created_by || value.created_at !== newCategory(null).created_at)} onChange={(e) => onChange({ ...value, key: e.target.value })} /></Field><Field label="Label"><Input value={value.label} onChange={(e) => onChange({ ...value, label: e.target.value })} /></Field><Field label="Description"><Textarea value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} /></Field><Field label="Order"><Input type="number" min={0} value={value.display_order} onChange={(e) => onChange({ ...value, display_order: Number(e.target.value) })} /></Field><label className="flex items-center gap-3"><Switch checked={value.is_active} onCheckedChange={(is_active) => onChange({ ...value, is_active })} />Active category</label></div><DialogFooter><Button variant="outline" onClick={() => onChange(null)}>Cancel</Button><Button onClick={onSave} disabled={saving || !value.key.trim() || !value.label.trim()}><Save className="mr-2 h-4 w-4" />Save category</Button></DialogFooter></DialogContent></Dialog>;
}

function QuickCardDialog({ value, categories, onChange, saving, onSave }: { value: PilotReviewQuickCard | null; categories: PilotReviewCategoryOption[]; onChange: (value: PilotReviewQuickCard | null) => void; saving: boolean; onSave: () => void }) {
  if (!value) return null;
  return <Dialog open onOpenChange={(open) => { if (!open) onChange(null); }}><DialogContent><DialogHeader><DialogTitle>Quick-review card</DialogTitle><DialogDescription>The card immediately populates the student review form but remains editable.</DialogDescription></DialogHeader><div className="space-y-4"><Field label="Card label"><Input value={value.label} maxLength={120} onChange={(e) => onChange({ ...value, label: e.target.value })} /></Field><Field label="Category"><Select value={value.category_key} onValueChange={(category_key) => onChange({ ...value, category_key })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>)}</SelectContent></Select></Field><Field label="Sentiment"><Select value={value.sentiment} onValueChange={(sentiment) => onChange({ ...value, sentiment: sentiment as PilotReviewSentiment })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="positive">Positive</SelectItem><SelectItem value="negative">Negative</SelectItem><SelectItem value="neutral">Neutral</SelectItem></SelectContent></Select></Field><Field label="Order"><Input type="number" min={0} value={value.display_order} onChange={(e) => onChange({ ...value, display_order: Number(e.target.value) })} /></Field><label className="flex items-center gap-3"><Switch checked={value.is_active} onCheckedChange={(is_active) => onChange({ ...value, is_active })} />Active card</label></div><DialogFooter><Button variant="outline" onClick={() => onChange(null)}>Cancel</Button><Button onClick={onSave} disabled={saving || !value.label.trim() || !value.category_key}><Save className="mr-2 h-4 w-4" />Save card</Button></DialogFooter></DialogContent></Dialog>;
}

function DocumentDialog({ value, onChange, pdf, onPdf, saving, onSave }: { value: PilotSafetyDocument | null; onChange: (value: PilotSafetyDocument | null) => void; pdf: File | null; onPdf: (file: File | null) => void; saving: boolean; onSave: () => void }) {
  if (!value) return null;
  return <Dialog open onOpenChange={(open) => { if (!open) onChange(null); }}><DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Safety PDF version</DialogTitle><DialogDescription>Upload a print-ready PDF or retain the approved static fallback URL.</DialogDescription></DialogHeader><div className="space-y-4"><Field label="Title"><Input value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} /></Field><Field label="Description"><Textarea rows={4} value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Version"><Input value={value.version} onChange={(e) => onChange({ ...value, version: e.target.value })} /></Field><Field label="Publication date"><Input type="date" value={value.publication_date} onChange={(e) => onChange({ ...value, publication_date: e.target.value })} /></Field></div><Field label="Fallback download URL"><Input value={value.download_url} onChange={(e) => onChange({ ...value, download_url: e.target.value })} /></Field><Field label="Upload replacement PDF"><Input type="file" accept="application/pdf,.pdf" onChange={(e) => onPdf(e.target.files?.[0] ?? null)} />{pdf && <p className="text-xs text-muted-foreground">Selected: {pdf.name} ({Math.round(pdf.size / 1024)} KB)</p>}</Field><Field label="Campus targeting"><CampusPicker value={value.campus_targets} onChange={(campus_targets) => onChange({ ...value, campus_targets })} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Starts at"><Input type="datetime-local" value={toLocalInput(value.starts_at)} onChange={(e) => onChange({ ...value, starts_at: fromLocalInput(e.target.value) })} /></Field><Field label="Expires at"><Input type="datetime-local" value={toLocalInput(value.expires_at)} onChange={(e) => onChange({ ...value, expires_at: fromLocalInput(e.target.value) })} /></Field></div><label className="flex items-center gap-3"><Switch checked={value.is_active} onCheckedChange={(is_active) => onChange({ ...value, is_active })} />Active document</label>{value.file_name && <div className="rounded-xl bg-muted p-4 text-sm"><Download className="mr-2 inline h-4 w-4" />Current managed file: {value.file_name}</div>}</div><DialogFooter><Button variant="outline" onClick={() => onChange(null)}>Cancel</Button><Button onClick={onSave} disabled={saving || !value.title.trim() || !value.version.trim() || !value.publication_date || !value.campus_targets.length}><Upload className="mr-2 h-4 w-4" />Save PDF version</Button></DialogFooter></DialogContent></Dialog>;
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <div className={`space-y-2 ${wide ? 'sm:col-span-2' : ''}`}><Label>{label}</Label>{children}</div>; }
