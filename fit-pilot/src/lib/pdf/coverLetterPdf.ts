import type { ContactInfo, CoverLetter } from '@/types/ai';
import { PdfWriter } from './pdfWriter';

/**
 * Render a CoverLetter as a downloadable PDF, in the same template family as the
 * resume PDF so an application's two documents look like a matched set. Contact
 * info is optional — when the rewrite captured it, we show a letterhead so the
 * letter isn't anonymous.
 */

function contactLine(contact: ContactInfo): string {
  return [
    contact.email,
    contact.phone,
    contact.location,
    ...(contact.links ?? []),
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join('  •  ');
}

function today(): string {
  return new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function buildCoverLetterPdf(
  letter: CoverLetter,
  contact?: ContactInfo | null
): PdfWriter {
  const w = new PdfWriter();

  // ── Letterhead (only if we have contact info) ────────────────────────────
  if (contact?.name?.trim()) {
    w.text(contact.name.trim(), { size: 16, style: 'bold', gap: 2 });
  }
  if (contact) {
    const line = contactLine(contact);
    if (line) w.text(line, { size: 9.5, color: [71, 85, 105], gap: 6 });
  }

  // ── Date ──────────────────────────────────────────────────────────────────
  w.text(today(), { size: 10, color: [71, 85, 105], gap: 10 });

  // ── Body ───────────────────────────────────────────────────────────────────
  if (letter.opening?.trim()) w.text(letter.opening, { size: 10.5, gap: 8 });
  if (letter.body?.trim()) {
    for (const para of letter.body.split(/\n\n+/)) {
      if (para.trim()) w.text(para.trim(), { size: 10.5, gap: 8 });
    }
  }
  if (letter.closing?.trim()) w.text(letter.closing, { size: 10.5, gap: 2 });

  return w;
}

/** Build the cover letter PDF and trigger a browser download. */
export function downloadCoverLetterPdf(
  letter: CoverLetter,
  filename: string,
  contact?: ContactInfo | null
): void {
  buildCoverLetterPdf(letter, contact).save(filename);
}
