/**
 * Escapes text before it is placed inside HTML markup (e.g. the printable PDF report).
 * Notes and holiday names come from users or external APIs and must never be
 * interpreted as HTML/script.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds a safe, quoted CSV cell. Doubles embedded quotes and neutralises
 * spreadsheet formula injection (cells starting with = + - @ tab or CR).
 */
export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}
