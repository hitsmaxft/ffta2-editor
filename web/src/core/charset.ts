// FFTA2 custom text codec, ported from FFTA2Charset.java.

import { Bytes } from './binary';
import type { WordTable } from './wordTable';

const SINGLE: Array<[number, string]> = [
  [0x00, '\r'], [0x01, ' '],
  [0x02, 'A'], [0x03, 'B'], [0x04, 'C'], [0x05, 'D'], [0x06, 'E'], [0x07, 'F'],
  [0x08, 'G'], [0x09, 'H'], [0x0a, 'I'], [0x0b, 'J'], [0x0c, 'K'], [0x0d, 'L'],
  [0x0e, 'M'], [0x0f, 'N'], [0x10, 'O'], [0x11, 'P'], [0x12, 'Q'], [0x13, 'R'],
  [0x14, 'S'], [0x15, 'T'], [0x16, 'U'], [0x17, 'V'], [0x18, 'W'], [0x19, 'X'],
  [0x1a, 'Y'], [0x1b, 'Z'],
  [0x1c, 'a'], [0x1d, 'b'], [0x1e, 'c'], [0x1f, 'd'], [0x20, 'e'], [0x21, 'f'],
  [0x22, 'g'], [0x23, 'h'], [0x24, 'i'], [0x25, 'j'], [0x26, 'k'], [0x27, 'l'],
  [0x28, 'm'], [0x29, 'n'], [0x2a, 'o'], [0x2b, 'p'], [0x2c, 'q'], [0x2d, 'r'],
  [0x2e, 's'], [0x2f, 't'], [0x30, 'u'], [0x31, 'v'], [0x32, 'w'], [0x33, 'x'],
  [0x34, 'y'], [0x35, 'z'],
  [0x36, 'À'], [0x37, 'Á'], [0x38, 'Â'], [0x39, 'Ä'], [0x3a, 'Æ'], [0x3b, 'Ç'],
  [0x3c, 'È'], [0x3d, 'É'], [0x3e, 'Ê'], [0x3f, 'Ë'], [0x40, 'Ì'], [0x41, 'Í'],
  [0x42, 'Î'], [0x43, 'Ï'], [0x44, 'Ñ'], [0x45, 'Ò'], [0x46, 'Ó'], [0x47, 'Ô'],
  [0x48, 'Ö'], [0x49, 'Œ'], [0x4a, 'Ù'], [0x4b, 'Ú'], [0x4c, 'Û'], [0x4d, 'Ü'],
  [0x4e, 'ß'], [0x4f, 'à'], [0x50, 'á'], [0x51, 'â'], [0x52, 'ä'], [0x53, 'æ'],
  [0x54, 'ç'], [0x55, 'è'], [0x56, 'é'], [0x57, 'ê'], [0x58, 'ë'], [0x59, 'ì'],
  [0x5a, 'í'], [0x5b, 'î'], [0x5c, 'ï'], [0x5d, 'ñ'], [0x5e, 'ò'], [0x5f, 'ó'],
  [0x60, 'ô'], [0x61, 'ö'], [0x62, 'œ'], [0x63, 'ù'], [0x64, 'ú'], [0x65, 'û'],
  [0x66, 'ü'],
  [0x67, '0'], [0x68, '1'], [0x69, '2'], [0x6a, '3'], [0x6b, '4'], [0x6c, '5'],
  [0x6d, '6'], [0x6e, '7'], [0x6f, '8'], [0x70, '9'],
  [0x71, '~'], [0x72, '`'], [0x73, '!'], [0x74, '?'], [0x75, '#'], [0x76, '%'],
  [0x77, '^'], [0x78, '&'], [0x79, '*'], [0x7a, '/'], [0x7b, '_'], [0x7c, '+'],
  [0x7d, '='], [0x7e, ','], [0x7f, '.'], [0x80, ';'], [0x81, ':'], [0x82, '¥'],
  [0x83, "'"], [0x84, '"'], [0x85, '„'], [0x86, '('], [0x87, ')'], [0x88, '['],
  [0x89, ']'], [0x8a, '{'], [0x8b, '}'], [0x8c, '|'], [0x8d, '-'], [0x8e, 'ー'],
  [0x8f, '—'], [0x90, '«'], [0x91, '»'], [0x92, '·'], [0x93, '¡'], [0x94, '¿'],
  [0x95, '°'], [0x96, '\\squareleft\\'], [0x97, '\\squareright\\'], [0x98, '♪'],
  [0x99, '↓'], [0x9a, '←'], [0x9b, '↑'], [0x9c, '→'], [0x9d, '™'], [0x9e, '®'],
  [0x9f, '©'], [0xa0, '\\small2\\'], [0xa1, '\\small3\\'], [0xa2, '\\small4\\'],
  [0xa3, '\\small5\\'], [0xa4, '<'], [0xa5, '>'], [0xa6, '≠'], [0xa7, '≤'],
  [0xa8, '≥'],
  [0xc1, '\\end\\'],
  [0xc2, '\\var2:%02X\\'], [0xc4, '\\var4:%02X\\'], [0xc5, '\\var5:%02X\\'],
  [0xc6, '\\var6:%02X\\'], [0xc7, '\\defaultOption:%02X\\'], [0xc9, '\\var9:%02X\\'],
  [0xca, '\\varA:%02X\\'], [0xcb, '\\sprite:%02X\\'], [0xcc, '\\varC:%02X\\'],
  [0xcd, '\\varD:%02X\\'], [0xce, '\\varE:%02X\\'], [0xcf, '\\varF:%02X\\'],
];

