import { FormEvent, useEffect, useState } from 'react';
import { CarFront, CircleParking, Loader2, MapPin, Send, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CAMPUS_LABELS } from '@/config/pilot';
import { RoadSafetyNotices } from '@/components/traffic/RoadSafetyNotices';
import { TrafficPassBadge } from '@/components/traffic/TrafficPassBadge';
import {
  getStudentTrafficPermit,
  requestStudentTrafficPermit,
  trafficErrorMessage,
} from '@/services/trafficService';
import {
  TRAFFIC_STUDENT_STATUS_LABELS,
  type TrafficCampus,
  type TrafficStudentPermit,
} from '@/types/traffic';

export function StudentTrafficHub() {
  const { userProfile } = useAuth();
  const campus = userProfile?.campus as TrafficCampus | null | undefined;
  const [permit, setPermit] = useState<TrafficStudentPermit | null>(null);
  const [vehicleRegistration, setVehicleRegistration] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleColour, setVehicleColour] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    if (!userProfile?.id) return;
    setIsLoading(true);
    void getStudentTrafficPermit(userProfile.id)
      .then((data) => {
        if (!current) return;
        setPermit(data);
        if (data) {
          setVehicleRegistration(data.vehicle_registration);
          setVehicleMake(data.vehicle_make ?? '');
          setVehicleColour(data.vehicle_colour ?? '');
        }
        setBackendMessage(null);
      })
      .catch((error) => {
        if (current) setBackendMessage(trafficErrorMessage(error));
      })
      .finally(() => {
        if (current) setIsLoading(false);
      });
    return () => {
      current = false;
    };
  }, [userProfile?.id]);

  const submitPermit = async (event: FormEvent) => {
    event.preventDefault();
    if (!campus) return;
    setIsSubmitting(true);
    setBackendMessage(null);
    try {
      const updated = await requestStudentTrafficPermit({
        campus,
        vehicleRegistration,
        vehicleMake,
        vehicleColour,
      });
      setPermit(updated);
      toast.success('Student parking permit sent to Traffic for review.');
    } catch (error) {
      setBackendMessage(trafficErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const canEdit = !permit || !['active', 'suspended'].includes(permit.status);

  return (
    <div className="mx-auto max-w-7xl space-y-6" data-testid="student-traffic-hub">
      <Card className="overflow-hidden border-[#F2A900]/60">
        <CardContent className="grid gap-6 bg-gradient-to-br from-[#002F6C] via-[#07366D] to-[#1A0D2B] p-6 text-white lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <Badge className="bg-[#F2A900] text-[#002F6C]">Traffic department ú onboarding</Badge>
            <h2 className="mt-3 text-3xl font-black">Student parking</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/75">
              Register your vehicle for Traffic review, display an approved permit and use student parking bays only.
            </p>
          </div>
          <Button asChild className="bg-white text-[#002F6C] hover:bg-white/90">
            <Link to="/traffic"><CarFront className="mr-2 h-4 w-4" />Visitor parking portal</Link>
          </Button>
        </CardContent>
      </Card>

      <Alert className="border-[#F2A900]/60 bg-[#F2A900]/10">
        <TriangleAlert className="h-4 w-4" />
        <AlertTitle>Students may park only in marked student parking</AlertTitle>
        <AlertDescription>
          Do not use visitor, staff, reserved, accessible or emergency bays unless Traffic has issued specific written permission.
        </AlertDescription>
      </Alert>

      {backendMessage && (
        <Alert className="border-orange-400/50 bg-orange-50 text-orange-950">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Traffic backend onboarding</AlertTitle>
          <AlertDescription>{backendMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CircleParking className="h-5 w-5 text-[#002F6C]" />My student parking permit</CardTitle>
            <p className="text-sm text-muted-foreground">One current vehicle per student profile. Traffic must activate the permit.</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
            ) : (
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitPermit}>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Verified campus</Label>
                  <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm">
                    <MapPin className="mr-2 h-4 w-4 text-primary" />{campus ? CAMPUS_LABELS[campus] : 'Complete your campus profile'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-vehicle-registration">Vehicle registration</Label>
                  <Input id="student-vehicle-registration" className="uppercase" value={vehicleRegistration} onChange={(event) => setVehicleRegistration(event.target.value)} disabled={!canEdit} maxLength={20} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-vehicle-make">Vehicle make / model</Label>
                  <Input id="student-vehicle-make" value={vehicleMake} onChange={(event) => setVehicleMake(event.target.value)} disabled={!canEdit} maxLength={80} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-vehicle-colour">Vehicle colour</Label>
                  <Input id="student-vehicle-colour" value={vehicleColour} onChange={(event) => setVehicleColour(event.target.value)} disabled={!canEdit} maxLength={40} />
                </div>
                {permit && (
                  <div className="flex items-end">
                    <Badge variant={permit.status === 'active' ? 'default' : 'outline'}>
                      {TRAFFIC_STUDENT_STATUS_LABELS[permit.status]}
                    </Badge>
                  </div>
                )}
                {canEdit && (
                  <Button type="submit" className="sm:col-span-2" disabled={!campus || isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {permit ? 'Update pending request' : 'Request student permit'}
                  </Button>
                )}
                {!canEdit && (
                  <p className="text-sm text-muted-foreground sm:col-span-2">
                    Contact Traffic to change a vehicle after a permit has been activated or suspended.
                  </p>
                )}
              </form>
            )}
          </CardContent>
        </Card>

        {permit ? (
          <TrafficPassBadge
            kind="student"
            name={userProfile?.full_name ?? 'TUT Student'}
            reference={permit.permit_number ?? 'PENDING'}
            vehicleRegistration={permit.vehicle_registration}
            campusLabel={CAMPUS_LABELS[permit.campus]}
            validDate={permit.valid_until ? 'Valid to ' + permit.valid_until : 'Awaiting issue date'}
            status={permit.status}
            developmentPreview
          />
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
              <CircleParking className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 font-black">No student permit request yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">Register your vehicle to begin Traffic review.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <RoadSafetyNotices campus={campus ?? undefined} />
    </div>
  );
}
