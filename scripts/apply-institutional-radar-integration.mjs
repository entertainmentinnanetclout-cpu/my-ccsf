import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/components/student/SafetyMobilityHub.tsx';
let source = readFileSync(path, 'utf8');

if (!source.includes("import { InstitutionalCampusRadar } from '@/components/student/InstitutionalCampusRadar';")) {
  source = source.replace(
    "import { CampusMap } from '@/components/student/CampusMap';\n",
    "import { CampusMap } from '@/components/student/CampusMap';\nimport { InstitutionalCampusRadar } from '@/components/student/InstitutionalCampusRadar';\n",
  );
}

source = source
  .replace("import { useCallback, useEffect, useMemo, useState } from 'react';", "import { useCallback, useEffect, useState } from 'react';")
  .replace('  Crosshair,\n', '')
  .replace('  ExternalLink,\n', '')
  .replace('  MapPinned,\n', '');

const helperStart = source.indexOf('function haversineMeters(');
const componentStart = source.indexOf('export function SafetyMobilityHub');
if (helperStart >= 0 && componentStart > helperStart) {
  source = `${source.slice(0, helperStart)}${source.slice(componentStart)}`;
}

const plottedStart = source.indexOf('  const plottedStudents = useMemo(');
const activeModeStart = source.indexOf('  const activeMode =', plottedStart);
if (plottedStart >= 0 && activeModeStart > plottedStart) {
  source = `${source.slice(0, plottedStart)}${source.slice(activeModeStart)}`;
}

source = source.replace(
  /\n  const mapsUrl = mobility\.location[\s\S]*?\n    : null;\n/,
  '\n',
);

const radarStart = source.indexOf('        <TabsContent value="radar"');
const phoneStart = source.indexOf('        <TabsContent value="phone"', radarStart);
if (radarStart < 0 || phoneStart < 0) throw new Error('Could not locate Campus Radar tab boundaries.');

const radarMarkup = `        <TabsContent value="radar" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
            <InstitutionalCampusRadar
              campus={campus}
              selfLocation={selfFix}
              students={radarStudents}
              loading={radarLoading}
              onRefresh={refreshRadar}
              onSelectStudent={setSelectedStudent}
            />

            <Card className="h-fit border-[#002F6C]/20 shadow-large xl:sticky xl:top-24">
              <CardHeader className="border-b bg-muted/25"><CardTitle>My Radar visibility</CardTitle><CardDescription>Visibility is voluntary, time-controlled and can be disabled immediately.</CardDescription></CardHeader>
              <CardContent className="space-y-5 p-5">
                <div className="space-y-2"><Label>Who can locate me?</Label><Select value={radarVisibility} onValueChange={(value) => setRadarVisibility(value as SafetyPresenceVisibility)}><SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="off"><span className="flex items-center gap-2"><EyeOff className="h-4 w-4" />Invisible</span></SelectItem><SelectItem value="campus_approximate"><span className="flex items-center gap-2"><Eye className="h-4 w-4" />Campus approximate</span></SelectItem><SelectItem value="campus_exact"><span className="flex items-center gap-2"><LocateFixed className="h-4 w-4" />Campus exact location</span></SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Sharing duration</Label><Select value={radarDuration} onValueChange={setRadarDuration}><SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="60">1 hour</SelectItem><SelectItem value="120">2 hours</SelectItem><SelectItem value="480">8 hours</SelectItem><SelectItem value="until_off">Until I turn it off</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label htmlFor="radar-status">Status message</Label><Input id="radar-status" value={radarMessage} onChange={(event) => setRadarMessage(event.target.value)} maxLength={100} placeholder="At the library / walking to residence" /></div>
                {radarVisibility === 'campus_exact' && <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/25"><Checkbox id="exact-location-consent" checked={exactConsent} onCheckedChange={(checked) => setExactConsent(checked === true)} /><Label htmlFor="exact-location-consent" className="leading-6">I understand that opted-in campus users may see my exact live position until the selected time or until I switch it off.</Label></div>}
                <Button className="min-h-12 w-full touch-manipulation font-extrabold" onClick={() => void updateRadar()}>{radarVisibility === 'off' ? <EyeOff className="mr-2 h-4 w-4" /> : <Radar className="mr-2 h-4 w-4" />}{radarVisibility === 'off' ? 'Turn off Radar visibility' : 'Activate Radar visibility'}</Button>
                <div className="rounded-xl bg-muted/50 p-4 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Privacy blueprint:</strong> approximate mode rounds coordinates and reports at least a 120m uncertainty. Exact mode requires explicit consent and a fresh device fix within the configured quality boundary. Stale locations disappear after 15 minutes.</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

`;
source = `${source.slice(0, radarStart)}${radarMarkup}${source.slice(phoneStart)}`;

