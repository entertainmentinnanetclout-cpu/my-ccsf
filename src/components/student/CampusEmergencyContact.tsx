import { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

  useEffect(() => {
    let cancelled = false;

    const loadContact = async () => {
      setLoading(true);

      let query = supabase
        .from('campus_emergency_contacts')
        .select('label, phone_number, extension, availability')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1);

      if (userProfile?.campus) {
        query = query.or(`campus.eq.${userProfile.campus},campus.is.null`);
      } else {
        query = query.is('campus', null);
      }

      const { data, error } = await query.maybeSingle();

      if (!cancelled) {
        if (error) {
          console.error('Unable to load campus emergency contact:', error);
          setContact(null);
        } else {
          setContact(data);
        }
        setLoading(false);
      }
    };

    void loadContact();

    return () => {
      cancelled = true;
    };
  }, [userProfile?.campus]);

  const dialNumber = contact?.phone_number.replace(/[^+\d]/g, '');

  return (
    <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
      <Phone className="h-5 w-5 text-primary mt-0.5" />
      <div>
        <p className="text-sm font-medium">
          {contact?.label || 'Campus Protection Services'}
        </p>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading official contact…</p>
        ) : contact ? (
          <>
            <a className="text-sm text-primary font-medium hover:underline" href={`tel:${dialNumber}`}>
              {contact.phone_number}
              {contact.extension ? ` ext. ${contact.extension}` : ''}
            </a>
            {contact.availability && (
              <p className="text-xs text-muted-foreground mt-1">{contact.availability}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Official campus contact awaiting institutional verification. Use the nearest CPS office or campus emergency point.
          </p>
        )}
      </div>
    </div>
  );
};
