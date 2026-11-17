import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { Bytes } from '../src/core/binary';
import { NdsRom } from '../src/core/nds';
import { loadRom, IdxPaks } from '../src/data/load';
import { loadMessages } from '../src/data/text';
import { repackContainers } from '../src/data/save';
import { StringTable } from '../src/data/model/stringTable';
import { fixturesDir } from './helpers';

// Real-ROM Java<->TS oracle comparison.
// TS side: extract pc.idx/pc.bin for Java, dump a canonical read fingerprint,
// then apply a deterministic modification and repack. The independent Java
// oracle (tools/oracle/*) produces the matching artifacts and the tests assert
// byte-for-byte identity. Regenerate them with:
//   tools/oracle/run.sh
// The pristine extraction dir this file writes is data/extracted-original/files.

const dataDir = join(fixturesDir, '../../../data');
const romDir = join(dataDir, 'extracted');
const compareDir = join(dataDir, 'compare');
const extractedFilesDir = join(dataDir, 'extracted-original/files');
const romFile = existsSync(romDir) ? readdirSync(romDir).find((f) => f.endsWith('.nds')) : undefined;
const romPath = romFile ? join(romDir, romFile) : null;

function sha(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}
function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}
function write(name: string, data: Uint8Array): void {
  mkdirSync(compareDir, { recursive: true });
  writeFileSync(join(compareDir, name), data);
}
function bb(bytes: Bytes): Uint8Array {
  return bytes.rewind().toUint8Array();
}

// Deterministic synthetic replacement for sysdata file 0 (multiple of 4).
function synthetic(): Uint8Array {
  const out = new Uint8Array(5000);
  for (let i = 0; i < out.length; i++) out[i] = (i * 7 + 3) & 0xff;
  return out;
}

const PAK_ORDER = ['sysdata', 'unitSsts', 'unitCgs', 'jdMessage', 'jhQuest', 'jhRumor', 'jhNotice', 'evMsg', 'entrydata', 'atl', 'face', 'mapData', 'texData', 'plttData'] as const;
const TEXT_TABLES: Array<[string, number]> = [['characterNames', 0], ['jobNames', 1], ['abilityNames', 3], ['itemNames', 11]];

