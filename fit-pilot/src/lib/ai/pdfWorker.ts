import * as pdfjs from 'pdfjs-dist';

// Resolves relative to node_modules at build time and maps to a production asset hash
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs', // Note: use '.js' if using pdfjs-dist v3 or lower
  import.meta.url
).toString();

export const pdfjsLib = pdfjs;