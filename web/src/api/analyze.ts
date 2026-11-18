import { Bytes } from '../core/binary';
import { NdsRom } from '../core/nds';
import { Archive } from '../core/archive';
import { parseWordTable, type WordTable } from '../core/wordTable';
import { decode } from '../core/charset';
import { checkedRange, readIndexedPak, validateNds } from './containers';
import { RomAnalysisError, fail } from './errors';
import { TABLE_SPECS, FORMATION_HEADER, FORMATION_UNIT, LAYOUT_ID, getLayout } from './layout';
import { CORE_VERSION, DATASET_SCHEMA, type Dataset, type AnalyzeOptions, type RawRecord, type Diagnostic } from './types';
import { canonicalJson, sha256, utf8 } from './encoding';
import { decodeRecord } from './records';
import { buildRelations } from './relations';
import { plainText, displayTokens } from './text';
import { questViews } from './quests';

const SYS = ['system/rom/sysdata_rom.idx', 'system/rom/sysdata.pak'];
const ENTRY = ['system/rom/entrydata_rom.idx', 'system/rom/entrydata.pak'];
const MSG = ['system/rom/JD_message_rom_0.idx', 'system/rom/JD_message_0.pak'];
const QUEST_TEXT = ['system/rom/JH_questtext_rom_0.idx', 'system/rom/JH_questtext_0.pak'];
function validateDisplayTokens(bytes: Uint8Array, resource: string): void {
  for (let offset = 0; offset < bytes.length;) {
    const width = bytes[offset] >= 0xa9 ? 2 : 1;
    if (offset + width > bytes.length) fail('TRUNCATED_TEXT_TOKEN', resource, 'Display/control token is truncated', { offset, lead: bytes[offset] });
    offset += width;
  }
}
async function readTexts(files: Array<Uint8Array | null>, table: WordTable | undefined, diagnostics: Diagnostic[], language: string): Promise<Dataset['texts']> {
  const result: Dataset['texts'] = {};
  for (const id of [0, 1, 2, 3, 5, 6, 11, 30, 31, 35, 38, 39, 47, 52]) {
    const bytes = files[id];
    if (!bytes) fail('MISSING_TEXT_TABLE', MSG[1], 'Required name/description table is absent', { tableId: id });
    if (!bytes.length) continue;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    checkedRange(0, 2, bytes.length, `message:0:${id}`);
    const count = view.getUint16(0, true);
    checkedRange(2, count * 10, bytes.length, `message:0:${id}`);
    const records = await Promise.all(Array.from({ length: count }, async (_, index) => {
      const at = 2 + index * 10, length = view.getUint32(at, true), offset = view.getUint32(at + 4, true);
      const key = `message:0:${id}:${index}`;
      checkedRange(offset, length, bytes.length, key);
      if (length && offset < 2 + count * 10) fail('TEXT_OVERLAP', key, 'String overlaps its offset table');
      const source = bytes.subarray(offset, offset + length);
      validateDisplayTokens(source, key);
      const value = decode(Bytes.wrap(source), table).text;
      const unknownCodes = [...new Set(value.match(/<unknown:[0-9A-Fa-f]+>/g) ?? [])];
      if (unknownCodes.length) diagnostics.push({ severity: 'warning', code: 'UNMAPPED_TEXT', resource: MSG[1], recordKey: key, field: null, value: null, message: `${unknownCodes.length} unmapped text codes preserved as tokens` });
      return { id: key, value, plain: plainText(value), sha256: await sha256(source), unknownCodes, language,
        tokens: displayTokens(value), state: plainText(value) ? 'present' as const : 'empty' as const,
        source: { resource: MSG[1], tableId: id, stringId: index, offset, bytes: length, lines: view.getUint16(at + 8, true), header: {} } };
    }));
    for (const record of records) result[record.id] = record;
  }
  return result;
}

