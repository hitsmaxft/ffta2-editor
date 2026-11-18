import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { loadRom } from '../src/data/load';
import { loadAll } from '../src/data/orchestration';
import { getUnitSpriteState } from '../src/data/controllers/sprites';
import { renderFace, renderTopSprite, renderUnitSprite } from '../src/data/render/jobImages';

// Explicit local opt-in; no ROM or extracted image fixtures are bundled.
const path = process.env.FFTA2_PREVIEW_ROM;
describe.skipIf(!path)('job images from an open ROM', () => {
  it('decodes every referenced job image without changing model bytes or source cursors', () => {
    const bytes = new Uint8Array(readFileSync(path!));
    const hash = () => createHash('sha256').update(bytes).digest('hex');
    const original = hash();
    const data = loadRom(bytes); loadAll(data);
    const jobs = data.jobDataList.map((job) => job.toBytes());
    const stats = { portraits: 0, sprites: 0, topSprites: 0, absent: 0, visible: 0 };
    for (const [index, job] of data.jobDataList.entries()) {
      for (const side of ['unit', 'enemy'] as const) {
        const face = data.unitFaces[job[`${side}Portrait`]];
        const portrait = face ? renderFace(face) : null;
        if (portrait) stats.portraits++;
        for (const key of [`${side}Sprite`, `${side}AlternateSprite`] as const) {
          const sst = data.unitSstList[job[key]];
          const state = sst ? getUnitSpriteState(sst) : undefined;
          const before = state?.compressedSpriteList[0]?.position();
          const image = state ? renderUnitSprite(state, 0, job[`${side}Palette`]) : null;
          if (image) {
            stats.sprites++;
            if (image.pixels.some((value, i) => i % 4 === 3 && value !== 0)) stats.visible++;
          } else stats.absent++;
          expect(state?.compressedSpriteList[0]?.position(), `${index} ${key}`).toBe(before);
        }
        const top = data.topSprites[job[`${side}TopSprite`]];
        if (top && renderTopSprite(top)) stats.topSprites++;
      }
      expect(job.toBytes()).toEqual(jobs[index]);
    }
    expect(hash()).toBe(original);
    expect(stats.portraits).toBeGreaterThan(100);
    expect(stats.sprites).toBeGreaterThan(100);
    expect(stats.topSprites).toBeGreaterThan(100);
    expect(stats.visible).toBeGreaterThan(100);
    console.info('Job image runtime coverage:', JSON.stringify(stats));
  });
});
