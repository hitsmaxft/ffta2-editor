// Synthetic ROM container, generated from public format definitions. No game data.
import { Bytes } from '../src/core/binary';
import { Archive } from '../src/core/archive';
import { TABLE_SPECS, FORMATION_HEADER, FORMATION_UNIT } from '../src/api/layout';

function indexed(files: Array<Uint8Array | null>): { idx: Uint8Array; pak: Uint8Array } {
  const length = files.reduce((sum, file) => sum + (file?.length ?? 0), 0);
  const idx = new Uint8Array(4 + (files.length + 1) * 6 + ((files.length + 1) % 2 ? 2 : 0));
  const pak = new Uint8Array(length); const v = new DataView(idx.buffer); let at = 0;
  files.forEach((file, i) => { v.setUint32(4 + i * 6, at * 2 + (file ? 0 : 7), true); if (file) { pak.set(file, at); at += file.length; } });
  v.setUint32(4 + files.length * 6, at * 2 + 7, true);
  return { idx, pak };
}
function message(): Uint8Array {
  const bytes = new Uint8Array(36); const v = new DataView(bytes.buffer);
  v.setUint16(0, 2, true);
  v.setUint32(2, 2, true); v.setUint32(6, 24, true);
  bytes.set([0xc1, 0], 24);
  v.setUint32(12, 8, true); v.setUint32(16, 28, true); v.setUint16(20, 1, true);
  bytes.set([5, 0x20, 0x28, 0x2a, 0xc0, 0, 0xc1, 0], 28); // Demo + newline/end
  return bytes;
}
export function syntheticRom(shift = 0, mutate?: (resources: Map<string, Uint8Array>) => void): Uint8Array {
  const blocks: Array<Uint8Array | null> = Array.from({ length: 37 }, () => null);
  for (const spec of TABLE_SPECS) blocks[spec.tableId] = new Uint8Array(spec.stride * (['jobs', 'characters', 'sets', 'equipment', 'jobGroups', 'active', 'questInfo', 'quests'].includes(spec.domain) ? 2 : 1));
  const set = (domain: string, id: number, field: string, value: number) => {
    const spec = TABLE_SPECS.find((s) => s.domain === domain)!;
    const f = spec.fields.find((f) => f.key === field)!;
    const data = blocks[spec.tableId]!;
    for (let i = 0; i < f.bytes; i++) data[id * spec.stride + f.offset + i] = Math.floor(value / 2 ** (8 * i)) & 255;
  };
  set('characters', 1, 'defaultJob', 1); set('characters', 1, 'name', 1);
  set('jobs', 1, 'abilitySet', 1); set('jobs', 1, 'race', 250);
  set('sets', 1, 'last', 1); set('entries', 0, 'ability', 1); set('entries', 0, 'maxAP', 9);
  set('equipment', 1, 'ability1', 1); set('equipment', 1, 'jobGroup1', 1); set('jobGroups', 1, 'job1', 1);
  set('requirements', 0, 'jobId', 1); set('requirements', 0, 'job1', 1); set('requirements', 0, 'abilityNum1', 2);
  set('quests', 1, 'type', 250); set('quests', 1, 'monthRequirement', 255); set('quests', 1, 'dispatch', 7);
  set('quests', 1, 'abilityRequirement', 65535); set('quests', 1, 'flagRequirement', 1);
  set('quests', 1, 'itemReward1', 65535); set('quests', 1, 'itemReward2', 1025);
  const header = new Uint8Array(FORMATION_HEADER.stride); header[1] = 1;
  const unit = new Uint8Array(FORMATION_UNIT.stride); unit[0] = 1; unit[2] = 9; unit[3] = 50;
  const sys = indexed(blocks), entry = indexed([header, unit]);
  const messages = indexed(Array.from({ length: 53 }, () => message()));
  const single = new Uint8Array(16); // present, empty single-string slot
  const detail = indexed([single, single]);
  const resources = new Map<string, Uint8Array>([
    ['system/rom/sysdata_rom.idx', sys.idx], ['system/rom/sysdata.pak', sys.pak],
    ['system/rom/entrydata_rom.idx', entry.idx], ['system/rom/entrydata.pak', entry.pak],
    ['system/rom/JD_message_rom_0.idx', messages.idx], ['system/rom/JD_message_0.pak', messages.pak],
    ['system/rom/JH_questtext_rom_0.idx', detail.idx], ['system/rom/JH_questtext_0.pak', detail.pak],
  ]);
  mutate?.(resources);
  const emptyIdx = Bytes.alloc(8 + 1024 * 9 + 1); emptyIdx.view.setUint32(0, 1024, true);
  const archive = new Archive(emptyIdx, Bytes.alloc(0));
  for (const [name, bytes] of resources) {
    const id = Archive.filenameCrc(name);
    if (archive.files[id]) throw new Error('Synthetic resource hash collision');
    archive.files[id] = { isList: false, file: Bytes.wrap(bytes) };
  }
  const master = archive.repack(); const pcIdx = master.idx.toUint8Array(), pcBin = master.bin.toUint8Array();
  const fntAt = 0x200 + shift, fatAt = 0x280 + shift, idxAt = 0x400 + shift, binAt = Math.ceil((idxAt + pcIdx.length) / 16) * 16;
  const rom = new Uint8Array(binAt + pcBin.length); const v = new DataView(rom.buffer);
  rom.set(new TextEncoder().encode('A6FE'), 12);
  v.setUint32(0x40, fntAt, true); v.setUint32(0x44, 42, true); v.setUint32(0x48, fatAt, true); v.setUint32(0x4c, 16, true);
  v.setUint32(fntAt, 16, true); v.setUint16(fntAt + 6, 2, true); v.setUint32(fntAt + 8, 26, true);
  rom.set([0x86, ...new TextEncoder().encode('master'), 1, 0xf0, 0], fntAt + 16);
  rom.set([6, ...new TextEncoder().encode('pc.idx'), 6, ...new TextEncoder().encode('pc.bin'), 0], fntAt + 26);
  v.setUint32(fatAt, idxAt, true); v.setUint32(fatAt + 4, idxAt + pcIdx.length, true);
  v.setUint32(fatAt + 8, binAt, true); v.setUint32(fatAt + 12, binAt + pcBin.length, true);
  rom.set(pcIdx, idxAt); rom.set(pcBin, binAt);
  return rom;
}
