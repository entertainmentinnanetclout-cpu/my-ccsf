import path from 'node:path';
import { createBrandedPdf } from './pdf-brand-engine.mjs';
import { BRAND, academicFraudTypes, appGuideSteps, buildingVerified, contacts, departmentRoutes, safetyTopics } from './resource-data.mjs';

const unverified = 'No authoritative public occupancy record was confirmed. Ask CPS/security, campus reception or Facilities Management before travelling.';

function introPage(section, title, body, cards) {
  return { section, title, draw(d) {
    d.paragraph(34, 680, body, 82, 10.8, BRAND.ink, 17);
    cards.forEach(([heading, detail, accent], index) => {
      const x = 34 + (index % 2) * 268;
      const y = 495 - Math.floor(index / 2) * 145;
      d.card(x, y, 250, 115, heading, detail, accent ?? (index % 2 ? BRAND.blue : BRAND.red), index % 2 ? BRAND.pale : BRAND.softGold);
    });
  } };
}

function buildingDashboardPage() {
  return { section: 'Building intelligence', title: 'Building 1-60 coverage dashboard', draw(d) {
    d.paragraph(34, 680, 'Every building number is indexed. Occupants are shown only where the source guide contains a specific public building or room reference. Unknown entries remain unverified rather than being guessed.', 82, 10.5, BRAND.ink, 16);
    let number = 1;
    for (let row = 0; row < 6; row++) for (let column = 0; column < 10; column++) {
      const x = 34 + column * 52.5;
      const y = 530 - row * 62;
      const verified = buildingVerified.has(number);
      d.rect(x, y, 45, 43, verified ? BRAND.navy : BRAND.pale, verified ? BRAND.navy : 'B8C5D3', 0.6);
      d.text(x + (number < 10 ? 17 : 12), y + 16, String(number), 10, true, verified ? BRAND.white : BRAND.muted);
      number++;
    }
    d.rect(34, 112, 18, 18, BRAND.navy);
    d.text(60, 117, 'Specific public building or room reference is available', 9, false, BRAND.ink);
    d.rect(34, 78, 18, 18, BRAND.pale, 'B8C5D3', 0.6);
    d.text(60, 83, 'Occupancy unverified - ask CPS, reception or Facilities', 9, false, BRAND.ink);
  } };
}

function buildingRegisterPage(start) {
  return { section: 'Building register', title: `Buildings ${start}-${start + 9}`, draw(d) {
    let y = 665;
    for (let number = start; number < start + 10; number++) {
      const verified = buildingVerified.get(number);
      d.rect(34, y - 42, 527, 52, verified ? BRAND.pale : 'F7F8FA', verified ? BRAND.navy : 'CDD5DF', 0.6);
      d.rect(44, y - 31, 42, 32, verified ? BRAND.navy : '8A96A6');
      d.text(55, y - 20, String(number), 11, true, BRAND.white);
      d.text(100, y - 13, verified ? 'VERIFIED / CONFIRM FIRST' : 'UNVERIFIED OCCUPANCY', 8, true, verified ? BRAND.red : BRAND.muted);
      d.paragraph(100, y - 29, verified ?? unverified, 72, 8.4, BRAND.ink, 11);
      y -= 58;
    }
  } };
}

function servicePage(title, rows) {
  return { section: 'Student services', title, draw(d) {
    let y = 675;
    rows.forEach(([name, location, purpose], index) => {
      d.rect(34, y - 82, 527, 94, index % 2 ? BRAND.pale : BRAND.softGold, BRAND.navy, 0.6);
      d.text(50, y - 8, name, 11, true, BRAND.navy);
      d.text(50, y - 28, location, 9, true, BRAND.red);
      d.paragraph(50, y - 47, purpose, 76, 9, BRAND.ink, 13);
      y -= 108;
    });
  } };
}

function academicFraudPage() {
  return { section: 'Digital prevention', title: 'Report academic fraud and fake admin services', draw(d) {
    d.paragraph(34, 680, 'Use the isolated Pilot workflow for suspicious paid academic or administrative offers. Select the service type, describe the approach factually and attach evidence. Do not pay, confront the person or circulate unverified names publicly.', 82, 10.5, BRAND.ink, 16);
    academicFraudTypes.forEach(([name, detail], index) => {
      const x = 34 + (index % 2) * 268;
      const y = 520 - Math.floor(index / 2) * 145;
      d.card(x, y, 250, 118, name, detail, index % 3 === 0 ? BRAND.red : BRAND.navy, index % 2 ? BRAND.pale : BRAND.softRed);
    });
    d.text(34, 90, 'Evidence examples: screenshots, usernames, phone numbers, URLs, payment requests, PDFs, dates and transaction references.', 8.5, true, BRAND.red);
  } };
}

