const HEIC_TYPES = new Set(['image/heic', 'image/heif']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', ...HEIC_TYPES]);
const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'video/3gpp2']);
const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
  mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', '3gp': 'video/3gpp', '3g2': 'video/3gpp2',
  pdf: 'application/pdf',
};

export interface EvidencePreparationOptions { allowPdf?: boolean; maxBytes: number; maxDimension?: number; compressAboveBytes?: number; jpegQuality?: number }
export interface EvidenceManifestItem { path: string; original_filename: string; mime_type: string; size_bytes: number; checksum: string }

function extensionOf(name: string): string { return name.split('.').pop()?.trim().toLowerCase() ?? ''; }
export function normaliseEvidenceMimeType(file: File): string {
  const type = file.type.trim().toLowerCase();
  if (type && type !== 'application/octet-stream') return type;
  return MIME_BY_EXTENSION[extensionOf(file.name)] ?? type;
}
export function evidenceFileIdentity(file: File): string { return `${file.name}:${file.size}:${file.lastModified}:${normaliseEvidenceMimeType(file)}`; }
export function isAllowedEvidenceFile(file: File, allowPdf = false): boolean {
  const type = normaliseEvidenceMimeType(file);
  return IMAGE_TYPES.has(type) || VIDEO_TYPES.has(type) || (allowPdf && type === 'application/pdf');
}

function withNormalisedMime(file: File): File {
  const type = normaliseEvidenceMimeType(file);
  if (!type || type === file.type) return file;
  return new File([file], file.name, { type, lastModified: file.lastModified || Date.now() });
}

async function loadImageSource(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch { /* Safari may decode through HTMLImageElement. */ }
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`${file.name} could not be decoded on this device. Save HEIC/HEIF evidence as JPEG or PNG and try again.`));
    image.src = url;
  });
  return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) };
}
function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The image could not be converted.')), type, quality));
}
async function convertOrCompressImage(file: File, options: Required<Pick<EvidencePreparationOptions, 'maxDimension' | 'compressAboveBytes' | 'jpegQuality'>>): Promise<File> {
  const type = normaliseEvidenceMimeType(file);
  const needsConversion = HEIC_TYPES.has(type);
  const needsCompression = file.size > options.compressAboveBytes;
  if (!needsConversion && !needsCompression) return withNormalisedMime(file);
  const loaded = await loadImageSource(file);
  try {
    const scale = Math.min(1, options.maxDimension / Math.max(loaded.width, loaded.height));
    const width = Math.max(1, Math.round(loaded.width * scale));
    const height = Math.max(1, Math.round(loaded.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Image processing is not supported by this browser.');
    context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
    context.fillStyle = '#FFFFFF'; context.fillRect(0, 0, width, height); context.drawImage(loaded.source, 0, 0, width, height);
    const outputType = needsConversion ? 'image/jpeg' : type === 'image/png' ? 'image/webp' : type;
    const blob = await canvasBlob(canvas, outputType, options.jpegQuality);
    const outputExtension = outputType === 'image/webp' ? 'webp' : outputType === 'image/png' ? 'png' : 'jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'evidence';
    const converted = new File([blob], `${baseName}.${outputExtension}`, { type: outputType, lastModified: file.lastModified || Date.now() });
    return converted.size < file.size || needsConversion ? converted : withNormalisedMime(file);
  } finally { loaded.close(); }
}
export async function evidenceChecksum(file: Blob): Promise<string> {
  if (!crypto.subtle) return '';
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
}
export async function prepareEvidenceFile(file: File, options: EvidencePreparationOptions): Promise<File> {
  if (file.size <= 0) throw new Error(`${file.name} is empty.`);
  const normalized = withNormalisedMime(file);
  if (!isAllowedEvidenceFile(normalized, options.allowPdf)) throw new Error(`${file.name} is not an accepted evidence format.`);
  const prepared = IMAGE_TYPES.has(normaliseEvidenceMimeType(normalized)) ? await convertOrCompressImage(normalized, {
    maxDimension: options.maxDimension ?? 2560,
    compressAboveBytes: options.compressAboveBytes ?? 2 * 1024 * 1024,
    jpegQuality: options.jpegQuality ?? 0.86,
  }) : normalized;
  if (prepared.size > options.maxBytes) throw new Error(`${prepared.name} is ${(prepared.size / (1024 * 1024)).toFixed(1)} MB after processing and exceeds the ${(options.maxBytes / (1024 * 1024)).toFixed(0)} MB limit.`);
  return prepared;
}
export async function prepareEvidenceFiles(files: File[], options: EvidencePreparationOptions): Promise<File[]> {
  const prepared: File[] = [];
  for (const file of files) prepared.push(await prepareEvidenceFile(file, options));
  return prepared;
}
export function revokePreviewUrls(urls: string[]): void { urls.forEach((url) => URL.revokeObjectURL(url)); }
