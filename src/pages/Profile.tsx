import { Fingerprint } from 'lucide-react';
import { Link } from 'react-router-dom';
import InstitutionalProfile from '@/pages/InstitutionalProfile';
import { Button } from '@/components/ui/button';

export default function Profile() {
  return (
    <>
      <InstitutionalProfile />
      <Button asChild className="fixed bottom-5 right-5 z-[70] min-h-12 rounded-full px-5 shadow-xl">
        <Link to="/settings/security"><Fingerprint className="mr-2 h-5 w-5" />Security settings</Link>
      </Button>
    </>
  );
}
