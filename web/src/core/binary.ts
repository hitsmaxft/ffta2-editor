// ByteBuffer-like reader/writer over an ArrayBuffer, little-endian.
// get()/getShort()/getInt() return SIGNED values to match Java ByteBuffer semantics;
// use getU8/getU16/getU32 where Java code used Byte.toUnsignedInt etc.

export class Bytes {
  readonly buf: ArrayBuffer;
  readonly base: number;
  readonly view: DataView;
  pos: number;
  lim: number;

  constructor(buf: ArrayBuffer, base = 0, length = buf.byteLength - base) {
    this.buf = buf;
    this.base = base;
    this.pos = 0;
    this.lim = length;
    this.view = new DataView(buf, base, length);
  }

  static wrap(data: Uint8Array): Bytes {
    return new Bytes(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength);
  }

  static alloc(size: number): Bytes {
    return new Bytes(new ArrayBuffer(size));
  }

  remaining(): number {
    return this.lim - this.pos;
  }

  rewind(): this {
    this.pos = 0;
    return this;
  }

  position(p?: number): number {
    if (p !== undefined) this.pos = p;
    return this.pos;
  }

  limit(l?: number): number {
    if (l !== undefined) this.lim = l;
    return this.lim;
  }

  slice(offset: number, length: number): Bytes {
    return new Bytes(this.buf, this.base + offset, length);
  }

  get(): number {
    return this.view.getInt8(this.pos++);
  }

  getU8(): number {
    return this.view.getUint8(this.pos++);
  }

  getShort(): number {
    const v = this.view.getInt16(this.pos, true);
    this.pos += 2;
    return v;
  }

  getU16(): number {
    const v = this.view.getUint16(this.pos, true);
    this.pos += 2;
    return v;
  }

  getInt(): number {
    const v = this.view.getInt32(this.pos, true);
    this.pos += 4;
    return v;
  }

  getU32(): number {
    const v = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return v;
  }

  peekInt(offset = this.pos): number {
    return this.view.getInt32(offset, true);
  }

  put(b: number): this {
    this.view.setInt8(this.pos++, b);
    return this;
  }

  putU8(b: number): this {
    this.view.setUint8(this.pos++, b);
    return this;
  }

  putShort(v: number): this {
    this.view.setInt16(this.pos, v, true);
    this.pos += 2;
    return this;
  }

  putU16(v: number): this {
    this.view.setUint16(this.pos, v, true);
    this.pos += 2;
    return this;
  }

  putInt(v: number): this {
    this.view.setInt32(this.pos, v, true);
    this.pos += 4;
    return this;
  }

  putU32(v: number): this {
    this.view.setUint32(this.pos, v, true);
    this.pos += 4;
    return this;
  }

  putBytes(src: Bytes | Uint8Array): this {
    if (src instanceof Bytes) {
      const n = src.remaining();
      new Uint8Array(this.buf, this.base + this.pos, n).set(
        new Uint8Array(src.buf, src.base + src.pos, n)
      );
      this.pos += n;
      src.pos += n;
    } else {
      new Uint8Array(this.buf, this.base + this.pos, src.length).set(src);
      this.pos += src.length;
    }
    return this;
  }

  putZeroes(n: number): this {
    new Uint8Array(this.buf, this.base + this.pos, n).fill(0);
    this.pos += n;
    return this;
  }

  // Copy of the whole underlying region [0, lim), independent of pos.
  toUint8Array(): Uint8Array {
    return new Uint8Array(this.buf.slice(this.base, this.base + this.lim));
  }

  // Copy of remaining bytes from pos.
  remainingBytes(): Uint8Array {
    return new Uint8Array(this.buf.slice(this.base + this.pos, this.base + this.lim));
  }

  getBytesAt(offset: number, length: number): Uint8Array {
    return new Uint8Array(this.buf.slice(this.base + offset, this.base + offset + length));
  }
}

export function align16(d: number): number {
  return (d + 0x1f) & ~0x1f;
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function firstMismatch(a: Uint8Array, b: Uint8Array): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : n;
}

export function hex(data: Uint8Array, max = 64): string {
  return Array.from(data.slice(0, max))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');
}

// Java-style signed byte arithmetic helpers
export function toSignedByte(v: number): number {
  return (v << 24) >> 24;
}

export function toUnsignedByte(v: number): number {
  return v & 0xff;
}

export function toUnsignedShort(v: number): number {
  return v & 0xffff;
}