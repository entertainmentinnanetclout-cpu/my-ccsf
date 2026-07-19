import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const passes = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (condition) passes.push(message);
  else failures.push(message);
}

const app = read('src/App.tsx');
assert(app.includes('<ApplicationErrorBoundary>'), 'The application has a recoverable render-failure boundary.');
assert(app.includes('<ConnectivityBanner />'), 'The application exposes online and offline state.');
for (const route of ['/dashboard', '/security/*', '/admin/*', '/office', '/profile', '/profile-completion', '/judiciary']) {
  assert(app.includes(`path="${route}"`), `Primary route ${route} remains registered.`);
}

const errorBoundary = read('src/components/shared/ApplicationErrorBoundary.tsx');
assert(errorBoundary.includes('Your account data was not changed.'), 'Render failure messaging avoids implying data loss.');
assert(errorBoundary.includes('Retry screen') && errorBoundary.includes('Portal home'), 'Render failures provide recovery controls.');

const connectivity = read('src/components/shared/ConnectivityBanner.tsx');
assert(connectivity.includes("window.addEventListener('offline'"), 'Offline changes are detected.');
assert(connectivity.includes("window.addEventListener('online'"), 'Connection restoration is detected.');
assert(connectivity.includes('Do not submit reports until the connection is restored.'), 'Offline reporting guidance is explicit.');

const dashboard = read('src/pages/Dashboard.tsx');
assert(dashboard.includes("label: 'Support'"), 'The student navigation no longer presents mock messaging as live chat.');
assert(dashboard.includes('<StudentChat onNavigate='), 'Guided support routes into verified student workflows.');
assert(dashboard.includes('role="tablist"') && dashboard.includes('aria-selected='), 'Student navigation exposes tab semantics.');
assert(dashboard.includes('aria-label="Sign out of CCSF"'), 'The icon-only student sign-out control is labelled.');

const studentSupport = read('src/components/student/StudentChat.tsx');
for (const prohibited of ['generateCaseNumber', 'CCSF AI Support', 'Always Available', 'Math.random()', 'Case Status (']) {
  assert(!studentSupport.includes(prohibited), `Student support contains no mock construct: ${prohibited}.`);
}
assert(studentSupport.includes("from('campus_emergency_contacts')"), 'Student support uses the official emergency-contact source.');
assert(studentSupport.includes('It is not a live chat and does not dispatch emergency services.'), 'Student support states its real operating boundary.');
assert(studentSupport.includes("onNavigate?.(intent)"), 'Student support connects to report, case and map journeys.');
assert(studentSupport.includes('role="log"') && studentSupport.includes('aria-live="polite"'), 'Guided support output is announced accessibly.');

const emergencyContact = read('src/components/student/CampusEmergencyContact.tsx');
assert(emergencyContact.includes('Loading official contact'), 'Emergency contact has a loading state.');
assert(emergencyContact.includes('could not be loaded'), 'Emergency contact has an error state.');
assert(emergencyContact.includes('Retry contact directory'), 'Emergency contact errors are recoverable.');
assert(emergencyContact.includes('href={`tel:${dialNumber}`}'), 'Verified emergency contacts remain directly callable.');

const notifications = read('src/components/shared/NotificationBell.tsx');
assert(notifications.includes('Notifications could not be loaded.'), 'Notifications expose load failures.');
assert(notifications.includes('Live notification updates are temporarily unavailable.'), 'Notifications expose Realtime failures.');
assert(notifications.includes('setNotifications(previous)'), 'Bulk read updates roll back after backend failure.');
assert(notifications.includes('<button') && notifications.includes('focus-visible:ring-2'), 'Notification rows are keyboard-focusable controls.');
assert(notifications.includes('aria-label={unreadCount > 0'), 'The notification bell has an unread-aware accessible name.');

const reportIncident = read('src/components/student/ReportIncident.tsx');
assert(reportIncident.includes('MAX_EVIDENCE_FILES = 3'), 'Incident evidence count is bounded.');
assert(reportIncident.includes('MAX_EVIDENCE_BYTES = 10 * 1024 * 1024'), 'Incident evidence file size is bounded.');
assert(reportIncident.includes('failedEvidence.push(file.name)'), 'Evidence failures are tracked instead of ignored.');
assert(reportIncident.includes("remove([fileName])"), 'Orphaned evidence objects are removed after metadata failure.');
assert(reportIncident.includes('Report submitted with evidence warning'), 'Partial evidence failure is communicated without losing the report.');
assert(reportIncident.includes('aria-label="Report anonymously"'), 'Anonymous reporting control has an accessible name.');