source = source.replace(
  /<div className="grid gap-3 sm:grid-cols-2"><Button variant="outline" onClick=\{\(\) => void mobility\.captureNow\(\)\} disabled=\{mobility\.locating\}><LocateFixed className="mr-2 h-4 w-4" \/>Refresh phone location<\/Button>\{mapsUrl && <Button asChild><a href=\{mapsUrl\} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" \/>Open in Maps<\/a><\/Button>}<\/div>/,
  `<div className="grid gap-3 sm:grid-cols-2"><Button variant="outline" className="min-h-11" onClick={() => void mobility.captureNow()} disabled={mobility.locating}><LocateFixed className="mr-2 h-4 w-4" />Refresh phone location</Button><Button variant="outline" className="min-h-11" disabled={!mobility.location} onClick={() => { if (!mobility.location) return; void navigator.clipboard.writeText(\`${'${'}mobility.location.latitude},${'${'}mobility.location.longitude}\`).then(() => toast({ title: 'Coordinates copied', description: 'The measured phone location is ready to paste.' })).catch(() => toast({ title: 'Copy unavailable', description: 'Your browser blocked clipboard access.', variant: 'destructive' })); }}><Compass className="mr-2 h-4 w-4" />Copy coordinates</Button></div>`,
);

const mapStart = source.indexOf('        <TabsContent value="map"');
const tabsEnd = source.indexOf('      </Tabs>', mapStart);
if (mapStart < 0 || tabsEnd < 0) throw new Error('Could not locate campus map tab boundaries.');
const mapMarkup = `        <TabsContent value="map" className="space-y-5">
          <CampusMap campus={campus} />
        </TabsContent>
`;
source = `${source.slice(0, mapStart)}${mapMarkup}${source.slice(tabsEnd)}`;

source = source.replace(
  'Keeps the existing campus GPS map and incident live-location system unchanged.',
  'Uses the internal Campus Safety Radar and preserves the official incident live-location trail without claiming false map precision.',
);

if (source.includes('plottedStudents') || source.includes('mapsUrl') || source.includes('maps.google.com')) {
  throw new Error('Legacy external/generic Radar code remains after integration.');
}
if (!source.includes('<InstitutionalCampusRadar') || !source.includes('<CampusMap campus={campus} />')) {
  throw new Error('Institutional Radar integration was not completed.');
}
writeFileSync(path, source);

const compatibilityFiles = [
  'src/components/student/InstitutionalCampusRadar.tsx',
  'src/components/student/InstitutionalCaseReports.tsx',
];
for (const compatibilityPath of compatibilityFiles) {
  const current = readFileSync(compatibilityPath, 'utf8');
  const compatible = current
    .replace(/\.replaceAll\('_', ' '\)/g, ".replace(/_/g, ' ')")
    .replace(/\.replaceAll\('-', ''\)/g, ".replace(/-/g, '')")
    .replace(/\.replaceAll\('&', '&amp;'\)/g, ".replace(/&/g, '&amp;')")
    .replace(/\.replaceAll\('<', '&lt;'\)/g, ".replace(/</g, '&lt;')")
    .replace(/\.replaceAll\('>', '&gt;'\)/g, ".replace(/>/g, '&gt;')")
    .replace(/\.replaceAll\('\\"', '&quot;'\)/g, ".replace(/\\\"/g, '&quot;')")
    .replace(/\.replaceAll\("'", '&#039;'\)/g, ".replace(/'/g, '&#039;')");
  writeFileSync(compatibilityPath, compatible);
}

console.log('Institutional Campus Safety Radar integrated with current TypeScript target compatibility.');
