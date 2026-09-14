import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InstitutionalSignoffWorkspace } from '@/components/admin/InstitutionalSignoffWorkspace';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';
import { Button } from '@/components/ui/button';

export default function FormalGovernanceAdmin() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <InstitutionBrand size="header" />
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#C8102E]">TUT institutional governance</p>
              <h1 className="text-lg font-black text-[#002F6C]">Campus Safety App · Formal Sign-Off</h1>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link to="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Back to Admin</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <InstitutionalSignoffWorkspace />
      </main>
    </div>
  );
}
