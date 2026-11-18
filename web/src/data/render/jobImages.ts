// Runtime-only pixel decoding from the open ROM. No files, URLs or persistence.
// Layout and palette rules follow the Java UnitFace / TopSprite / UnitSprite.
import { Bytes } from '../../core/binary';
import { decode } from '../../core/lzss';
import type { UnitFace, TopSprite } from '../model/sprites';
import type { UnitSpriteState } from '../controllers/sprites';

export interface PixelImage {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}

function image(width: number, height: number): PixelImage {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0
      || width > 2048 || height > 2048 || width * height > 1048576) {
    throw new Error('Invalid image dimensions');
  }
  return { width, height, pixels: new Uint8ClampedArray(width * height * 4) };
}

export function decodePalette(bytes: Uint8Array, offset = 0): Uint8ClampedArray {
  if (bytes.length % 2 || offset < 0 || offset + bytes.length / 2 > 256) throw new Error('Invalid palette');
  const colors = new Uint8ClampedArray(256 * 4);
  for (let i = 1; i < 256; i++) colors[i * 4 + 3] = 255;
  for (let i = 0; i < bytes.length / 2; i++) {
    const color = bytes[i * 2] | (bytes[i * 2 + 1] << 8);
    const out = (i + offset) * 4;
    colors[out] = Math.floor((color & 31) * 255 / 31);
    colors[out + 1] = Math.floor(((color >> 5) & 31) * 255 / 31);
    colors[out + 2] = Math.floor(((color >> 10) & 31) * 255 / 31);
  }
  return colors;
}

function put(out: PixelImage, x: number, y: number, color: number, palette: Uint8ClampedArray): void {
  if (x < 0 || y < 0 || x >= out.width || y >= out.height) throw new Error('Image piece out of bounds');
  out.pixels.set(palette.subarray(color * 4, color * 4 + 4), (y * out.width + x) * 4);
}

export function renderFace(face: UnitFace): PixelImage | null {
  if (!face.image.length || !face.pieces.length) return null;
  if (face.image.length < face.width * face.height || face.palette.length !== 512) throw new Error('Incomplete portrait');
  const left = Math.min(...face.pieces.map((p) => p.offsetX));
  const top = Math.max(...face.pieces.map((p) => p.offsetY));
  const right = Math.max(...face.pieces.map((p) => p.offsetX + p.sourceWidth));
  const bottom = Math.max(...face.pieces.map((p) => p.sourceHeight - p.offsetY));
  const out = image(right - left, bottom + top);
  const palette = decodePalette(face.palette);
  for (const piece of face.pieces) {
    if (piece.sourceX < 0 || piece.sourceY < 0 || piece.sourceX + piece.sourceWidth > face.width
        || piece.sourceY + piece.sourceHeight > face.height) throw new Error('Portrait source out of bounds');
    for (let y = 0; y < piece.sourceHeight; y++) {
      for (let x = 0; x < piece.sourceWidth; x++) {
        const color = face.image[(piece.sourceY + y) * face.width + piece.sourceX + x];
        put(out, piece.offsetX - left + x, top - piece.offsetY + y, color, palette);
      }
    }
  }
  return out;
}

export function renderTopSprite(sprite: TopSprite, frame = 0): PixelImage | null {
  const bytes = sprite.sprites[frame];
  if (!bytes) return null;
  if (bytes.length !== 640 || sprite.palette.length !== 32) throw new Error('Incomplete top sprite');
  const out = image(32, 40);
  const palette = decodePalette(sprite.palette);
  // Twenty 8x8 4bpp tiles in row order; low nibble is the left pixel.
  for (let tile = 0; tile < 20; tile++) {
    for (let pixel = 0; pixel < 64; pixel++) {
      const byte = bytes[tile * 32 + (pixel >> 1)];
      const color = (byte >> ((pixel & 1) * 4)) & 15;
      put(out, (tile % 4) * 8 + pixel % 8, Math.floor(tile / 4) * 8 + Math.floor(pixel / 8), color, palette);
    }
  }
  return out;
}

export function renderUnitSprite(state: UnitSpriteState, frame = 0, paletteIndex = 0): PixelImage | null {
  const pieces = state.spriteData?.spriteMaps[frame]?.pieces;
  const source = state.compressedSpriteList[frame];
  const paletteBytes = state.spritePalettes?.palettes[paletteIndex];
  if (!pieces?.length || !source || !paletteBytes) return null;
  const size = source.view.getUint32(0, true) >>> 8;
  if (size > 1048576) throw new Error('Sprite decompression limit exceeded');
  // New cursor over the same bytes: rendering cannot alter save-state buffers.
  const decoded = decode(new Bytes(source.buf, source.base, source.lim)).decodedData.toUint8Array();
  const palette = decodePalette(paletteBytes, state.spritePalettes!.numColors === 32 ? 224 : 0);
  const left = Math.min(...pieces.map((p) => p.offsetX));
  const top = Math.min(...pieces.map((p) => p.offsetY));
  const right = Math.max(...pieces.map((p) => p.offsetX + p.width));
  const bottom = Math.max(...pieces.map((p) => p.offsetY + p.height));
  const out = image(right - left, bottom - top);
  let cursor = 0;
  for (const piece of pieces) {
    if (piece.width < 0 || piece.height < 0 || cursor + piece.width * piece.height > decoded.length) {
      throw new Error('Incomplete sprite pixels');
    }
    for (let y = 0; y < piece.height; y++) {
      for (let x = 0; x < piece.width; x++) {
        put(out, piece.offsetX - left + x, piece.offsetY - top + y, decoded[cursor++], palette);
      }
    }
  }
  return out;
}
