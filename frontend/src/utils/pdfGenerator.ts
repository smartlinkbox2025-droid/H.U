// PDF generator with Arabic RTL support.
// Fonts are fetched at runtime from Google Fonts and cached in localStorage as Base64,
// then registered with pdfmake's virtual filesystem. This keeps the repo lean while
// producing production-grade Arabic PDF output. Once cached, the font is available offline.

import pdfMake from 'pdfmake/build/pdfmake';
import { AR } from '../constants/arabicTerms';

const FONT_URL = 'https://fonts.gstatic.com/s/tajawal/v11/Iura6YBj_oCad4k1l_6gLrZjiLlJ-G0.ttf';
const FONT_KEY_B64 = 'sre_font_tajawal_regular_b64';
const FONT_URL_BOLD = 'https://fonts.gstatic.com/s/tajawal/v11/Iurf6YBj_oCad4k1l7GhY9V_UvSNTA.ttf';
const FONT_KEY_BOLD_B64 = 'sre_font_tajawal_bold_b64';

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(binary);
}

async function loadFont(url: string, key: string): Promise<string> {
  const cached = localStorage.getItem(key);
  if (cached) return cached;
  const b64 = await urlToBase64(url);
  try { localStorage.setItem(key, b64); } catch { /* quota — ignore */ }
  return b64;
}

let fontsReady = false;

export async function ensureArabicFonts(): Promise<void> {
  if (fontsReady) return;
  const [regular, bold] = await Promise.all([
    loadFont(FONT_URL, FONT_KEY_B64),
    loadFont(FONT_URL_BOLD, FONT_KEY_BOLD_B64),
  ]);
  // Register in pdfmake VFS
  const vfs = (pdfMake as any).vfs || {};
  vfs['Tajawal-Regular.ttf'] = regular;
  vfs['Tajawal-Bold.ttf'] = bold;
  (pdfMake as any).vfs = vfs;
  (pdfMake as any).fonts = {
    Tajawal: {
      normal: 'Tajawal-Regular.ttf',
      bold: 'Tajawal-Bold.ttf',
      italics: 'Tajawal-Regular.ttf',
      bolditalics: 'Tajawal-Bold.ttf',
    },
  };
  fontsReady = true;
}

export interface PdfSection {
  heading?: string;
  paragraphs?: string[];
  table?: {
    headers: string[];
    rows: (string | number)[][];
    widths?: (string | number)[];
  };
}

export async function generateArabicPDF(opts: {
  title: string;
  subtitle?: string;
  companyName?: string;
  sections: PdfSection[];
  filename?: string;
}): Promise<void> {
  await ensureArabicFonts();

  const content: any[] = [
    {
      text: opts.companyName || AR.app.title,
      style: 'company',
      alignment: 'right',
    },
    {
      text: opts.title,
      style: 'title',
      alignment: 'right',
      margin: [0, 6, 0, 4],
    },
    ...(opts.subtitle
      ? [{ text: opts.subtitle, style: 'subtitle', alignment: 'right', margin: [0, 0, 0, 12] }]
      : []),
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.8, lineColor: '#0284C7' }],
      margin: [0, 4, 0, 12],
    },
  ];

  for (const s of opts.sections) {
    if (s.heading) {
      content.push({ text: s.heading, style: 'sectionHeading', alignment: 'right', margin: [0, 10, 0, 6] });
    }
    if (s.paragraphs) {
      for (const p of s.paragraphs) {
        content.push({ text: p, alignment: 'right', margin: [0, 0, 0, 4] });
      }
    }
    if (s.table) {
      // Reverse header/row so first cell appears at right side in Arabic reading order
      const headers = [...s.table.headers].reverse();
      const rows = s.table.rows.map((r) => [...r].reverse());
      content.push({
        table: {
          headerRows: 1,
          widths: s.table.widths ? [...s.table.widths].reverse() : headers.map(() => '*'),
          body: [
            headers.map((h) => ({ text: h, style: 'tableHeader', alignment: 'right' })),
            ...rows.map((row) =>
              row.map((c) => ({ text: String(c ?? ''), alignment: 'right' }))
            ),
          ],
        },
        layout: {
          fillColor: (row: number) => (row === 0 ? '#0F172A' : row % 2 === 0 ? '#F8FAFC' : null),
          hLineColor: () => '#E2E8F0',
          vLineColor: () => '#E2E8F0',
        },
        margin: [0, 0, 0, 12],
      });
    }
  }

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content,
    defaultStyle: { font: 'Tajawal', alignment: 'right', fontSize: 10 },
    styles: {
      company: { fontSize: 10, color: '#64748B' },
      title: { fontSize: 20, bold: true, color: '#0F172A' },
      subtitle: { fontSize: 11, color: '#475569' },
      sectionHeading: { fontSize: 13, bold: true, color: '#0F172A' },
      tableHeader: { bold: true, color: '#FFFFFF', fillColor: '#0F172A' },
    },
    footer: (currentPage: number, pageCount: number) => ({
      text: `صفحة ${currentPage} من ${pageCount}`,
      alignment: 'center',
      fontSize: 8,
      margin: [0, 10, 0, 0],
      color: '#64748B',
    }),
    info: {
      title: opts.title,
      author: opts.companyName || AR.app.title,
    },
  };

  const filename = opts.filename || `${opts.title}.pdf`.replace(/\s+/g, '_');
  pdfMake.createPdf(docDefinition).download(filename);
}
