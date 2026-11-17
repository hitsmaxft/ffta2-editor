import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { Bytes } from '../src/core/binary';
import { NdsRom } from '../src/core/nds';
import { loadRom, IdxPaks } from '../src/data/load';
import { loadAll, saveAll } from '../src/data/orchestration';
import { repackContainers } from '../src/data/save';
import { fixturesDir } from './helpers';

// Full-pipeline acceptance on a ROM COPY.
//
// The independent Java oracle (tools/oracle/AcceptanceOracle.java) runs the
// complete controller load/save headless and writes its game-data payload
// (oracle_acc_pc.idx/bin, oracle_acc_arm9.bin, oracle_acc_overlay11.bin).
// TS runs the same load/mod/save.
// We assert (1) payloads byte-identical and (2) applying each payload to the SAME
// ROM copy through the verified minimal-patch NDS writer yields identical FINAL
// ROM bytes. Java's shipped ndstool container rebuild is not reproduced (ndstool
// unavailable); the container writer is shared and unit-tested (nds.test.ts).
//
// Reproduce the Java oracle (after the prep test has run once):
//   tools/oracle/run.sh
// Manual final-ROM check: ACCEPTANCE_EMIT_ROMS=1 npx vitest run test/acceptance.test.ts
// then sha256sum data/acceptance/final-ts.nds data/acceptance/final-java.nds.
//
// PRE-FIX: this Chinese ROM's ability set 95 has lastAbilityIndex=722 while
// sysdata file 3 holds 722 records (0..721). Java's AbilitySet ctor throws
// BufferUnderflowException there (TS port is lenient). To let BOTH sides load
// identically, the copy is prepared with that index clamped to count-1. This is
// a documented fixture preparation applied once to the copy, before either side
// imports it.

const dataDir = join(fixturesDir, '../../../data');
const romDir = join(dataDir, 'extracted');
const compareDir = join(dataDir, 'compare');
const acceptDir = join(dataDir, 'acceptance');
const copyPath = join(acceptDir, 'rom-copy.nds');
const romFile = existsSync(romDir) ? readdirSync(romDir).find((f) => f.endsWith('.nds')) : undefined;
const romPath = romFile ? join(romDir, romFile) : null;

function bb(b: Bytes): Uint8Array { return b.rewind().toUint8Array(); }

// Deterministic basic modification, mirrored exactly in AcceptanceCheck.java.
function applyBasicMod(data: ReturnType<typeof loadRom>): void {
  data.jobDataList[1].move += 1;
  data.jobDataList[1].jump += 1;
  data.activeAbilityList[1].mpCost += 1;
  data.activeAbilityList[1].power += 1;
  data.equipmentList[1].buy += 1;
  data.equipmentList[1].attack += 1;
}

interface Payload { idx: Uint8Array; bin: Uint8Array; arm9: Uint8Array; ovl11: Uint8Array; }

function tsPayload(data: ReturnType<typeof loadRom>): Payload {
  repackContainers(data);
  const { idx, bin } = data.archive!.repack();
  return { idx: bb(idx), bin: bb(bin), arm9: bb(data.arm9!), ovl11: bb(data.overlay11!) };
}

function javaPayload(): Payload | null {
  const f = (n: string) => join(compareDir, n);
  const prefix = existsSync(f('oracle_acc_pc.bin')) ? 'oracle_acc' : 'acc_java';
  if (!existsSync(f(`${prefix}_pc.bin`))) return null;
  return {
    idx: new Uint8Array(readFileSync(f(`${prefix}_pc.idx`))),
    bin: new Uint8Array(readFileSync(f(`${prefix}_pc.bin`))),
    arm9: new Uint8Array(readFileSync(f(`${prefix}_arm9.bin`))),
    ovl11: new Uint8Array(readFileSync(f(`${prefix}_overlay11.bin`))),
  };
}

function finalRom(copy: Uint8Array, p: Payload): Uint8Array {
  const nds = new NdsRom(Bytes.wrap(copy));
  const changes = new Map<string, Uint8Array>([['master/pc.idx', p.idx], ['master/pc.bin', p.bin]]);
  const ovl = new Map<number, Uint8Array>([[11, p.ovl11]]);
  return NdsRom.applyPlan(copy, nds.buildPatchPlan(changes, ovl, p.arm9));
}

