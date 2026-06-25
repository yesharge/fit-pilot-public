import { jsPDF } from 'jspdf';

/**
 * Thin layout wrapper around jsPDF. jsPDF is a low-level drawing API — it has no
 * concept of flowing text, paragraphs, or page breaks. PdfWriter adds the small
 * amount of layout we need: a top-to-bottom cursor, word-wrapping via
 * splitTextToSize, and an automatic page break when the cursor runs past the
 * bottom margin. Everything is measured in points (72pt = 1in), jsPDF's default
 * unit, on US Letter paper.
 *
 * It is deliberately generic: it knows nothing about resumes or cover letters.
 * The document generators compose it into a layout.
 */

const FONT = 'helvetica'; // a built-in jsPDF font — no embedding, keeps the file small

export interface TextOptions {
  size?: number;
  style?: 'normal' | 'bold' | 'italic' | 'bolditalic';
  color?: [number, number, number];
  /** Extra space (pt) added after the line/paragraph. */
  gap?: number;
  /** Left indent (pt) from the page margin. */
  indent?: number;
  /** Line height multiplier applied to the font size. Default 1.3. */
  lineHeight?: number;
}

export class PdfWriter {
  readonly doc: jsPDF;
  private readonly margin: number;
  private readonly pageWidth: number;
  private readonly pageHeight: number;
  private y: number;

  constructor(margin = 54 /* 0.75in */) {
    this.doc = new jsPDF({ unit: 'pt', format: 'letter' });
    this.margin = margin;
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.y = margin;
  }

  private get contentWidth(): number {
    return this.pageWidth - this.margin * 2;
  }

  /** Add a page if the next `needed` points won't fit before the bottom margin. */
  private ensureSpace(needed: number): void {
    if (this.y + needed > this.pageHeight - this.margin) {
      this.doc.addPage();
      this.y = this.margin;
    }
  }

  /** Write wrapped text from the cursor down. No-op for empty/whitespace input. */
  text(content: string, options: TextOptions = {}): void {
    const raw = (content ?? '').trim();
    if (!raw) return;

    const {
      size = 10,
      style = 'normal',
      color = [17, 24, 39], // slate-900
      gap = 0,
      indent = 0,
      lineHeight = 1.3,
    } = options;

    this.doc.setFont(FONT, style);
    this.doc.setFontSize(size);
    this.doc.setTextColor(color[0], color[1], color[2]);

    const width = this.contentWidth - indent;
    const lines = this.doc.splitTextToSize(raw, width) as string[];
    const step = size * lineHeight;

    for (const line of lines) {
      this.ensureSpace(step);
      this.doc.text(line, this.margin + indent, this.y);
      this.y += step;
    }

    this.y += gap;
  }

  /**
   * A section heading with a hairline rule beneath it — the visual anchor that
   * makes the generated PDF read like a real resume rather than a text dump.
   */
  heading(label: string): void {
    const text = (label ?? '').trim();
    if (!text) return;

    this.ensureSpace(26);
    this.y += 6;
    this.doc.setFont(FONT, 'bold');
    this.doc.setFontSize(11);
    this.doc.setTextColor(17, 24, 39);
    this.doc.text(text.toUpperCase(), this.margin, this.y);
    this.y += 4;

    this.doc.setDrawColor(203, 213, 225); // slate-300
    this.doc.setLineWidth(0.75);
    this.doc.line(this.margin, this.y, this.pageWidth - this.margin, this.y);
    this.y += 10;
  }

  /** Vertical whitespace. */
  space(points: number): void {
    this.y += points;
  }

  /** Trigger a browser download of the finished document. */
  save(filename: string): void {
    this.doc.save(filename);
  }

  /** The raw Blob, for callers that want to handle the download themselves. */
  blob(): Blob {
    return this.doc.output('blob');
  }
}
