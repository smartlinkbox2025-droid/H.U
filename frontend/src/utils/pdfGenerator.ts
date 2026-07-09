// PDF generator with Arabic RTL support.
// Fonts are fetched at runtime from Google Fonts and cached in localStorage as Base64,
// then registered with pdfmake's virtual filesystem. This keeps the repo lean while
// producing production-grade Arabic PDF output. Once cached, the font is available offline.

import pdfMake from 'pdfmake/build/pdfmake';
// @ts-ignore - CJS module without types
import { ArabicShaper } from 'arabic-persian-reshaper';
import { AR } from '../constants/arabicTerms';

const FONT_URL = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiri/Amiri-Regular.ttf';
const FONT_KEY_B64 = 'sre_font_amiri_regular_b64_v3';
const FONT_URL_BOLD = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiri/Amiri-Bold.ttf';
const FONT_KEY_BOLD_B64 = 'sre_font_amiri_bold_b64_v3';

// Invalidate any previously-poisoned caches from earlier attempts.
try {
  localStorage.removeItem('sre_font_tajawal_regular_b64');
  localStorage.removeItem('sre_font_tajawal_bold_b64');
  localStorage.removeItem('sre_font_tajawal_regular_b64_v2');
  localStorage.removeItem('sre_font_tajawal_bold_b64_v2');
} catch { /* ignore */ }

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`تعذّر تنزيل ملف الخط (${res.status})`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength < 10000) throw new Error(`ملف الخط تالف — الحجم ${buf.byteLength} بايت`);
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
  if (cached && cached.length > 5000) return cached;
  const b64 = await urlToBase64(url);
  try { localStorage.setItem(key, b64); } catch { /* quota — ignore */ }
  return b64;
}

let fontsReady = false;
let cachedVfs: Record<string, string> = {};
const cachedFonts = {
  Amiri: {
    normal: 'Amiri-Regular.ttf',
    bold: 'Amiri-Bold.ttf',
    italics: 'Amiri-Regular.ttf',
    bolditalics: 'Amiri-Bold.ttf',
  },
};

export async function ensureArabicFonts(): Promise<void> {
  if (fontsReady) return;
  const [regular, bold] = await Promise.all([
    loadFont(FONT_URL, FONT_KEY_B64),
    loadFont(FONT_URL_BOLD, FONT_KEY_BOLD_B64),
  ]);
  cachedVfs = {
    'Amiri-Regular.ttf': regular,
    'Amiri-Bold.ttf': bold,
  };
  // pdfmake v0.3.x browser bundle: fonts must be registered via addVirtualFileSystem
  // (which writes into an internal virtualfs module that Printer reads at createPdf-time).
  const pm: any = pdfMake as any;
  if (typeof pm.addVirtualFileSystem === 'function') {
    pm.addVirtualFileSystem(cachedVfs);
  } else {
    pm.vfs = { ...(pm.vfs || {}), ...cachedVfs };
  }
  if (typeof pm.addFonts === 'function') {
    pm.addFonts(cachedFonts);
  } else {
    pm.fonts = { ...(pm.fonts || {}), ...cachedFonts };
  }
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

// -----------------------------------------------------------------------------
// Arabic bidi + shaping for pdfmake
// -----------------------------------------------------------------------------
// pdfmake renders characters strictly left-to-right and does not perform Arabic
// letter shaping (contextual forms) nor bidirectional reordering. To make Arabic
// text render correctly we:
//   1. Reshape logical Arabic characters into their contextual presentation
//      forms via arabic-persian-reshaper.
//   2. Reorder the shaped glyphs for LTR-drawing: reverse the string in a
//      bidi-aware manner so that runs of digits/Latin remain in original order
//      (numbers must not be reversed).
// -----------------------------------------------------------------------------

// LTR run: Latin-Indic digits, Arabic-Indic digits (٠-٩ / ۰-۹), Latin letters,
// and common numeric separators (,.٬٫/-:).  Whitespace is treated as neutral
// and joins the surrounding Arabic segment so word gaps read naturally.
const LTR_RUN_RE =
  /([\d\u0660-\u0669\u06F0-\u06F9][\d\u0660-\u0669\u06F0-\u06F9.,\u066B\u066C/\-:]*|[A-Za-z][A-Za-z0-9._\-]*)/g;

// Map Arabic-Indic digits (٠-٩) and Extended Arabic-Indic digits (۰-۹)
// plus Arabic decimal/thousands separators (٫ ٬) to their ASCII equivalents.
// pdfmake applies implicit bidi reordering to Arabic-Indic digit runs, which
// visually reverses numeric strings inside PDF output. ASCII digits are safe.
const ARABIC_INDIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9\u066B\u066C]/g;
const AR_TO_LATIN: Record<string, string> = {
  '\u0660': '0', '\u0661': '1', '\u0662': '2', '\u0663': '3', '\u0664': '4',
  '\u0665': '5', '\u0666': '6', '\u0667': '7', '\u0668': '8', '\u0669': '9',
  '\u06F0': '0', '\u06F1': '1', '\u06F2': '2', '\u06F3': '3', '\u06F4': '4',
  '\u06F5': '5', '\u06F6': '6', '\u06F7': '7', '\u06F8': '8', '\u06F9': '9',
  '\u066B': '.', '\u066C': ',',
};

