// Port of model/map/MapData.java (CURRENT Java logic, incl. the recent palette
// fix: palettes are numPalettes x 512-byte slots filled via loadPalette).
// Parse-only model: Java MapData has no toBytes(); all BufferedImage rendering
// (getImage/getTexture) is skipped. Parts are stored in Java's reordered
// sequence: FX parts by descending FXIndex, then non-FX by descending
// primaryIndex (signed byte comparison, stable sort then reversed).

import { Bytes } from '../../core/binary';

export interface MapPoint {
  x: number;
  y: number;
}

export class MapPart {
  source: MapPoint[] = new Array(4);
  target: MapPoint[] = new Array(4);
  primaryIndex = 0; // signed byte
  FXIndex = 0; // signed byte
  isFX = false;

  constructor(bytes: Bytes) {
    for (let i = 0; i < 4; i++) {
      this.target[i] = { x: bytes.getShort(), y: bytes.getShort() };
      bytes.getShort();
      this.source[i] = { x: bytes.getShort(), y: bytes.getShort() };
      bytes.getShort();
    }
    bytes.getShort();
    bytes.get();
    this.primaryIndex = bytes.get();
    bytes.getShort();
    bytes.get();
    this.FXIndex = bytes.get();
    this.isFX = (bytes.getShort() & 1) === 1;
    bytes.getShort();
  }
}

const PRTS = new Uint8Array([0x50, 0x52, 0x54, 0x53]); // "PRTS"
const PLTT = new Uint8Array([0x50, 0x4c, 0x54, 0x54]); // "PLTT"
// ANIM / PANL / TEX sections are declared but unused in Java.

export class MapData {
  id: number;
  width = 0;
  height = 0;
  texture: Uint8Array;
  palettes: Uint8Array[];
  parts: MapPart[] | null = null;

  constructor(mapBytes: Bytes, textureBytes: Bytes, mapCtrlBytes: Bytes, id: number) {
    this.id = id;
    this.texture = textureBytes.remainingBytes();
    textureBytes.position(textureBytes.limit());

    const mapCtrlBytesPos = mapCtrlBytes.position();
    mapCtrlBytes.getShort(); // ??
    mapCtrlBytes.get(); // numTextures (always 1? read but unused)
    const numPalettes = mapCtrlBytes.get();
    mapCtrlBytes.position(mapCtrlBytesPos + 0x14);

    this.palettes = [];
    for (let i = 0; i < numPalettes; i++) {
      this.palettes.push(new Uint8Array(512));
    }

    this.width = 256;
    this.height = Math.floor(this.texture.length / 256);

    this.readPRTS(mapBytes);
    this.readPLTT(mapBytes);
  }

  private getSection(mapBytes: Bytes, name: Uint8Array): Bytes | null {
    mapBytes.rewind();
    let foundSection = false;
    while (mapBytes.remaining() >= 4) {
      const temp = mapBytes.getBytesAt(mapBytes.position(), 4);
      mapBytes.position(mapBytes.position() + 4);
      let equal = true;
      for (let i = 0; i < 4; i++) {
        if (temp[i] !== name[i]) {
          equal = false;
          break;
        }
      }
      if (equal) {
        foundSection = true;
        break;
      }
      mapBytes.position(mapBytes.position() - 3);
    }
    if (foundSection) {
      const pos = mapBytes.position();
      const lenParts = mapBytes.getInt();
      return mapBytes.slice(pos, lenParts - 4);
    }
    return null;
  }

  private readPRTS(mapBytes: Bytes): void {
    const PRTSBytes = this.getSection(mapBytes, PRTS);
    if (PRTSBytes !== null) {
      PRTSBytes.getInt(); // lenParts
      const numParts = PRTSBytes.getInt();
      const parts: MapPart[] = [];
      for (let i = 0; i < numParts; i++) {
        parts.push(new MapPart(PRTSBytes));
      }
      // Java: sorted(comparingInt(FXIndex)).toList().reversed() for FX parts,
      // then sorted(comparingInt(primaryIndex)).reversed() for non-FX parts.
      const fx = parts.filter((x) => x.isFX).sort((a, b) => a.FXIndex - b.FXIndex).reverse();
      const nonFx = parts.filter((x) => !x.isFX).sort((a, b) => a.primaryIndex - b.primaryIndex).reverse();
      this.parts = [...fx, ...nonFx];
    }
    // else: Java logs "PRTS not found" and leaves parts null.
  }

  private readPLTT(mapBytes: Bytes): void {
    const PLTTBytes = this.getSection(mapBytes, PLTT);
    if (PLTTBytes !== null) {
      PLTTBytes.getInt(); // lenParts
      PLTTBytes.getInt(); // numParts
      // TODO in Java: figure out what this section does (values discarded).
    }
  }

  loadPalette(paletteBytes: Bytes, i: number): void {
    this.palettes[i] = paletteBytes.getBytesAt(paletteBytes.position(), 512);
    paletteBytes.position(paletteBytes.position() + 512);
  }
}