// Central save path: mirrors MainController.save's container orchestration.
// Serializes models back into the IdxAndPaks (via controllers), repacks every
// sub-archive + NaUnitAnimTable into the master Archive, then computes a minimal
// in-place NDS patch plan (replacing the Java ndstool full rebuild).

import { Bytes } from '../core/binary';
import { NdsRom, PatchPlan } from '../core/nds';
import { RomData } from './romData';
import { IdxPaks, IdxPakKey } from './load';
import { javaLzssEncode } from './model/spritesLzss';

const PAK_KEYS = Object.keys(IdxPaks) as IdxPakKey[];

// Repack all 14 IdxAndPaks and the NaUnitAnimTable back into the master archive.
export function repackContainers(data: RomData): void {
  const archive = data.archive;
  if (!archive) throw new Error('No archive loaded');

  for (const key of PAK_KEYS) {
    const pak = data[key];
    if (!pak) continue;
    const { idx, pak: pakBytes } = pak.repack();
    archive.setFileByName(IdxPaks[key][0], idx);
    archive.setFileByName(IdxPaks[key][1], pakBytes);
  }

  // NaUnitAnimTable: LZSS-encode the decoded table, prepend a 4-byte header
  // (the signed short at encoded offset 1, widened to int) and pad to 4.
  if (data.naUnitAnimTable) {
    const encoded = javaLzssEncode(data.naUnitAnimTable.rewind()).toUint8Array();
    const padding = encoded.length % 4 !== 0 ? 4 - (encoded.length % 4) : 0;
    const newTable = Bytes.alloc(encoded.length + 4 + padding);
    let headerShort = encoded[1] | (encoded[2] << 8);
    if (headerShort >= 0x8000) headerShort -= 0x10000;
    // Java MainController:838 uses ByteBuffer.allocate (default BIG_ENDIAN) for
    // this header only; mirror that byte order so saves match Java exactly.
    const hv = headerShort >>> 0;
    newTable.putU8(hv >>> 24).putU8((hv >>> 16) & 0xff).putU8((hv >>> 8) & 0xff).putU8(hv & 0xff);
    newTable.putBytes(Bytes.wrap(encoded));
    archive.setFileByName('char/NaUnitAnimTable.bin', newTable);
  }
}

// Build the minimal NDS patch plan from the current (edited) data context.
export function buildSavePlan(data: RomData): PatchPlan {
  if (!data.nds || !data.archive) throw new Error('No ROM loaded');
  repackContainers(data);
  const { idx, bin } = data.archive.repack();

  const changes = new Map<string, Uint8Array>([
    ['master/pc.idx', idx.toUint8Array()],
    ['master/pc.bin', bin.toUint8Array()],
  ]);
  const overlayChanges = new Map<number, Uint8Array>();
  if (data.overlay11) overlayChanges.set(11, data.overlay11.toUint8Array());
  const arm9Change = data.arm9 ? data.arm9.toUint8Array() : undefined;

  return data.nds.buildPatchPlan(changes, overlayChanges, arm9Change);
}

// Produce the full patched ROM bytes (for download / in-memory verification).
export function saveRom(data: RomData): Uint8Array {
  const plan = buildSavePlan(data);
  return NdsRom.applyPlan(data.nds!.data.toUint8Array(), plan);
}