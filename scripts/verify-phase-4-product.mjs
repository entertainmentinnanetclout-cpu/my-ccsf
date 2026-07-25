import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const passes = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const check = (condition, message) => condition ? passes.push(message) : failures.push(message);

// Run the purpose-built privacy, RLS, map-preservation, branding and PWA gate.
execFileSync(process.execPath, ['scripts/verify-safety-mobility-release.mjs'], { cwd: root, stdio: 'inherit' });

const app = read('src/App.tsx');
const dashboard = read('src/pages/Dashboard.tsx');
const reportIncident = read('src/components/student/ReportIncident.tsx');
const myCases = read('src/components/student/MyCaseReports.tsx');
const support = read('src/components/student/StudentChat.tsx');
const connectivity = read('src/components/shared/ConnectivityBanner.tsx');
const errorBoundary = read('src/components/shared/ApplicationErrorBoundary.tsx');

check(app.includes('<ApplicationErrorBoundary>'), 'Application retains a recoverable render boundary.');
check(app.includes('<ConnectivityBanner />'), 'Application retains connectivity awareness.');
for (const route of ['/dashboard', '/security/*', '/admin/*', '/office', '/profile', '/profile-completion', '/judiciary']) {
  check(app.includes(`path="${route}"`), `Primary route ${route} remains registered.`);
}

check(errorBoundary.includes('Retry screen') && errorBoundary.includes('Portal home'), 'Render failures provide recovery controls.');
check(connectivity.includes("window.addEventListener('offline'") && connectivity.includes("window.addEventListener('online'"), 'Online and offline state changes are handled.');
check(connectivity.includes('Do not submit reports until the connection is restored.'), 'Offline reporting guidance remains explicit.');

check(dashboard.includes("label: 'Home'") && dashboard.includes("label: 'My Cases'") && dashboard.includes("label: 'Report'") && dashboard.includes("label: 'Safety'") && dashboard.includes("label: 'Support'"), 'Student dashboard has five clear primary destinations.');
check(dashboard.includes('<SafetyMobilityHub') && dashboard.includes('Open Pilot') && dashboard.includes('StudentDashboardHome'), 'Safety Mobility, Pilot navigation and campus/residence content remain connected.');
check(dashboard.includes('useSearchParams') && dashboard.includes("next.set('tab', view)"), 'Student destinations support direct links.');
check(dashboard.includes('<MobileBottomNav'), 'Mobile navigation remains available.');

check(reportIncident.includes('MAX_EVIDENCE_FILES = 3'), 'Incident evidence count is bounded.');
check(reportIncident.includes('MAX_EVIDENCE_BYTES = 10 * 1024 * 1024'), 'Incident evidence size is bounded.');
check(reportIncident.includes("{ value: 'Gbv'"), 'Official reporting retains the GBV category.');
check(reportIncident.includes('aria-label="Report anonymously"'), 'Anonymous reporting control is accessible.');
check(myCases.includes('Case timeline unavailable') && myCases.includes('aria-label={`Open case'), 'Case tracking has error and accessibility handling.');
check(support.includes('It is not a live chat and does not dispatch emergency services.'), 'Guided support states its operating boundary.');

const protectedFiles = [dashboard, reportIncident, myCases, support];
for (const [label, pattern] of [
  ['empty click handler', /onClick=\{\(\) => \{\s*\}\}/],
  ['dead hash link', /href=["']#["']/],
  ['javascript pseudo-link', /javascript:void/],
  ['mock case reference', /Ref#\$\{Math\.floor/],
]) {
  check(!protectedFiles.some((source) => pattern.test(source)), `Core student workflows contain no ${label}.`);
}

if (failures.length) {
  console.error(`Phase 4 product verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Phase 4 product verification passed (${passes.length} assertions plus the dedicated Safety Mobility gate).`);
passes.forEach((pass) => console.log(`- ${pass}`));
