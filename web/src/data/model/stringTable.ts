import { Bytes, align16 } from '../../core/binary';
import * as Charset from '../../core/charset';
import type { WordTable } from '../../core/wordTable';

export interface StringWithId {
  id: number;
  string: string;
}

function align4(d: number): number {
  return (d + 3) & ~3;
}

// Mirrors the page/line counting in StringTable.toBytes and StringSingle.toBytes.
function computeMaxLinesLegacy(bytes: Uint8Array): number {
  const pages: Uint8Array[] = [];
  let start = 0;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0xc1) {
      pages.push(bytes.slice(start, i + 2));
      start = i + 2;
    }
  }
  let maxLines = 0;
  for (const page of pages) {
    let numLines = 0;
    let numOptions = 0;
    for (const b of page) {
      if (b === 0xc0 || b === 0xc1) numLines++;
      if (b === 0xc8) numOptions++;
    }
    if (numOptions > 0) numLines += numOptions - 1;
    maxLines = Math.max(maxLines, numLines);
  }
  return maxLines;
}

const PARAM_CONTROL = new Set([0xc2, 0xc4, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcc, 0xcd, 0xce, 0xcf]);

// Localized text needs token-aware scanning: a Chinese pair (or a control-code
// parameter) may contain 0xC0/0xC1/0xC8 as its second byte and must not be
// mistaken for a line/page/option marker.
function computeMaxLinesLocalized(bytes: Uint8Array, wordTable: WordTable): number {
  const pages: Uint8Array[] = [];
  let start = 0;
  for (let i = 0; i < bytes.length;) {
    const b = bytes[i];
    if (wordTable.isLead(b) && i + 1 < bytes.length) { i += 2; continue; }
    if (PARAM_CONTROL.has(b) && i + 1 < bytes.length) { i += 2; continue; }
    if (b === 0xc0 || b === 0xc3 || b === 0xc8) { i += 2; continue; }
    if (b === 0xc1) {
      pages.push(bytes.slice(start, Math.min(i + 2, bytes.length)));
      start = Math.min(i + 2, bytes.length);
      i += 2;
      continue;
    }
    i++;
  }
  let maxLines = 0;
  for (const page of pages) {
    let numLines = 0;
    let numOptions = 0;
    for (let i = 0; i < page.length;) {
      const b = page[i];
      if (wordTable.isLead(b) && i + 1 < page.length) { i += 2; continue; }
      if (PARAM_CONTROL.has(b) && i + 1 < page.length) { i += 2; continue; }
      if (b === 0xc0 || b === 0xc1) numLines++;
      if (b === 0xc8) numOptions++;
      if (b === 0xc0 || b === 0xc1 || b === 0xc3 || b === 0xc8) { i += 2; continue; }
      i++;
    }
    if (numOptions > 0) numLines += numOptions - 1;
    maxLines = Math.max(maxLines, numLines);
  }
  return maxLines;
}

export function computeMaxLines(bytes: Uint8Array, wordTable?: WordTable | null): number {
  return wordTable ? computeMaxLinesLocalized(bytes, wordTable) : computeMaxLinesLegacy(bytes);
}

export class StringTable {
  id: number;
  name: string;
  hasLines = false;
  numLinesList: number[] = [];
  strings: StringWithId[] = [];
  readonly wordTable?: WordTable | null;

  constructor(bytes: Bytes | null, name: string, id: number, wordTable?: WordTable | null) {
    this.id = id;
    this.name = name;
    this.wordTable = wordTable;
    if (bytes == null || bytes.rewind().remaining() === 0) {
      this.name = 'Empty';
      return;
    }
    const numEntries = bytes.getShort();
    for (let i = 0; i < numEntries; i++) {
      const stringLength = bytes.getInt();
      const offset = bytes.getInt();
      const numLines = bytes.getU16();
      this.numLinesList.push(numLines);
      this.hasLines ||= numLines !== 0;
      const s = Charset.decode(bytes.slice(offset, stringLength), this.wordTable).text;
      this.strings.push({ id: i, string: s });
    }
  }