function toLatinDigits(s: string): string {
  return s.replace(ARABIC_INDIC_DIGITS, (c) => AR_TO_LATIN[c] || c);
}

function bidiForPdf(text: string): string {
  if (!text) return text;
  // 1) Normalize any Arabic-Indic digits & separators to ASCII so pdfmake does
  //    NOT apply its implicit bidi reversal to numeric runs.
  const normalized = toLatinDigits(String(text));
  // 2) Reshape Arabic letters into contextual presentation forms.
  const shaped: string = ArabicShaper.convertArabic(normalized);
  // 3) Bidi-aware reversal: reverse the string so it reads correctly when
  //    pdfmake draws LTR, but keep LTR runs (digits, Latin) intact.
  const parts: { ltr: boolean; text: string }[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  LTR_RUN_RE.lastIndex = 0;
  while ((m = LTR_RUN_RE.exec(shaped)) !== null) {
    if (m.index > lastIndex) parts.push({ ltr: false, text: shaped.slice(lastIndex, m.index) });
    parts.push({ ltr: true, text: m[0] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < shaped.length) parts.push({ ltr: false, text: shaped.slice(lastIndex) });
  return parts
    .reverse()
    .map((p) => (p.ltr ? p.text : p.text.split('').reverse().join('')))
    .join('');
}

/** Shape a single string for direct pdfmake output. */
export const ar = (s: string | number | undefined | null): string =>
  s === undefined || s === null ? '' : bidiForPdf(String(s));

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
      text: ar(opts.companyName || AR.app.title),
      style: 'company',
      alignment: 'right',
    },
    {
      text: ar(opts.title),
      style: 'title',
      alignment: 'right',
      margin: [0, 6, 0, 4],
    },
    ...(opts.subtitle
      ? [{ text: ar(opts.subtitle), style: 'subtitle', alignment: 'right', margin: [0, 0, 0, 12] }]
      : []),
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.8, lineColor: '#0284C7' }],
      margin: [0, 4, 0, 12],
    },
  ];

  for (const s of opts.sections) {
    if (s.heading) {
      content.push({ text: ar(s.heading), style: 'sectionHeading', alignment: 'right', margin: [0, 10, 0, 6] });
    }
    if (s.paragraphs) {
      for (const p of s.paragraphs) {
        content.push({ text: ar(p), alignment: 'right', margin: [0, 0, 0, 4] });
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
            headers.map((h) => ({ text: ar(h), style: 'tableHeader', alignment: 'right' })),
            ...rows.map((row) =>
              row.map((c) => ({ text: ar(c), alignment: 'right' }))
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
    defaultStyle: { font: 'Amiri', alignment: 'right', fontSize: 10 },
    styles: {
      company: { fontSize: 10, color: '#64748B' },
      title: { fontSize: 20, bold: true, color: '#0F172A' },
      subtitle: { fontSize: 11, color: '#475569' },
      sectionHeading: { fontSize: 13, bold: true, color: '#0F172A' },
      tableHeader: { bold: true, color: '#FFFFFF', fillColor: '#0F172A' },
    },
    footer: (currentPage: number, pageCount: number) => ({
      text: ar(`صفحة ${currentPage} من ${pageCount}`),
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