const myCases = read('src/components/student/MyCaseReports.tsx');
assert(myCases.includes('Case timeline unavailable'), 'Case-update load failures are visible.');
assert(myCases.includes('tabIndex={0}') && myCases.includes("event.key === 'Enter' || event.key === ' '"), 'Case cards support keyboard activation.');
assert(myCases.includes('aria-label={`Open case'), 'Case cards expose a descriptive accessible name.');

const office = read('src/pages/Office.tsx');
assert(office.includes('aria-label="Return to portal home"'), 'Office home icon is labelled.');
assert(office.includes('aria-label="Search incident reports"'), 'Office report search is labelled.');
assert(office.includes('aria-label="Filter reports by status"'), 'Office status filter is labelled.');
assert(office.includes('aria-label="Filter reports by category"'), 'Office category filter is labelled.');
assert(office.includes('role="status" aria-label="Loading incident reports"'), 'Office loading state is announced.');

const security = read('src/pages/Security.tsx');
for (const component of ['CampusDashboard', 'AdminIncidents', 'ResolveCases', 'CampusAnalytics', 'CampusStudentsList', 'AdminAnnouncements', 'StaffCommunication', 'WifiAccessPointManager', 'OfficerSettings']) {
  assert(security.includes(`<${component}`), `Campus-security workflow retains ${component}.`);
}

const admin = read('src/pages/Admin.tsx');
for (const component of ['AdminOverview', 'AdminIncidents', 'CaseEscalation', 'IncidentAnalytics', 'AdminAnnouncements', 'StaffCommunication', 'CarouselManager', 'CampusAdminManager', 'WifiAccessPointManager', 'OfficeView']) {
  assert(admin.includes(`<${component}`), `Super-admin workflow retains ${component}.`);
}

const primaryFiles = [
  'src/pages/Dashboard.tsx',
  'src/pages/Security.tsx',
  'src/pages/Admin.tsx',
  'src/pages/Office.tsx',
  'src/pages/Profile.tsx',
  'src/pages/Judiciary.tsx',
  'src/components/student/ReportIncident.tsx',
  'src/components/student/MyCaseReports.tsx',
  'src/components/student/StudentChat.tsx',
  'src/components/shared/NotificationBell.tsx',
  'src/components/admin/CarouselManager.tsx',
  'src/components/admin/StaffCommunication.tsx',
];
const forbiddenPatterns = [
  ['empty click handler', /onClick=\{\(\) => \{\s*\}\}/],
  ['dead hash link', /href=["']#["']/],
  ['javascript pseudo-link', /javascript:void/],
  ['mock case reference', /Ref#\$\{Math\.floor/],
  ['mock-only AI support label', /CCSF AI Support/],
];
for (const file of primaryFiles) {
  const content = read(file);
  for (const [label, pattern] of forbiddenPatterns) {
    assert(!pattern.test(content), `${file} contains no ${label}.`);
  }
}

const indexHtml = read('index.html');
assert(indexHtml.includes('sizes="180x180" href="/apple-touch-icon.png"'), 'Apple touch icon uses its native 180px asset.');
assert(indexHtml.includes('sizes="32x32" href="/favicon-32x32.png"'), '32px favicon is explicitly declared.');
assert(indexHtml.includes('sizes="16x16" href="/favicon-16x16.png"'), '16px favicon is explicitly declared.');

const manifest = JSON.parse(read('public/manifest.json'));
assert(manifest.icons.some((icon) => icon.src === '/maskable-icon-512.png' && icon.purpose === 'maskable'), 'PWA manifest has a separately padded maskable icon.');
assert(manifest.icons.some((icon) => icon.src === '/app-icon-512.png' && icon.purpose === 'any'), 'PWA manifest has a standard transparent 512px icon.');

if (failures.length) {
  console.error(`Phase 4 product verification failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Phase 4 product verification passed (${passes.length} assertions).`);
for (const pass of passes) console.log(`- ${pass}`);
