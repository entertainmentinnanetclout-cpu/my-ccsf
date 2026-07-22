export function escXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
export function escPdf(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[’]/g, "'");
}
export function wrap(text, maxChars) {
  const words = String(text).split(/\s+/); const lines = []; let current = '';
  for (const word of words) {
    if (!current) current = word;
    else if ((current + ' ' + word).length <= maxChars) current += ' ' + word;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines;
}
