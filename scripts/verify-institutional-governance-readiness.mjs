import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const passes = [];

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const check = (condition, message) => condition ? passes.push(message) : failures.push(message);

const requiredFiles = [
  'src/config/institutionalGovernance.ts',
  'src/pages/InformationGovernance.tsx',
  'src/services/institutionalGovernanceService.ts',
  'src/components/admin/InstitutionalGovernanceDashboard.tsx',
  'supabase/migrations/20260912203000_institutional_governance_readiness.sql',
];
requiredFiles.forEach((file) => check(exists(file), `Institutional governance file exists: ${file}.`));

const app = read('src/App.tsx');
const config = read('src/config/institutionalGovernance.ts');
const governancePage = read('src/pages/InformationGovernance.tsx');
const governanceService = read('src/services/institutionalGovernanceService.ts');
const governanceAdmin = read('src/components/admin/InstitutionalGovernanceDashboard.tsx');
const migration = read('supabase/migrations/20260912203000_institutional_governance_readiness.sql');
const report = read('src/components/student/ReportIncidentV2.tsx');
const emergency = read('src/components/student/EmergencyReport.tsx');
const mobility = read('src/components/student/SafetyMobilityHub.tsx');
const reverseGeocode = read('src/lib/reverseGeocode.ts');
const geographicMap = read('src/components/maps/GeographicCampusMap.tsx');
const liveTracker = read('src/components/admin/LiveLocationTracker.tsx');
const incidentDetails = read('src/components/admin/IncidentDetailsModal.tsx');
const vercel = read('vercel.json');
const envExample = read('.env.example');
const envProduction = read('.env.production');
const index = read('index.html');
const splash = read('src/components/shared/SplashScreen.tsx');
const dashboard = read('src/pages/Dashboard.tsx');
const security = read('src/pages/Security.tsx');
const admin = read('src/pages/Admin.tsx');

for (const marker of [
  'TUT_PAIA-Manual-2025.pdf',
  'https://www.tut.ac.za/privacy-policy--popia/',
  'https://inforegulator.org.za/paia-forms/',
  "informationOfficerEmail: 'paia@tut.ac.za'",
  "privacyEmail: 'popia@tut.ac.za'",
  "cybersecurityEmail: 'tut_security_matters@tut.ac.za'",
]) {
  check(config.includes(marker), `Governance configuration includes official source/contact: ${marker}.`);
}

check(app.includes('path="/governance"') && app.includes('<InformationGovernance />'), 'Public information-governance route is registered.');
check(governancePage.includes("does not replace TUT's statutory PAIA or POPIA process"), 'Governance page does not falsely replace statutory TUT processes.');
check(governancePage.includes('FORM 2') && governancePage.includes('Information Officer'), 'Governance page exposes the formal PAIA request route.');
check(governancePage.includes('Anonymous does not mean technically untraceable'), 'Anonymous reporting limitation is stated truthfully.');
check(governancePage.includes('Final retention periods require TUT records-management confirmation'), 'Retention periods are not invented by the app.');

for (const marker of [
  'institutional_consent_events',
  'institutional_control_register',
  'institutional_assurance_evidence',
  'institutional_governance_audit',
  'record_institutional_consent',
  'upsert_institutional_control',
  'record_institutional_assurance_evidence',
  'guard_official_submission_consent',
  'guard_incident_creation_consent',
  'guard_mobility_session_consent',
]) {
  check(migration.includes(marker), `Governance migration includes ${marker}.`);
}

check(migration.includes("revoke update, delete, truncate on public.institutional_consent_events"), 'Consent evidence is append-only for application users.');
check(migration.includes("p_sharing_until is null then raise exception 'A finite Radar sharing period is required'"), 'Campus Radar fails closed without a finite sharing period.');
check(migration.includes("p_sharing_until > now() + interval '24 hours'"), 'Campus Radar has a backend maximum sharing boundary.');
check(migration.includes("('retention-periods'") && migration.includes("'requires_tut_confirmation'"), 'Authoritative records-retention period is explicitly left to TUT confirmation.');
check(migration.includes("('cloud-operator-approval'") && migration.includes("'requires_tut_confirmation'"), 'Cloud/operator approval is explicitly left to TUT confirmation.');
check(migration.includes("('cyber-plan-integration'") && migration.includes("'requires_tut_confirmation'"), 'Internal Cyber Security/Data Incident Plan mapping is explicitly left to TUT confirmation.');
check(migration.includes("('backup-dr'") && migration.includes("'requires_tut_confirmation'"), 'RPO/RTO and backup/DR approval are explicitly left to TUT confirmation.');

