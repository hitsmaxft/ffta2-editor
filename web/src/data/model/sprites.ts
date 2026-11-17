// Ports of model/unitSst/{SpriteData,SpritePalettes,SstHeaderNode,UnitAnimation,UnitSst}.java,
// model/topSprite/TopSprite.java and model/unitFace/UnitFace.java.
// Pure record/data parsers: raw byte arrays are kept as Uint8Array, JavaFX
// properties become plain fields, and all BufferedImage/rendering code is
// skipped (TopSprite/UnitFace serialize their raw arrays, not rendered output).

import { Bytes, toSignedByte, toUnsignedByte } from '../../core/binary';
import * as LZSS from '../../core/lzss';
import { Flags } from './flags';
import { BinaryTree, BinaryTreeNode } from './spritesTree';
import { javaLzssEncode } from './spritesLzss';

// ---- SpriteData ----

export interface SpritePiece {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export interface SpriteMap {
  unkownValue: number; // sic: Java record field typo preserved
  spriteOffset: number;
  pieces: SpritePiece[];
}

export class SpriteData {
  spriteMaps: SpriteMap[] = [];

  constructor(bytes: Bytes) {
    // Java: bytes.getShort(0) >>> 3 (absolute signed read, unsigned shift)
    const count = bytes.view.getInt16(0, true) >>> 3;
    for (let i = 0; i < count; i++) {
      const pieceOffset = bytes.getShort();
      const unkownValue = bytes.getShort();
      const spriteOffset = bytes.getInt();
      const mark = bytes.position();
      bytes.position(pieceOffset);
      const numPieces = bytes.getInt();
      const pieces: SpritePiece[] = [];
      for (let j = 0; j < numPieces; j++) {
        pieces.push({
          offsetX: bytes.getShort(),
          offsetY: bytes.getShort(),
          width: bytes.getShort(),
          height: bytes.getShort(),
        });
      }
      this.spriteMaps.push({ unkownValue, spriteOffset, pieces });
      bytes.position(mark);
    }
  }

  toByteBuffer(): Bytes {
    const total = this.spriteMaps.reduce((n, x) => n + 8 + 4 + x.pieces.length * 8, 0);
    const bytes = Bytes.alloc(total);
    let currPieceOffset = this.spriteMaps.length * 8;
    for (const spriteMap of this.spriteMaps) {
      bytes.putShort(currPieceOffset);
      bytes.putShort(spriteMap.unkownValue);
      bytes.putInt(spriteMap.spriteOffset);
      const mark = bytes.position();
      bytes.position(currPieceOffset);
      bytes.putInt(spriteMap.pieces.length);
      for (const piece of spriteMap.pieces) {
        bytes.putShort(piece.offsetX);
        bytes.putShort(piece.offsetY);
        bytes.putShort(piece.width);
        bytes.putShort(piece.height);
      }
      currPieceOffset = bytes.position();
      bytes.position(mark);
    }
    return bytes.rewind();
  }

  toBytes(): Uint8Array {
    return this.toByteBuffer().toUint8Array();
  }
}

// ---- SpritePalettes ----

export class SpritePalettes {
  numColors: number;
  palettes: Uint8Array[] = [];

  constructor(paletteBytes: Bytes, numColors: number) {
    this.numColors = numColors;
    const count = Math.floor(paletteBytes.remaining() / (numColors * 2));
    for (let i = 0; i < count; i++) {
      this.palettes.push(paletteBytes.getBytesAt(paletteBytes.position(), numColors * 2));
      paletteBytes.position(paletteBytes.position() + numColors * 2);
    }
  }

  toBytes(): Uint8Array {
    return this.toByteBuffer().toUint8Array();
  }

