import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const passes = [];

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const check = (condition, message) => condition ? passes.push(message) : failures.push(message);

const requiredFiles = [
  'src/components/admin/InstitutionalSignoffWorkspace.tsx',
  'src/pages/FormalGovernanceAdmin.tsx',
  'src/pages/InstitutionalSignoffPack.tsx',
  'supabase/migrations/20260914064500_formal_institutional_signoff.sql',
];
requiredFiles.forEach((file) => check(exists(file), `Formal sign-off file exists: ${file}.`));

const app = read('src/App.tsx');
const service = read('src/services/institutionalGovernanceService.ts');
const config = read('src/config/institutionalGovernance.ts');
const workspace = read('src/components/admin/InstitutionalSignoffWorkspace.tsx');
const pack = read('src/pages/InstitutionalSignoffPack.tsx');
const migration = read('supabase/migrations/20260914064500_formal_institutional_signoff.sql');

check(app.includes('/admin/governance/signoff') && app.includes('FormalGovernanceAdmin'), 'Protected formal governance route is registered.');
check(app.includes('/admin/governance/signoff-pack') && app.includes('InstitutionalSignoffPack'), 'Protected print-ready sign-off pack route is registered.');

for (const marker of [
  'loadInstitutionalSignoffRegister',
  'loadInstitutionalSignoffEvents',
  'loadInstitutionalReleaseDecision',
  'recordInstitutionalSignoffEvent',
]) {
  check(service.includes(marker), `Governance service includes ${marker}.`);
}

for (const marker of [
  'TUT Intellectual Property Policy',
  'TUT Research Ethics',
  'TUT Executive Management Committee',
]) {
  check(config.includes(marker), `Governance sources include ${marker}.`);
}

for (const marker of [
  'institutional_signoff_register',
  'institutional_signoff_events',
  'record_institutional_signoff_event',
  'get_institutional_release_decision',
]) {
  check(migration.includes(marker), `Sign-off migration includes ${marker}.`);
}

for (const key of [
  'so01-cps-operational-ownership',
  'so02-project-ip-classification',
  'so03-ict-architecture-hosting',
  'so04-privacy-popia',
  'so05-information-security',
  'so06-records-retention',
  'so07-legal-procurement-operators',
  'so08-backup-dr-bcp',
  'so09-corporate-affairs',
  'so10-operational-handover',
  'so11-final-production-designation',
  'so12-research-ethics-applicability',
]) {
  check(migration.includes(key), `Formal sign-off seed exists: ${key}.`);
}

check(migration.includes("Written decision evidence reference is required"), 'Approval cannot be recorded without written evidence.');
check(migration.includes("Decision authority name or committee is required"), 'Approval requires a named authority or committee.');
check(migration.includes("conditionally_approved") && migration.includes("approved") && migration.includes("changes_required"), 'Formal sign-off state machine includes conditional and change-required states.');
check(migration.includes("ready_for_formal_production_designation"), 'Database computes formal production-designation readiness.');
check(migration.includes("status not in ('approved','not_applicable')"), 'Formal readiness remains fail-closed until every mandatory gate is closed.');
check(migration.includes("existing TUT system-development/vendor agreement applies"), 'Procurement gate explicitly tests the claimed existing systems-development/vendor arrangement.');
check(migration.includes("student-developed internal institutional system"), 'Project/IP classification explicitly covers student-developed internal work.');
check(migration.includes("No destructive retention automation should be enabled"), 'Retention automation remains blocked until TUT confirms the schedule.');

check(workspace.includes('Technical readiness is complete') && workspace.includes('written TUT decisions'), 'Admin sign-off workspace clearly separates technical readiness from TUT approval.');
check(workspace.includes('Do not represent the system as formally approved yet'), 'Admin UI prevents premature institutional-approval claims.');
check(workspace.includes('Record written decision'), 'Admin UI provides an evidenced decision-recording workflow.');
check(pack.includes('Technical readiness evidence does not create institutional approval'), 'Print pack preserves the no-self-approval rule.');
check(pack.includes('Final institutional production designation'), 'Print pack includes a final formal designation record.');
check(pack.includes('Print / Save PDF'), 'Sign-off pack is print-ready.');

if (failures.length) {
  console.error(`Formal institutional sign-off verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Formal institutional sign-off verification passed (${passes.length} assertions).`);
passes.forEach((pass) => console.log(`- ${pass}`));
