import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  GraduationCap,
  HeartPulse,
  Home,
  Loader2,
  LockKeyhole,
  MapPin,
  Phone,
  Save,
  Shield,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';
import { PremiumAvatarUpload } from '@/components/shared/PremiumAvatarUpload';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PROFILE_FIELDS = [
  'full_name',
  'first_name',
  'last_name',
  'phone_number',
  'student_number',
  'course',
  'year_of_study',
  'emergency_contact_name',
  'emergency_contact_phone',
  'emergency_contact_relationship',
  'blood_type',
  'allergies',
  'medical_aid_name',
] as const;

interface ProfileForm {
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  student_number: string;
  phone_number: string;
  campus: string;
  course: string;
  year_of_study: string;
  residence: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  blood_type: string;
  allergies: string;
  chronic_conditions: string;
  disability_status: string;
  special_needs: string;
  medical_aid_name: string;
  medical_aid_number: string;
}

const EMPTY_FORM: ProfileForm = {
  full_name: '',
  first_name: '',
  last_name: '',
  email: '',
  student_number: '',
  phone_number: '',
  campus: '',
  course: '',
  year_of_study: '',
  residence: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: '',
  blood_type: '',
  allergies: '',
  chronic_conditions: '',
  disability_status: '',
  special_needs: '',
  medical_aid_name: '',
  medical_aid_number: '',
};

const formatCampus = (value: string) => value
  ? value.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  : 'Campus not set';

const normalizePhone = (value: string) => value.replace(/[\s()-]/g, '');
const isValidPhone = (value: string) => !value || /^\+?[0-9]{7,15}$/.test(normalizePhone(value));

