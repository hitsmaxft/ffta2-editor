// Example guide build input. This module reads exported JSON only, never a ROM.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { verifyDataPackage } from '../dist/index.js';

export async function consumePackage(directory, approved) {
  const names = ['dataset.json', 'layout.json', 'dataset.schema.json', 'manifest.json'];
  const files = Object.fromEntries(await Promise.all(names.map(async (name) => [name, new Uint8Array(await readFile(join(directory, name)))])));
  const { dataset } = await verifyDataPackage(files, approved);
  const text = (id) => dataset.texts[id]?.plain ?? null;
  return {
    source: dataset.source,
    jobs: dataset.tables.jobs.map((row) => ({ ...row, name: text(row.nameTextId) })),
    abilities: [...dataset.tables.active, ...dataset.tables.reaction, ...dataset.tables.support],
    sets: dataset.relations.setMemberships,
    equipment: dataset.tables.equipment,
    teaching: dataset.relations.teaching,
    characters: dataset.tables.characters,
    requirements: dataset.relations.requirements,
    recruitment: dataset.relations.recruitment,
    quests: dataset.quests.map((row) => ({ ...row, name: text(row.textIds.name), description: text(row.textIds.description), detail: text(row.textIds.detail) })),
    texts: dataset.texts,
    englishReference: dataset.textReference,
    diagnostics: dataset.diagnostics,
  };
}
