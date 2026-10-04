/**
 * Formats a student ID by adding a hyphen '-' after every 3 digits.
 * Example: '111111111' -> '111-111-111'
 * Example: '201015123' -> '201-015-123'
 * Example: '0182210012101001' -> '018-221-001-210-100-1'
 * 
 * Frontend visual presentation helper only (does not mutate backend data).
 */
export function formatStudentId(id?: string | number | null): string {
  if (id === null || id === undefined) return '';
  const str = String(id).trim();
  if (!str) return '';
  if (str === 'N/A' || str === 'n/a') return 'N/A';
  if (str.toLowerCase() === 'admin') return str;

  // Extract all numeric digits
  const digits = str.replace(/\D/g, '');

  // If there are no digits, or it is a placeholder with alphabet codes (e.g., '21-XXXXX-1')
  if (!digits || /[A-Za-z]{2,}/.test(str)) {
    return str;
  }

  // Format into chunks of 3 digits separated by '-'
  const chunks = digits.match(/.{1,3}/g);
  return chunks ? chunks.join('-') : str;
}