  toBytes(aligned16 = true): Uint8Array {
    const list = this.strings;
    if (list.length === 0) return new Uint8Array(0);
    const capacity =
      list.reduce((n, x) => n + (x.string.length + 1) * 4, 0) + 2 + list.length * 10 + 0x40;
    const buf = Bytes.alloc(capacity);
    let offset = 2 + list.length * 10;
    buf.putShort(list.length);
    for (const entry of list) {
      const bytes = Charset.encode(entry.string, this.wordTable);
      const maxLines = computeMaxLines(bytes, this.wordTable);
      buf.putInt(bytes.length);
      buf.putInt(offset);
      buf.putShort(this.hasLines ? Math.max(1, maxLines) : 0);
      new Uint8Array(buf.buf, buf.base + offset, bytes.length).set(bytes);
      offset += bytes.length;
    }
    const end = aligned16 ? align16(offset) : align4(offset);
    buf.limit(end);
    return buf.toUint8Array();
  }
}

export class StringSingle {
  id: number;
  name: string;
  _0x00 = 0;
  _0x02 = 0;
  stringLength = 0;
  _0x08 = 0;
  numLines = 0;
  text = '';
  readonly wordTable?: WordTable | null;

  constructor(bytes: Bytes, name: string, id: number, wordTable?: WordTable | null) {
    this.id = id;
    this.name = name;
    this.wordTable = wordTable;
    this._0x00 = bytes.getShort();
    this._0x02 = bytes.getShort();
    this.stringLength = bytes.getInt();
    this._0x08 = bytes.getInt();
    this.numLines = bytes.getShort();
    this.text = Charset.decode(bytes.slice(bytes.position(), this.stringLength), this.wordTable).text;
  }

  toBytes(): Uint8Array {
    const buf = Bytes.alloc(0xe + (this.text.length + 1) * 4 + 0x20);
    buf.position(0xe);
    const bytes = Charset.encode(this.text, this.wordTable);
    const maxLines = computeMaxLines(bytes, this.wordTable);
    this.stringLength = bytes.length;
    this.numLines = Math.max(1, maxLines);
    buf.putBytes(bytes);
    const endPosition = align16(buf.position());
    buf.rewind();
    buf.putShort(this._0x00);
    buf.putShort(this._0x02);
    buf.putInt(this.stringLength);
    buf.putInt(this._0x08);
    buf.putShort(this.numLines);
    buf.limit(endPosition);
    return buf.toUint8Array();
  }
}

export const messageNames = [
  'Character names',
  'Job names',
  'Ability set names',
  'Ability names',
  'Region names',
  'Location names',
  'Quest names',
  'Clan titles(?) + Auction text',
  'Rumor titles',
  'Miscellaneous menu text',
  'Notice titles',
  'Item names',
  'Status names',
  'Clan names',
  'Law names',
  'Clan privilege names',
  'Auction menu text',
  'Quest related text (for various quest menus?)',
  'Miscellaneous item text (item types, item effects?)',
  'Keyboard 1?',
  'Keyboard 2?',
  'Keyboard 3?',
  "Just A's?",
  "Just A's?",
  'Bazaar text (Category titles, menu text)',
  "Doesn't exist?",
  "Doesn't exist?",
  "Doesn't exist?",
  "Doesn't exist?",
  "Doesn't exist?",
  'Ability set descriptions',
  'Ability descriptions',
  'Region descriptions',
  'Location descriptions',
  "Doesn't exist?",
  'Quest descriptions (short)',
  "Doesn't exist?",
  'Battle text',
  'Job descriptions',
  'Item descriptions',
  'Ally death text',
  'Status descriptions',
  'Law descriptions',
  'Clan privilege descriptions',
  'Auction House text',
  'Pub text',
  "Doesn't exist?",
  'Ability help text',
  'Unit dismiss text + some intro text',
  'New notice text',
  'Shop text',
  'Opportunity text',
  'Various Menu text + job requirements',
  'Bazaar category descriptions',
  'Clan descriptions',
];

export const evMsgNames: Record<number, string> = {
  0x21: 'First Auction?',
  0x22: 'Bazaar Tutorial + Hurdy?',
  0x23: 'Pub Tutorial + Adelle?',
  0x24: 'Aerodrome',
  0x26: 'Raffle',
  0x29: 'Resting',
  0x2a: 'Intro',
  0x2b: 'Race Descriptions',
  0x66: 'Map Tutorial',
  0x72: 'Entering Auction?',
  0x7e: 'Making Music (shop)',
  0xb4: 'Help! (text)',
};