function evidencePage() {
  const cards = [
    ['KEEP ORIGINAL FILES', 'Do not edit, crop or re-export evidence if a formal referral may follow.'],
    ['RELEVANT MATERIAL ONLY', 'Attach only information that helps authorised staff understand the report.'],
    ['PRIVATE ACCESS', 'Pilot attachments use controlled access rather than publicly exposed file links.'],
    ['NO RISKY CAPTURE', 'Never place yourself in danger to obtain a photo, video or location.'],
    ['PROTECT PERSONAL DATA', 'Avoid unrelated IDs, private chats, victim names or confidential records.'],
    ['SAVE THE REFERENCE', 'Keep your case number and follow authorised updates in My Cases.'],
  ];
  return { section: 'Evidence & privacy', title: 'Preserve proof and protect personal information', draw(d) {
    cards.forEach(([name, detail], index) => {
      const x = 34 + (index % 2) * 268;
      const y = 545 - Math.floor(index / 2) * 170;
      d.card(x, y, 250, 140, name, detail, index % 2 ? BRAND.navy : BRAND.red, index % 2 ? BRAND.pale : BRAND.softRed);
    });
  } };
}

function contactPage() {
  return { section: 'Contacts', title: 'Verified support numbers and escalation rule', draw(d) {
    contacts.forEach(([number, label], index) => {
      const y = 625 - index * 92;
      d.rect(34, y, 527, 68, index === 0 ? BRAND.softRed : BRAND.pale, index === 0 ? BRAND.red : BRAND.navy, 0.8);
      d.text(52, y + 36, number, 15, true, index === 0 ? BRAND.red : BRAND.navy);
      d.text(220, y + 36, label, 11, true, BRAND.ink);
    });
    d.paragraph(34, 120, 'For a campus-specific CPS number or control point, use current verified TUT or My CCSF channels. Contact details and room locations can change; confirm before travelling.', 82, 10, BRAND.muted, 15);
  } };
}

function safetyPage() {
  return { section: 'Safety guidance', title: 'Prevention checklist', draw(d) {
    safetyTopics.forEach(([name, detail], index) => {
      const x = 34 + (index % 2) * 268;
      const y = 545 - Math.floor(index / 2) * 170;
      d.card(x, y, 250, 140, name, detail, index % 2 ? BRAND.navy : BRAND.red, index % 2 ? BRAND.pale : BRAND.softGold);
    });
  } };
}

const handbookPages = [
  introPage('Start here', 'How to use this handbook', 'Use this handbook to identify the service you need, confirm whether the building or office is verified, navigate with a building and room reference, report suspicious academic services and preserve evidence for authorised follow-up.', [
    ['IDENTIFY THE NEED', 'Academic, finance, WIL, support, sport, security, navigation or emergency.', BRAND.red],
    ['CHECK THE STATUS', 'Verified, confirm first, unverified or off-campus.', BRAND.navy],
    ['USE BUILDING + ROOM', 'State a readable campus location before relying on coordinates.', BRAND.blue],
    ['KEEP EVIDENCE', 'Save screenshots, links, dates, payment requests and case references.', BRAND.gold],
  ]),
  introPage('App navigation', 'Official and Pilot student portals', 'Students can move between the official student portal and Pilot Mode using visible navigation controls. The same account is used, while Pilot cases remain isolated from official incidents.', [
    ['OFFICIAL PORTAL', 'Use the production student dashboard for official services and established reporting.', BRAND.navy],
    ['OPEN PILOT', 'Use Open Pilot in the official student header to enter the controlled testing environment.', BRAND.red],
    ['RETURN TO OFFICIAL', 'Use Official Student Portal in Pilot Mode to move back without signing out.', BRAND.blue],
    ['ISOLATED RECORDS', 'Pilot submissions, evidence, case status and reviews remain separate test records.', BRAND.gold],
  ]),
  academicFraudPage(),
  introPage('Safety & reporting', 'Emergency and standard reporting routes', 'The Pilot is useful for controlled digital reporting tests, but it does not dispatch external emergency services. Immediate danger must continue through verified CPS, SAPS and medical channels.', [
    ['ACTUAL EMERGENCY', 'Call 112, SAPS 10111 or ambulance/fire 10177 and follow verified campus CPS instructions.', BRAND.red],
    ['STANDARD REPORT', 'Choose the approved workflow, add facts, attach evidence and save the reference.', BRAND.navy],
    ['READABLE LOCATION', 'Use a building, gate, residence, street or landmark when location is required.', BRAND.blue],
    ['TRACK STATUS', 'Open My Cases for received, assessing, assigned, in-progress and completed updates.', BRAND.gold],
  ]),
  buildingDashboardPage(),
  ...[1, 11, 21, 31, 41, 51].map(buildingRegisterPage),
  servicePage('High-value service routes', departmentRoutes.slice(0, 5)),
  servicePage('Support, international, sport and digital access', departmentRoutes.slice(5)),
  evidencePage(),
  safetyPage(),
  contactPage(),
  introPage('Document control', 'Verification and public-resource protocol', 'This resource deliberately separates confirmed locations from unverified building occupancy and public student information from internal CCSF operating records. Future editions should use authoritative TUT, CPS or Facilities corrections.', [
    ['VERIFIED', 'A public building and room reference is available. Confirm operating hours when possible.', BRAND.navy],
    ['CONFIRM FIRST', 'The service is known, but its room, counter or operating point may change.', BRAND.blue],
    ['UNVERIFIED', 'No authoritative occupancy was confirmed. Ask CPS, reception or Facilities; never guess.', BRAND.red],
    ['PUBLIC ONLY', 'Staffing, internal case processes, finances and governance records are not included.', BRAND.gold],
  ]),
];