  toByteBuffer(): Bytes {
    const total = this.palettes.reduce((n, x) => n + x.length, 0);
    const newPalettes = Bytes.alloc(total);
    for (const paletteBytes of this.palettes) {
      newPalettes.putBytes(paletteBytes);
    }
    newPalettes.limit(newPalettes.position());
    // Java uses its suffix-tree LZSS encoder (vram-compatible); the core
    // hash-chain encoder is not byte-identical, so use the faithful port.
    return javaLzssEncode(newPalettes.rewind(), true);
  }
}

// ---- SstHeaderNode ----

export class SstHeaderNode extends BinaryTreeNode<Uint8Array> {
  dataType: number;
  animationId: number;

  constructor(bytes: Bytes, index: number);
  constructor(index: number, dataType: number, animationId: number, offset: number);
  constructor(a: Bytes | number, b: number, c?: number, d?: number) {
    if (a instanceof Bytes) {
      super(a, b);
      this.dataType = toSignedByte(this.key & 0xff);
      this.animationId = toSignedByte((this.key & 0xffff) >>> 0x8);
    } else {
      // Java: super(index, (short) key(dataType, animationId), offset)
      super(a, (SstHeaderNode.key(b, c!) << 16) >> 16, d!);
      this.dataType = b;
      this.animationId = c!;
    }
  }

  static key(dataType: number, animationId: number): number {
    return (toUnsignedByte(animationId) << 0x8) | toUnsignedByte(dataType);
  }
}

// ---- UnitAnimation ----

export class UnitAnimationFrame {
  _0x00 = 0; // Used to signal damage number and special effects
  duration = 0;
  _0x04 = 0;
  propertyFlags: Flags; // bit0..bit7; bit1 = isMirrored
  spriteIndex = 0;
  _0x08 = 0;
  _0x0a = 0;
  _0x0c = 0;
  _0x0e = 0;

  constructor(bytes: Bytes) {
    this._0x00 = bytes.getShort();
    this.duration = bytes.getShort();
    this._0x04 = bytes.getShort();
    this.propertyFlags = new Flags(new Uint8Array([bytes.getU8()]));
    this.spriteIndex = bytes.get();
    this._0x08 = bytes.getShort();
    this._0x0a = bytes.getShort();
    this._0x0c = bytes.getShort();
    this._0x0e = bytes.getShort();
  }

  toBytes(): Uint8Array {
    const buf = Bytes.alloc(0x10);
    buf.putShort(this._0x00);
    buf.putShort(this.duration);
    buf.putShort(this._0x04);
    buf.putBytes(this.propertyFlags.toBytes());
    buf.put(this.spriteIndex);
    buf.putShort(this._0x08);
    buf.putShort(this._0x0a);
    buf.putShort(this._0x0c);
    buf.putShort(this._0x0e);
    return buf.toUint8Array();
  }
}

export class UnitAnimation {
  animHeader: Uint8Array;
  frames: UnitAnimationFrame[];
  unknown = 0;
  key: number;

  constructor(bytes: Bytes, animHeader: Uint8Array, key: number) {
    this.animHeader = animHeader;
    this.key = key;
    const count = bytes.getShort();
    this.unknown = bytes.getShort();
    this.frames = [];
    for (let i = 0; i < count; i++) {
      this.frames.push(new UnitAnimationFrame(bytes));
    }
  }

  toBytes(): Uint8Array {
    const buf = Bytes.alloc(0x10 * this.frames.length + 4);
    buf.putShort(this.frames.length);
    buf.putShort(this.unknown);
    for (const frame of this.frames) {
      buf.putBytes(frame.toBytes());
    }
    return buf.toUint8Array();
  }
}

// ---- UnitSst ----

export class UnitSst extends BinaryTree<Uint8Array> {
  constructor(bytes: Bytes) {
    super(bytes);
    // Populate nodes with their raw compressed values (4-byte prefix + LZSS).
    this.traverseInOrder((node) => {
      this.data.position(node.offset * 0x10 + 4);
      try {
        const value = LZSS.decode(this.data);
        node.value = this.data.getBytesAt(node.offset * 0x10, value.compressedSize + 4);
      } catch {
        // Java shows an Alert and stores null; headless port stores null.
        node.value = null;
      }
    });
  }

