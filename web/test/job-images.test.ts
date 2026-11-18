import { describe, expect, it } from 'vitest';
import { Bytes } from '../src/core/binary';
import { encode } from '../src/core/lzss';
import { SpriteData, SpritePalettes, TopSprite, UnitFace } from '../src/data/model/sprites';
import type { UnitSpriteState } from '../src/data/controllers/sprites';
import { decodePalette, renderFace, renderTopSprite, renderUnitSprite, renderIndexedTexture } from '../src/data/render/jobImages';

const pixel = (pixels: Uint8ClampedArray, index: number) => [...pixels.slice(index * 4, index * 4 + 4)];

export function testFace(color = 31): UnitFace {
  const face = new UnitFace(0);
  face.width = 2; face.height = 2;
  face.palette = new Uint8Array(512);
  face.palette[2] = color & 255; face.palette[3] = color >> 8;
  face.image = new Uint8Array([1, 0, 0, 1]);
  face.pieces = [
    { sourceX: 0, sourceY: 0, sourceWidth: 2, sourceHeight: 2, offsetX: -2, offsetY: 4, targetWidth: 2, targetHeight: 2 },
  ];
  return face;
}

export function testTopSprite(): TopSprite {
  const top = new TopSprite(1);
  top.palette = new Uint8Array(32);
  top.palette[2] = 31;
  top.sprites = [new Uint8Array(640), new Uint8Array(640)];
  top.sprites[0][0] = 0x01;
  top.sprites[0][32] = 0x10;
  top.sprites[1][0] = 0x10;
  return top;
}

function testState(colors = 32): UnitSpriteState {
  const palette = new Uint8Array(colors * 2);
  const index = colors === 32 ? 0 : 1;
  palette[index * 2] = 0xe0; palette[index * 2 + 1] = 3;
  const bytes = new Uint8Array([colors === 32 ? 224 : 1, 0, colors === 32 ? 224 : 1]);
  return {
    unitIndex: 0, hasChanged: false,
    spriteData: Object.assign(Object.create(SpriteData.prototype), { spriteMaps: [{
      unkownValue: 0, spriteOffset: 0, pieces: [
        { offsetX: -1, offsetY: -2, width: 2, height: 1 },
        { offsetX: 1, offsetY: -1, width: 1, height: 1 },
      ],
    }] }),
    spritePalettes: new SpritePalettes(Bytes.wrap(palette), colors),
    compressedSpriteList: [encode(Bytes.wrap(bytes))],
  };
}

describe('ROM image pixels', () => {
  it('converts BGR555 and keeps palette index zero transparent', () => {
    const palette = decodePalette(new Uint8Array([0xff, 0x7f, 31, 0, 0xe0, 3, 0, 0x7c]));
    expect(pixel(palette, 0)).toEqual([255, 255, 255, 0]);
    expect(pixel(palette, 1)).toEqual([255, 0, 0, 255]);
    expect(pixel(palette, 2)).toEqual([0, 255, 0, 255]);
    expect(pixel(palette, 3)).toEqual([0, 0, 255, 255]);
  });

  it('reassembles portrait pieces with inverted Y offsets and source cropping', () => {
    const face = testFace();
    face.pieces.push({ ...face.pieces[0], sourceWidth: 1, sourceHeight: 1, offsetX: 0, offsetY: 2 });
    const out = renderFace(face)!;
    expect([out.width, out.height]).toEqual([3, 3]);
    expect(pixel(out.pixels, 0)).toEqual([255, 0, 0, 255]);
    expect(pixel(out.pixels, 1)[3]).toBe(0);
    expect(pixel(out.pixels, 8)).toEqual([255, 0, 0, 255]);
  });

  it('decodes top-sprite tile order, nibble order and frame selection', () => {
    const top = testTopSprite();
    const out = renderTopSprite(top)!;
    expect([out.width, out.height]).toEqual([32, 40]);
    expect(pixel(out.pixels, 0)).toEqual([255, 0, 0, 255]);
    expect(pixel(out.pixels, 1)[3]).toBe(0);
    expect(pixel(out.pixels, 9)).toEqual([255, 0, 0, 255]);
    expect(pixel(renderTopSprite(top, 1)!.pixels, 1)).toEqual([255, 0, 0, 255]);
  });

  it.each([32, 128])('decodes LZSS pieces and %i-color palette without mutating the source', (colors) => {
    const state = testState(colors);
    state.compressedSpriteList[0].position(2);
    const before = state.compressedSpriteList[0].toUint8Array().slice();
    const out = renderUnitSprite(state)!;
    expect([out.width, out.height]).toEqual([3, 2]);
    expect(pixel(out.pixels, 0)).toEqual([0, 255, 0, 255]);
    expect(pixel(out.pixels, 1)[3]).toBe(0);
    expect(pixel(out.pixels, 5)).toEqual([0, 255, 0, 255]);
    expect(state.compressedSpriteList[0].position()).toBe(2);
    expect(state.compressedSpriteList[0].toUint8Array()).toEqual(before);
    expect(state.hasChanged).toBe(false);
  });

  it('handles missing and malformed image data without allocating unbounded images', () => {
    expect(renderFace(new UnitFace(0))).toBeNull();
    expect(renderTopSprite(new TopSprite(0))).toBeNull();
    expect(renderUnitSprite(testState(), 100)).toBeNull();
    expect(renderUnitSprite(testState(), 0, 10)).toBeNull();
    const invalid = testFace(); invalid.pieces[0].sourceX = 10;
    expect(() => renderFace(invalid)).toThrow('source out of bounds');
    const large = testFace(); large.pieces.push({ ...large.pieces[0], offsetX: 1000000 });
    expect(() => renderFace(large)).toThrow('Invalid image dimensions');
  });
  it('previews 8bpp map textures with the selected palette and validates their bounds', () => {
    const palette = new Uint8Array(512); palette[2] = 31;
    const out = renderIndexedTexture(2, 2, new Uint8Array([1, 0, 0, 1]), palette);
    expect(pixel(out.pixels, 0)).toEqual([255, 0, 0, 255]);
    expect(pixel(out.pixels, 1)[3]).toBe(0);
    expect(() => renderIndexedTexture(2, 2, new Uint8Array(1), palette)).toThrow('Incomplete');
    expect(() => renderIndexedTexture(0, 2, new Uint8Array(0), palette)).toThrow('Invalid');
  });

});
