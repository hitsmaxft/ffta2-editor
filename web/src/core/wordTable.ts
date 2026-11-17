// External double-byte word table for localized (e.g. Chinese) FFTA2 ROMs.
//
// The original FFTA2 charset uses single-byte glyphs plus a few 2-byte control
// codes. Chinese patches reuse the unused 0xA9..0xBF byte range as a lead byte
// followed by an arbitrary second byte. The actual glyph -> Chinese text
// mapping is patch-specific, so it must be supplied externally.
//
// Supported input formats:
//   1. JSON object:
//        { "name": "...", "leadBytes": ["A9-BF"], "entries": { "ABD8": "字" } }
//        { "entries": [{ "code": "ABD8", "text": "字" }] }
//        { "ABD8": "字" }
//   2. TSV/CSV lines (tab or comma separated):
//        # name Chinese
//        # lead A9-BF
//        ABD8<TAB>字
//
// Codes are hexadecimal. 4 hex digits denote a double-byte code; 2 hex digits
// denote an optional single-byte extension. Empty entries are ignored so the
// generated template can be filled in incrementally.

export const DEFAULT_DOUBLE_BYTE_LEADS: ReadonlySet<number> = new Set(
  Array.from({ length: 0xbf - 0xa9 + 1 }, (_, i) => 0xa9 + i)
);

interface ParsedEntry {
  code: number;
  text: string;
}

function hexToCode(raw: string): number {
  const clean = raw.trim().replace(/^0x/i, '').replace(/[\s_-]/g, '');
  if (!/^[0-9a-fA-F]{2,4}$/.test(clean)) {
    throw new Error(`Invalid word-table code "${raw}" (expected 2 or 4 hex digits)`);
  }
  return parseInt(clean, 16);
}

function codeToHex(code: number): string {
  return code.toString(16).toUpperCase().padStart(code > 0xff ? 4 : 2, '0');
}

function parseLeadSpec(raw: string): number[] {
  const out: number[] = [];
  for (const part of raw.split(/[,\s]+/).filter(Boolean)) {
    const m = /^(?:0x)?([0-9a-fA-F]{2})(?:\s*-\s*(?:0x)?([0-9a-fA-F]{2}))?$/.exec(part);
    if (!m) throw new Error(`Invalid lead-byte range "${part}"`);
    const start = parseInt(m[1], 16);
    const end = m[2] ? parseInt(m[2], 16) : start;
    if (start > end) throw new Error(`Invalid descending lead-byte range "${part}"`);
    for (let b = start; b <= end; b++) out.push(b);
  }
  return out;
}

export class WordTable {
  readonly name: string;
  readonly leadBytes: Set<number>;
  readonly decodeMap = new Map<number, string>();
  readonly singleDecodeMap = new Map<number, string>();
  readonly encodeMap = new Map<string, Uint8Array>();
  readonly maxTextLength: number;

  constructor(name: string, entries: ParsedEntry[], leadBytes?: Iterable<number>) {
    this.name = name || 'Custom word table';
    this.leadBytes = new Set(leadBytes ?? DEFAULT_DOUBLE_BYTE_LEADS);
    let maxLen = 1;
    for (const { code, text } of entries) {
      if (text === '') continue;
      if (code > 0xff) this.leadBytes.add(code >>> 8);
      if (code > 0xff) this.decodeMap.set(code, text);
      else this.singleDecodeMap.set(code, text);
      // Duplicate texts keep the first mapping. Longest-match encoding still
      // handles shared prefixes and multi-character entries.
      if (!this.encodeMap.has(text)) {
        const bytes = code > 0xff
          ? new Uint8Array([code >>> 8, code & 0xff])
          : new Uint8Array([code]);
        this.encodeMap.set(text, bytes);
      }
      maxLen = Math.max(maxLen, text.length);
    }
    this.maxTextLength = maxLen;
  }

  isLead(byte: number): boolean {
    return this.leadBytes.has(byte);
  }

  decode(code: number): string | undefined {
    return code > 0xff ? this.decodeMap.get(code) : this.singleDecodeMap.get(code);
  }

  // Longest text -> bytes match at the given offset.
  match(text: string, offset: number): { bytes: Uint8Array; textLength: number } | undefined {
    const max = Math.min(this.maxTextLength, text.length - offset);
    for (let len = max; len >= 1; len--) {
      const hit = this.encodeMap.get(text.substring(offset, offset + len));
      if (hit) return { bytes: hit, textLength: len };
    }
    return undefined;
  }
}

function entriesFromObject(obj: Record<string, unknown>): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'name' || key === 'leadBytes' || key === 'leads' || key === 'entries') continue;
    if (typeof value === 'string') entries.push({ code: hexToCode(key), text: value });
  }
  return entries;
}