  getAnimation(key: number): UnitAnimation | null {
    const node = this.find(key)!;
    const temp = Bytes.wrap(node.value!);
    const animHeader = temp.getBytesAt(0, 4);
    temp.position(4);
    try {
      const anim = LZSS.decode(temp);
      return new UnitAnimation(anim.decodedData, animHeader, key);
    } catch {
      return null;
    }
  }

  getPalettes(): Bytes | null {
    const node = this.find(0x00f0)!;
    this.data.position(node.offset * 0x10);
    this.data.getShort();
    this.data.getShort(); // count (read but unused, as in Java)
    try {
      const palettes = LZSS.decode(this.data);
      return palettes.decodedData;
    } catch {
      return null;
    }
  }

  getSpriteMap(): SpriteData | null {
    const node = this.find(0x00ff)!;
    this.data.position(node.offset * 0x10);
    this.data.getInt();
    try {
      const spriteMapBytes = LZSS.decode(this.data);
      return new SpriteData(spriteMapBytes.decodedData);
    } catch {
      return null;
    }
  }

  getCompressedValue(key: number): Uint8Array | null {
    const node = this.find(key)!;
    return node.value;
  }

  setCompressedValue(key: number, value: Bytes): void {
    const node = this.find(key)!;
    // Java quirk: the new 4-byte prefix is built from bytes 1..2 of the NEW
    // buffer plus bytes 2..3 of the OLD value (not a plain header copy).
    const newCompressedValue = Bytes.alloc(value.lim + 4);
    newCompressedValue.putShort(value.view.getInt16(1, true));
    for (let j = 2; j < 4; j++) {
      newCompressedValue.put(node.value![j]);
    }
    newCompressedValue.putBytes(value);
    node.value = newCompressedValue.toUint8Array();
  }

  toBytes(): Uint8Array {
    return this.toByteBuffer().toUint8Array();
  }

  toByteBuffer(): Bytes {
    const nodeList = this.asList();
    const compressedData = nodeList.map((node) => this.getCompressedValue(node.key)!);

    const headerSize = this.size % 2 === 1 ? (this.size + 1) * 8 : (this.size + 2) * 8;
    const total =
      headerSize +
      compressedData.reduce((n, x) => n + x.length + (x.length % 16 !== 0 ? 16 - (x.length % 16) : 0), 0);
    const newSst = Bytes.alloc(total);

    let currOffset = headerSize;
    for (let i = 0; i < nodeList.length; i++) {
      const node = nodeList[i];
      node.offset = Math.floor(currOffset / 16);
      newSst.putBytes(node.toBytes());
      const mark = newSst.position();
      newSst.position(currOffset);
      newSst.putBytes(compressedData[i]);
      if (newSst.position() % 16 !== 0) {
        newSst.position(newSst.position() + 16 - (newSst.position() % 16));
      }
      currOffset = newSst.position();
      newSst.position(mark);
    }
    newSst.putShort(0).putInt(Math.floor(total / 0x10));

    return newSst.rewind();
  }
}

// ---- TopSprite ----

export class TopSprite {
  id: number;
  palette: Uint8Array;
  sprites: Uint8Array[] = [];
  remainingBytes: Uint8Array;
  hasChanged = false;

  constructor(bytes: Bytes, id: number);
  constructor(id: number);
  constructor(a: Bytes | number, b?: number) {
    if (a instanceof Bytes) {
      const bytes = a;
      this.id = b!;
      this.palette = bytes.getBytesAt(bytes.position(), 32);
      bytes.position(bytes.position() + 32);
      const numSprites = bytes.get(); // signed byte, as in Java
      for (let i = 0; i < numSprites; i++) {
        this.sprites.push(bytes.getBytesAt(bytes.position(), 0x20 * 4 * 5));
        bytes.position(bytes.position() + 0x20 * 4 * 5);
      }
      this.remainingBytes = bytes.remainingBytes();
      bytes.position(bytes.limit());
    } else {
      this.id = a;
      this.palette = new Uint8Array(0);
      this.remainingBytes = new Uint8Array(0);
    }
  }