describe.skipIf(!romPath)('real ROM Java<->TS comparison', () => {
  const rom = romPath ? new Uint8Array(readFileSync(romPath)) : new Uint8Array(0);

  it('generates TS artifacts (extract + dump + modify)', () => {
    mkdirSync(extractedFilesDir, { recursive: true });
    mkdirSync(join(extractedFilesDir, 'master'), { recursive: true });
    const nds = new NdsRom(Bytes.wrap(rom));
    writeFileSync(join(extractedFilesDir, 'master/pc.idx'), bb(nds.readFile('master/pc.idx')));
    writeFileSync(join(extractedFilesDir, 'master/pc.bin'), bb(nds.readFile('master/pc.bin')));
    writeFileSync(join(extractedFilesDir, 'arm9.bin'), bb(nds.readArm9()));
    writeFileSync(join(extractedFilesDir, 'overlay_0011.bin'), bb(nds.readOverlay(11)));
    writeFileSync(join(extractedFilesDir, 'overlay_0008.bin'), bb(nds.readOverlay(8)));

    const data = loadRom(rom);
    loadMessages(data);
    const archive = data.archive!;

    const lines: string[] = [];
    lines.push(`ARCHIVE ${archive.files.length}`);
    for (let i = 0; i < archive.files.length; i++) {
      const e = archive.files[i];
      if (!e) { lines.push(`A ${i} NULL`); continue; }
      if (e.isList) {
        lines.push(`A ${i} LIST ${e.files.length}`);
        for (let j = 0; j < e.files.length; j++) {
          const b = bb(e.files[j].file);
          lines.push(`L ${i} ${j} ${b.length} ${sha(b)}`);
        }
      } else {
        const b = bb(e.file);
        lines.push(`A ${i} SINGLE ${b.length} ${sha(b)}`);
      }
    }
    for (const key of PAK_ORDER) {
      const pak = data[key]!;
      lines.push(`IDXPAK ${key} ${pak.numFiles()}`);
      for (let i = 0; i < pak.numFiles(); i++) {
        const f = pak.getFile(i);
        if (!f) { lines.push(`P ${i} NULL`); continue; }
        const b = bb(f);
        lines.push(`P ${i} ${b.length} ${sha(b)}`);
      }
    }
    for (const [tableName, idx] of TEXT_TABLES) {
      const bytes = data.jdMessage!.getFile(idx);
      const table = new StringTable(bytes, tableName, idx);
      lines.push(`TEXT ${tableName} ${table.strings.length}`);
      for (const s of table.strings) lines.push(`S ${s.id} ${esc(s.string)}`);
    }
    write('ts_dump.txt', new TextEncoder().encode(lines.join('\n') + '\n'));

    // Modify sysdata file 0, repack the IdxAndPak, then repack the whole archive.
    data.sysdata!.setFile(0, Bytes.wrap(synthetic()));
    const sys = data.sysdata!.repack();
    write('ts_sysdata.idx', bb(sys.idx));
    write('ts_sysdata.pak', bb(sys.pak));
    archive.setFileByName(IdxPaks.sysdata[0], sys.idx);
    archive.setFileByName(IdxPaks.sysdata[1], sys.pak);
    const pc = archive.repack();
    write('ts_pc.idx', bb(pc.idx));
    write('ts_pc.bin', bb(pc.bin));

    expect(archive.files.length).toBeGreaterThan(0);
  });

  it('TS read fingerprint matches Java', () => {
    const javaDump = join(compareDir, 'java_dump.txt');
    if (!existsSync(javaDump)) return; // Java harness not run yet
    const ts = readFileSync(join(compareDir, 'ts_dump.txt'), 'utf-8');
    const java = readFileSync(javaDump, 'utf-8');
    expect(ts).toBe(java);
  });

  it('TS modified output bytes match Java', () => {
    const pairs: Array<[string, string]> = [
      ['ts_sysdata.idx', 'java_sysdata.idx'],
      ['ts_sysdata.pak', 'java_sysdata.pak'],
      ['ts_pc.idx', 'java_pc.idx'],
      ['ts_pc.bin', 'java_pc.bin'],
    ];
    if (!existsSync(join(compareDir, 'java_pc.bin'))) return; // Java harness not run yet
    for (const [tsName, javaName] of pairs) {
      const a = readFileSync(join(compareDir, tsName));
      const b = readFileSync(join(compareDir, javaName));
      expect(a.length, `${tsName} length`).toBe(b.length);
      expect(Buffer.compare(a, b), `${tsName} bytes`).toBe(0);
    }
  });

  // Non-Latin (Chinese) ROMs decode to <unknown:XX> placeholders; re-encoding
  // emits those placeholders literally (lossy) in BOTH Java and TS. The property
  // that matters is fidelity: TS re-encode must equal Java re-encode byte-for-byte.
  it('text re-encode matches Java on non-Latin ROM (lossy but identical)', () => {
    const data = loadRom(rom);
    loadMessages(data);
    for (const [tableName, idx] of TEXT_TABLES) {
      const javaFile = join(compareDir, `java_text_${tableName}.bin`);
      if (!existsSync(javaFile)) return; // Java harness not run yet
      const table = new StringTable(data.jdMessage!.getFile(idx), tableName, idx);
      const ts = table.toBytes();
      const java = new Uint8Array(readFileSync(javaFile));
      expect(ts.length, `${tableName} length`).toBe(java.length);
      expect(Buffer.compare(ts, java), `${tableName} bytes`).toBe(0);
    }
  });

  it('full container save pipeline matches Java', () => {
    const data = loadRom(rom);
    repackContainers(data);
    const { idx, bin } = data.archive!.repack();
    write('ts_full_pc.idx', bb(idx));
    write('ts_full_pc.bin', bb(bin));

    const oracleBin = join(compareDir, 'oracle_full_pc.bin');
    const javaBin = existsSync(oracleBin) ? oracleBin : join(compareDir, 'java_full_pc.bin');
    if (!existsSync(javaBin)) return; // Java oracle not run yet
    const prefix = existsSync(oracleBin) ? 'oracle_full_pc' : 'java_full_pc';
    for (const [tsName, javaName] of [[ 'ts_full_pc.idx', `${prefix}.idx`], ['ts_full_pc.bin', `${prefix}.bin`]] as const) {
      const a = readFileSync(join(compareDir, tsName));
      const b = readFileSync(join(compareDir, javaName));
      expect(a.length, `${tsName} length`).toBe(b.length);
      expect(Buffer.compare(a, b), `${tsName} bytes`).toBe(0);
    }
  });
});