describe.skipIf(!romPath)('acceptance: ROM copy, bidirectional import/export, final bytes identical', () => {
  it('prepares the ROM copy (clamp out-of-range ability-set index) + Java inputs', () => {
    mkdirSync(acceptDir, { recursive: true });
    copyFileSync(romPath!, copyPath);
    const raw = new Uint8Array(readFileSync(copyPath));
    const data = loadRom(raw);

    const sets = data.sysdata!.getFile(2)!;
    const abilityCount = Math.floor(data.sysdata!.getFile(3)!.rewind().remaining() / 0xc);
    const numSets = data.arm9!.view.getUint8(0xcb054) + 1;
    const fixed = bb(sets);
    const fv = new DataView(fixed.buffer, fixed.byteOffset, fixed.byteLength);
    let clamped = 0;
    for (let i = 0; i < numSets; i++) {
      const off = i * 0xc;
      const last = fv.getInt16(off + 2, true);
      if (last >= abilityCount) { fv.setInt16(off + 2, abilityCount - 1, true); clamped++; }
    }
    expect(clamped, 'expected the known out-of-range set to be clamped').toBeGreaterThan(0);
    data.sysdata!.setFile(2, Bytes.wrap(fixed));
    const sys = data.sysdata!.repack();
    data.archive!.setFileByName(IdxPaks.sysdata[0], sys.idx);
    data.archive!.setFileByName(IdxPaks.sysdata[1], sys.pak);
    const pc = data.archive!.repack();
    const nds = new NdsRom(Bytes.wrap(raw));
    const plan = nds.buildPatchPlan(new Map([
      ['master/pc.idx', bb(pc.idx)], ['master/pc.bin', bb(pc.bin)],
    ]));
    writeFileSync(copyPath, NdsRom.applyPlan(raw, plan));

    // Extract payload inputs from the prepared COPY for the Java harness.
    const copyNds = new NdsRom(Bytes.wrap(new Uint8Array(readFileSync(copyPath))));
    const filesDir = join(romDir, 'files');
    mkdirSync(join(filesDir, 'master'), { recursive: true });
    writeFileSync(join(filesDir, 'master/pc.idx'), bb(copyNds.readFile('master/pc.idx')));
    writeFileSync(join(filesDir, 'master/pc.bin'), bb(copyNds.readFile('master/pc.bin')));
    writeFileSync(join(filesDir, 'arm9.bin'), bb(copyNds.readArm9()));
    writeFileSync(join(filesDir, 'overlay_0011.bin'), bb(copyNds.readOverlay(11)));
    writeFileSync(join(filesDir, 'overlay_0008.bin'), bb(copyNds.readOverlay(8)));
  });

  it('TS payload matches Java full-controller save payload byte-for-byte', () => {
    const jp = javaPayload();
    if (!jp) return; // Java harness not run yet
    const copy = new Uint8Array(readFileSync(copyPath));
    const data = loadRom(copy);
    loadAll(data);
    applyBasicMod(data);
    saveAll(data);
    const tp = tsPayload(data);

    expect(tp.idx.length, 'pc.idx length').toBe(jp.idx.length);
    expect(Buffer.compare(tp.idx, jp.idx), 'pc.idx bytes').toBe(0);
    expect(tp.bin.length, 'pc.bin length').toBe(jp.bin.length);
    expect(Buffer.compare(tp.bin, jp.bin), 'pc.bin bytes').toBe(0);
    expect(Buffer.compare(tp.arm9, jp.arm9), 'arm9 bytes').toBe(0);
    expect(Buffer.compare(tp.ovl11, jp.ovl11), 'overlay11 bytes').toBe(0);
  });

  it('final ROM bytes identical: Java payload vs TS payload on the same copy', () => {
    const jp = javaPayload();
    if (!jp) return;
    const copy = new Uint8Array(readFileSync(copyPath));
    const data = loadRom(copy);
    loadAll(data);
    applyBasicMod(data);
    saveAll(data);
    const tp = tsPayload(data);

    const fromTs = finalRom(copy, tp);
    const fromJava = finalRom(copy, jp);
    // Manual verification: ACCEPTANCE_EMIT_ROMS=1 writes both final ROMs so they
    // can be hashed (sha256sum) and boot-tested in an emulator independently.
    if (process.env.ACCEPTANCE_EMIT_ROMS) {
      writeFileSync(join(acceptDir, 'final-ts.nds'), fromTs);
      writeFileSync(join(acceptDir, 'final-java.nds'), fromJava);
    }
    expect(fromTs.length, 'final ROM length').toBe(fromJava.length);
    expect(Buffer.compare(fromTs, fromJava), 'final ROM bytes').toBe(0);
    expect(fromTs.length).toBeGreaterThanOrEqual(copy.length);

    const reloaded = loadRom(fromTs);
    loadAll(reloaded);
    expect(reloaded.jobDataList[1].move).toBe(data.jobDataList[1].move);
    expect(reloaded.equipmentList[1].attack).toBe(data.equipmentList[1].attack);
  });
});