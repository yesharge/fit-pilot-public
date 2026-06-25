import type { ContactInfo, RewriteResult } from '@/types/ai';
import { PdfWriter } from './pdfWriter';

/**
 * Render a RewriteResult as a clean, professionally styled resume PDF.
 *
 * This is a fresh, generated layout — not the user's original PDF with words
 * swapped in. True in-place editing of the source PDF is unreliable because
 * rewritten text rarely matches the original's length and breaks the layout.
 * Instead we lay out the structured rewrite into a consistent template, and pull
 * through the sections the model did NOT rewrite (contact, education, and any
 * additional sections) so the exported document is complete.
 *
 * Only the REWRITTEN side is ever rendered; the `original` fields exist for the
 * on-screen diff and must never reach the export.
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

export function buildResumePdf(result: RewriteResult): PdfWriter {
  const w = new PdfWriter();
  const {
    contact,
    summary,
    experience,
    skills,
    education,
    additionalSections,
  } = result;

  // ── Header: name + contact line ──────────────────────────────────────────
  if (contact?.name?.trim()) {
    w.text(contact.name.trim(), { size: 20, style: 'bold', gap: 2 });
  }
  if (contact) {
    const line = contactLine(contact);
    if (line) w.text(line, { size: 9.5, color: [71, 85, 105], gap: 4 });
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  if (summary?.rewritten?.trim()) {
    w.heading('Summary');
    w.text(summary.rewritten, { size: 10, gap: 2 });
  }

  // ── Experience ─────────────────────────────────────────────────────────────
  if (experience?.length) {
    w.heading('Experience');
    experience.forEach((entry, i) => {
      const titleCompany = [entry.title, entry.company]
        .filter(Boolean)
        .join(', ');
      if (titleCompany) w.text(titleCompany, { size: 10.5, style: 'bold' });
      if (entry.dates?.trim()) {
        w.text(entry.dates, {
          size: 9,
          style: 'italic',
          color: [71, 85, 105],
          gap: 2,
        });
      }
      for (const bullet of entry.bullets ?? []) {
        if (bullet?.trim())
          w.text(`•  ${bullet.trim()}`, { size: 10, indent: 12, gap: 1 });
      }
      if (i < experience.length - 1) w.space(6);
    });
  }

  // ── Education ───────────────────────────────────────────────────────────────
  if (education?.length) {
    w.heading('Education');
    education.forEach((edu, i) => {
      const head = [edu.degree, edu.institution]
        .map((s) => s?.trim())
        .filter(Boolean)
        .join(', ');
      if (head) w.text(head, { size: 10.5, style: 'bold' });
      if (edu.dates?.trim()) {
        w.text(edu.dates, {
          size: 9,
          style: 'italic',
          color: [71, 85, 105],
          gap: 2,
        });
      }
      for (const detail of edu.details ?? []) {
        if (detail?.trim())
          w.text(detail.trim(), { size: 10, indent: 12, gap: 1 });
      }
      if (i < education.length - 1) w.space(4);
    });
  }

  // ── Skills ───────────────────────────────────────────────────────────────────
  if (skills?.rewritten?.trim()) {
    w.heading('Skills');
    w.text(skills.rewritten, { size: 10, gap: 2 });
  }

  // ── Additional passthrough sections (certifications, projects, …) ────────────
  for (const block of additionalSections ?? []) {
    const lines = (block.lines ?? [])
      .map((l) => l?.trim())
      .filter(Boolean) as string[];
    if (!block.heading?.trim() || lines.length === 0) continue;
    w.heading(block.heading);
    for (const line of lines) w.text(line, { size: 10, gap: 1 });
  }

  return w;
}

/** Build the resume PDF and trigger a browser download. */
export function downloadResumePdf(
  result: RewriteResult,
  filename: string
): void {
  buildResumePdf(result).save(filename);
}
