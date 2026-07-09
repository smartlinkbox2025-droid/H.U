// PDF generator with Arabic RTL support — production-grade.
//
// Pipeline:
//   1. Amiri TTF (regular + bold) bundled directly in the project as static
//      assets (see /src/assets/fonts). Vite's `?url` import produces same-origin
//      URLs that Workbox pre-caches, giving true offline PDF output.
//   2. Fonts are registered explicitly in pdfMake.fonts / VFS at first use.
//   3. Every text string is pre-shaped through arabic-persian-reshaper to
//      convert logical Arabic characters into their contextual presentation
//      forms (Amiri's cmap covers the full U+FE70..U+FEFC range) and then
//      bidi-reordered so it draws correctly when pdfmake lays out LTR.
//   4. Arabic-Indic digits are normalized to ASCII 0-9 so pdfmake's implicit
//      bidi cannot reverse numeric runs.
//   5. RTL is declared at every level pdfmake understands: docDefinition
//      (`direction: 'rtl'`), defaultStyle (`alignment: 'right'`, `rtl: true`),
//      per-cell alignment 'right', and via the `pageOrientation` layout.

import pdfMake from 'pdfmake/build/pdfmake';
// @ts-ignore - CJS module without types
import { ArabicShaper } from 'arabic-persian-reshaper';
import { AR } from '../constants/arabicTerms';

// Vite ?url imports produce bundled same-origin URLs. Both TTFs live in
// /src/assets/fonts and are copied by Vite into the build output.  Workbox
// (VitePWA) auto-caches them so PDF generation works fully offline once the
// PWA is installed / first visited.
import AmiriRegularUrl from '../assets/fonts/Amiri-Regular.ttf?url';
import AmiriBoldUrl from '../assets/fonts/Amiri-Bold.ttf?url';

// Clear caches from previous font strategies so users don't hit stale bytes.
try {
  const legacyKeys = [
    'sre_font_tajawal_regular_b64', 'sre_font_tajawal_bold_b64',
    'sre_font_tajawal_regular_b64_v2', 'sre_font_tajawal_bold_b64_v2',
    'sre_font_amiri_regular_b64_v3', 'sre_font_amiri_bold_b64_v3',
    'sre_font_amiri_reg_v4', 'sre_font_amiri_bold_v4',
  ];
  for (const k of legacyKeys) localStorage.removeItem(k);
} catch { /* ignore */ }

const FONT_CACHE_KEY_REG = 'sre_font_amiri_reg_v5_subset';
const FONT_CACHE_KEY_BOLD = 'sre_font_amiri_bold_v5_subset';

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
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

async function loadFontBase64(url: string, key: string): Promise<string> {
  try {
    const cached = localStorage.getItem(key);
    // Subsetted TTFs are ~112 KB → ~150 KB base64. Guard against tiny/corrupt cache.
    if (cached && cached.length > 50000) return cached;
  } catch { /* ignore */ }
  const b64 = await urlToBase64(url);
  try { localStorage.setItem(key, b64); } catch { /* quota — ignore */ }
  return b64;
}

let fontsReady = false;

// Font family registration — matches pdfMake.fonts contract.
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
    loadFontBase64(AmiriRegularUrl, FONT_CACHE_KEY_REG),
    loadFontBase64(AmiriBoldUrl, FONT_CACHE_KEY_BOLD),
  ]);
  const cachedVfs: Record<string, string> = {
    'Amiri-Regular.ttf': regular,
    'Amiri-Bold.ttf': bold,
  };
  const pm: any = pdfMake as any;
  // pdfmake v0.3.x browser bundle: fonts must be registered via
  // addVirtualFileSystem so the internal Printer sees them.
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

// -----------------------------------------------------------------------------
// Arabic bidi + shaping for pdfmake
// -----------------------------------------------------------------------------
// pdfmake does not perform OpenType shaping. To render connected/cursive Arabic
// we (1) normalise Arabic-Indic digits to ASCII so pdfmake doesn't reverse
// numeric runs, (2) reshape Arabic letters via arabic-persian-reshaper into
// their contextual presentation forms (which Amiri's cmap covers fully),
// (3) bidi-reverse the string with LTR-run preservation so it draws correctly
// when pdfmake lays out characters left-to-right.

