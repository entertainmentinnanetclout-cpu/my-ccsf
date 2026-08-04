import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Loader2, MapPin, Radio, StopCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { captureBrowserPosition, normalizeGeolocationError } from '@/lib/browserGeolocation';
import { formatCoordinatePair, reverseGeocodeCoordinates } from '@/lib/reverseGeocode';
import { CampusEmergencyContact } from './CampusEmergencyContact';
import type { Database } from '@/integrations/supabase/types';

type IncidentCategory = Database['public']['Enums']['incident_category'];
const EMERGENCY_TYPES: Array<{ value: IncidentCategory; label: string }> = [
  { value: 'Public violence', label: 'Immediate danger / feeling unsafe' },
  { value: 'Assault common', label: 'Assault or threat' },
  { value: 'Assault GBH', label: 'Serious physical assault' },
  { value: 'Gbv', label: 'Gender-based violence' },
  { value: 'Armed robbery', label: 'Armed threat or robbery' },
  { value: 'Arson', label: 'Fire or suspected arson' },
  { value: 'Attempted murder', label: 'Life-threatening attack' },
];

export const EmergencyReport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [category, setCategory] = useState<IncidentCategory>('Public violence');
  const [details, setDetails] = useState('I need immediate safety assistance.');
  const [locationPreview, setLocationPreview] = useState('');
  const { startTracking, stopTracking, isTracking } = useLocationTracking();

  const reset = () => {
    setConsentAgreed(false);
    setCategory('Public violence');
    setDetails('I need immediate safety assistance.');
    setLocationPreview('');
  };

  const sendEmergencyReport = async () => {
    if (!user || !consentAgreed || details.trim().length < 5) {
      toast({ title: 'Complete the emergency declaration', description: 'Choose the emergency type, add a short description and confirm the declaration.', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      let latitude: number | null = null;
      let longitude: number | null = null;
      let accuracy: number | null = null;
      let address: string | null = null;
      try {
        const { position } = await captureBrowserPosition();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        accuracy = position.coords.accuracy ?? null;
        const resolved = await reverseGeocodeCoordinates(latitude, longitude);
        address = resolved.address ?? formatCoordinatePair(latitude, longitude);
        setLocationPreview(`${address}${accuracy ? ` · ±${Math.round(accuracy)} m` : ''}`);
      } catch (locationError) {
        const normalized = normalizeGeolocationError(locationError);
        toast({ title: 'Location unavailable', description: `The emergency case will still be created. ${normalized.message}` });
      }

      const { data, error } = await supabase.rpc('create_emergency_alert' as never, {
        p_category: category,
        p_reason: details.trim(),
        p_latitude: latitude,
        p_longitude: longitude,
        p_accuracy_meters: accuracy,
        p_location_description: address,
      } as never);
      if (error || !data) throw error ?? new Error('The emergency case could not be created.');
      const incident = data as unknown as { id: string };
      startTracking(incident.id);

      toast({
        title: 'Emergency case created',
        description: 'Your case is in the official CCSF/CPS queue. Use the verified emergency contact below for immediate voice assistance.',
      });
      setOpen(false);
      reset();
    } catch (error) {
      toast({ title: 'Emergency case not delivered', description: error instanceof Error ? error.message : 'Use the verified campus emergency contact immediately.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {isTracking && (
        <motion.div
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+9.75rem)] right-[max(1rem,env(safe-area-inset-right))] z-[60] md:bottom-24"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl bg-destructive p-3 text-destructive-foreground shadow-2xl">
            <Radio className="h-4 w-4 shrink-0 animate-pulse" aria-hidden="true" />
            <span className="text-xs font-bold sm:text-sm">Live tracking active while My CCSF is open</span>
            <Button size="sm" variant="ghost" className="h-9 shrink-0 hover:bg-white/10" onClick={stopTracking}>
              <StopCircle className="mr-1 h-4 w-4" />Stop
            </Button>
          </div>
        </motion.div>
      )}

      <motion.div
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-[max(1rem,env(safe-area-inset-right))] z-[60] md:bottom-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Button
          size="icon"
          variant="destructive"
          className="h-14 w-14 touch-manipulation rounded-full border-2 border-white/70 shadow-[0_14px_35px_rgba(190,18,60,0.42)] ring-4 ring-destructive/20"
          onClick={() => setOpen(true)}
          aria-label="Open emergency safety alert"
          data-testid="emergency-safety-button"
        >
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </Button>
      </motion.div>

      <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) reset(); }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-md overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl text-destructive"><AlertTriangle className="h-6 w-6" />Emergency safety alert</DialogTitle>
            <DialogDescription>Create an official high-priority case and share the best location your device can provide.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>Emergency type</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as IncidentCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EMERGENCY_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency-details">What is happening?</Label>
              <Textarea id="emergency-details" value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1000} rows={4} />
              <p className="text-xs text-muted-foreground">Do not include information that is not needed for immediate assistance.</p>
            </div>

            {locationPreview && (
              <div className="rounded-xl border border-success/25 bg-success/10 p-3">
                <p className="flex items-center gap-2 text-xs font-bold text-success"><MapPin className="h-4 w-4" />Location captured</p>
                <p className="mt-1 text-sm">{locationPreview}</p>
              </div>
            )}

            <div className="rounded-xl border border-warning/25 bg-warning/10 p-4">
              <div className="flex items-start gap-3">
                <Checkbox id="emergency-consent" checked={consentAgreed} onCheckedChange={(checked) => setConsentAgreed(checked === true)} />
                <Label htmlFor="emergency-consent" className="cursor-pointer leading-5">I confirm this is a genuine emergency and consent to sharing my profile identity and current location with authorised safety personnel.</Label>
              </div>
            </div>
            <CampusEmergencyContact />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>Cancel</Button>
            <Button variant="destructive" onClick={() => void sendEmergencyReport()} disabled={sending || !consentAgreed}>
              {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating case…</> : 'Send alert'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
