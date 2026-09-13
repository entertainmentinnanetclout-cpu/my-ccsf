import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpenCheck,
  Database,
  ExternalLink,
  FileCheck2,
  FileLock2,
  Fingerprint,
  Globe2,
  Mail,
  MapPin,
  Scale,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';
import {
  APP_PROCESSING_AREAS,
  APPROVED_DISCLOSURE_CATEGORIES,
  CURRENT_TECHNICAL_PROVIDERS,
  DATA_SUBJECT_RIGHTS,
  INSTITUTIONAL_GOVERNANCE_VERSION,
  TUT_GOVERNANCE,
} from '@/config/institutionalGovernance';

const iconByArea: Record<string, typeof Database> = {
  'identity-profile': UserRoundCheck,
  'case-records': FileCheck2,
  evidence: FileLock2,
  location: MapPin,
  technical: Fingerprint,
};

export default function InformationGovernance() {
  return (
    <div className="min-h-screen bg-background" data-testid="information-governance-centre">
      <header className="border-b border-border border-t-4 border-t-[#F2A900] bg-background">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <InstitutionBrand size="header" />
          <div className="text-right">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#D7193F]">Institutional information governance</p>
            <p className="text-sm font-semibold text-muted-foreground">Campus Safety App · TUT / CPS / CCSF</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:py-8">
        <section className="overflow-hidden rounded-3xl border border-[#F2A900]/50 bg-gradient-to-br from-[#002F6C] via-[#07366D] to-[#190D2B] p-6 text-white shadow-large sm:p-8">
          <Badge className="border border-[#F2A900]/50 bg-[#F2A900]/15 text-[#F2A900]">Governance baseline {INSTITUTIONAL_GOVERNANCE_VERSION}</Badge>
          <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight sm:text-4xl">Privacy, records, security and information rights</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-white/80 sm:text-base">
            The Campus Safety App processes safety information inside the TUT institutional context. This page explains the current app controls, the official TUT PAIA and POPIA routes, and the controls that remain subject to TUT ICT, privacy, records and security approval.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild className="bg-[#F2A900] font-extrabold text-[#002F6C] hover:bg-[#F2A900]/90">
              <a href={TUT_GOVERNANCE.paiaManual.href} target="_blank" rel="noreferrer"><BookOpenCheck className="mr-2 h-4 w-4" />TUT PAIA Manual</a>
            </Button>
            <Button asChild variant="outline" className="border-white/35 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <a href={TUT_GOVERNANCE.privacyStatement.href} target="_blank" rel="noreferrer"><ShieldCheck className="mr-2 h-4 w-4" />TUT Privacy & POPIA</a>
            </Button>
          </div>
        </section>

        <Card className="border-[#D7193F]/30">
          <CardContent className="flex gap-3 p-5 text-sm leading-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#D7193F]" />
            <div>
              <p className="font-extrabold">This app does not replace TUT's statutory PAIA or POPIA process.</p>
              <p className="mt-1 text-muted-foreground">
                Formal access-to-record requests must use the prescribed TUT/Information Regulator route. Privacy rights and complaints remain under TUT's Information Officer / Deputy Information Officer governance.
              </p>
            </div>
          </CardContent>
        </Card>

        <section>
          <div className="mb-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Purpose and minimisation</p>
            <h2 className="mt-1 text-2xl font-black">What the app processes and why</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
              TUT's published PAIA Manual identifies student support, safety and security as purposes for processing student information. The app must still limit each field to a defined operational purpose and approved access path.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {APP_PROCESSING_AREAS.map((area) => {
              const Icon = iconByArea[area.id] ?? Database;
              return (
                <Card key={area.id} className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><Icon className="h-5 w-5 text-primary" />{area.title}</CardTitle>
                    <CardDescription>{area.purpose}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div><p className="font-bold">Typical data</p><ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{area.data.map((item) => <li key={item}>{item}</li>)}</ul></div>
                    <div><p className="font-bold">Access boundary</p><p className="mt-1 text-muted-foreground">{area.access}</p></div>
                    <div><p className="font-bold">Retention position</p><p className="mt-1 text-muted-foreground">{area.retention}</p></div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5 text-[#D7193F]" />Your information rights</CardTitle>
              <CardDescription>TUT's published privacy statement recognises access, correction/update, complaint and consent-withdrawal rights.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {DATA_SUBJECT_RIGHTS.map((right) => (
                <div key={right.title} className="rounded-xl border bg-muted/30 p-4">
                  <p className="font-extrabold">{right.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{right.description}</p>
                </div>
              ))}
              <div className="grid gap-2 pt-2 sm:grid-cols-2">
                <Button asChild variant="outline"><a href={`mailto:${TUT_GOVERNANCE.privacyEmail}`}><Mail className="mr-2 h-4 w-4" />{TUT_GOVERNANCE.privacyEmail}</a></Button>
                <Button asChild variant="outline"><a href={TUT_GOVERNANCE.regulatorForms.href} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Regulator forms</a></Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BookOpenCheck className="h-5 w-5 text-primary" />Access to TUT records under PAIA</CardTitle>
              <CardDescription>The TUT PAIA Manual states that a request for access to a record is made using prescribed FORM 2.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6">
              <div className="rounded-xl border border-[#F2A900]/45 bg-[#F2A900]/10 p-4">
                <p className="font-extrabold">Official route</p>
                <p className="mt-1 text-muted-foreground">Use the Information Regulator's prescribed FORM 2 and the TUT Information Officer route.</p>
              </div>
              <Button asChild className="w-full"><a href={`mailto:${TUT_GOVERNANCE.informationOfficerEmail}`}><Mail className="mr-2 h-4 w-4" />{TUT_GOVERNANCE.informationOfficerEmail}</a></Button>
              <Button asChild variant="outline" className="w-full"><a href={TUT_GOVERNANCE.regulatorForms.href} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open PAIA forms</a></Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-primary" />External disclosure and operators</CardTitle>
              <CardDescription>Disclosure is purpose-bound and must be authorised, minimal and auditable.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-extrabold">Recipient categories reflected in the TUT PAIA Manual</p>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">{APPROVED_DISCLOSURE_CATEGORIES.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div className="space-y-3">
                {CURRENT_TECHNICAL_PROVIDERS.map((provider) => (
                  <div key={provider.name} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-extrabold">{provider.name}</p><Badge variant="outline">TUT review required</Badge></div>
                    <p className="mt-2 text-sm text-muted-foreground">{provider.role}</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{provider.status}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" />Security and accountability controls</CardTitle>
              <CardDescription>The app is designed to support the confidentiality, integrity and availability objectives described in TUT's published governance material.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6">
              {[
                'Role- and campus-scoped access is enforced at backend boundaries, not only by hiding interface controls.',
                'Privileged roles use stronger authentication controls; biometric/WebAuthn features do not replace required privileged MFA.',
                'Evidence storage is private by design and sensitive downloads must remain policy-gated and auditable.',
                'Location features disclose their purpose, precision and sharing controls and can be stopped where consent is the basis.',
                'Pilot records are separated from official production cases and must not imply live emergency dispatch.',
                'Security, access, release and monitoring evidence is retained as part of the institutional-readiness record.',
              ].map((item) => <div key={item} className="flex gap-3 rounded-xl border bg-muted/30 p-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{item}</span></div>)}
            </CardContent>
          </Card>
        </section>

        <Card className="border-[#002F6C]/25">
          <CardHeader>
            <CardTitle>Important privacy behaviour in this app</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm leading-6 md:grid-cols-2">
            <div className="rounded-xl border p-4">
              <p className="font-extrabold">Anonymous reports</p>
              <p className="mt-1 text-muted-foreground">Anonymous presentation removes the reporter identity from the ordinary case identity field, but the system may retain a protected technical ownership/audit relationship for abuse prevention, continuity and authorised governance. Anonymous does not mean technically untraceable.</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="font-extrabold">Offline reports</p>
              <p className="mt-1 text-muted-foreground">Eligible non-emergency drafts may remain on the user's device until they are sent or cleared. An offline draft is not represented as delivered, and emergency categories are not given a false delivery confirmation.</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="font-extrabold">Live location</p>
              <p className="mt-1 text-muted-foreground">Location is feature- and purpose-specific. Browser and operating-system restrictions can interrupt tracking, and the app must not claim continuous tracking when the device cannot provide it.</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="font-extrabold">Retention and deletion</p>
              <p className="mt-1 text-muted-foreground">A request to delete or withdraw consent does not automatically override lawful records-retention, investigation, legal-preservation or security requirements. Final retention periods require TUT records-management confirmation.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border bg-muted/25 p-4 text-center sm:flex-row sm:text-left">
          <div>
            <p className="font-extrabold">Need app-specific help?</p>
            <p className="text-sm text-muted-foreground">Use My Cases for an existing report, Support for guidance, or the official TUT information-governance contacts above for rights and records requests.</p>
          </div>
          <Button asChild variant="outline"><Link to="/">Return to portal</Link></Button>
        </div>
      </main>
    </div>
  );
}
