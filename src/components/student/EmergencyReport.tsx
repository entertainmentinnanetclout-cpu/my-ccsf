import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { AlertTriangle, Phone, MapPin, Loader2, Radio, StopCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { Badge } from '@/components/ui/badge';

// Reverse geocode using free Nominatim API (OpenStreetMap)
const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'CCSF-Campus-Safety-App'
        }
      }
    );
    const data = await response.json();
    
    if (data.display_name) {
      return data.display_name;
    }
    return `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error('Geocoding error:', error);
    return `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
};

export const EmergencyReport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  
  const { startTracking, stopTracking, isTracking, currentIncidentId } = useLocationTracking();

  const sendEmergencyReport = async () => {
    if (!consentAgreed) {
      toast({
        title: 'Consent Required',
        description: 'Please confirm the emergency declaration before sending.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    setGettingLocation(true);

    try {
      let location = { lat: null as number | null, lng: null as number | null };
      let locationAddress = 'Location unavailable';
      
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { 
              timeout: 10000,
              enableHighAccuracy: true,
              maximumAge: 0
            });
          });
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          
          // Get readable address from coordinates
          setGettingLocation(false);
          locationAddress = await reverseGeocode(location.lat!, location.lng!);
          setCurrentAddress(locationAddress);
          
        } catch (error) {
          console.log('Location access denied or unavailable:', error);
          setGettingLocation(false);
        }
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      // Build comprehensive emergency description
      let description = '🚨 EMERGENCY SITUATION REPORTED\n\n';
      description += '═══════════════════════════════\n';
      description += 'STUDENT INFORMATION:\n';
      description += `• Name: ${profile?.first_name || 'Unknown'} ${profile?.last_name || ''}\n`;
      description += `• Student Number: ${profile?.student_number || 'Not provided'}\n`;
      description += `• Phone: ${profile?.phone_number || 'Not provided'}\n`;
      description += `• Email: ${profile?.email || 'Not provided'}\n`;
      description += '═══════════════════════════════\n\n';
      description += 'EMERGENCY CONTACT:\n';
      description += `• Name: ${profile?.emergency_contact_name || 'Not provided'}\n`;
      description += `• Phone: ${profile?.emergency_contact_phone || 'Not provided'}\n`;
      description += `• Relationship: ${profile?.emergency_contact_relationship || 'Not provided'}\n`;
      description += '═══════════════════════════════\n\n';
      description += 'MEDICAL INFORMATION:\n';
      description += `• Blood Type: ${profile?.blood_type || 'Unknown'}\n`;
      description += `• Allergies: ${profile?.allergies || 'None specified'}\n`;
      description += `• Chronic Conditions: ${profile?.chronic_conditions || 'None specified'}\n`;
      description += '═══════════════════════════════\n\n';
      description += '📍 LIVE LOCATION TRACKING ENABLED\n';
      description += 'Location updates every 30 seconds until resolved.\n\n';
      description += '⚠️ User unable to provide details. Immediate assistance required.\n';
      description += 'Student has confirmed this is a genuine emergency.';

      const { data: incident, error } = await supabase.from('incidents').insert({
        title: '🚨 EMERGENCY ALERT - LIVE TRACKING',
        description,
        category: 'Assault common',
        reporter_id: user?.id,
        is_anonymous: false,
        location_lat: location.lat,
        location_lng: location.lng,
        location_description: locationAddress,
      }).select().single();

      if (error) throw error;

      // Start live location tracking
      if (incident) {
        startTracking(incident.id);
      }

      toast({
        title: 'Emergency Alert Sent',
        description: 'Campus security has been notified. Your location is being tracked.',
        variant: 'default',
      });

      setOpen(false);
      setConsentAgreed(false);
      setCurrentAddress('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to send emergency alert. Please call campus security directly.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
      setGettingLocation(false);
    }
  };

  const handleStopTracking = () => {
    stopTracking();
    toast({
      title: 'Location Tracking Stopped',
      description: 'Your location is no longer being shared.',
    });
  };

  return (
    <>
      {/* Live tracking indicator */}
      {isTracking && (
        <motion.div
          className="fixed bottom-36 md:bottom-24 right-4 sm:right-6 z-40"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-destructive text-destructive-foreground rounded-lg p-3 shadow-lg flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">Live Tracking Active</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 hover:bg-destructive-foreground/10"
              onClick={handleStopTracking}
            >
              <StopCircle className="h-4 w-4 mr-1" />
              Stop
            </Button>
          </div>
        </motion.div>
      )}

      <motion.div
        className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Button
          size="lg"
          variant="destructive"
          className="h-12 w-12 rounded-full shadow-xl animate-emergency-blink ring-2 ring-destructive/30"
          onClick={() => setOpen(true)}
        >
          <AlertTriangle className="h-5 w-5" />
        </Button>
      </motion.div>

      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setConsentAgreed(false);
          setCurrentAddress('');
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
              <p className="text-sm font-medium mb-2">
                Emergency alert will include:
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span>•</span> Your name and student number
                </li>
                <li className="flex items-center gap-2">
                  <span>•</span> Your phone number
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium">Your live location (full address)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>•</span> Emergency contact details
                </li>
                <li className="flex items-center gap-2">
                  <span>•</span> Medical information (blood type, allergies)
                </li>
              </ul>
            </div>

            {/* Live tracking info */}
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-start gap-3">
              <Radio className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Live Location Tracking
                </p>
                <p className="text-xs text-muted-foreground">
                  Your location will be updated every 30 seconds until the case is resolved. You can stop tracking at any time.
                </p>
              </div>
            </div>

            {/* Current location preview */}
            {currentAddress && (
              <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                <p className="text-xs font-medium text-success mb-1">
                  📍 Your Location:
                </p>
                <p className="text-sm text-foreground">
                  {currentAddress}
                </p>
              </div>
            )}

            {/* Consent Declaration */}
            <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg space-y-3">
              <p className="text-sm font-medium text-foreground">
                ⚠️ Emergency Declaration
              </p>
              <p className="text-xs text-muted-foreground">
                By sending this alert, I confirm that this is a genuine emergency requiring immediate assistance. 
                I understand that misuse of the emergency system may result in disciplinary action.
              </p>
              <div className="flex items-start space-x-3 pt-2">
                <Checkbox 
                  id="emergency-consent" 
                  checked={consentAgreed}
                  onCheckedChange={(checked) => setConsentAgreed(checked === true)}
                />
                <label htmlFor="emergency-consent" className="text-sm cursor-pointer text-foreground font-medium">
                  I confirm this is a genuine emergency
                </label>
              </div>
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
              disabled={sending || !consentAgreed}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {gettingLocation ? 'Getting Location...' : 'Sending...'}
                </>
              ) : (
                'Send Emergency Alert'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