check(governanceService.includes("recordGovernanceConsent(") && governanceService.includes("campus-safety-governance-"), 'Client writes versioned governance consent evidence.');
check(report.includes("recordGovernanceConsent('incident_report'"), 'Official incident reporting records the governance notice decision.');
check(emergency.includes("recordGovernanceConsent('emergency_location'"), 'Emergency reporting records identity/location consent.');
check(mobility.includes("recordGovernanceConsent('safety_mobility'"), 'Safety Mobility records explicit location consent.');
check(mobility.includes("'campus_radar_exact'") && mobility.includes("'campus_radar_approximate'"), 'Campus Radar records exact and approximate consent separately.');
check(!mobility.includes('<SelectItem value="until_off">'), 'Campus Radar UI no longer offers indefinite sharing.');
check(mobility.includes('phone-tracking-consent') && mobility.includes('disabled={!phoneConsent}'), 'Track This Phone requires explicit consent before starting.');

for (const source of [envExample, envProduction]) {
  check(source.includes('VITE_EXTERNAL_MAP_TILES_ENABLED=false'), 'External map tiles are fail-closed by default.');
  check(source.includes('VITE_EXTERNAL_REVERSE_GEOCODING_ENABLED=false'), 'External reverse geocoding is fail-closed by default.');
}
check(reverseGeocode.includes("VITE_EXTERNAL_REVERSE_GEOCODING_ENABLED === 'true'"), 'Reverse geocoding is gated by explicit institutional configuration.');
check(geographicMap.includes("VITE_EXTERNAL_MAP_TILES_ENABLED === 'true'"), 'External geographic tiles are gated by explicit institutional configuration.');
check(!liveTracker.includes('google.com/maps') && !incidentDetails.includes('google.com/maps'), 'Sensitive case coordinates are not handed to Google Maps from CPS/admin case views.');
check(liveTracker.includes('Copy coordinates') && incidentDetails.includes('Copy coordinates'), 'Authorised staff retain an internal coordinate workflow without automatic third-party disclosure.');

for (const header of [
  'Strict-Transport-Security',
  'X-Content-Type-Options',
  'X-Frame-Options',
  'Referrer-Policy',
  'Permissions-Policy',
  'Cross-Origin-Opener-Policy',
  'Content-Security-Policy',
]) {
  check(vercel.includes(header), `Web delivery config includes ${header}.`);
}
check(vercel.includes("frame-ancestors 'none'") && vercel.includes("object-src 'none'"), 'Content Security Policy blocks framing and plugin/object execution.');

check(governanceAdmin.includes('Add protocol') && governanceAdmin.includes('Record evidence'), 'Admin governance workspace can absorb future TUT protocols without a code redesign.');
check(governanceAdmin.includes('No automatic institutional approval claim'), 'Admin governance workspace prevents technical evidence from being misrepresented as institutional approval.');
check(governanceService.includes('upsertInstitutionalControl') && governanceService.includes('recordInstitutionalAssuranceEvidence'), 'Protocol and assurance updates use audited governance RPCs.');

check(!index.includes('Campus Community Safety Forum') && !index.includes('Campus Protection Services'), 'Public browser/social metadata remains TUT-only.');
check(!index.includes('Official campus safety'), 'Public metadata does not claim unapproved official designation.');
check(!splash.includes('Official institutional application'), 'Splash does not claim unapproved institutional designation.');
check(dashboard.includes('Privacy · PAIA · Governance'), 'Student portal exposes the information-governance centre.');
check(security.includes('TUT Campus Protection Services · Campus Community Safety Forum'), 'CPS portal identifies CPS as part of TUT and CCSF as its programme/unit context.');
check(admin.includes('TUT Campus Protection Services · Campus Community Safety Forum'), 'Admin portal uses the correct TUT CPS/CCSF institutional context.');

if (failures.length) {
  console.error(`Institutional governance readiness verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Institutional governance readiness verification passed (${passes.length} assertions).`);
passes.forEach((pass) => console.log(`- ${pass}`));
