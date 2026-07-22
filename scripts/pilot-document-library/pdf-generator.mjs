import fs from 'node:fs';
import path from 'node:path';
import { BRAND, buildingVerified, departmentRoutes, safetyTopics } from './resource-data.mjs';
import { escPdf, wrap } from './shared.mjs';

export function makePdf(outDir) {
  const W = 595.28, H = 841.89;
  const pages = [];
  const rgb = (hex) => [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(n => n.toFixed(3)).join(' ');
  const text = (ops, x, y, value, size = 10, bold = false, color = BRAND.ink) => {
    ops.push(`${rgb(color)} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${escPdf(value)}) Tj ET`);
  };
  const rect = (ops, x, y, w, h, fill, stroke = null, line = 1) => {
    ops.push(`${rgb(fill)} rg ${stroke ? `${rgb(stroke)} RG ${line} w` : ''} ${x} ${y} ${w} ${h} re ${stroke ? 'B' : 'f'}`);
  };
  const paragraph = (ops, x, y, value, widthChars = 85, size = 10, color = BRAND.ink, leading = 15, bold = false) => {
    const lines = wrap(value, widthChars);
    lines.forEach((ln, i) => text(ops, x, y - i * leading, ln, size, bold, color));
    return y - lines.length * leading;
  };
  const header = (ops, section, title, pageNo) => {
    rect(ops, 0, H - 62, W, 62, BRAND.white);
    rect(ops, 0, H - 66, W, 4, BRAND.red);
    rect(ops, 0, H - 70, W, 4, BRAND.gold);
    text(ops, 34, H - 28, 'TUT', 16, true, BRAND.navy);
    text(ops, 78, H - 25, 'Campus Community Safety Forum', 9, true, BRAND.red);
    text(ops, 78, H - 39, 'Operating under Campus Protection Services', 7.5, false, BRAND.muted);
    text(ops, 34, H - 96, section.toUpperCase(), 8, true, BRAND.red);
    text(ops, 34, H - 120, title, 20, true, BRAND.navy);
    rect(ops, W - 73, H - 50, 40, 28, BRAND.navy);
    text(ops, W - 61, H - 40, String(pageNo).padStart(2, '0'), 10, true, BRAND.white);
  };
  const footer = (ops, pageNo) => {
    rect(ops, 0, 0, W, 28, BRAND.navy);
    text(ops, 34, 10, 'My CCSF | TUT Pretoria Campus | Verify time-sensitive locations before travelling', 7, false, BRAND.white);
    text(ops, W - 65, 10, `${pageNo}`, 7, true, BRAND.white);
  };
  const addPage = (section, title, draw) => {
    const pageNo = pages.length + 1; const ops = [];
    header(ops, section, title, pageNo); draw(ops, pageNo); footer(ops, pageNo); pages.push(ops.join('\n'));
  };

  {
    const ops = [];
    rect(ops, 0, 0, W, H, BRAND.navy);
    rect(ops, 0, H - 18, W, 8, BRAND.red); rect(ops, 0, H - 26, W, 5, BRAND.gold);
    rect(ops, 40, H - 150, 112, 76, BRAND.white); text(ops, 62, H - 110, 'TUT', 30, true, BRAND.navy);
    text(ops, 40, H - 205, 'CAMPUS COMMUNITY SAFETY FORUM', 12, true, BRAND.gold);
    text(ops, 40, H - 255, 'PRETORIA CAMPUS SAFETY,', 27, true, BRAND.white);
    text(ops, 40, H - 290, 'SECURITY & NAVIGATION', 27, true, BRAND.white);
    text(ops, 40, H - 325, 'HANDBOOK', 27, true, BRAND.white);
    text(ops, 40, H - 365, 'Buildings 1-60 | Student services | Reporting | Emergency readiness', 11, false, BRAND.white);
    rect(ops, 40, 220, 515, 190, BRAND.white);
    text(ops, 65, 375, 'ONE STUDENT-FACING RESOURCE', 10, true, BRAND.red);
    paragraph(ops, 65, 345, 'A practical CCSF and TUT branded guide that connects campus navigation, verified student-service routes, prevention-first safety guidance and the My CCSF Pilot reporting workflow.', 68, 13, BRAND.navy, 20, true);
    text(ops, 65, 265, 'Version 2.1 | Pilot Edition | 22 July 2026', 10, true, BRAND.red);
    text(ops, 40, 70, 'Independent student support resource. TUT offices and building occupants can change; verify time-sensitive details.', 8, false, BRAND.white);
    pages.push(ops.join('\n'));
  }

  addPage('Start here', 'How to use this handbook', (ops) => {
    paragraph(ops, 34, 690, 'Use the handbook in this order: identify what you need, check whether the building or office is verified, state the building and room when asking for help, and keep evidence or reference numbers for any escalation.', 82, 11, BRAND.ink, 17);
    const steps = [
      ['1', 'IDENTIFY THE NEED', 'Academic, finance, WIL, support, sport, security or emergency.'],
      ['2', 'CHECK THE STATUS', 'Verified, confirm first, unverified or off-campus.'],
      ['3', 'STATE BUILDING + ROOM', 'Example: Building 30, Room 288.'],
      ['4', 'ESCALATE WITH EVIDENCE', 'Keep emails, screenshots, dates and reference numbers.'],
    ];
    steps.forEach((s, i) => { const y = 575 - i * 105; rect(ops, 34, y, 527, 82, i % 2 ? BRAND.pale : 'FFF6DF', BRAND.navy, .7); rect(ops, 48, y + 17, 45, 45, i % 2 ? BRAND.navy : BRAND.red); text(ops, 65, y + 33, s[0], 15, true, BRAND.white); text(ops, 112, y + 50, s[1], 11, true, BRAND.navy); paragraph(ops, 112, y + 30, s[2], 62, 9, BRAND.muted, 13); });
  });

  addPage('Safety & reporting', 'Emergency and standard reporting routes', (ops) => {
    text(ops, 34, 685, 'ACTUAL EMERGENCY', 12, true, BRAND.red);
    rect(ops, 34, 575, 527, 90, 'FFF1F3', BRAND.red, 1);
    paragraph(ops, 52, 635, 'Immediate danger: call 112, SAPS 10111 or ambulance/fire 10177. Contact the verified campus CPS point and follow official instructions. The Pilot does not dispatch emergency services.', 76, 11, BRAND.ink, 17, true);
    text(ops, 34, 525, 'PILOT / STANDARD REPORT', 12, true, BRAND.navy);
    const route = ['Open My CCSF', 'Choose the approved scenario', 'Describe what happened', 'Confirm readable location', 'Attach relevant evidence', 'Receive reference and track status'];
    route.forEach((r, i) => { const x = 34 + (i % 2) * 268, y = 455 - Math.floor(i / 2) * 95; rect(ops, x, y, 250, 70, i % 2 ? BRAND.pale : 'FFF6DF', BRAND.navy, .7); text(ops, x + 14, y + 45, `${i + 1}. ${r}`, 10, true, BRAND.navy); });
    paragraph(ops, 34, 145, 'Pilot cases are isolated test records. Serious or real incidents must continue through established CPS, SAPS, medical, disciplinary and university processes.', 82, 10, BRAND.muted, 15);
  });

  addPage('Digital prevention', 'Report online academic scams early', (ops) => {
    paragraph(ops, 34, 685, 'Students should use the Pilot to test reporting of low-risk digital misconduct and suspicious approaches that can be documented safely. These cases demonstrate the practical value of early reporting without replacing formal investigation or disciplinary authority.', 82, 11, BRAND.ink, 17);
    const scams = ['Selling courses or fake enrolment access', 'Offering to change marks for payment', 'Producing fake academic records', 'Impersonating university staff or systems', 'Requesting payments for unofficial services', 'Circulating fraudulent registration links'];
    scams.forEach((s, i) => { const x = 34 + (i % 2) * 268, y = 545 - Math.floor(i / 2) * 105; rect(ops, x, y, 250, 82, i % 3 === 0 ? 'FFF1F3' : BRAND.pale, i % 3 === 0 ? BRAND.red : BRAND.navy, .7); text(ops, x + 14, y + 52, s, 10, true, i % 3 === 0 ? BRAND.red : BRAND.navy); });
    text(ops, 34, 185, 'WHAT TO KEEP', 11, true, BRAND.red);
    paragraph(ops, 34, 160, 'Screenshots, usernames, phone numbers, URLs, payment requests, dates, platform names and any transaction reference. Do not pay, threaten or confront the person.', 82, 10, BRAND.ink, 15);
  });

  addPage('Building intelligence', 'Building 1-60 coverage dashboard', (ops) => {
    paragraph(ops, 34, 685, 'Every building number is indexed. Occupants are shown only where the source handbook contains a specific public building or room reference. Unknown entries remain unverified rather than being guessed.', 82, 10.5, BRAND.ink, 16);
    let idx = 1;
    for (let row = 0; row < 6; row++) for (let col = 0; col < 10; col++) {
      const x = 34 + col * 52.5, y = 545 - row * 64; const verified = buildingVerified.has(idx);
      rect(ops, x, y, 45, 45, verified ? BRAND.navy : BRAND.pale, verified ? BRAND.navy : 'B8C5D3', .6);
      text(ops, x + (idx < 10 ? 16 : 12), y + 17, String(idx), 10, true, verified ? BRAND.white : BRAND.muted);
      idx++;
    }
    rect(ops, 34, 115, 18, 18, BRAND.navy); text(ops, 60, 120, 'Specific public building or room reference in the source guide', 9, false, BRAND.ink);
    rect(ops, 34, 80, 18, 18, BRAND.pale, 'B8C5D3', .6); text(ops, 60, 85, 'Occupancy not publicly verified - ask CPS, reception or Facilities', 9, false, BRAND.ink);
  });

  for (let start = 1; start <= 60; start += 10) {
    addPage('Building register', `Buildings ${start}-${start + 9}`, (ops) => {
      let y = 675;
      for (let n = start; n < start + 10; n++) {
        const verified = buildingVerified.get(n); rect(ops, 34, y - 42, 527, 52, verified ? 'EEF4FA' : 'F7F8FA', verified ? BRAND.navy : 'CDD5DF', .6);
        rect(ops, 44, y - 31, 42, 32, verified ? BRAND.navy : '8A96A6'); text(ops, 55, y - 20, String(n), 11, true, BRAND.white);
        text(ops, 100, y - 13, verified ? 'VERIFIED / CONFIRM FIRST' : 'UNVERIFIED OCCUPANCY', 8, true, verified ? BRAND.red : BRAND.muted);
        paragraph(ops, 100, y - 29, verified ?? 'No authoritative public occupancy record was confirmed. Ask CPS/security, campus reception or Facilities Management before travelling.', 72, 8.5, BRAND.ink, 11);
        y -= 58;
      }
    });
  }

  const addServicePage = (title, rows) => addPage('Student services', title, (ops) => {
    let y = 680;
    rows.forEach(([name, location, purpose], i) => {
      rect(ops, 34, y - 82, 527, 94, i % 2 ? BRAND.pale : 'FFF6DF', BRAND.navy, .6);
      text(ops, 50, y - 8, name, 11, true, BRAND.navy); text(ops, 50, y - 28, location, 9, true, BRAND.red); paragraph(ops, 50, y - 47, purpose, 76, 9, BRAND.ink, 13); y -= 108;
    });
  });
  addServicePage('High-value service routes', departmentRoutes.slice(0, 5));
  addServicePage('Support, international, sport and digital access', departmentRoutes.slice(5));

  addPage('Safety guidance', 'Prevention checklist', (ops) => {
    let y = 670;
    safetyTopics.forEach(([name, detail], i) => { const x = 34 + (i % 2) * 268; const yy = y - Math.floor(i / 2) * 175; rect(ops, x, yy - 132, 250, 145, i % 2 ? BRAND.pale : 'FFF6DF', BRAND.navy, .6); text(ops, x + 16, yy - 18, name, 11, true, BRAND.navy); paragraph(ops, x + 16, yy - 45, detail, 34, 9, BRAND.ink, 14); });
  });

  addPage('Location & evidence', 'Use readable locations and preserve proof', (ops) => {
    const cards = [
      ['READABLE LOCATION FIRST', 'State the building, gate, residence, street or landmark before relying on coordinates.'], ['COORDINATES AS SUPPORT', 'Latitude, longitude and accuracy remain supporting technical evidence.'], ['RELEVANT EVIDENCE ONLY', 'Upload only material that helps authorised staff understand the report.'], ['NO RISKY CAPTURE', 'Never place yourself in danger to obtain a photo, video or live location.'], ['KEEP ORIGINAL FILES', 'Do not edit, crop or circulate original evidence if a formal process may follow.'], ['PROTECT PERSONAL DATA', 'Avoid unrelated names, IDs, private chats or victim information.'],
    ];
    cards.forEach((c, i) => { const x = 34 + (i % 2) * 268, y = 610 - Math.floor(i / 2) * 170; rect(ops, x, y, 250, 140, i % 2 ? BRAND.pale : 'FFF1F3', i % 2 ? BRAND.navy : BRAND.red, .7); text(ops, x + 16, y + 105, c[0], 9.5, true, i % 2 ? BRAND.navy : BRAND.red); paragraph(ops, x + 16, y + 78, c[1], 34, 9, BRAND.ink, 14); });
  });

  addPage('Contacts', 'Verified support numbers and escalation rule', (ops) => {
    const contacts = [['112', 'Cellphone emergency'], ['10111', 'SAPS emergency'], ['10177', 'Ambulance / fire'], ['086 110 2421', 'TUT Contact Centre'], ['0800 428 428', 'GBV Command Centre']];
    contacts.forEach((c, i) => { const y = 640 - i * 90; rect(ops, 34, y, 527, 65, i === 0 ? 'FFF1F3' : BRAND.pale, i === 0 ? BRAND.red : BRAND.navy, .7); text(ops, 52, y + 35, c[0], 15, true, i === 0 ? BRAND.red : BRAND.navy); text(ops, 220, y + 35, c[1], 11, true, BRAND.ink); });
    paragraph(ops, 34, 135, 'For a campus-specific CPS number or control point, use current verified TUT/My CCSF channels. Contact details and room locations can change; call before travelling during peak periods.', 82, 10, BRAND.muted, 15);
  });

  addPage('Document control', 'Verification and update protocol', (ops) => {
    paragraph(ops, 34, 690, 'This resource deliberately separates confirmed locations from unverified building occupancy. A future update should be issued when TUT/CPS or Facilities provides an authoritative building register, current campus map or corrected service location.', 82, 11, BRAND.ink, 17);
    const statuses = [['VERIFIED', 'A public building and room reference is available. Navigate directly but call first when possible.'], ['CONFIRM FIRST', 'The service is known, but the room, counter or operating point may change.'], ['UNVERIFIED', 'No authoritative occupancy was found. Ask CPS, reception or Facilities; never guess.'], ['OFF-CAMPUS', 'The relevant central office may be at another TUT campus. Travel only after referral.']];
    statuses.forEach((s, i) => { const y = 555 - i * 110; rect(ops, 34, y, 527, 85, i % 2 ? BRAND.pale : 'FFF6DF', BRAND.navy, .7); text(ops, 50, y + 55, s[0], 11, true, i === 2 ? BRAND.red : BRAND.navy); paragraph(ops, 170, y + 55, s[1], 57, 9.5, BRAND.ink, 14); });
  });

  const objects = [null];
  const add = (s) => { objects.push(s); return objects.length - 1; };
  const font1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const font2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pagesId = add(''); const pageIds = [];
  for (const content of pages) {
    const stream = Buffer.from(content, 'utf8'); const contentId = add(`<< /Length ${stream.length} >>\nstream\n${content}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${contentId} 0 R >>`));
  }
  objects[pagesId] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] >>`;
  const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let body = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const offsets = [0];
  for (let i = 1; i < objects.length; i++) { offsets[i] = Buffer.byteLength(body, 'binary'); body += `${i} 0 obj\n${objects[i]}\nendobj\n`; }
  const xref = Buffer.byteLength(body, 'binary'); body += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const file = path.join(outDir, 'My-CCSF-TUT-Pretoria-Campus-Safety-Security-Navigation-Handbook-v2.1.pdf');
  fs.writeFileSync(file, Buffer.from(body, 'binary'));
  return { file, pages: pages.length, size: fs.statSync(file).size };
}
