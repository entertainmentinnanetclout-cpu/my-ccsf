import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Phone, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

type EmergencyContact = {
  label: string;
  phone_number: string;
  extension: string | null;
  availability: string | null;
};

export const CampusEmergencyContact = () => {
  const { userProfile } = useAuth();
  const [contact, setContact] = useState<EmergencyContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContact = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('campus_emergency_contacts')
      .select('label, phone_number, extension, availability')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1);

    query = userProfile?.campus
      ? query.or(`campus.eq.${userProfile.campus},campus.is.null`)
      : query.is('campus', null);

    const { data, error: queryError } = await query.maybeSingle();
    if (queryError) {
      setContact(null);
      setError('Official campus contact information could not be loaded.');
    } else {
      setContact(data);
    }
    setLoading(false);
  }, [userProfile?.campus]);

  useEffect(() => {
    void loadContact();
  }, [loadContact]);

  const dialNumber = contact?.phone_number.replace(/[^+\d]/g, '');

  return (
    <section className="flex items-start gap-3 rounded-lg bg-muted/50 p-4" aria-labelledby="campus-emergency-contact-title">
      <Phone className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p id="campus-emergency-contact-title" className="text-sm font-medium">
          {contact?.label || 'Campus Protection Services'}
        </p>

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Loading official contact…
          </p>
        ) : error ? (
          <div className="space-y-2" role="alert">
            <p className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
            <Button variant="outline" size="sm" onClick={() => void loadContact()} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry contact directory
            </Button>
          </div>
        ) : contact && dialNumber ? (
          <>
            <a className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={`tel:${dialNumber}`}>
              {contact.phone_number}
              {contact.extension ? ` ext. ${contact.extension}` : ''}
            </a>
            {contact.availability && <p className="mt-1 text-xs text-muted-foreground">{contact.availability}</p>}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Official campus contact awaiting institutional verification. Use the nearest CPS office or campus emergency point.
          </p>
        )}
      </div>
    </section>
  );
};
