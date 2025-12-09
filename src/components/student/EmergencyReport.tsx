import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { AlertTriangle, Phone } from 'lucide-react';

export const EmergencyReport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const sendEmergencyReport = async () => {
    setSending(true);

    try {
      let location = { lat: null as number | null, lng: null as number | null };
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
        } catch (error) {
          console.log('Location access denied or unavailable');
        }
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      let description = 'Emergency situation reported. User unable to provide details. Immediate assistance required.\n\n';
      description += `Student: ${profile?.first_name || 'Unknown'} ${profile?.last_name || ''}\n`;
      description += `Phone: ${profile?.phone_number || 'Not provided'}\n`;

      const { error } = await supabase.from('incidents').insert({
        title: '🚨 EMERGENCY ALERT',
        description,
        category: 'Assault common',
        reporter_id: user?.id,
        is_anonymous: false,
        location_lat: location.lat,
        location_lng: location.lng,
        location_description: 'Emergency location',
      });

      if (error) throw error;

      toast({
        title: 'Emergency Alert Sent',
        description: 'Campus security has been notified. Help is on the way!',
        variant: 'default',
      });

      setOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to send emergency alert. Please call campus security directly.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <motion.div
        className="fixed bottom-6 right-6 z-40"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Button
          size="lg"
          variant="destructive"
          className="h-16 w-16 rounded-full shadow-2xl animate-pulse"
          onClick={() => setOpen(true)}
        >
          <AlertTriangle className="h-8 w-8" />
        </Button>
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl text-destructive">
              <AlertTriangle className="h-6 w-6" />
              Emergency Alert
            </DialogTitle>
            <DialogDescription className="text-base">
              This will immediately send an emergency alert to campus security with your location and profile information.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-foreground font-medium mb-2">
                Emergency alert will include:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Your name and student number</li>
                <li>• Your phone number</li>
                <li>• Your current location (if available)</li>
                <li>• Timestamp of alert</li>
              </ul>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
              <Phone className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Campus Security</p>
                <p className="text-sm text-muted-foreground">012 382 5911 / 5912</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={sendEmergencyReport}
              disabled={sending}
            >
              {sending ? 'Sending...' : 'Send Emergency Alert'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
