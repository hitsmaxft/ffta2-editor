import { loadRom } from '../data/load';
import { loadSprites, getUnitSpriteState } from '../data/controllers/sprites';
import { renderFace, renderUnitSprite, renderTopSprite, renderIndexedTexture, type PixelImage } from '../data/render/jobImages';
import { sha256 } from './encoding';
import { validateNds } from './containers';
import { RomAnalysisError, fail } from './errors';

export interface ImageSession {
  romSha256: string;
  counts: { portraits: number; unitSprites: number; topSprites: number; maps: number };
  portrait(id: number): PixelImage | null;
  unitSprite(id: number, frame?: number, palette?: number): PixelImage | null;
  topSprite(id: number, frame?: number): PixelImage | null;
  mapTexture(id: number, palette?: number): PixelImage | null;
}
/** Optional, in-memory image access sharing the Editor's existing decoders.
 * It never adds pixels to createDataPackage(), creates URLs or writes assets. */
export async function openImageSession(input: Uint8Array, expectedSha256: string): Promise<ImageSession> {
  if (!(input instanceof Uint8Array)) fail('INVALID_INPUT', 'ROM', 'Input must be a Uint8Array');
  input = input.slice();
  const actual = await sha256(input);
  if (actual !== expectedSha256) fail('ROM_SHA_MISMATCH', 'ROM', 'Image source differs from the expected ROM');
  try {
    validateNds(input);
    // Own the backing buffer; a caller cannot mutate it after opening a session.
    const data = loadRom(input);
    loadSprites(data);
    const read = (resource: string, action: () => PixelImage | null) => {
      try { return action(); } catch (error) { fail('IMAGE_READ_ERROR', resource, error instanceof Error ? error.message : String(error)); }
    };
    return { romSha256: actual, counts: { portraits: data.unitFaces.length, unitSprites: data.unitSstList.length, topSprites: data.topSprites.length, maps: data.maps.length },
      portrait: (id) => read(`portrait:${id}`, () => data.unitFaces[id] ? renderFace(data.unitFaces[id]) : null),
      unitSprite: (id, frame = 0, palette = 0) => read(`unitSprite:${id}:${frame}:${palette}`, () => {
        const state = data.unitSstList[id] ? getUnitSpriteState(data.unitSstList[id]) : undefined;
        return state ? renderUnitSprite(state, frame, palette) : null;
      }),
      topSprite: (id, frame = 0) => read(`topSprite:${id}:${frame}`, () => data.topSprites[id] ? renderTopSprite(data.topSprites[id], frame) : null),
      mapTexture: (id, palette = 0) => read(`mapTexture:${id}:${palette}`, () => {
        const map = data.maps.find((map) => map.id === id);
        return map?.palettes[palette] ? renderIndexedTexture(map.width, map.height, map.texture, map.palettes[palette]) : null;
      }) };
  } catch (error) {
    if (error instanceof RomAnalysisError) throw error;
    fail('IMAGE_READ_ERROR', 'image-resources', error instanceof Error ? error.message : String(error));
  }
}
export type { PixelImage } from '../data/render/jobImages';