function entryFromObject(rec: Record<string, unknown>): ParsedEntry | null {
  const code = rec.code ?? rec.game_code_hex ?? rec.gameCodeHex ?? rec.hex;
  if (typeof code !== 'string' && typeof code !== 'number') return null;
  // FFTA2-US-CHS glyphs.json uses { game_code_hex, character, glyph_label... }.
  // Prefer the real Unicode character, then a named glyph label for native
  // symbols (\small2\, \squareleft\, ...). Rows without either are skipped.
  let text: string | undefined;
  for (const key of ['text', 'string', 'chinese', 'character', 'glyph_label']) {
    const value = rec[key];
    if (typeof value === 'string' && value !== '') { text = value; break; }
  }
  if (text === undefined) return null;
  return { code: typeof code === 'number' ? code & 0xffff : hexToCode(code), text };
}

function parseJson(source: string): { name: string; leads?: number[]; entries: ParsedEntry[] } {
  const obj = JSON.parse(source) as Record<string, unknown>;
  const name = typeof obj.name === 'string'
    ? obj.name
    : typeof obj.text_version === 'string'
      ? `FFTA2-US-CHS ${obj.text_version}`
      : '';
  let leads: number[] | undefined;
  const leadSpec = obj.leadBytes ?? obj.leads;
  if (Array.isArray(leadSpec)) {
    leads = leadSpec.flatMap((x) => typeof x === 'number' ? [x & 0xff] : parseLeadSpec(String(x)));
  } else if (typeof leadSpec === 'string') {
    leads = parseLeadSpec(leadSpec);
  }

  const rawEntries = obj.entries;
  const entries: ParsedEntry[] = [];
  if (Array.isArray(rawEntries)) {
    for (const item of rawEntries) {
      if (!item || typeof item !== 'object') continue;
      const entry = entryFromObject(item as Record<string, unknown>);
      if (entry) entries.push(entry);
    }
  } else if (rawEntries && typeof rawEntries === 'object') {
    entries.push(...entriesFromObject(rawEntries as Record<string, unknown>));
  } else {
    entries.push(...entriesFromObject(obj));
  }
  return { name, leads, entries };
}

function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseDelimited(source: string): { name: string; leads?: number[]; entries: ParsedEntry[] } {
  const entries: ParsedEntry[] = [];
  let name = '';
  let leads: number[] | undefined;
  let header: string[] | null = null;
  let codeCol = -1;
  let textCol = -1;
  let labelCol = -1;
  for (const originalLine of source.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = originalLine.trimEnd();
    if (line.trim() === '') continue;
    const directive = /^\s*(?:#|\/\/)\s*(name|lead|leadBytes)\s*[:=]?\s*(.+)$/i.exec(line);
    if (directive) {
      if (directive[1].toLowerCase() === 'name') name = directive[2].trim();
      else leads = parseLeadSpec(directive[2].trim());
      continue;
    }
    if (/^\s*(?:#|\/\/)/.test(line)) continue;

    // FFTA2-US-CHS glyphs.csv header.
    if (line.includes('game_code_hex') && line.includes('character')) {
      header = splitCsv(line).map((x) => x.trim());
      codeCol = header.indexOf('game_code_hex');
      textCol = header.indexOf('character');
      labelCol = header.indexOf('glyph_label');
      continue;
    }
    if (header) {
      const cols = splitCsv(line);
      const code = cols[codeCol]?.trim();
      const text = (cols[textCol]?.trim() || cols[labelCol]?.trim() || '');
      if (!code || text === '' || code === '') continue;
      entries.push({ code: hexToCode(code), text });
      continue;
    }

    // FFTA2-US-CHS decode.tbl: CODE=label
    const eq = line.indexOf('=');
    const tab = line.indexOf('\t');
    const comma = line.indexOf(',');
    const sep = tab >= 0 ? tab : comma >= 0 ? comma : eq;
    if (sep < 0) continue;
    const code = line.slice(0, sep).trim();
    const text = line.slice(sep + 1).trim();
    if (code === '' || text === '' || code.toLowerCase() === 'glyph_id') continue;
    entries.push({ code: hexToCode(code), text });
  }
  return { name, leads, entries };
}

export function parseWordTable(source: string, fileName = ''): WordTable {
  const trimmed = source.replace(/^\uFEFF/, '').trim();
  const parsed = trimmed.startsWith('{') || trimmed.startsWith('[')
    ? parseJson(trimmed)
    : parseDelimited(source);
  return new WordTable(parsed.name || fileName.replace(/\.[^.]+$/, ''), parsed.entries, parsed.leads);
}

export function createWordTable(entries: Iterable<[number, string]>, options: {
  name?: string;
  leadBytes?: Iterable<number>;
} = {}): WordTable {
  return new WordTable(
    options.name ?? 'Custom word table',
    Array.from(entries, ([code, text]) => ({ code, text })),
    options.leadBytes
  );
}

export function wordTableCodeToHex(code: number): string {
  return codeToHex(code);
}

// Generate a fill-in template from observed double-byte codes. Code lines have
// an empty mapping so parseWordTable ignores them until a translator fills in
// the second column.
export function formatWordTableTemplate(counts: Map<number, number>): string {
  const lines = [
    '# FFTA2 Chinese word table template',
    '# Fill in the second column with the Chinese text for each code.',
    `# lead A9-BF`,
    '# code\ttext',
  ];
  for (const code of [...counts.keys()].sort((a, b) => a - b)) {
    lines.push(`${codeToHex(code)}\t`);
  }
  return lines.join('\n') + '\n';
}
