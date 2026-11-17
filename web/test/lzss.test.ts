import { describe, it, expect } from 'vitest';
import { Bytes } from '../src/core/binary';
import * as LZSS from '../src/core/lzss';
import { fixture, tsOutput, assertBytesEqual } from './helpers';

// Cross-check against the original Java implementation:
// 1. TS must decode every Java-encoded sample to the exact original bytes.
// 2. TS-encoded output is written to test/ts-output and decoded by the Java
//    decoder in the Java reference implementation (LZSS.java).

const manifest = fixture('lzss/manifest.txt');
const names = new TextDecoder().decode(manifest).split('\n').filter(Boolean);

describe('LZSS vs Java reference', () => {
  for (const name of names) {
    it(`decodes Java-encoded ${name}`, () => {
      const raw = fixture(`lzss/${name}.raw`);
      const lz = fixture(`lzss/${name}.lz`);
      const result = LZSS.decode(Bytes.wrap(lz));
      assertBytesEqual(result.decodedData.toUint8Array(), raw, name);
      // Java's decoder stops as soon as the output is full; trailing flag-byte
      // padding may remain unconsumed.
      expect(result.compressedSize).toBeLessThanOrEqual(lz.length);
      expect(result.compressedSize).toBeGreaterThan(0);
    });

    it(`TS encode of ${name} roundtrips and is exported for Java verification`, () => {
      const raw = fixture(`lzss/${name}.raw`);
      const encoded = LZSS.encode(Bytes.wrap(raw), name === 'vram');
      const decoded = LZSS.decode(encoded);
      assertBytesEqual(decoded.decodedData.toUint8Array(), raw, `${name} roundtrip`);
      tsOutput(`lzss/${name}.lz`, encoded.toUint8Array());
    });
  }

  it('rejects non-LZSS headers', () => {
    const bad = Bytes.wrap(new Uint8Array([0x20, 0, 0, 0]));
    expect(() => LZSS.decode(bad)).toThrow();
  });

  it('handles random roundtrips of various sizes', () => {
    let seed = 12345;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed & 0xff;
    };
    for (const size of [3, 18, 255, 5000, 70000]) {
      const data = new Uint8Array(size);
      for (let i = 0; i < size; i++) data[i] = i % 7 === 0 ? rand() : data[Math.max(0, i - 13)];
      const enc = LZSS.encode(Bytes.wrap(data));
      const dec = LZSS.decode(enc);
      assertBytesEqual(dec.decodedData.toUint8Array(), data, `random ${size}`);
    }
  });
});