const DOUBLE: Array<[number, string]> = [
  [0xc000, '\n'], [0xc300, '\\endPage\\'], [0xc800, '\\endOption\\'],
];

export const decodingMap = new Map<number, string>([...SINGLE, ...DOUBLE]);

// Encoding keys for control codes with a parameter drop the "%02X\\" suffix.
// Two-byte codes are stored as their first byte (Java encodingMap uses 0xC0/0xC3/0xC8).
export const encodingMap = new Map<string, number>();
for (const [code, str] of SINGLE) {
  let key = str;
  if (code >= 0xc2 && str.endsWith('%02X\\')) {
    key = str.slice(0, -5);
  }
  encodingMap.set(key, code);
}
for (const [code, str] of DOUBLE) {
  encodingMap.set(str, code >>> 8);
}

const hex2 = (v: number) => (v & 0xff).toString(16).toUpperCase().padStart(2, '0');


export interface DecodeResult {
  text: string;
  warnings: string[];
}

function warningFor(unknownCharacters: string[], text: string): string[] {
  if (unknownCharacters.length === 0) return [];
  return [
    `Unknown characters [${unknownCharacters.map((c) => `"${c}"`).join(', ')}] in "${text}"`
  ];
}

// Reads one original-charset token, including its reversible "<unknown:...>"
// fallback. Returns null for the carriage-return token, which is display-only.
function readLegacyToken(bytes: Bytes, unknownCharacters: string[]): string | null {
  let b = 0;
  let s: string | undefined;
  let i = 0;
  // Mirror Java: i is the loop variable, ending at 4 on full consumption
  // (no break) or at the break index. The unknown-byte rewind uses i itself.
  for (i = 0; i < 4; i++) {
    b = (b << 8) | bytes.getU8();
    s = decodingMap.get(b);
    if (s !== undefined || bytes.remaining() === 0) break;
  }
  if (s === undefined) {
    bytes.position(bytes.pos - i);
    const unknownByte = bytes.getU8();
    if (unknownByte >= 0xc0 && bytes.remaining() > 0) {
      s = `<unknown:${hex2(unknownByte)}${hex2(bytes.getU8())}>`;
    } else {
      s = `<unknown:${hex2(unknownByte)}>`;
    }
    unknownCharacters.push(s);
  } else if (s.startsWith('\\') && s.endsWith('%02X\\')) {
    s = s.replace('%02X', hex2(bytes.getU8()));
  }
  return s === '\r' ? null : s;
}

export function decode(bytes: Bytes, wordTable?: WordTable | null): DecodeResult {
  if (wordTable) return decodeWithWordTable(bytes, wordTable);
  let sb = '';
  const unknownCharacters: string[] = [];
  while (bytes.remaining() > 0) {
    const s = readLegacyToken(bytes, unknownCharacters);
    if (s !== null) sb += s;
  }
  return { text: sb, warnings: warningFor(unknownCharacters, sb) };
}

