import { describe, it, expect } from 'vitest';
import { Bytes } from '../src/core/binary';
import * as Charset from '../src/core/charset';
import { fixture, fixtureJson, tsOutput, assertBytesEqual } from './helpers';

interface Cases {
  cases: Array<{ name: string; text: string | null; decoded: string }>;
  errorCases: string[];
}

const cases = fixtureJson<Cases>('charset/cases.json');

describe('FFTA2 charset vs Java reference', () => {
  for (const c of cases.cases) {
    it(`decodes ${c.name} exactly like Java`, () => {
      const bin = fixture(`charset/${c.name}.bin`);
      const result = Charset.decode(Bytes.wrap(bin));
      expect(result.text).toBe(c.decoded);
    });

    if (c.text !== null) {
      it(`encodes ${c.name} byte-identical to Java`, () => {
        const expected = fixture(`charset/${c.name}.bin`);
        const actual = Charset.encode(c.text!);
        assertBytesEqual(actual, expected, c.name);
        tsOutput(`charset/${c.name}.bin`, actual);
      });
    }
  }

  for (const bad of cases.errorCases) {
    it(`rejects unencodable text ${JSON.stringify(bad)} like Java`, () => {
      expect(() => Charset.encode(bad)).toThrow();
    });
  }

  it('roundtrips every encodable single character', () => {
    for (const [str, code] of Charset.encodingMap) {
      if (code >= 0xc2 && code !== 0xc3 && code !== 0xc8) continue; // needs param
      const encoded = Charset.encode(str);
      const decoded = Charset.decode(Bytes.wrap(encoded));
      // \r is dropped by decode; \end\ keeps trailing behavior
      if (str === '\r') {
        expect(decoded.text).toBe('');
      } else {
        expect(decoded.text).toBe(str);
      }
    }
  });
});

// Regression for the unknown-byte lookahead rewind off-by-one found via the
// real-ROM Java<->TS comparison. When 4 lookahead bytes are consumed without a
// match (and bytes remain), Java rewinds by the loop index i==4, not i-1. The
// expected strings below were captured directly from FFTA2Charset.decode.
describe('FFTA2 charset unknown-byte lookahead (real-ROM regression)', () => {
  const cases: Array<[number[], string]> = [
    [[0xb0, 0xb1, 0xb2, 0xb3, 0xb4, 0x02], '<unknown:B0><unknown:B1><unknown:B3><unknown:02>'],
    [[0xb0, 0xb1, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0x02], '<unknown:B0><unknown:B1><unknown:B2><unknown:B3><unknown:B5><unknown:02>'],
    [[0xeb, 0xb4, 0xfa, 0x23], '<unknown:B4><unknown:23>'],
    [[0xc0, 0x00, 0xb0, 0x02], '\n<unknown:02>'],
    [[0xcf, 0x05, 0xb0, 0xb1, 0x02], '\\varF:05\\<unknown:B1>A'],
  ];
  for (const [bytes, expected] of cases) {
    it(`decodes [${bytes.map((b) => b.toString(16)).join(' ')}] like Java`, () => {
      const result = Charset.decode(Bytes.wrap(new Uint8Array(bytes)));
      expect(result.text).toBe(expected);
    });
  }
});