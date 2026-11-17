// Equivalent of Java BitSet.valueOf(bytes) + named-bit setters + toByteArray
// padded to a fixed length. All bits in [0, length*8) are explicitly controlled,
// so a boolean array reproduces Java's output exactly (little-endian bit order).

export class Flags {
  readonly length: number;
  readonly bits: boolean[];

  constructor(source: Uint8Array | number) {
    if (typeof source === 'number') {
      this.length = source;
      this.bits = new Array(source * 8).fill(false);
    } else {
      this.length = source.length;
      this.bits = new Array(source.length * 8).fill(false);
      for (let i = 0; i < this.bits.length; i++) {
        this.bits[i] = ((source[i >> 3] >> (i & 7)) & 1) === 1;
      }
    }
  }

  get(i: number): boolean {
    return this.bits[i];
  }

  set(i: number, v: boolean): void {
    this.bits[i] = v;
  }

  toBytes(): Uint8Array {
    const out = new Uint8Array(this.length);
    for (let i = 0; i < this.bits.length; i++) {
      if (this.bits[i]) out[i >> 3] |= 1 << (i & 7);
    }
    return out;
  }
}