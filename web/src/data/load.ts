// Port of MainController.loadRom data orchestration: NDS -> Archive -> IdxAndPaks
// -> raw arm9/overlays/animTable. Model loading happens per-domain on top of this.

import { Bytes } from '../core/binary';
import { Archive } from '../core/archive';
import { IdxAndPak } from '../core/idxpak';
import { NdsRom } from '../core/nds';
import * as LZSS from '../core/lzss';
import { RomData } from './romData';

export const IdxPaks = {
  sysdata: ['system/rom/sysdata_rom.idx', 'system/rom/sysdata.pak'],
  unitSsts: ['char/rom/rom_idx/UnitSst.rom_idx', 'char/rom/pak/UnitSst.pak'],
  unitCgs: ['char/rom/rom_idx/UnitCg.rom_idx', 'char/rom/pak/UnitCg.pak'],
  jdMessage: ['system/rom/JD_message_rom_0.idx', 'system/rom/JD_message_0.pak'],
  jhQuest: ['system/rom/JH_questtext_rom_0.idx', 'system/rom/JH_questtext_0.pak'],
  jhRumor: ['system/rom/JH_uwasatext_rom_0.idx', 'system/rom/JH_uwasatext_0.pak'],
  jhNotice: ['system/rom/JH_freepapermes_rom_0.idx', 'system/rom/JH_freepapermes_0.pak'],
  evMsg: ['event/rom/ev_msg0_rom.idx', 'event/rom/ev_msg0.pak'],
  entrydata: ['system/rom/entrydata_rom.idx', 'system/rom/entrydata.pak'],
  atl: ['menu/atl_rom/atl_rom.idx', 'menu/atl_rom/atl.pak'],
  face: ['menu/face_rom/face_rom.idx', 'menu/face_rom/face.pak'],
  mapData: ['map/rom/MapData.idx', 'map/rom/MapData.dat'],
  texData: ['map/rom/TexData.idx', 'map/rom/TexData.dat'],
  plttData: ['map/rom/PlttData.idx', 'map/rom/PlttData.dat'],
} as const;

export type IdxPakKey = keyof typeof IdxPaks;

function makeIdxPak(data: RomData, key: IdxPakKey): IdxAndPak {
  const [idxPath, pakPath] = IdxPaks[key];
  const idx = data.archive!.getFileByName(idxPath);
  const pak = data.archive!.getFileByName(pakPath);
  if (idx == null || pak == null) throw new Error(`Missing archive file for ${key}: ${idxPath} / ${pakPath}`);
  return new IdxAndPak(key, idx, pak);
}

export function loadRomResources(nds: NdsRom): RomData {
  const data = new RomData();
  data.nds = nds;
  data.arm9 = nds.readArm9();
  data.overlay11 = nds.readOverlay(11);
  data.overlay8 = nds.readOverlay(8);

  const pcIdx = nds.readFile('master/pc.idx');
  const pcBin = nds.readFile('master/pc.bin');
  data.archive = new Archive(pcIdx, pcBin);

  data.sysdata = makeIdxPak(data, 'sysdata');
  data.unitSsts = makeIdxPak(data, 'unitSsts');
  data.unitCgs = makeIdxPak(data, 'unitCgs');
  data.jdMessage = makeIdxPak(data, 'jdMessage');
  data.jhQuest = makeIdxPak(data, 'jhQuest');
  data.jhRumor = makeIdxPak(data, 'jhRumor');
  data.jhNotice = makeIdxPak(data, 'jhNotice');
  data.evMsg = makeIdxPak(data, 'evMsg');
  data.entrydata = makeIdxPak(data, 'entrydata');
  data.atl = makeIdxPak(data, 'atl');
  data.face = makeIdxPak(data, 'face');
  data.mapData = makeIdxPak(data, 'mapData');
  data.texData = makeIdxPak(data, 'texData');
  data.plttData = makeIdxPak(data, 'plttData');

  const animTable = data.archive.getFileByName('char/NaUnitAnimTable.bin');
  if (animTable == null) throw new Error('Missing char/NaUnitAnimTable.bin');
  animTable.position(4);
  data.naUnitAnimTable = LZSS.decode(animTable).decodedData;

  return data;
}

// Convenience: load directly from raw ROM bytes.
export function loadRom(romBytes: Uint8Array): RomData {
  return loadRomResources(new NdsRom(Bytes.wrap(romBytes)));
}