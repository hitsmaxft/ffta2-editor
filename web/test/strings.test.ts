import { describe, it, expect } from 'vitest';
import { Bytes } from '../src/core/binary';
import { StringTable, StringSingle } from '../src/data/model/stringTable';
import { fixture, fixtureJson, tsOutput, assertBytesEqual } from './helpers';

interface TableManifest {
  name: string;
  parsed: { hasLines: boolean; numLinesList: number[]; strings: { id: number; string: string }[] };
}
interface SingleManifest {
  name: string;
  text: string;
  _0x00: number;
  _0x02: number;
  _0x08: number;
}
interface Manifest {
  tables: TableManifest[];
  singles: SingleManifest[];
}

const manifest = fixtureJson<Manifest>('strings/manifest.json');

describe('StringTable', () => {
  for (const t of manifest.tables.filter((x) => /^table_\d\d$/.test(x.name))) {
    it(`parses and reserializes ${t.name} byte-for-byte vs Java`, () => {
      const input = fixture(`strings/${t.name}.in.bin`);
      const table = new StringTable(Bytes.wrap(input), 'T', 0);
      expect(table.hasLines).toBe(t.parsed.hasLines);
      expect(table.numLinesList).toEqual(t.parsed.numLinesList);
      expect(table.strings.map((s) => ({ id: s.id, string: s.string }))).toEqual(t.parsed.strings);

      const out16 = table.toBytes(true);
      assertBytesEqual(out16, fixture(`strings/${t.name}.out16.bin`), `${t.name} out16`);
      tsOutput(`strings/${t.name}.out16.bin`, out16);

      const out4 = table.toBytes(false);
      assertBytesEqual(out4, fixture(`strings/${t.name}.out4.bin`), `${t.name} out4`);
      tsOutput(`strings/${t.name}.out4.bin`, out4);
    });
  }

  it('empty table serializes to zero bytes', () => {
    const table = new StringTable(Bytes.wrap(fixture('strings/table_empty.in.bin')), 'Empty', 99);
    expect(table.strings).toEqual([]);
    const out = table.toBytes(true);
    expect(out.length).toBe(0);
    assertBytesEqual(out, fixture('strings/table_empty.out16.bin'), 'table_empty');
  });

  it('modified table matches Java after edit + append', () => {
    const table = new StringTable(Bytes.wrap(fixture('strings/table_01.in.bin')), 'Mod', 1);
    table.strings[0].string = 'Edited first line\\end\\';
    table.strings.push({ id: 3, string: 'Appended \\var2:01\\ text\\end\\' });
    const out = table.toBytes(true);
    assertBytesEqual(out, fixture('strings/table_modified.out16.bin'), 'table_modified');
    tsOutput('strings/table_modified.out16.bin', out);
  });
});

describe('StringSingle', () => {
  for (const s of manifest.singles) {
    it(`parses and reserializes ${s.name} byte-for-byte vs Java`, () => {
      const single = new StringSingle(Bytes.wrap(fixture(`strings/${s.name}.in.bin`)), 'S', 0);
      expect(single.text).toBe(s.text);
      expect(single._0x00).toBe(s._0x00);
      expect(single._0x02).toBe(s._0x02);
      expect(single._0x08).toBe(s._0x08);
      const out = single.toBytes();
      assertBytesEqual(out, fixture(`strings/${s.name}.out.bin`), `${s.name} out`);
      tsOutput(`strings/${s.name}.out.bin`, out);
    });
  }
});