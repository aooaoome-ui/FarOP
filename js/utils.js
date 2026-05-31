// ===== UTILS — pure utility functions =====

/**
 * Format ISO date string to Thai short date
 * e.g. '2026-05-23' → '23 พ.ค. 69'
 */
export function fmtDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr + 'T00:00:00');
  if (isNaN(d)) return isoStr;
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return `${d.getDate()} ${months[d.getMonth()]} ${String(d.getFullYear() + 543).slice(-2)}`;
}

/**
 * Today's date as ISO string e.g. '2026-05-23'
 */
export const dateStr = new Date().toISOString().split('T')[0];

/**
 * Zero-pad number
 */
export function pad2(n) { return String(n).padStart(2, '0'); }

/**
 * Format number as Thai currency
 */
export function thb(n) {
  return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0 });
}
