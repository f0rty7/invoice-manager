/**
 * Format a date string (ISO / yyyy-MM-dd) into a human-readable form.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format a number as Indian Rupee currency.
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number with commas (Indian grouping).
 */
export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-IN').format(value);
}

/**
 * Get a display string for order_no which can be string | string[] | null.
 */
export function formatOrderNo(orderNo: string | string[] | null | undefined): string {
  if (!orderNo) return '—';
  if (Array.isArray(orderNo)) return orderNo.join(', ');
  return orderNo;
}

/**
 * Get the delivery partner display name.
 */
export function formatPartnerName(partner: { registered_name?: string | null; known_name?: string | null } | string | null | undefined): string {
  if (!partner) return '—';
  if (typeof partner === 'string') return partner;
  return partner.known_name || partner.registered_name || '—';
}

/**
 * Truncate text to a max length with ellipsis.
 */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}

/**
 * Format a relative time string, e.g. "2 min ago", "1 hour ago".
 */
export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
