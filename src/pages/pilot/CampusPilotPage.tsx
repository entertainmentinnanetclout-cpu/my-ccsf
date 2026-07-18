import { ArrowLeft, MapPin, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PilotAdminWorkspace } from '@/components/pilot/PilotAdminWorkspace';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import type { CampusLocation } from '@/types/pilot';
import { CAMPUS_LABELS } from '@/config/pilot';

export default function CampusPilotPage() {
  const { userProfile } = useAuth();
  const campus = (userProfile?.campus ?? null) as CampusLocation | null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-primary text-primary-foreground shadow-large">
        <div className="container mx-auto flex flex-col justify-between gap-4 px-4 py-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2"><Shield className="h-5 w-5" /><h1 className="text-xl font-bold">CCSF Campus Pilot Console</h1></div>
            <p className="mt-1 flex items-center gap-1 text-sm text-primary-foreground/80"><MapPin className="h-4 w-4" /> {campus ? CAMPUS_LABELS[campus] : 'Campus assignment required'}</p>
          </div>
          <Button variant="secondary" asChild><Link to="/security"><ArrowLeft className="mr-2 h-4 w-4" /> Production Campus Portal</Link></Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6"><PilotAdminWorkspace scope="campus" campus={campus} /></main>
    </div>
  );
}
