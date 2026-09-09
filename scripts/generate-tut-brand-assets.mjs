import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';

const root = process.cwd();
const sourcePath = path.join(root, 'src', 'assets', 'tut-logo.png');
const publicDir = path.join(root, 'public');

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodeRgbaPng(buffer) {
  if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Invalid TUT PNG signature');
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    offset += length + 12;
  }
  if (bitDepth !== 8 || colorType !== 6) throw new Error(`Expected 8-bit RGBA TUT logo; received ${bitDepth}/${colorType}`);
  const channels = 4;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(stride * height);
  let rawOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset++];
    const row = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const value = raw[rawOffset + x];
      const left = x >= channels ? pixels[row + x - channels] : 0;
      const above = y > 0 ? pixels[row - stride + x] : 0;
      const upperLeft = y > 0 && x >= channels ? pixels[row - stride + x - channels] : 0;
      if (filter === 0) pixels[row + x] = value;
      else if (filter === 1) pixels[row + x] = (value + left) & 255;
      else if (filter === 2) pixels[row + x] = (value + above) & 255;
      else if (filter === 3) pixels[row + x] = (value + Math.floor((left + above) / 2)) & 255;
      else if (filter === 4) pixels[row + x] = (value + paeth(left, above, upperLeft)) & 255;
      else throw new Error(`Unsupported PNG filter ${filter}`);
    }
    rawOffset += stride;
  }
  return { width, height, pixels };
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0);
  typeBuffer.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), data.length + 8);
  return out;
}

function encodeRgbaPng(width, height, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const target = y * (stride + 1);
    raw[target] = 0;
    pixels.copy(raw, target + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function contentBounds(image) {
  let left = image.width;
  let top = image.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const i = (y * image.width + x) * 4;
      const [r, g, b, a] = image.pixels.subarray(i, i + 4);
      const visible = a > 12 && (r < 248 || g < 248 || b < 248);
      if (!visible) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) return { left: 0, top: 0, right: image.width - 1, bottom: image.height - 1 };
  return { left, top, right, bottom };
}

function sampleBilinear(image, sx, sy) {
  const x0 = Math.max(0, Math.min(image.width - 1, Math.floor(sx)));
  const y0 = Math.max(0, Math.min(image.height - 1, Math.floor(sy)));
  const x1 = Math.min(image.width - 1, x0 + 1);
  const y1 = Math.min(image.height - 1, y0 + 1);
  const tx = sx - x0;
  const ty = sy - y0;
  const out = [0, 0, 0, 0];
  for (let c = 0; c < 4; c += 1) {
    const p00 = image.pixels[(y0 * image.width + x0) * 4 + c];
    const p10 = image.pixels[(y0 * image.width + x1) * 4 + c];
    const p01 = image.pixels[(y1 * image.width + x0) * 4 + c];
    const p11 = image.pixels[(y1 * image.width + x1) * 4 + c];
    out[c] = Math.round((p00 * (1 - tx) + p10 * tx) * (1 - ty) + (p01 * (1 - tx) + p11 * tx) * ty);
  }
  return out;
}

function renderLogo(image, width, height, paddingFraction) {
  const output = Buffer.alloc(width * height * 4, 255);
  const bounds = contentBounds(image);
  const sourceWidth = bounds.right - bounds.left + 1;
  const sourceHeight = bounds.bottom - bounds.top + 1;
  const maxWidth = width * (1 - paddingFraction * 2);
  const maxHeight = height * (1 - paddingFraction * 2);
  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
  const targetWidth = sourceWidth * scale;
  const targetHeight = sourceHeight * scale;
  const xOffset = (width - targetWidth) / 2;
  const yOffset = (height - targetHeight) / 2;

  for (let y = Math.max(0, Math.floor(yOffset)); y < Math.min(height, Math.ceil(yOffset + targetHeight)); y += 1) {
    for (let x = Math.max(0, Math.floor(xOffset)); x < Math.min(width, Math.ceil(xOffset + targetWidth)); x += 1) {
      const sx = bounds.left + (x - xOffset + 0.5) / scale - 0.5;
      const sy = bounds.top + (y - yOffset + 0.5) / scale - 0.5;
      const [r, g, b, a] = sampleBilinear(image, sx, sy);
      const alpha = a / 255;
      const i = (y * width + x) * 4;
      output[i] = Math.round(r * alpha + 255 * (1 - alpha));
      output[i + 1] = Math.round(g * alpha + 255 * (1 - alpha));
      output[i + 2] = Math.round(b * alpha + 255 * (1 - alpha));
      output[i + 3] = 255;
    }
  }
  return encodeRgbaPng(width, height, output);
}

function createIco(entries) {
  const header = Buffer.alloc(6 + entries.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let dataOffset = header.length;
  entries.forEach(({ size, png }, index) => {
    const offset = 6 + index * 16;
    header[offset] = size >= 256 ? 0 : size;
    header[offset + 1] = size >= 256 ? 0 : size;
    header[offset + 2] = 0;
    header[offset + 3] = 0;
    header.writeUInt16LE(1, offset + 4);
    header.writeUInt16LE(32, offset + 6);
    header.writeUInt32LE(png.length, offset + 8);
    header.writeUInt32LE(dataOffset, offset + 12);
    dataOffset += png.length;
  });
  return Buffer.concat([header, ...entries.map((entry) => entry.png)]);
}

await mkdir(publicDir, { recursive: true });
const source = decodeRgbaPng(await readFile(sourcePath));
const regular = new Map();
for (const size of [16, 32, 48, 64, 180, 192, 256, 512, 1024]) regular.set(size, renderLogo(source, size, size, size <= 64 ? 0.04 : 0.08));

await Promise.all([
  writeFile(path.join(publicDir, 'favicon-16x16.png'), regular.get(16)),
  writeFile(path.join(publicDir, 'favicon-32x32.png'), regular.get(32)),
  writeFile(path.join(publicDir, 'favicon.png'), regular.get(64)),
  writeFile(path.join(publicDir, 'favicon.ico'), createIco([16, 32, 48, 64].map((size) => ({ size, png: regular.get(size) })))),
  writeFile(path.join(publicDir, 'apple-touch-icon.png'), regular.get(180)),
  writeFile(path.join(publicDir, 'app-icon-192.png'), regular.get(192)),
  writeFile(path.join(publicDir, 'app-icon.png'), regular.get(256)),
  writeFile(path.join(publicDir, 'app-icon-512.png'), regular.get(512)),
  writeFile(path.join(publicDir, 'app-icon-1024.png'), regular.get(1024)),
  writeFile(path.join(publicDir, 'maskable-icon-512.png'), renderLogo(source, 512, 512, 0.18)),
  writeFile(path.join(publicDir, 'og-image.png'), renderLogo(source, 1200, 630, 0.14)),
]);

console.log('Generated TUT-only favicon, PWA, Apple touch and social preview assets from src/assets/tut-logo.png.');
