import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Bytes } from '../src/core/binary';
import * as Charset from '../src/core/charset';
import { createWordTable, parseWordTable } from '../src/core/wordTable';
import { loadRom } from '../src/data/load';
import { loadMessages, saveMessages } from '../src/data/text';
import { fixturesDir } from './helpers';

const romDir = join(fixturesDir, '../../../data/extracted');
const romFile = existsSync(romDir) ? readdirSync(romDir).find((f) => f.endsWith('.nds')) : undefined;
const romPath = romFile ? join(romDir, romFile) : null;

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(' ');
}

describe('external double-byte word table', () => {
  it('parses JSON entries and lead-byte ranges', () => {
    const table = parseWordTable(JSON.stringify({
      name: '中文测试',
      leadBytes: ['A9-BF'],
      entries: { ABD8: '阿', AA3B: '尔' },
    }));
    expect(table.name).toBe('中文测试');
    expect(table.decode(0xabd8)).toBe('阿');
    expect(table.isLead(0xab)).toBe(true);
    expect(table.isLead(0xc0)).toBe(false);
  });

  it('parses TSV directives and ignores empty template rows', () => {
    const table = parseWordTable([
      '# name Chinese',
      '# lead A9-BF',
      'ABD8\t阿',
      'AA3B\t尔',
      'B06C\t',
    ].join('\n'));
    expect(table.name).toBe('Chinese');
    expect(table.decode(0xabd8)).toBe('阿');
    expect(table.decode(0xb06c)).toBeUndefined();
    expect(table.decodeMap.size).toBe(2);
  });


  it('parses the FFTA2-US-CHS v4.1 glyphs.json format', () => {
    const table = parseWordTable(JSON.stringify({
      schema: 'ffta2-v41-public-charset/1',
      text_version: 'V4.1',
      entries: [
        { glyph_id: 896, game_code_hex: 'ABD8', byte_length: 2, character: '士', unicode: 'U+58EB', glyph_label: '士', role: 'default', canonical_glyph_id: 896 },
        { glyph_id: 483, game_code_hex: 'AA3B', byte_length: 2, character: '兵', unicode: 'U+5175', glyph_label: '兵', role: 'default', canonical_glyph_id: 483 },
        { glyph_id: 4000, game_code_hex: 'B900', byte_length: 2, character: null, unicode: null, glyph_label: null, role: 'unmapped_do_not_encode', canonical_glyph_id: null },
      ],
    }));
    expect(table.name).toBe('FFTA2-US-CHS V4.1');
    expect(table.decode(0xabd8)).toBe('士');
    expect(table.decode(0xaa3b)).toBe('兵');
    expect(Charset.decode(Bytes.wrap(new Uint8Array([0xab, 0xd8, 0xaa, 0x3b, 0x00])), table).text).toBe('士兵');
  });

  it('parses decode.tbl CODE=text format', () => {
    const table = parseWordTable([
      'ABD8=士',
      'AA3B=兵',
      'B900=',
    ].join('\n'));
    expect(table.decode(0xabd8)).toBe('士');
    expect(table.decode(0xaa3b)).toBe('兵');
  });

  it('parses the FFTA2-US-CHS glyphs.csv header format', () => {
    const table = parseWordTable([
      'glyph_id,game_code_hex,byte_length,character,unicode,glyph_label,role,canonical_glyph_id',
      '896,ABD8,2,士,U+58EB,士,default,896',
      '483,AA3B,2,兵,U+5175,兵,default,483',
    ].join('\n'));
    expect(table.decode(0xabd8)).toBe('士');
    expect(table.decode(0xaa3b)).toBe('兵');
  });

  it('decodes known double-byte codes and re-encodes them byte-for-byte', () => {
    const table = createWordTable([
      [0xabd8, '阿'],
      [0xaa3b, '尔'],
    ], { name: 'test' });
    const raw = new Uint8Array([0xab, 0xd8, 0xaa, 0x3b, 0x00, 0x00]);
    const text = Charset.decode(Bytes.wrap(raw), table).text;
    expect(text).toBe('阿尔');
    expect(hex(Charset.encode(text, table))).toBe('ab d8 aa 3b 00');
  });

  it('keeps unknown double-byte codes reversible', () => {
    const table = createWordTable([], { name: 'empty' });
    const raw = new Uint8Array([0xab, 0xd8, 0xaa, 0x3b, 0x00]);
    const decoded = Charset.decode(Bytes.wrap(raw), table);
    expect(decoded.text).toBe('<unknown:ABD8><unknown:AA3B>');
    expect(hex(Charset.encode(decoded.text, table))).toBe('ab d8 aa 3b 00');
  });

  it('prefers the longest word-table entry', () => {
    const table = createWordTable([
      [0xb000, '攻'],
      [0xb001, '攻击'],
      [0xb002, '力'],
    ]);
    expect(hex(Charset.encode('攻击力', table))).toBe('b0 01 b0 02 00');
  });

  it('keeps the original legacy charset behavior without a table', () => {
    const raw = new Uint8Array([0x0d, 0x24, 0x29, 0x20, 0x00, 0x0f, 0x2a, 0x2f, 0x00, 0xc1, 0x00]);
    const decoded = Charset.decode(Bytes.wrap(raw));
    expect(decoded.text).toContain('Line');
    expect(decoded.text).not.toContain('<unknown:');
    // Legacy encode is Java's canonical output, not a raw-byte round trip.
    expect(hex(Charset.encode(decoded.text))).toBe('0d 24 29 20 0f 2a 2f c1 00');
  });
});