/** Analyze exactly one explicitly identified ROM; never uses editor/UI fallbacks. */
export async function analyzeRom(input: Uint8Array, options: AnalyzeOptions): Promise<Dataset> {
  if (!options || !/^[a-f0-9]{64}$/.test(options.expectedSha256) || !['standard', 'acj'].includes(options.edition) || !options.version?.trim()) {
    fail('INVALID_OPTIONS', 'API', 'An exact lowercase ROM SHA-256, explicit edition and version label are required');
  }
  if (!(input instanceof Uint8Array)) fail('INVALID_INPUT', 'ROM', 'Input must be a Uint8Array');
  input = input.slice(); // Bind parsing to the bytes hashed, even if the caller mutates its buffer.
  const romSha256 = await sha256(input);
  if (romSha256 !== options.expectedSha256) fail('ROM_SHA_MISMATCH', 'ROM', 'Input ROM does not match its expected SHA-256', { expected: options.expectedSha256, actual: romSha256 });
  let phase = 'NDS';
  try {
    validateNds(input);
    phase = 'NitroFS';
    const nds = new NdsRom(Bytes.wrap(input));
    const pcIdx = nds.readFile('master/pc.idx'), pcBin = nds.readFile('master/pc.bin');
    if (pcIdx.lim < 8 || pcIdx.view.getUint32(0, true) > 4096 || 8 + pcIdx.view.getUint32(0, true) * 9 > pcIdx.lim) fail('INVALID_MASTER_INDEX', 'master/pc.idx', 'Master archive table is truncated or too large');
    phase = 'master/pc.idx';
    const archive = new Archive(pcIdx, pcBin);
    const resources: Dataset['source']['resources'] = {};
    const read = async (name: string): Promise<Uint8Array> => {
      phase = name;
      const file = archive.getFileByName(name);
      if (!file) fail('MISSING_RESOURCE', name, 'Required archive resource is absent');
      const bytes = file.toUint8Array();
      resources[name] = { bytes: bytes.length, sha256: await sha256(bytes) };
      return bytes;
    };
    const readPak = async (paths: string[]) => readIndexedPak(await read(paths[0]), await read(paths[1]), paths[1]);
    const sysdata = await readPak(SYS), entrydata = await readPak(ENTRY), messages = await readPak(MSG);
    const tables = Object.fromEntries([...TABLE_SPECS, FORMATION_HEADER, FORMATION_UNIT].map((spec) => [spec.domain, []])) as unknown as Dataset['tables'];
    const diagnostics: Diagnostic[] = [];
    for (const declaredSpec of TABLE_SPECS) {
      const base = declaredSpec.domain === 'consumables' ? tables.equipment.length : declaredSpec.domain === 'loot' ? tables.equipment.length + tables.consumables.length : declaredSpec.idBase;
      const spec = { ...declaredSpec, idBase: base };
      phase = `${SYS[1]}/${spec.tableId}`;
      const bytes = sysdata[spec.tableId];
      if (!bytes) fail('MISSING_TABLE', SYS[1], 'Required sysdata table is absent', { tableId: spec.tableId });
      if (bytes.length % spec.stride || bytes.length / spec.stride > 100000) fail('TABLE_SHAPE', SYS[1], 'Table length does not match its record stride', { tableId: spec.tableId, bytes: bytes.length, stride: spec.stride });
      tables[spec.domain] = await Promise.all(Array.from({ length: bytes.length / spec.stride }, (_, i) => decodeRecord(bytes.subarray(i * spec.stride, (i + 1) * spec.stride), spec, i, SYS[1], diagnostics)));
    }
    if (tables.active.length > 0x336 || tables.reaction.length > 0x1d) fail('ABILITY_NAMESPACE_OVERLAP', SYS[1], 'Table exceeds this layout\'s stable ability ID namespace');
    if (entrydata.length % 2) fail('FORMATION_PAIRS', ENTRY[1], 'Formation resources must be header/unit pairs');
    for (let i = 0; i < entrydata.length / 2; i++) {
      const header = entrydata[i * 2], units = entrydata[i * 2 + 1];
      if (!header || !units) fail('MISSING_FORMATION', ENTRY[1], 'Formation pair is incomplete', { id: i });
      if (units.length % FORMATION_UNIT.stride) fail('TABLE_SHAPE', ENTRY[1], 'Formation unit table has a partial record', { id: i });
      const parsed = await decodeRecord(header, { ...FORMATION_HEADER, tableId: i * 2 }, i, ENTRY[1], diagnostics);
      if (parsed.fields.numUnits > units.length / FORMATION_UNIT.stride) fail('FORMATION_COUNT_MISMATCH', ENTRY[1], 'Header declares more units than are stored', { id: i, declared: parsed.fields.numUnits, actual: units.length / 60 });
      if (parsed.fields.numUnits < units.length / FORMATION_UNIT.stride) diagnostics.push({ severity: 'warning', code: 'UNREFERENCED_FORMATION_RECORDS', resource: ENTRY[1], recordKey: parsed.key, field: 'numUnits', value: parsed.fields.numUnits, message: 'Stored trailing records are retained separately from header-referenced units' });
      tables.formationHeaders.push(parsed);
      tables.formationUnits.push(...await Promise.all(Array.from({ length: units.length / 60 }, (_, slot) => decodeRecord(units.subarray(slot * 60, (slot + 1) * 60), { ...FORMATION_UNIT, tableId: i * 2 + 1 }, slot, ENTRY[1], diagnostics, `formationUnits:${i}:${slot}`))));
    }
    for (const character of tables.characters) character.nameTextId = `message:0:0:${character.fields.name}`;
    let wordTable: WordTable | undefined;
    if (options.wordTable) {
      phase = 'word-table';
      wordTable = parseWordTable(new TextDecoder('utf-8', { fatal: true }).decode(options.wordTable.bytes), options.wordTable.format);
      if ([...wordTable.leadBytes].some((code) => code < 0xa9 || code > 0xbf) || [...wordTable.singleDecodeMap.keys()].some((code) => code >= 0xc0)) fail('INVALID_WORD_TABLE', 'word-table', 'Word tables cannot override structural control codes');
    }
    phase = MSG[1];
    const language = options.textLanguage ?? 'und';
    const texts = await readTexts(messages, wordTable, diagnostics, language);
    const questTexts = await readPak(QUEST_TEXT);
    for (let id = 0; id < questTexts.length; id++) {
      const bytes = questTexts[id];
      if (!bytes || !bytes.length) continue;
      const key = `questtext:0:${id}:0`;
      checkedRange(0, 14, bytes.length, key);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), length = view.getUint32(4, true);
      checkedRange(14, length, bytes.length, key);
      const source = bytes.subarray(14, 14 + length);
      validateDisplayTokens(source, key);
      const value = decode(Bytes.wrap(source), wordTable).text;
      const unknownCodes = [...new Set(value.match(/<unknown:[0-9A-Fa-f]+>/g) ?? [])];
      if (unknownCodes.length) diagnostics.push({ severity: 'warning', code: 'UNMAPPED_TEXT', resource: QUEST_TEXT[1], recordKey: key, field: null, value: null, message: `${unknownCodes.length} unmapped text codes preserved as tokens` });
      texts[key] = { id: key, value, plain: plainText(value), sha256: await sha256(source), unknownCodes, language,
        tokens: displayTokens(value), state: plainText(value) ? 'present' : 'empty', source: { resource: QUEST_TEXT[1], tableId: id, stringId: 0,
          offset: 14, bytes: length, lines: view.getUint16(12, true), header: { _0x00: view.getUint16(0, true), _0x02: view.getUint16(2, true), _0x08: view.getUint32(8, true) } } };
    }
    if (tables.questInfo.length !== tables.quests.length) fail('QUEST_TABLE_COUNT_MISMATCH', SYS[1], 'Quest info and data table counts differ', { info: tables.questInfo.length, data: tables.quests.length });
    const quests = questViews({ tables, texts });
    for (const quest of quests) {
      if (quest.dispatch.enabled === null) diagnostics.push({ severity: 'warning', code: 'UNKNOWN_DISPATCH', resource: SYS[1], recordKey: quest.dataKey, field: 'dispatch', value: quest.dispatch.raw, message: 'Dispatch flag is not zero or one; no boolean fallback was applied' });
      for (const item of quest.rewards.items) if (item.state === 'missing') diagnostics.push({ severity: 'warning', code: 'UNRESOLVED_REWARD_ITEM', resource: SYS[1], recordKey: quest.dataKey, field: `itemReward${item.slot}`, value: item.raw, message: 'Packed item reward is preserved but its item reference is absent' });
      for (const condition of quest.conditions) if (condition.reference && !condition.reference.resolved) diagnostics.push({ severity: 'warning', code: 'UNRESOLVED_QUEST_CONDITION', resource: SYS[1], recordKey: quest.dataKey, field: condition.field, value: condition.raw, message: 'Condition reference is absent; dependency semantics were not inferred' });
    }
    const relations = buildRelations(tables, diagnostics);
    // Diagnostics ordering must not depend on asynchronous hash scheduling.
    diagnostics.sort((a, b) => canonicalJson(a) < canonicalJson(b) ? -1 : canonicalJson(a) > canonicalJson(b) ? 1 : 0);
    if (options.strictDiagnostics && diagnostics.length) fail('DIAGNOSTICS_REJECTED', 'analysis', 'Strict analysis rejects unresolved values/references', { count: diagnostics.length, diagnostics });
    return { schema: DATASET_SCHEMA, coreVersion: CORE_VERSION, layoutId: LAYOUT_ID, layoutSha256: await sha256(utf8(canonicalJson(getLayout()))),
      source: { romSha256, romBytes: input.length, gameCode: 'A6FE', edition: options.edition, version: options.version,
        wordTableSha256: options.wordTable ? await sha256(options.wordTable.bytes) : null, textLanguage: language, resources }, tables, texts, relations, quests, textReference: null, diagnostics };
  } catch (error) {
    if (error instanceof RomAnalysisError) throw error;
    fail('READ_ERROR', phase, error instanceof Error ? error.message : String(error));
  }
}
export function recordByKey(dataset: Dataset, key: string): RawRecord | undefined {
  return Object.values(dataset.tables).flat().find((record) => record.key === key);
}
