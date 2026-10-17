/**
 * Date manipulation and JJ/MM/AA formatting helpers
 */

export function formatDateDMY(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr || '';
  }
}

export function formatDateFull(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr || '';
  }
}

export function isDateInRange(targetDate?: string | null, startDate?: string, endDate?: string): boolean {
  if (!targetDate) return true;
  // Normalize target date to YYYY-MM-DD
  const target = targetDate.slice(0, 10);
  if (startDate && target < startDate.slice(0, 10)) {
    return false;
  }
  if (endDate && target > endDate.slice(0, 10)) {
    return false;
  }
  return true;
}

export function generateDocNumber(prefix: string, dateStr?: string, counter: number = 1): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year2 = String(d.getFullYear()).slice(-2);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const seq = String(counter).padStart(4, '0');

  if (prefix === 'FACTURE') {
    // Format AA/MMJJXXXX
    return `${year2}/${month}${day}${seq}`;
  } else if (prefix === 'BON_LIVRAISON') {
    // Format BL-AA/MMJJXXXX
    return `BL-${year2}/${month}${day}${seq}`;
  } else if (prefix === 'DEVIS') {
    // Format DV-AA/MMJJXXXX
    return `DV-${year2}/${month}${day}${seq}`;
  }
  return `${prefix}-${year2}/${month}${day}${seq}`;
}
