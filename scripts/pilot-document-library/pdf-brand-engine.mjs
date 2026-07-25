import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { BRAND } from './resource-data.mjs';
import { escPdf, wrap } from './shared.mjs';

const W = 595.28;
const H = 841.89;
const rgb = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((n) => n.toFixed(3)).join(' ');

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodePng(filePath) {
  const input = fs.readFileSync(filePath);
  if (!input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error(`Invalid PNG: ${filePath}`);
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let palette = null;
  let transparency = null;
  const idat = [];
  while (offset < input.length) {
    const length = input.readUInt32BE(offset);
    const type = input.toString('ascii', offset + 4, offset + 8);
    const data = input.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') transparency = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    offset += 12 + length;
  }
  if (bitDepth !== 8) throw new Error(`Unsupported PNG bit depth ${bitDepth}: ${filePath}`);
  const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 })[colorType];
  if (!channels) throw new Error(`Unsupported PNG color type ${colorType}: ${filePath}`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rows = Buffer.alloc(height * stride);
  let sourceOffset = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[sourceOffset++];
    const rowStart = y * stride;
    for (let x = 0; x < stride; x++) {
      const value = raw[sourceOffset++];
      const left = x >= channels ? rows[rowStart + x - channels] : 0;
      const up = y > 0 ? rows[rowStart - stride + x] : 0;
      const upLeft = y > 0 && x >= channels ? rows[rowStart - stride + x - channels] : 0;
      let decoded = value;
      if (filter === 1) decoded = (value + left) & 255;
      else if (filter === 2) decoded = (value + up) & 255;
      else if (filter === 3) decoded = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) decoded = (value + paeth(left, up, upLeft)) & 255;
      else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}`);
      rows[rowStart + x] = decoded;
    }
  }
  const pixels = width * height;
  const color = Buffer.alloc(pixels * 3);
  const alpha = Buffer.alloc(pixels);
  let hasAlpha = false;
  for (let i = 0; i < pixels; i++) {
    const source = i * channels;
    let r; let g; let b; let a = 255;
    if (colorType === 6) {
      r = rows[source]; g = rows[source + 1]; b = rows[source + 2]; a = rows[source + 3];
    } else if (colorType === 2) {
      r = rows[source]; g = rows[source + 1]; b = rows[source + 2];
    } else if (colorType === 4) {
      r = g = b = rows[source]; a = rows[source + 1];
    } else if (colorType === 0) {
      r = g = b = rows[source];
    } else {
      const index = rows[source];
      r = palette?.[index * 3] ?? 0;
      g = palette?.[index * 3 + 1] ?? 0;
      b = palette?.[index * 3 + 2] ?? 0;
      a = transparency?.[index] ?? 255;
    }
    color[i * 3] = r;
    color[i * 3 + 1] = g;
    color[i * 3 + 2] = b;
    alpha[i] = a;
    if (a !== 255) hasAlpha = true;
  }
  return { width, height, color: zlib.deflateSync(color), alpha: hasAlpha ? zlib.deflateSync(alpha) : null };
}

function imageFit(image, x, y, maxW, maxH) {
  const scale = Math.min(maxW / image.width, maxH / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  return { x: x + (maxW - width) / 2, y: y + (maxH - height) / 2, width, height };
}

function streamObject(dictionary, data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'binary');
  return Buffer.concat([Buffer.from(`<< ${dictionary} /Length ${buffer.length} >>\nstream\n`, 'binary'), buffer, Buffer.from('\nendstream', 'binary')]);
}

export function createBrandedPdf({ outFile, documentTitle, coverTitle, coverSubtitle, version, coverSummary, pages }) {
  const ccsf = decodePng(path.resolve('src/assets/Campus safety forum logo design(1).png'));
  const tut = decodePng(path.resolve('src/assets/tut_light_theme.png'));
  const pageStreams = [];

  const drawing = (ops) => ({
    rect(x, y, width, height, fill, stroke = null, line = 1) {
      ops.push(`${rgb(fill)} rg ${stroke ? `${rgb(stroke)} RG ${line} w` : ''} ${x.toFixed(1)} ${y.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)} re ${stroke ? 'B' : 'f'}`);
    },
    line(x1, y1, x2, y2, color = BRAND.navy, line = 1) {
      ops.push(`${rgb(color)} RG ${line} w ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S`);
    },
    text(x, y, value, size = 10, bold = false, color = BRAND.ink) {
      ops.push(`${rgb(color)} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${escPdf(value)}) Tj ET`);
    },
    paragraph(x, y, value, widthChars = 82, size = 10, color = BRAND.ink, leading = 15, bold = false) {
      const lines = wrap(value, widthChars);
      lines.forEach((line, index) => this.text(x, y - index * leading, line, size, bold, color));
      return y - lines.length * leading;
    },
    image(name, image, x, y, maxW, maxH) {
      const fitted = imageFit(image, x, y, maxW, maxH);
      ops.push(`q ${fitted.width.toFixed(2)} 0 0 ${fitted.height.toFixed(2)} ${fitted.x.toFixed(2)} ${fitted.y.toFixed(2)} cm /${name} Do Q`);
    },
    card(x, y, width, height, title, body, accent = BRAND.navy, fill = BRAND.pale) {
      this.rect(x, y, width, height, fill, accent, 0.8);
      this.rect(x, y, 6, height, accent);
      this.text(x + 18, y + height - 25, title, 10.5, true, accent);
      this.paragraph(x + 18, y + height - 46, body, Math.max(25, Math.floor(width / 7)), 8.6, BRAND.ink, 12.5);
    },
  });

  const addCover = () => {
    const ops = [];
    const d = drawing(ops);
    d.rect(0, 0, W, H, BRAND.navy);
    d.rect(0, H - 18, W, 8, BRAND.red);
    d.rect(0, H - 26, W, 5, BRAND.gold);
    d.rect(38, H - 155, 519, 93, BRAND.white);
    d.image('CCSF', ccsf, 50, H - 145, 115, 72);
    d.line(178, H - 142, 178, H - 78, BRAND.muted, 0.6);
    d.image('TUT', tut, 196, H - 143, 330, 68);
    d.text(40, H - 205, 'MY CCSF | TSHWANE UNIVERSITY OF TECHNOLOGY', 10, true, BRAND.gold);
    const titleLines = wrap(coverTitle.toUpperCase(), 34).slice(0, 4);
    titleLines.forEach((line, index) => d.text(40, H - 258 - index * 38, line, 25, true, BRAND.white));
    const subtitleY = H - 280 - titleLines.length * 38;
    d.paragraph(40, subtitleY, coverSubtitle, 66, 11, BRAND.white, 17);
    d.rect(40, 185, 515, 185, BRAND.white);
    d.text(64, 335, 'PUBLIC STUDENT RESOURCE', 10, true, BRAND.red);
    d.paragraph(64, 306, coverSummary, 67, 12, BRAND.navy, 19, true);
    d.text(64, 218, `Version ${version} | Pilot Edition | 22 July 2026`, 9.5, true, BRAND.red);
    d.text(40, 68, 'CCSF prevention-first student support | Verify time-sensitive TUT locations before travelling', 7.8, false, BRAND.white);
    pageStreams.push(ops.join('\n'));
  };

  const addPage = (page, index) => {
    const pageNumber = index + 2;
    const ops = [];
    const d = drawing(ops);
    d.rect(0, 0, W, H, BRAND.white);
    d.rect(0, H - 76, W, 76, BRAND.white);
    d.rect(0, H - 80, W, 4, BRAND.red);
    d.rect(0, H - 84, W, 4, BRAND.gold);
    d.image('CCSF', ccsf, 28, H - 69, 82, 51);
    d.line(120, H - 65, 120, H - 20, BRAND.muted, 0.5);
    d.image('TUT', tut, 132, H - 66, 220, 46);
    d.text(34, H - 110, page.section.toUpperCase(), 8, true, BRAND.red);
    d.text(34, H - 136, page.title, 19, true, BRAND.navy);
    d.rect(W - 73, H - 58, 40, 28, BRAND.navy);
    d.text(W - 61, H - 48, String(pageNumber).padStart(2, '0'), 10, true, BRAND.white);
    d.rect(0, 0, W, 29, BRAND.navy);
    d.text(34, 10, 'My CCSF | TUT | Public student resource', 7, false, BRAND.white);
    d.text(W - 74, 10, `${pageNumber} / ${pages.length + 1}`, 7, true, BRAND.white);
    page.draw(d, { W, H, pageNumber });
    pageStreams.push(ops.join('\n'));
  };

  addCover();
  pages.forEach(addPage);

  const objects = [null];
  const add = (value) => { objects.push(Buffer.isBuffer(value) ? value : Buffer.from(value, 'binary')); return objects.length - 1; };
  const font1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const font2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const addImage = (image) => {
    const mask = image.alpha ? add(streamObject(`/Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`, image.alpha)) : null;
    return add(streamObject(`/Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode${mask ? ` /SMask ${mask} 0 R` : ''}`, image.color));
  };
  const ccsfId = addImage(ccsf);
  const tutId = addImage(tut);
  const pagesId = add('');
  const pageIds = [];
  for (const content of pageStreams) {
    const contentId = add(streamObject('', Buffer.from(content, 'utf8')));
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> /XObject << /CCSF ${ccsfId} 0 R /TUT ${tutId} 0 R >> >> /Contents ${contentId} 0 R >>`));
  }
  objects[pagesId] = Buffer.from(`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`, 'binary');
  const infoId = add(`<< /Title (${escPdf(documentTitle)}) /Author (Campus Community Safety Forum) /Subject (Public TUT student resource) /Creator (My CCSF branded document engine) >>`);
  const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  const chunks = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'binary')];
  const offsets = [0];
  let length = chunks[0].length;
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = length;
    const chunk = Buffer.concat([Buffer.from(`${i} 0 obj\n`, 'binary'), objects[i], Buffer.from('\nendobj\n', 'binary')]);
    chunks.push(chunk);
    length += chunk.length;
  }
  const xref = length;
  let trailer = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) trailer += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  trailer += `trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  chunks.push(Buffer.from(trailer, 'binary'));
  fs.writeFileSync(outFile, Buffer.concat(chunks));
  return { file: outFile, pages: pageStreams.length, size: fs.statSync(outFile).size };
}