export default function InstitutionalProfile() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfileForm>(EMPTY_FORM);
  const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify(EMPTY_FORM));

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (cancelled) return;
      if (error || !data) {
        toast({ title: 'Profile unavailable', description: error?.message ?? 'Your profile could not be loaded.', variant: 'destructive' });
        setLoading(false);
        return;
      }
      const next: ProfileForm = {
        full_name: data.full_name ?? '',
        first_name: data.first_name ?? '',
        last_name: data.last_name ?? '',
        email: data.email ?? '',
        student_number: data.student_number ?? '',
        phone_number: data.phone_number ?? '',
        campus: data.campus ?? '',
        course: data.course ?? '',
        year_of_study: data.year_of_study?.toString() ?? '',
        residence: data.residence ?? '',
        emergency_contact_name: data.emergency_contact_name ?? '',
        emergency_contact_phone: data.emergency_contact_phone ?? '',
        emergency_contact_relationship: data.emergency_contact_relationship ?? '',
        blood_type: data.blood_type ?? '',
        allergies: data.allergies ?? '',
        chronic_conditions: data.chronic_conditions ?? '',
        disability_status: data.disability_status ?? '',
        special_needs: data.special_needs ?? '',
        medical_aid_name: data.medical_aid_name ?? '',
        medical_aid_number: data.medical_aid_number ?? '',
      };
      setFormData(next);
      setSavedSnapshot(JSON.stringify(next));
      setAvatarUrl(data.avatar_url);
      setLoading(false);
    };
    void loadProfile();
    return () => { cancelled = true; };
  }, [navigate, toast, user]);

  const profileCompletion = useMemo(() => {
    const complete = PROFILE_FIELDS.filter((field) => formData[field].trim().length > 0).length;
    return Math.round((complete / PROFILE_FIELDS.length) * 100);
  }, [formData]);

  const isDirty = JSON.stringify(formData) !== savedSnapshot;
  const completionState = profileCompletion >= 90
    ? { label: 'Emergency ready', colour: 'text-emerald-600', panel: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/25' }
    : profileCompletion >= 65
      ? { label: 'Nearly complete', colour: 'text-amber-600', panel: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/25' }
      : { label: 'Action required', colour: 'text-destructive', panel: 'border-destructive/25 bg-destructive/5' };

  const updateField = (field: keyof ProfileForm, value: string) => setFormData((current) => ({ ...current, [field]: value }));

  const saveProfile = async () => {
    if (!user) return;
    if (!formData.full_name.trim()) {
      toast({ title: 'Full name required', description: 'Enter the name that should appear on your My CCSF profile.', variant: 'destructive' });
      return;
    }
    if (!formData.student_number.trim()) {
      toast({ title: 'Student number required', description: 'A student number is required for institutional case routing.', variant: 'destructive' });
      return;
    }
    if (!isValidPhone(formData.phone_number) || !isValidPhone(formData.emergency_contact_phone)) {
      toast({ title: 'Check phone numbers', description: 'Use 7–15 digits, with an optional international + prefix.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const payload = {
      full_name: formData.full_name.trim(),
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      phone_number: normalizePhone(formData.phone_number),
      student_number: formData.student_number.trim(),
      course: formData.course.trim(),
      year_of_study: formData.year_of_study ? Number(formData.year_of_study) : null,
      emergency_contact_name: formData.emergency_contact_name.trim(),
      emergency_contact_phone: normalizePhone(formData.emergency_contact_phone),
      emergency_contact_relationship: formData.emergency_contact_relationship,
      blood_type: formData.blood_type,
      allergies: formData.allergies.trim(),
      chronic_conditions: formData.chronic_conditions.trim(),
      disability_status: formData.disability_status,
      special_needs: formData.special_needs.trim(),
      medical_aid_name: formData.medical_aid_name.trim(),
      medical_aid_number: formData.medical_aid_number.trim(),
      profile_completed: profileCompletion >= 80,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
    if (error) {
      toast({ title: 'Profile not saved', description: error.message, variant: 'destructive' });
    } else {
      const next = { ...formData, phone_number: payload.phone_number, emergency_contact_phone: payload.emergency_contact_phone };
      setFormData(next);
      setSavedSnapshot(JSON.stringify(next));
      toast({ title: 'Profile secured', description: 'Your student and emergency-readiness details were updated.' });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-9 w-9 animate-spin text-primary" aria-label="Loading profile" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-background to-background dark:from-slate-950">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#002F6C] shadow-large">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-5 lg:px-8">
          <div className="min-w-0 text-white">
            <InstitutionBrand size="compact" themeOverride="dark" className="max-w-[235px] sm:max-w-none" />
            <p className="mt-1 hidden text-xs font-bold text-white/72 sm:block">Secure student profile and emergency-readiness record</p>
          </div>
          {userRole === 'student' && (
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="destructive" className="min-h-11 touch-manipulation font-extrabold" onClick={() => navigate('/dashboard?tab=report')}>
                <AlertTriangle className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Report</span>
              </Button>
              <Button size="sm" variant="secondary" className="min-h-11 touch-manipulation font-bold" onClick={() => navigate('/dashboard')}>
                <Home className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Dashboard</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-5 sm:py-8 lg:px-8">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[2rem] border border-[#F2A900]/35 bg-gradient-to-br from-[#002F6C] via-[#003D7C] to-[#10172A] p-5 text-white shadow-[0_24px_65px_rgba(0,47,108,0.28)] sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <PremiumAvatarUpload userId={user?.id ?? ''} currentAvatarUrl={avatarUrl} userName={formData.full_name} onUploadComplete={setAvatarUrl} />
            <div className="min-w-0 text-center lg:text-left">
              <Badge className="bg-[#F2A900] text-[#002F6C] hover:bg-[#F2A900]"><BadgeCheck className="mr-1 h-3.5 w-3.5" />Authenticated student profile</Badge>
              <h1 className="mt-3 truncate text-2xl font-black sm:text-4xl">{formData.full_name || 'Complete your student identity'}</h1>
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs font-bold lg:justify-start">
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5"><GraduationCap className="mr-1 inline h-3.5 w-3.5" />{formData.student_number || 'Student number pending'}</span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5"><MapPin className="mr-1 inline h-3.5 w-3.5" />{formatCampus(formData.campus)}</span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5"><Shield className="mr-1 inline h-3.5 w-3.5" />{formData.course || 'Programme pending'}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur sm:min-w-[220px]">
              <div className="flex items-center justify-between gap-4"><span className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/65">Readiness</span><span className="text-2xl font-black text-[#F2A900]">{profileCompletion}%</span></div>
              <Progress value={profileCompletion} className="mt-3 h-2.5 bg-white/15" />
              <p className="mt-2 text-xs leading-5 text-white/70">Complete details help authorised responders identify and assist you faster.</p>
            </div>
          </div>
        </motion.section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[310px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
            <Card className={`border shadow-large ${completionState.panel}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  {profileCompletion >= 90 ? <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" /> : <AlertCircle className={`mt-0.5 h-6 w-6 shrink-0 ${completionState.colour}`} />}
                  <div><p className={`font-black ${completionState.colour}`}>{completionState.label}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{profileCompletion >= 90 ? 'Core identity, emergency and medical readiness fields are substantially complete.' : 'Complete the missing fields before an emergency or case follow-up occurs.'}</p></div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-large">
              <CardHeader className="pb-3"><CardTitle className="text-base">Institutional identity</CardTitle><CardDescription>Read-only routing details are controlled by registration.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <IdentityRow icon={MapPin} label="Campus" value={formatCampus(formData.campus)} />
                <IdentityRow icon={Home} label="Residence" value={formData.residence || 'Not recorded'} />
                <IdentityRow icon={GraduationCap} label="Year" value={formData.year_of_study ? `Year ${formData.year_of_study}` : 'Not recorded'} />
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/70 shadow-large dark:border-blue-900 dark:bg-blue-950/25">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 font-black text-blue-950 dark:text-blue-100"><LockKeyhole className="h-5 w-5" />Privacy boundary</div>
                <p className="mt-2 text-xs leading-5 text-blue-900/80 dark:text-blue-100/75">Medical and emergency-contact information is sensitive. It must be used only for authorised safety and support purposes.</p>
              </CardContent>
            </Card>
          </aside>

          <Card className="overflow-hidden shadow-large">
            <CardHeader className="border-b bg-muted/25">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div><CardTitle className="text-xl">Student profile workspace</CardTitle><CardDescription>Update identity, emergency-contact and medical-readiness information.</CardDescription></div>
                <Badge variant={isDirty ? 'destructive' : 'secondary'}>{isDirty ? 'Unsaved changes' : 'Saved'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="personal" className="w-full">
                <div className="overflow-x-auto border-b bg-background px-3 pt-3 sm:px-5 sm:pt-5">
                  <TabsList className="grid min-w-[520px] grid-cols-3 rounded-xl">
                    <TabsTrigger value="personal" className="min-h-11 gap-2"><UserRound className="h-4 w-4" />Personal and academic</TabsTrigger>
                    <TabsTrigger value="emergency" className="min-h-11 gap-2"><Phone className="h-4 w-4" />Emergency contact</TabsTrigger>
                    <TabsTrigger value="medical" className="min-h-11 gap-2"><HeartPulse className="h-4 w-4" />Medical readiness</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="personal" className="m-0 space-y-5 p-4 sm:p-6">
                  <SectionIntro icon={UserRound} title="Personal and academic identity" description="These details appear on your student safety profile and support official case routing." />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First name" id="first_name"><Input id="first_name" value={formData.first_name} onChange={(event) => updateField('first_name', event.target.value)} autoComplete="given-name" /></Field>
                    <Field label="Last name" id="last_name"><Input id="last_name" value={formData.last_name} onChange={(event) => updateField('last_name', event.target.value)} autoComplete="family-name" /></Field>
                  </div>
                  <Field label="Full name" id="full_name" required><Input id="full_name" value={formData.full_name} onChange={(event) => updateField('full_name', event.target.value)} autoComplete="name" /></Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Institutional email" id="email" hint="Email changes require an account-support process."><Input id="email" value={formData.email} disabled className="bg-muted/60" /></Field>
                    <Field label="Student number" id="student_number" required><Input id="student_number" value={formData.student_number} onChange={(event) => updateField('student_number', event.target.value)} inputMode="numeric" /></Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Phone number" id="phone_number"><Input id="phone_number" type="tel" value={formData.phone_number} onChange={(event) => updateField('phone_number', event.target.value)} autoComplete="tel" placeholder="e.g. 0712345678" /></Field>
                    <Field label="Year of study" id="year_of_study"><Select value={formData.year_of_study} onValueChange={(value) => updateField('year_of_study', value)}><SelectTrigger id="year_of_study"><SelectValue placeholder="Select year" /></SelectTrigger><SelectContent><SelectItem value="1">1st year</SelectItem><SelectItem value="2">2nd year</SelectItem><SelectItem value="3">3rd year</SelectItem><SelectItem value="4">4th year</SelectItem><SelectItem value="5">Postgraduate</SelectItem></SelectContent></Select></Field>
                  </div>
                  <Field label="Course or programme" id="course"><Input id="course" value={formData.course} onChange={(event) => updateField('course', event.target.value)} placeholder="Qualification or programme name" /></Field>
                </TabsContent>

                <TabsContent value="emergency" className="m-0 space-y-5 p-4 sm:p-6">
                  <SectionIntro icon={ShieldCheck} title="Emergency contact" description="Provide someone who can be contacted when an authorised safety response requires it." tone="danger" />
                  <Field label="Emergency contact name" id="emergency_contact_name"><Input id="emergency_contact_name" value={formData.emergency_contact_name} onChange={(event) => updateField('emergency_contact_name', event.target.value)} autoComplete="name" /></Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Emergency contact phone" id="emergency_contact_phone"><Input id="emergency_contact_phone" type="tel" value={formData.emergency_contact_phone} onChange={(event) => updateField('emergency_contact_phone', event.target.value)} autoComplete="tel" /></Field>
                    <Field label="Relationship" id="emergency_contact_relationship"><Select value={formData.emergency_contact_relationship} onValueChange={(value) => updateField('emergency_contact_relationship', value)}><SelectTrigger id="emergency_contact_relationship"><SelectValue placeholder="Select relationship" /></SelectTrigger><SelectContent><SelectItem value="parent">Parent</SelectItem><SelectItem value="guardian">Guardian</SelectItem><SelectItem value="sibling">Sibling</SelectItem><SelectItem value="spouse">Spouse</SelectItem><SelectItem value="relative">Other relative</SelectItem><SelectItem value="friend">Friend</SelectItem></SelectContent></Select></Field>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm leading-6"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /><span>Keep this information current. An incorrect number can delay authorised emergency follow-up.</span></div>
                </TabsContent>

                <TabsContent value="medical" className="m-0 space-y-5 p-4 sm:p-6">
                  <SectionIntro icon={HeartPulse} title="Medical readiness" description="Record information that may help authorised responders understand immediate care considerations." />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Blood type" id="blood_type"><Select value={formData.blood_type} onValueChange={(value) => updateField('blood_type', value)}><SelectTrigger id="blood_type"><SelectValue placeholder="Select blood type" /></SelectTrigger><SelectContent>{['A+','A-','B+','B-','AB+','AB-','O+','O-','unknown'].map((value) => <SelectItem key={value} value={value}>{value === 'unknown' ? 'Unknown' : value}</SelectItem>)}</SelectContent></Select></Field>
                    <Field label="Disability status" id="disability_status"><Select value={formData.disability_status} onValueChange={(value) => updateField('disability_status', value)}><SelectTrigger id="disability_status"><SelectValue placeholder="Select status" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="physical">Physical</SelectItem><SelectItem value="visual">Visual</SelectItem><SelectItem value="hearing">Hearing</SelectItem><SelectItem value="cognitive">Cognitive</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></Field>
                  </div>
                  <Field label="Allergies" id="allergies"><Textarea id="allergies" rows={2} value={formData.allergies} onChange={(event) => updateField('allergies', event.target.value)} placeholder="Food, medication or other known allergies" /></Field>
                  <Field label="Chronic conditions" id="chronic_conditions"><Textarea id="chronic_conditions" rows={2} value={formData.chronic_conditions} onChange={(event) => updateField('chronic_conditions', event.target.value)} /></Field>
                  <Field label="Special needs or accommodations" id="special_needs"><Textarea id="special_needs" rows={2} value={formData.special_needs} onChange={(event) => updateField('special_needs', event.target.value)} /></Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Medical-aid provider" id="medical_aid_name"><Input id="medical_aid_name" value={formData.medical_aid_name} onChange={(event) => updateField('medical_aid_name', event.target.value)} /></Field>
                    <Field label="Medical-aid membership number" id="medical_aid_number"><Input id="medical_aid_number" value={formData.medical_aid_number} onChange={(event) => updateField('medical_aid_number', event.target.value)} /></Field>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="sticky bottom-0 border-t bg-background/95 p-4 backdrop-blur supports-[padding:max(0px)]:pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Sparkles className="h-4 w-4 text-primary" />{isDirty ? 'Review and save your changes.' : 'Your profile matches the latest saved version.'}</div>
                  <Button className="min-h-12 touch-manipulation bg-gradient-to-r from-[#D7193F] to-[#A70F30] px-8 font-extrabold text-white" onClick={() => void saveProfile()} disabled={saving || !isDirty}>
                    {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}{saving ? 'Saving profile…' : 'Save profile securely'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function IdentityRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return <div className="flex items-start gap-3 rounded-xl border bg-muted/25 p-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div className="min-w-0"><p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-bold">{value}</p></div></div>;
}

function Field({ label, id, required = false, hint, children }: { label: string; id: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={id} className="font-bold">{label}{required && <span className="ml-1 text-destructive">*</span>}</Label>{children}{hint && <p className="text-xs leading-5 text-muted-foreground">{hint}</p>}</div>;
}

function SectionIntro({ icon: Icon, title, description, tone = 'default' }: { icon: typeof UserRound; title: string; description: string; tone?: 'default' | 'danger' }) {
  return <div className={`flex items-start gap-3 rounded-2xl border p-4 ${tone === 'danger' ? 'border-destructive/20 bg-destructive/5' : 'border-primary/20 bg-primary/5'}`}><span className={`rounded-xl p-2 ${tone === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}><Icon className="h-5 w-5" /></span><div><h3 className="font-black">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p></div></div>;
}