  toBytes(): Uint8Array {
    const buffer = Bytes.alloc(0x21 + 0x20 * 4 * 5 * this.sprites.length + this.remainingBytes.length);
    buffer.putBytes(this.palette);
    buffer.put(this.sprites.length);
    for (const sprite of this.sprites) {
      buffer.putBytes(sprite);
    }
    buffer.putBytes(this.remainingBytes);
    return buffer.toUint8Array();
  }
}

// ---- UnitFace ----

export interface PieceMapping {
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  offsetX: number;
  offsetY: number;
  targetWidth: number;
  targetHeight: number;
}

export class UnitFace {
  id: number;
  _0x0 = 0;
  _0x1 = 0;
  width = 0;
  height = 0;
  _0x6 = 0;
  pieces: PieceMapping[] = [];
  image: Uint8Array = new Uint8Array(0);
  palette: Uint8Array = new Uint8Array(0);
  remainingBytes: Uint8Array = new Uint8Array(0);
  hasChanged = false;

  constructor(bytes: Bytes, id: number);
  constructor(id: number);
  constructor(a: Bytes | number, b?: number) {
    if (a instanceof Bytes) {
      const bytes = a;
      this.id = b!;
      this._0x0 = bytes.get();
      this._0x1 = bytes.get();
      this.width = bytes.getShort();
      this.height = bytes.getShort();
      this._0x6 = bytes.get();
      const numPieces = bytes.get(); // signed byte, as in Java
      for (let i = 0; i < numPieces; i++) {
        this.pieces.push({
          sourceX: bytes.getShort(),
          sourceY: bytes.getShort(),
          sourceWidth: bytes.getShort(),
          sourceHeight: bytes.getShort(),
          offsetX: 0,
          offsetY: 0,
          targetWidth: 0,
          targetHeight: 0,
        });
      }
      for (let i = 0; i < numPieces; i++) {
        const piece = this.pieces[i];
        piece.offsetX = bytes.getShort();
        piece.offsetY = bytes.getShort();
        piece.targetWidth = bytes.getShort();
        piece.targetHeight = bytes.getShort();
      }
      this.image = bytes.getBytesAt(bytes.position(), this.width * this.height);
      bytes.position(bytes.position() + this.width * this.height);
      this.palette = bytes.getBytesAt(bytes.position(), 0x200);
      bytes.position(bytes.position() + 0x200);
      this.remainingBytes = bytes.remainingBytes();
      bytes.position(bytes.limit());
    } else {
      this.id = a;
    }
  }

  toBytes(): Uint8Array {
    const buffer = Bytes.alloc(
      0x8 + 0x10 * this.pieces.length + this.image.length + this.palette.length + this.remainingBytes.length
    );
    buffer.put(this._0x0);
    buffer.put(this._0x1);
    buffer.putShort(this.width);
    buffer.putShort(this.height);
    buffer.put(this._0x6);
    buffer.put(this.pieces.length);
    for (const piece of this.pieces) {
      buffer.putShort(piece.sourceX);
      buffer.putShort(piece.sourceY);
      buffer.putShort(piece.sourceWidth);
      buffer.putShort(piece.sourceHeight);
    }
    for (const piece of this.pieces) {
      buffer.putShort(piece.offsetX);
      buffer.putShort(piece.offsetY);
      buffer.putShort(piece.targetWidth);
      buffer.putShort(piece.targetHeight);
    }
    buffer.putBytes(this.image);
    buffer.putBytes(this.palette);
    buffer.putBytes(this.remainingBytes);
    return buffer.toUint8Array();
  }
}