// Chinese-ROM mode: 0xA9..0xBF are double-byte lead bytes. Known pairs come
// from the external word table; unknown pairs stay reversible as
// "<unknown:ABD8>", so a load -> save round trip is byte-identical.
function decodeWithWordTable(bytes: Bytes, wordTable: WordTable): DecodeResult {
  let sb = '';
  const unknownCharacters: string[] = [];
  while (bytes.remaining() > 0) {
    const b = bytes.view.getUint8(bytes.pos);
    if (wordTable.isLead(b) && bytes.remaining() >= 2) {
      bytes.getU8();
      const trail = bytes.getU8();
      const code = (b << 8) | trail;
      const mapped = wordTable.decode(code);
      if (mapped !== undefined) {
        sb += mapped;
      } else {
        const token = `<unknown:${hex2(b)}${hex2(trail)}>`;
        unknownCharacters.push(token);
        sb += token;
      }
      continue;
    }
    const single = wordTable.decode(b);
    if (single !== undefined) {
      bytes.getU8();
      sb += single;
      continue;
    }
    const s = readLegacyToken(bytes, unknownCharacters);
    if (s !== null) sb += s;
  }
  return { text: sb, warnings: warningFor(unknownCharacters, sb) };
}

interface EncodedLegacyToken {
  bytes: Uint8Array;
  consumed: number;
  lastCode: number;
}

function encodeLegacyTokenAt(s: string, i: number): EncodedLegacyToken {
  for (let j = i; j <= s.length; j++) {
    const code = encodingMap.get(s.substring(i, j));
    if (code !== undefined) {
      if (code >= 0xc0) {
        if (code >= 0xc2 && code !== 0xc3 && code !== 0xc8) {
          const param = s.substring(j, j + 2);
          if (!/^[0-9a-fA-F]{2}$/.test(param)) {
            throw new Error(`Failed to encode parameter "${param}" in:\n"${s}"`);
          }
          return {
            bytes: new Uint8Array([code, parseInt(param, 16)]),
            // Java also consumes the closing '\\' after the 2 hex digits.
            consumed: j - i + 3,
            lastCode: code,
          };
        }
        return {
          // Java putShort(code), i.e. low byte first (control codes 0xC0/0xC1/0xC3/0xC8).
          bytes: new Uint8Array([code & 0xff, (code >>> 8) & 0xff]),
          consumed: j - i,
          lastCode: code,
        };
      }
      return { bytes: new Uint8Array([code]), consumed: j - i, lastCode: code };
    }
    if (j === s.length) {
      throw new Error(`Failed to encode unknown character "${s.substring(i, j)}" in:\n"${s}"`);
    }
  }
  throw new Error(`Failed to encode unknown character "${s.substring(i)}" in:\n"${s}"`);
}

function encodeLegacy(s: string): Uint8Array {
  const out = Bytes.alloc((s.length + 1) * 4);
  let lastCode: number | null = null;
  let i = 0;
  while (i < s.length) {
    const token = encodeLegacyTokenAt(s, i);
    out.putBytes(token.bytes);
    lastCode = token.lastCode;
    i += token.consumed;
  }
  if (lastCode !== 0x00 && lastCode !== 0xc1) out.put(0);
  return out.toUint8Array().slice(0, out.pos);
}

export function encode(s: string, wordTable?: WordTable | null): Uint8Array {
  if (s === '') return new Uint8Array([0x00]);
  if (wordTable) return encodeWithWordTable(s, wordTable);
  return encodeLegacy(s);
}

// Chinese-ROM mode. Explicit "<unknown:...>" tokens are written back as raw
// bytes first, then the longest word-table entry, then the original charset.
function encodeWithWordTable(s: string, wordTable: WordTable): Uint8Array {
  const out = Bytes.alloc(s.length * 4 + 8);
  let lastByte: number | null = null;
  let i = 0;
  while (i < s.length) {
    const unknown = /^<unknown:([0-9a-fA-F]+)>/.exec(s.substring(i));
    if (unknown && unknown[1].length % 2 === 0 && unknown[1].length <= 8) {
      const h = unknown[1];
      for (let k = 0; k < h.length; k += 2) {
        lastByte = parseInt(h.slice(k, k + 2), 16);
        out.putU8(lastByte);
      }
      i += unknown[0].length;
      continue;
    }
    const hit = wordTable.match(s, i);
    if (hit) {
      out.putBytes(hit.bytes);
      lastByte = hit.bytes[hit.bytes.length - 1];
      i += hit.textLength;
      continue;
    }
    const token = encodeLegacyTokenAt(s, i);
    out.putBytes(token.bytes);
    lastByte = token.bytes[token.bytes.length - 1];
    i += token.consumed;
  }
  if (lastByte !== 0x00 && lastByte !== 0xc1) out.put(0);
  return out.toUint8Array().slice(0, out.pos);
}