describe.skipIf(!romPath)('Chinese ROM text round-trip with an empty word table', () => {
  const rom = romPath ? new Uint8Array(readFileSync(romPath)) : new Uint8Array(0);

  it('decode(encode(text)) preserves every text table', () => {
    const data = loadRom(rom);
    data.wordTable = createWordTable([], { name: 'empty' });
    loadMessages(data);
    const before = {
      messages: data.messageList.map((t) => t.strings.map((s) => s.string)),
      quests: data.questList.map((s) => s.text),
      rumors: data.rumorList.map((s) => s.text),
      notices: data.noticeList.map((s) => s.text),
    };
    saveMessages(data);
    loadMessages(data);
    expect(data.messageList.map((t) => t.strings.map((s) => s.string))).toEqual(before.messages);
    expect(data.questList.map((s) => s.text)).toEqual(before.quests);
    expect(data.rumorList.map((s) => s.text)).toEqual(before.rumors);
    expect(data.noticeList.map((s) => s.text)).toEqual(before.notices);
  });


  it('round-trips every double-byte code through a populated word table', () => {
    const data = loadRom(rom);
    data.wordTable = createWordTable([], { name: 'empty' });
    loadMessages(data);

    const codes = new Set<number>();
    const collect = (text: string) => {
      for (const m of text.matchAll(/<unknown:([0-9A-F]{4})>/g)) codes.add(parseInt(m[1], 16));
    };
    for (const table of data.messageList) for (const s of table.strings) collect(s.string);
    for (const table of data.eventMsgList) for (const s of table.strings) collect(s.string);
    for (const s of data.questList) collect(s.text);
    for (const s of data.rumorList) collect(s.text);
    for (const s of data.noticeList) collect(s.text);
    expect(codes.size).toBeGreaterThan(1000);

    data.wordTable = createWordTable([...codes].map((code) => [code, `〔${code.toString(16).toUpperCase().padStart(4, '0')}〕`] as [number, string]));
    loadMessages(data);
    const before = {
      messages: data.messageList.map((t) => t.strings.map((s) => s.string)),
      events: data.eventMsgList.map((t) => t.strings.map((s) => s.string)),
      quests: data.questList.map((s) => s.text),
      rumors: data.rumorList.map((s) => s.text),
      notices: data.noticeList.map((s) => s.text),
    };
    saveMessages(data);
    loadMessages(data);
    expect(data.messageList.map((t) => t.strings.map((s) => s.string))).toEqual(before.messages);
    expect(data.eventMsgList.map((t) => t.strings.map((s) => s.string))).toEqual(before.events);
    expect(data.questList.map((s) => s.text)).toEqual(before.quests);
    expect(data.rumorList.map((s) => s.text)).toEqual(before.rumors);
    expect(data.noticeList.map((s) => s.text)).toEqual(before.notices);
  });


  it('loads the built-in FFTA-DECOMP V4.1 table and decodes real names', () => {
    const text = readFileSync(join(fixturesDir, '../../public/wordtables/ffta-decomp-v4.1.tsv'), 'utf-8');
    const table = parseWordTable(text, 'ffta-decomp-v4.1.tsv');
    expect(table.name).toBe('FFTA-DECOMP 汉化 V4.1');
    expect(table.decodeMap.size).toBeGreaterThan(2900);
    expect(table.decode(0xabd8)).toBe('士');
    expect(table.decode(0xaa3b)).toBe('兵');

    const data = loadRom(rom);
    data.wordTable = table;
    loadMessages(data);
    expect(data.jobNames[1].string).toBe('士兵');
    expect(data.jobNames[2].string).toBe('盗贼');
  });

  it('displays Chinese names once a word table is supplied', () => {
    const data = loadRom(rom);
    // The first job name in this ROM is <unknown:ABD8><unknown:AA3B>.
    data.wordTable = createWordTable([[0xabd8, '阿'], [0xaa3b, '尔']]);
    loadMessages(data);
    expect(data.jobNames[1].string).toBe('阿尔');
  });
});
