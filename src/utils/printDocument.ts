/**
 * Specialized Document Print & PDF Download Naming Utility
 * Ensures that whenever a user saves/prints a fiche as PDF, the browser automatically
 * defaults to a strictly unique, standardized, non-repeating file name formatted as:
 * [TYPE]_[UNIQUE_REFERENCE]_[PARTNER_OR_STATION]_[DATE].pdf
 */

export type DocumentTypeKey =
  | 'FACTURE'
  | 'BL'
  | 'DEVIS'
  | 'CLOTURE_JOURNEE'
  | 'BON_ACHAT'
  | 'RAPPORT_CPC'
  | 'RECU_CAISSE';

export interface PrintDocumentOptions {
  /** The explicit document type (e.g. FACTURE, BL, DEVIS, CLOTURE_JOURNEE) */
  type: DocumentTypeKey | string;
  /** The unique reference of the document (e.g. FAC-2026-1017-0001, BL-2026-0002) */
  reference: string;
  /** Client, Fournisseur, or Station identifier */
  partnerOrEntity?: string;
  /** ISO Date or document date */
  date?: string;
  /** Optional secondary info like shift or matricule */
  subInfo?: string;
  /** Station name */
  stationName?: string;
}

/**
 * Sanitize string for clean, cross-platform file naming
 */
export function sanitizeFilenamePart(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents (é, è, à -> e, e, a)
    .replace(/[^a-zA-Z0-9_-]/g, '_') // replace spaces, slashes, punctuation with _
    .replace(/_+/g, '_') // collapse consecutive underscores
    .replace(/^_+|_+$/g, '') // trim leading/trailing underscores
    .toUpperCase();
}

/**
 * Generate a guaranteed unique, descriptive filename for any printable document
 */
export function buildDocumentFilename(options: PrintDocumentOptions): string {
  // Normalize type
  let typePrefix = options.type.toUpperCase();
  if (typePrefix === 'BON_LIVRAISON') typePrefix = 'BL';
  if (typePrefix === 'BON_COMMANDE') typePrefix = 'BC';

  const type = sanitizeFilenamePart(typePrefix);
  const ref = sanitizeFilenamePart(options.reference || `REF-${Date.now()}`);
  const partner = options.partnerOrEntity ? sanitizeFilenamePart(options.partnerOrEntity) : '';
  const sub = options.subInfo ? sanitizeFilenamePart(options.subInfo) : '';
  const dateStr = options.date
    ? sanitizeFilenamePart(options.date.slice(0, 10))
    : new Date().toISOString().slice(0, 10);

  const parts = [type, ref];
  if (partner) parts.push(partner);
  if (sub) parts.push(sub);
  parts.push(dateStr);

  return parts.filter(Boolean).join('_');
}

/**
 * Trigger window.print() with dynamic document.title so that the browser's "Save as PDF"
 * dialog automatically names the file uniquely according to document type and reference.
 */
export function printDocumentWithCustomName(options: PrintDocumentOptions): void {
  const customTitle = buildDocumentFilename(options);
  const originalTitle = document.title;

  // Set title before printing
  document.title = customTitle;

  const cleanup = () => {
    document.title = originalTitle;
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  // Small delay to ensure the browser DOM reflects document.title before print dialog opens
  setTimeout(() => {
    window.print();
    // Fallback restoration in case afterprint does not fire in certain browser engines
    setTimeout(cleanup, 3000);
  }, 100);
}
