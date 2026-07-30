const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  mp4: 'video/mp4',
  pdf: 'application/pdf',
};

export function evidenceFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.trim().toLowerCase() ?? '';
}

export function normaliseEvidenceMimeType(file: File): string {
  const browserType = file.type.trim().toLowerCase();
  if (browserType && browserType !== 'application/octet-stream') return browserType;
  return MIME_BY_EXTENSION[evidenceFileExtension(file.name)] ?? 'application/octet-stream';
}

export function isAllowedEvidenceFile(file: File, allowedMimeTypes: readonly string[]): boolean {
  return allowedMimeTypes.includes(normaliseEvidenceMimeType(file));
}
