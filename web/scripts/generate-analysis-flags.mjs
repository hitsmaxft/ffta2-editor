import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const sources = {
  'jobs.properties': ['model/job/JobData.java', 'PropertyFlags'],
  'jobs.equipment': ['model/job/JobData.java', 'EquipFlags'],
  'sets.raceFlags': ['model/job/AbilitySet.java', 'RaceFlags'],
  'active.flags': ['model/ability/ActiveAbilityData.java', 'AbilityFlags'],
  'equipment.properties': ['model/item/EquipmentData.java', 'PropertyFlags'],
  'quests.regionFlags': ['model/quest/QuestData.java', 'RegionFlags'],
};
const definitions = {};
for (const [key, [path, name]] of Object.entries(sources)) {
  const bytes = readFileSync(new URL(`../../src/main/java/org/ruru/ffta2editor/${path}`, import.meta.url));
  const text = bytes.toString().replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/"(?:\\.|[^"\\])*"/g, '""');
  const start = text.indexOf(`public class ${name} {`);
  if (start < 0) throw new Error(`Missing class ${path}:${name}`);
  const open = text.indexOf('{', start); let end = open + 1, depth = 1;
  while (depth && end < text.length) { if (text[end] === '{') depth++; if (text[end] === '}') depth--; end++; }
  const bits = {};
  for (const match of text.slice(open, end).matchAll(/(\w+)\.setValue\(flags\.get\(([\d +]+)\)\)/g)) {
    const bit = match[2].split('+').reduce((sum, n) => sum + Number(n.trim()), 0);
    if (String(bit) in bits) throw new Error(`Repeated bit ${key}:${bit}`);
    bits[bit] = match[1];
  }
  if (!Object.keys(bits).length) throw new Error(`No bit assignments ${key}`);
  definitions[key] = { source: `src/main/java/org/ruru/ffta2editor/${path}`, sourceSha256: createHash('sha256').update(bytes).digest('hex'), bits };
}
writeFileSync(new URL('../src/api/flagDefinitions.ts', import.meta.url), '// Generated from the public Java reference by scripts/generate-analysis-flags.mjs.\nexport const FLAG_DEFINITIONS = ' + JSON.stringify(definitions, null, 2) + ';\n');
