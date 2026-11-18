import { describe, expect, it } from 'vitest';
import { analyzeRom, attachTextReference, createDataPackage, verifyDataPackage, sha256, canonicalJson, decodeRecord, TABLE_SPECS, DATASET_JSON_SCHEMA, readIndexedPak, RomAnalysisError } from '../src/api/index';
import { reproducibleZip, readZip } from '../scripts/data-zip';
import { syntheticRom } from './analysis-fixture';

async function analyze(bytes = syntheticRom(), edition: 'standard' | 'acj' = 'standard') {
  return analyzeRom(bytes, { expectedSha256: await sha256(bytes), edition, version: 'synthetic', textLanguage: 'en' });
}

describe('Editor read-only analysis API', () => {
  it('derives resources from NitroFS and follows them after physical relocation', async () => {
    const a = await analyze(), b = await analyze(syntheticRom(0x1000));
    expect(a.tables).toEqual(b.tables);
    expect(a.relations).toEqual(b.relations);
    expect(a.source.romSha256).not.toBe(b.source.romSha256);
    expect(a.relations.recruitment[0]).toMatchObject({ slot: 0, characterId: 1, formationJobId: 0, effectiveJobId: 1, minLevel: 9, maxLevel: 50, jobResolution: 'character-default' });
  });
  it('preserves unknown enums, sparse inclusive set ranges and quest semantics', async () => {
    const data = await analyze();
    expect(data.tables.jobs[1].fields.race).toBe(250);
    expect(data.tables.jobs[1].enums.race).toEqual({ value: 250, symbol: null, known: false });
    expect(data.relations.setMemberships[1]).toMatchObject({ complete: false, members: [{ entryId: 0, abilityId: 1, maxAP: 9 }, { entryId: 1, abilityId: null, maxAP: null }] });
    expect(data.relations.teaching[0]).toMatchObject({ equipmentId: 1, abilityId: 1, jobIds: [1] });
    expect(data.quests[1].category).toEqual({ raw: 250, symbol: null, known: false });
    expect(data.quests[1].dispatch).toMatchObject({ raw: 7, enabled: null });
    expect(data.tables.quests[1].fields.monthRequirement).toBe(255);
    expect(data.quests[1].prerequisites).toEqual({ status: 'unresolved', questIds: null });
    expect(data.quests[1].rewards.items[0]).toMatchObject({ raw: 65535, itemId: 1023, amountRaw: 63, state: 'missing' });
    expect(data.quests[1].rewards.items[1]).toMatchObject({ raw: 1025, itemId: 1, amountRaw: 1, state: 'resolved' });
    expect(data.texts['questtext:0:0:0'].state).toBe('empty');
    expect(data.texts['message:0:6:1'].plain).toBe('Demo');
    expect(data.texts['message:0:6:1'].tokens.some((token) => token.kind === 'line-break')).toBe(true);
  });
  it('covers every byte without signed truncation or enum fallback', async () => {
    for (const spec of TABLE_SPECS) {
      const bytes = Uint8Array.from({ length: spec.stride }, (_, i) => (i * 71 + 241) & 255);
      const record = await decodeRecord(bytes, spec, 0, 'synthetic');
      const reconstructed = new Uint8Array(bytes.length);
      for (const field of spec.fields) for (let i = 0; i < field.bytes; i++) reconstructed[field.offset + i] = Math.floor(record.fields[field.key] / 2 ** (8 * i)) & 255;
      expect(reconstructed, spec.domain).toEqual(bytes);
      expect(record.source.sha256).toBe(await sha256(bytes));
    }
  });
  it('rejects source mismatches, unsupported games, truncated input and strict unresolved values', async () => {
    const bytes = syntheticRom(); const options = { expectedSha256: '0'.repeat(64), edition: 'standard' as const, version: 'synthetic' };
    await expect(analyzeRom(bytes, options)).rejects.toMatchObject({ code: 'ROM_SHA_MISMATCH' });
    const tiny = new Uint8Array(12);
    await expect(analyzeRom(tiny, { ...options, expectedSha256: await sha256(tiny) })).rejects.toMatchObject({ code: 'TRUNCATED_NDS' });
    bytes[12] = 0;
    await expect(analyzeRom(bytes, { ...options, expectedSha256: await sha256(bytes) })).rejects.toMatchObject({ code: 'UNSUPPORTED_GAME' });
    const valid = syntheticRom();
    await expect(analyzeRom(valid, { ...options, expectedSha256: await sha256(valid), strictDiagnostics: true })).rejects.toMatchObject({ code: 'DIAGNOSTICS_REJECTED' });
  });
  it('owns the bytes used for SHA binding across asynchronous hashing', async () => {
    const bytes = syntheticRom(), digest = await sha256(bytes);
    const pending = analyzeRom(bytes, { expectedSha256: digest, edition: 'standard', version: 'synthetic' });
    bytes.fill(0);
    expect((await pending).source.romSha256).toBe(digest);
  });
  it('validates indexed spans and accepts zero alignment padding', () => {
    const idx = new Uint8Array(24), view = new DataView(idx.buffer);
    view.setUint32(4, 0, true); view.setUint32(10, 8, true); view.setUint32(16, 23, true);
    expect(readIndexedPak(idx, new Uint8Array(8))).toHaveLength(2);
    idx[23] = 1;
    expect(() => readIndexedPak(idx, new Uint8Array(8))).toThrow(RomAnalysisError);
    idx[23] = 0; view.setUint32(10, 1024, true);
    expect(() => readIndexedPak(idx, new Uint8Array(8))).toThrow(RomAnalysisError);
  });
  it('exports reproducibly and rejects checksum, schema and source tampering', async () => {
    const data = await analyze();
    const a = await createDataPackage(data), b = await createDataPackage(await analyze());
    expect(a).toEqual(b);
    expect(reproducibleZip(a)).toEqual(reproducibleZip(b));
    expect(await verifyDataPackage(readZip(reproducibleZip(a), 'package'), { romSha256: data.source.romSha256 })).toMatchObject({ dataset: data });
    await expect(verifyDataPackage(a, { romSha256: '0'.repeat(64) })).rejects.toMatchObject({ code: 'PACKAGE_SOURCE_MISMATCH' });
    const tampered = { ...a, 'dataset.json': a['dataset.json'].slice() }; tampered['dataset.json'][10] ^= 1;
    await expect(verifyDataPackage(tampered, { romSha256: data.source.romSha256 })).rejects.toMatchObject({ code: 'PACKAGE_CHECKSUM' });
    const nullManifest = { ...a, 'manifest.json': new TextEncoder().encode('null') };
    await expect(verifyDataPackage(nullManifest, { romSha256: data.source.romSha256 })).rejects.toMatchObject({ code: 'INVALID_MANIFEST' });
    const manifest = JSON.parse(new TextDecoder().decode(a['manifest.json'])); manifest.files['dataset.json'] = null;
    await expect(verifyDataPackage({ ...a, 'manifest.json': new TextEncoder().encode(JSON.stringify(manifest)) }, { romSha256: data.source.romSha256 })).rejects.toMatchObject({ code: 'INVALID_MANIFEST' });
    const invalid = structuredClone(data); (invalid.quests[0].category as unknown as { known: string }).known = 'guessed';
    await expect(createDataPackage(invalid)).rejects.toMatchObject({ code: 'DATASET_SCHEMA' });
    expect(canonicalJson(DATASET_JSON_SCHEMA)).toContain('ffta2-editor.dataset/1');
  });
  it('binds bilingual text to the matching edition and raw gameplay IDs', async () => {
    const data = await analyze();
    const aligned = attachTextReference(data, data);
    expect(aligned.source).toEqual(data.source);
    expect(aligned.textReference?.alignment).toBe('stable-text-id');
    expect(() => attachTextReference(data, { ...data, source: { ...data.source, edition: 'acj' } })).toThrow(RomAnalysisError);
    const larger = structuredClone(data); larger.tables.jobs.push(structuredClone(larger.tables.jobs[0]));
    expect(() => attachTextReference(data, larger)).toThrow(RomAnalysisError);
    const changed = structuredClone(data); changed.tables.jobs[0].source.sha256 = 'f'.repeat(64);
    expect(() => attachTextReference(data, changed)).toThrow(RomAnalysisError);
  });
  it('reports missing resources and truncated single-string payloads with structured errors', async () => {
    const missing = syntheticRom(0, (resources) => { resources.delete('system/rom/JH_questtext_0.pak'); });
    await expect(analyze(missing)).rejects.toMatchObject({ code: 'MISSING_RESOURCE', resource: 'system/rom/JH_questtext_0.pak' });
    const truncated = syntheticRom(0, (resources) => {
      const bytes = resources.get('system/rom/JH_questtext_0.pak')!;
      new DataView(bytes.buffer).setUint32(4, 0xffffffff, true);
    });
    await expect(analyze(truncated)).rejects.toMatchObject({ code: 'OUT_OF_BOUNDS', resource: 'questtext:0:0:0' });
  });
  it('preserves unknown external glyphs and rejects incomplete display cells', async () => {
    const withGlyph = (length: number) => syntheticRom(0, (resources) => {
      const bytes = resources.get('system/rom/JH_questtext_0.pak')!;
      new DataView(bytes.buffer).setUint32(4, length, true);
      bytes[14] = 0xa9; bytes[15] = 2;
    });
    const bytes = withGlyph(2);
    const wordTable = { format: 'synthetic.json', bytes: new TextEncoder().encode('{"entries":{"A901":"X"}}') };
    const data = await analyzeRom(bytes, { expectedSha256: await sha256(bytes), edition: 'standard', version: 'synthetic', wordTable });
    expect(data.texts['questtext:0:0:0'].value).toBe('<unknown:A902>');
    expect(data.texts['questtext:0:0:0'].tokens).toEqual([{ kind: 'unknown', value: '<unknown:A902>' }]);
    const broken = withGlyph(1);
    await expect(analyzeRom(broken, { expectedSha256: await sha256(broken), edition: 'standard', version: 'synthetic', wordTable })).rejects.toMatchObject({ code: 'TRUNCATED_TEXT_TOKEN' });
  });
  it('rejects a cyclic NitroFS tree before recursive directory parsing', async () => {
    const bytes = syntheticRom();
    new DataView(bytes.buffer).setUint16(0x200 + 23, 0xf000, true);
    await expect(analyze(bytes)).rejects.toMatchObject({ code: 'INVALID_FNT_GRAPH' });
  });

});
