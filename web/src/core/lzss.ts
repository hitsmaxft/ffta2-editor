// NDS LZSS (LZ77 type 0x10) codec.
// Decode is a faithful port of the Java implementation.
// Encode uses a hash-chain matcher; output is not required to be byte-identical
// to the Java encoder, but must be mutually decodable (verified by cross tests).

import { Bytes } from './binary';

const N = 4096;
const F = 18;
const THRESHOLD = 3;

export interface LZSSDecodeResult {
  decodedData: Bytes;
  compressedSize: number;
}

export function decode(input: Bytes): LZSSDecodeResult {
  const startPos = input.pos;
  const header = input.getInt();
  const compressionType = (header >>> 4) & 0x0f;
  if (compressionType !== 0x1) throw new Error('Not LZSS compressed');
  const uncompressedSize = header >>> 8;

  const out = Bytes.alloc(uncompressedSize);
  let flags = 0;
  let flagIndex = 7;
  while (out.remaining() > 0) {
    if (flagIndex === 7) {
      if (input.remaining() === 0) break;
      flags = input.getU8();
    }
    if (((flags >> flagIndex) & 1) === 0) {
      if (input.remaining() === 0) break;
      out.put(input.get());
    } else {
      if (input.remaining() === 0) break;
      const i = input.getU8();
      if (input.remaining() === 0) break;
      const j = input.getU8();
      const offset = ((i & 0x0f) << 8) | j;
      const numBytes = ((i & 0xf0) >>> 4) + 3;
      let src = out.pos - offset - 1;
      for (let k = 0; k < numBytes; k++) {
        out.putU8(out.view.getUint8(src++));
      }
    }
    flagIndex = flagIndex === 0 ? 7 : flagIndex - 1;
  }
  return { decodedData: out.rewind(), compressedSize: input.pos - startPos };
}

export function encode(input: Bytes, vramCompatible = false): Bytes {
  const data = new Uint8Array(input.buf, input.base + input.pos, input.remaining());
  const size = data.length;
  const out = new Uint8Array(size + Math.ceil(size / 8) + 16);
  let op = 0;
  out[op++] = 0x10;
  out[op++] = size & 0xff;
  out[op++] = (size >>> 8) & 0xff;
  out[op++] = (size >>> 16) & 0xff;

  const head = new Int32Array(N).fill(-1);
  const prev = new Int32Array(N).fill(-1);
  const minMatchPos = vramCompatible ? 2 : 1;

  const hash3 = (p: number) => ((data[p] << 8) | (data[p + 1] << 3) | data[p + 2]) & (N - 1);

  let pos = 0;
  while (pos < size) {
    const flagPos = op++;
    let flags = 0;
    for (let bit = 7; bit >= 0 && pos < size; bit--) {
      let bestLen = 0;
      let bestDist = 0;
      if (pos + THRESHOLD <= size) {
        const limit = Math.min(F, size - pos);
        const windowStart = Math.max(0, pos - N);
        let cand = head[hash3(pos)];
        let chain = 0;
        while (cand >= windowStart && chain < 256) {
          const dist = pos - cand;
          if (dist >= minMatchPos) {
            let len = 0;
            while (len < limit && data[cand + len] === data[pos + len]) len++;
            if (len > bestLen) {
              bestLen = len;
              bestDist = dist;
              if (len === limit) break;
            }
          }
          cand = prev[cand & (N - 1)];
          chain++;
        }
      }
      if (bestLen >= THRESHOLD) {
        flags |= 1 << bit;
        const d = bestDist - 1;
        out[op++] = ((bestLen - THRESHOLD) << 4) | (d >>> 8);
        out[op++] = d & 0xff;
        for (let k = 0; k < bestLen; k++) {
          const p = pos + k;
          if (p + THRESHOLD <= size) {
            const h = hash3(p);
            prev[p & (N - 1)] = head[h];
            head[h] = p;
          }
        }
        pos += bestLen;
      } else {
        out[op++] = data[pos];
        if (pos + THRESHOLD <= size) {
          const h = hash3(pos);
          prev[pos & (N - 1)] = head[h];
          head[h] = pos;
        }
        pos++;
      }
    }
    out[flagPos] = flags;
  }
  return Bytes.wrap(out.slice(0, op));
}