const LTR_RUN_RE =
  /([\d\u0660-\u0669\u06F0-\u06F9][\d\u0660-\u0669\u06F0-\u06F9.,\u066B\u066C/\-:]*|[A-Za-z][A-Za-z0-9._\-]*)/g;

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
  const normalized = toLatinDigits(String(text));
  const shaped: string = ArabicShaper.convertArabic(normalized);
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

/** Shape a single string for direct pdfmake output. Exposed for tests. */
export const ar = (s: string | number | undefined | null): string =>
  s === undefined || s === null ? '' : bidiForPdf(String(s));

export interface PdfSection {
  heading?: string;
  paragraphs?: string[];
  table?: {
    headers: string[];
    rows: (string | number)[][];
    widths?: (string | number)[];
  };
}

// Return an array of pdfmake-compatible width values.  We use '*' for every
// column so pdfmake distributes the available width equally and wraps content
// inside cells (no clipping). Explicit widths supplied by the caller are
// preserved verbatim.
function autoWidths(headers: string[]): (string | number)[] {
  return headers.map(() => '*');
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
      content.push({
        text: ar(s.heading),
        style: 'sectionHeading',
        alignment: 'right',
        margin: [0, 10, 0, 6],
      });
    }
    if (s.paragraphs) {
      for (const p of s.paragraphs) {
        content.push({ text: ar(p), alignment: 'right', margin: [0, 0, 0, 4] });
      }
    }
    if (s.table) {
      // Reverse column order so the first logical column reads at the right
      // (Arabic reading direction).  Widths follow the same reversal.
      const headers = [...s.table.headers].reverse();
      const rows = s.table.rows.map((r) => [...r].reverse());
      const widths = s.table.widths
        ? [...s.table.widths].reverse()
        : autoWidths(headers);

      content.push({
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths,
          body: [
            headers.map((h) => ({
              text: ar(h),
              style: 'tableHeader',
              alignment: 'right',
              noWrap: false,
            })),
            ...rows.map((row) =>
              row.map((c) => ({
                text: ar(c),
                alignment: 'right',
                noWrap: false,
              }))
            ),
          ],
        },
        layout: {
          fillColor: (row: number) => (row === 0 ? '#0F172A' : row % 2 === 0 ? '#F8FAFC' : null),
          hLineColor: () => '#E2E8F0',
          vLineColor: () => '#E2E8F0',
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          paddingTop: () => 6,
          paddingBottom: () => 6,
          paddingLeft: () => 8,
          paddingRight: () => 8,
        },
        margin: [0, 0, 0, 12],
      });
    }
  }

  // docDefinition — RTL declared at the doc level (pdfmake 0.3.x honours `direction: 'rtl'`).
  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    direction: 'rtl',
    content,
    defaultStyle: {
      font: 'Amiri',
      alignment: 'right',
      fontSize: 11,
      lineHeight: 1.35,
    },
    styles: {
      company: { fontSize: 10, color: '#64748B', alignment: 'right' },
      title: { fontSize: 22, bold: true, color: '#0F172A', alignment: 'right' },
      subtitle: { fontSize: 11, color: '#475569', alignment: 'right' },
      sectionHeading: { fontSize: 14, bold: true, color: '#0F172A', alignment: 'right' },
      tableHeader: { bold: true, color: '#FFFFFF', fillColor: '#0F172A', alignment: 'right' },
    },
    footer: (currentPage: number, pageCount: number) => ({
      text: ar(`صفحة ${currentPage} من ${pageCount}`),
      alignment: 'center',
      fontSize: 9,
      margin: [0, 10, 0, 0],
      color: '#64748B',
      font: 'Amiri',
    }),
    info: {
      title: opts.title,
      author: opts.companyName || AR.app.title,
      subject: opts.title,
      creator: AR.app.title,
      producer: AR.app.title,
    },
  };

  const filename = opts.filename || `${opts.title}.pdf`.replace(/\s+/g, '_');
  // Wrap in try/catch so pdfmake exceptions surface to the caller (which shows
  // a toast). Otherwise a fatal render error swallows silently.
  try {
    const doc = pdfMake.createPdf(docDefinition);
    await new Promise<void>((resolve, reject) => {
      try {
        doc.download(filename, () => resolve(), { autoPrint: false } as any);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err: any) {
    console.error('[PDF] generation failed', err);
    throw new Error('تعذّر إنشاء ملف PDF: ' + (err?.message || 'خطأ داخلي'));
  }
}
