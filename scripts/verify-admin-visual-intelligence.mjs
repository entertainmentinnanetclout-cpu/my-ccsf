import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const requireText = (source, expected, message) => {
  if (!source.includes(expected)) throw new Error(`${message}\nMissing: ${expected}`);
};
const forbidText = (source, forbidden, message) => {
  if (source.includes(forbidden)) throw new Error(`${message}\nForbidden: ${forbidden}`);
};

const visual = read('src/components/admin/visualizations/LiveOperationsVisuals.tsx');
const adminOverview = read('src/components/admin/AdminOverview.tsx');
const adminPage = read('src/pages/Admin.tsx');
const campusVisual = read('src/components/admin/visualizations/CampusAdminVisuals.tsx');
const securityPage = read('src/pages/Security.tsx');
const pilotSuper = read('src/components/pilot/PilotSuperAdminDashboard.tsx');
const pilotCampus = read('src/components/pilot/PilotCampusSecurityDashboard.tsx');

requireText(visual, 'Campus risk bubble map', 'The geographic campus bubble view must remain available.');
requireText(visual, 'Operational flow', 'The response-stage visualization must remain available.');
requireText(visual, 'Seven-day time heatmap', 'The time-concentration heatmap must remain available.');
requireText(visual, 'Incident movement', 'The ordered activity trend must remain available.');
requireText(visual, 'Critical action list', 'Critical records must remain directly actionable.');
requireText(visual, 'onOpenQueue', 'The visual layer must expose a live queue action.');
requireText(visual, 'onOpenAnalytics', 'The visual layer must expose a full analytics action.');
requireText(visual, 'onOpenRecord', 'The visual layer must support record drill-down.');
requireText(visual, "setCampus(campus === item.key ? 'all' : item.key)", 'Campus bubbles must drive live filtering.');
requireText(visual, "setStatus(status === stage.status ? 'all' : stage.status)", 'Workflow stages must drive live filtering.');
forbidText(visual, 'fetch(', 'The visualization layer must not send CCSF data to an external visualization service.');
forbidText(visual, 'maptive.com', 'The implementation must remain internally rendered and vendor independent.');

requireText(adminOverview, '<LiveOperationsVisuals', 'The institution super-admin overview must use the shared visual layer.');
requireText(adminPage, "onOpenIncidents={() => setActiveView('incidents')}", 'Super-admin queue action must open the live incidents view.');
requireText(adminPage, "onOpenAnalytics={() => setActiveView('analytics')}", 'Super-admin analytics action must open full analytics.');

requireText(campusVisual, '<LiveOperationsVisuals', 'The campus admin wrapper must use the shared visual layer.');
requireText(campusVisual, 'lockCampus', 'Campus-security visualization must remain campus scoped.');
requireText(securityPage, '<CampusAdminVisuals', 'The production campus-security overview must include visual intelligence.');

requireText(pilotSuper, 'Pilot Institution Visual Intelligence', 'Pilot super-admin must include institution-wide visual intelligence.');
requireText(pilotSuper, "onOpenQueue={() => setActiveView('operations')}", 'Pilot super-admin visual queue action must remain connected.');
requireText(pilotSuper, 'onOpenRecord={(recordId) => navigate(PILOT_ROUTES.report(recordId))}', 'Pilot super-admin record drill-down must remain connected.');

requireText(pilotCampus, 'Pilot Visual Intelligence', 'Pilot campus-security must include campus-scoped visual intelligence.');
requireText(pilotCampus, 'lockCampus', 'Pilot campus-security visualization must remain campus scoped.');
requireText(pilotCampus, "onOpenQueue={() => setActiveView('incidents')}", 'Pilot campus visual queue action must remain connected.');
requireText(pilotCampus, 'onOpenRecord={(recordId) => navigate(PILOT_ROUTES.report(recordId))}', 'Pilot campus record drill-down must remain connected.');

console.log('Admin visual intelligence verification passed across production and Pilot administration.');