const buildingPages = [
  introPage('Navigation standard', 'How building verification works', 'Building numbers are indexed from 1 to 60. Only locations supported by the public source guide are labelled verified or confirm first. Missing occupancy is not guessed.', [
    ['VERIFIED', 'A specific public room or service location is available.', BRAND.navy],
    ['CONFIRM FIRST', 'Call or ask before travelling because rooms and counters can move.', BRAND.blue],
    ['UNVERIFIED', 'Use CPS, reception or Facilities for current direction.', BRAND.red],
    ['READABLE ROUTING', 'State the building, room, gate or landmark when requesting help.', BRAND.gold],
  ]),
  buildingDashboardPage(),
  ...[1, 11, 21, 31, 41, 51].map(buildingRegisterPage),
  servicePage('High-value service routes', departmentRoutes.slice(0, 5)),
  servicePage('Support, international, sport and digital access', departmentRoutes.slice(5)),
  introPage('Student routing', 'Where should I go?', 'Start with the type of service, use the verified building and room where available, confirm before travelling and keep written evidence of referrals or unresolved enquiries.', [
    ['FUNDING OR FEES', 'Use Financial Aid/NSFAS or Student Finance routes in Buildings 53 and 21.', BRAND.navy],
    ['WIL OR PLACEMENT', 'Use the myWIL Helpdesk route in Building 13. Report fake placement sales in Pilot.', BRAND.red],
    ['SUPPORT SERVICES', 'Use Buildings 4 and 6 for listed wellness, international, counselling and disability services.', BRAND.blue],
    ['UNKNOWN BUILDING', 'Ask CPS, reception or Facilities rather than relying on an unverified occupant.', BRAND.gold],
  ]),
];

