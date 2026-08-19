import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BiometricLoginSettings } from '@/components/auth/BiometricLoginSettings';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function SecuritySettings() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const backTo = userRole === 'admin' ? '/admin' : userRole === 'security' ? '/security' : userRole === 'student' ? '/profile' : '/developer';

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b border-t-4 border-t-[#F2A900] bg-background shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <InstitutionBrand size="header" />
            <div className="border-l pl-4">
              <h1 className="text-2xl font-black tracking-tight">Account security settings</h1>
              <p className="mt-1 text-sm text-muted-foreground">Password, biometric login and privileged authentication policy.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate(backTo)}><ArrowLeft className="mr-2 h-4 w-4" />Back to portal</Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="font-bold">Two first-factor choices</p><p className="mt-1 text-sm text-muted-foreground">Once biometric login is enabled, you can sign in with either your password or your device’s Face ID, fingerprint, Windows Hello, Touch ID or equivalent WebAuthn security.</p></div></div>
            <div className="flex items-start gap-3"><KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="font-bold">MFA remains independent</p><p className="mt-1 text-sm text-muted-foreground">For Admin, CPS/Security and Developer access, AAL2 MFA remains compulsory after either password or biometric sign-in. Biometrics cannot disable, substitute or bypass MFA.</p></div></div>
          </CardContent>
        </Card>

        <BiometricLoginSettings />
      </main>
    </div>
  );
}