const appPages = [
  introPage('Access', 'Sign in and move between modes', 'The official and Pilot student experiences use the same authenticated account. Pilot Mode is clearly labelled and keeps reports, evidence and case activity isolated from official incidents.', [
    ['OFFICIAL STUDENT PORTAL', 'Use the main dashboard for established student services and official workflows.', BRAND.navy],
    ['OPEN PILOT', 'Select Open Pilot in the official student header.', BRAND.red],
    ['RETURN', 'Select Official Student Portal from the Pilot header or Support centre.', BRAND.blue],
    ['PROFILE ACCURACY', 'Keep campus, student number and contact information current.', BRAND.gold],
  ]),
  introPage('Home', 'Use both information carousels', 'The Pilot home contains the managed Pilot carousel for safety actions and the campus/residence image carousel from the student experience. Swipe, use arrows or select indicators to move through content.', [
    ['PILOT CAROUSEL', 'Opens reports, cases, reviews, documents and support actions.', BRAND.red],
    ['CAMPUS IMAGES', 'Shows campus entrances, facilities and other verified campus content.', BRAND.navy],
    ['RESIDENCE IMAGES', 'Shows active residence images assigned to the student campus.', BRAND.blue],
    ['FALLBACK CONTENT', 'Institutional CCSF/TUT content remains visible when an image fails.', BRAND.gold],
  ]),
  academicFraudPage(),
  evidencePage(),
  introPage('Reporting', 'Submit a standard report', 'Choose an authorised workflow, select the correct incident type, add a factual description and provide location only when the scenario requires it.', [
    ['CHOOSE WORKFLOW', 'Use the reporting selector rather than forcing unrelated information into a case.', BRAND.navy],
    ['ADD FACTS', 'Explain what happened, when, where and who contacted you without speculation.', BRAND.red],
    ['LOCATION WHEN REQUIRED', 'Use a readable location and permit coordinates only for relevant workflows.', BRAND.blue],
    ['SUBMIT SECURELY', 'The app refreshes an expired Pilot session before saving the report.', BRAND.gold],
  ]),
  introPage('Cases', 'Track reports and authorised updates', 'Each submitted Pilot report receives a reference number. Open My Cases to review the current status, location, evidence and timeline created by authorised Pilot staff.', [
    ['RECEIVED', 'The report has entered the authorised Pilot queue.', BRAND.navy],
    ['ASSESSING / ASSIGNED', 'Staff are reviewing and assigning the test case.', BRAND.blue],
    ['IN PROGRESS', 'The workflow is active and may contain staff updates.', BRAND.red],
    ['COMPLETED', 'The simulation has reached its controlled close-out state.', BRAND.gold],
  ]),
  introPage('Resources', 'Documents, reviews and support', 'The public document library contains the campus handbook, Building Structure and Student Services Guide, and this App User Guide. Students can also submit reviews and read authorised notifications.', [
    ['DOCUMENTS', 'Open or download public PDFs from the Campus Guide & Document Library.', BRAND.navy],
    ['REVIEWS', 'Rate the Pilot experience and read staff responses where available.', BRAND.blue],
    ['SUPPORT', 'Use the Support centre for notifications, report shortcuts and guide settings.', BRAND.red],
    ['NO INTERNAL FILES', 'Private operating structure, staffing, finances and governance are excluded.', BRAND.gold],
  ]),
  introPage('Safety limits', 'Privacy and actual emergencies', 'Pilot Mode is a controlled workflow test. It is not a substitute for immediate protection, medical treatment, police response or formal university disciplinary procedures.', [
    ['PRIVATE EVIDENCE', 'Use only relevant files and protect personal information.', BRAND.navy],
    ['NO CONFRONTATION', 'Do not engage suspected scammers or place yourself at risk.', BRAND.red],
    ['ACTUAL EMERGENCY', 'Use 112, SAPS 10111, ambulance/fire 10177 and verified campus CPS.', BRAND.blue],
    ['KEEP REFERENCES', 'Save case numbers, emails and official referral records.', BRAND.gold],
  ]),
];

export function makePublicDocuments(outDir) {
  const handbook = createBrandedPdf({
    outFile: path.join(outDir, 'My-CCSF-TUT-Pretoria-Campus-Safety-Security-Navigation-Handbook-v2.2.pdf'),
    documentTitle: 'TUT Pretoria Campus Safety, Security & Navigation Handbook',
    coverTitle: 'Pretoria Campus Safety, Security & Navigation Handbook',
    coverSubtitle: 'Buildings 1-60 | Student services | Academic-scam reporting | Emergency readiness',
    version: '2.2',
    coverSummary: 'One premium student-facing resource connecting campus navigation, verified service routes, prevention-first safety guidance, evidence protection and the My CCSF Pilot reporting workflow.',
    pages: handbookPages,
  });
  const buildings = createBrandedPdf({
    outFile: path.join(outDir, 'My-CCSF-TUT-Pretoria-Campus-Building-Structure-Student-Services-Guide-v1.0.pdf'),
    documentTitle: 'TUT Pretoria Campus Building Structure & Student Services Guide',
    coverTitle: 'Building Structure & Student Services Navigation Guide',
    coverSubtitle: 'Building 1-60 register | Verified routes | Student service direction',
    version: '1.0',
    coverSummary: 'A focused public navigation guide for students who need to identify building numbers, verify known office locations and find the correct service route without relying on guessed occupancy.',
    pages: buildingPages,
  });
  const app = createBrandedPdf({
    outFile: path.join(outDir, 'My-CCSF-Pilot-App-User-Guide-v1.0.pdf'),
    documentTitle: 'My CCSF Pilot App User Guide',
    coverTitle: 'My CCSF Pilot App User Guide',
    coverSubtitle: 'Official and Pilot navigation | Reporting | Evidence | Cases | Documents',
    version: '1.0',
    coverSummary: 'A practical student guide to navigating My CCSF, viewing campus and residence images, reporting academic scams with evidence, tracking cases and understanding Pilot safety boundaries.',
    pages: appPages,
  });
  return [handbook, buildings, app];
}

export function makePdf(outDir) {
  return makePublicDocuments(outDir)[0];
}
