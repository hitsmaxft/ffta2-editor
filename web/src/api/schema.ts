import { DATASET_SCHEMA } from './types';
import { TABLE_SPECS, FORMATION_HEADER, FORMATION_UNIT } from './layout';

type S = Record<string, unknown>;
const string: S = { type: 'string' };
const uint: S = { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER };
const boolean: S = { type: 'boolean' };
const hash: S = { type: 'string', pattern: '^[a-f0-9]{64}$' };
const array = (items: S): S => ({ type: 'array', items });
const map = (value: S): S => ({ type: 'object', additionalProperties: value });
const object = (properties: Record<string, S>): S => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
const nullable = (schema: S): S => ({ anyOf: [schema, { type: 'null' }] });
const ref = (name: string): S => ({ $ref: `#/$defs/${name}` });
const source = object({ romSha256: hash, romBytes: uint, gameCode: { const: 'A6FE' }, edition: { enum: ['standard', 'acj'] },
  version: string, wordTableSha256: nullable(hash), textLanguage: string, resources: map(object({ bytes: uint, sha256: hash })) });
const text = object({ id: string, value: string, plain: string, sha256: hash, unknownCodes: array(string), language: string, state: { enum: ['present', 'empty'] },
  tokens: array(object({ kind: { enum: ['text', 'line-break', 'page-break', 'control', 'unknown'] }, value: string })),
  source: object({ resource: string, tableId: uint, stringId: uint, offset: uint, bytes: uint, lines: uint, header: map(uint) }) });
const raw = object({ key: string, id: uint, fields: map(uint),
  enums: map(object({ value: uint, symbol: nullable(string), known: boolean })), unknownFields: array(string),
  nameTextId: nullable(string), descriptionTextId: nullable(string),
  source: object({ resource: string, tableId: uint, recordIndex: uint, stride: uint, sha256: hash }) });
const diagnostic = object({ severity: { enum: ['warning', 'error'] }, code: string, resource: string, recordKey: nullable(string), field: nullable(string), value: nullable(uint), message: string });
const quest = object({ id: uint, infoKey: nullable(string), dataKey: string, emptySlot: boolean,
  textIds: object({ name: string, description: string, detail: string }), textPresent: object({ name: boolean, description: boolean, detail: boolean }),
  category: object({ raw: uint, symbol: nullable(string), known: boolean }),
  dispatch: object({ raw: uint, enabled: nullable(boolean), recommendedJobId: uint, resolvedJob: boolean }),
  conditions: array(object({ field: string, raw: uint, status: { enum: ['field-identified', 'semantic-unknown'] }, reference: nullable(object({ domain: string, id: uint, resolved: boolean })) })),
  prerequisites: object({ status: { const: 'unresolved' }, questIds: { type: 'null' } }),
  completion: object({ status: { const: 'unresolved' }, startEventRaw: nullable(uint), endEventRaw: nullable(uint) }),
  rewards: object({ interpretation: { const: 'stored-configuration' }, gilRaw: uint, apRaw: uint, cpRaw: uint, expRaw: uint,
    items: array(object({ slot: uint, raw: uint, itemId: uint, amountRaw: uint, flagRaw: nullable(uint), state: { enum: ['empty', 'resolved', 'missing'] }, textId: string })) }) });
const relations = object({
  jobSets: array(object({ jobId: uint, setId: uint, resolved: boolean })),
  setMemberships: array(object({ setId: uint, first: uint, last: uint, complete: boolean,
    members: array(object({ entryId: uint, abilityId: nullable(uint), maxAP: nullable(uint) })) })),
  teaching: array(object({ equipmentId: uint, slot: uint, abilityId: uint, jobGroupIds: array(uint), jobIds: array(uint), resolved: boolean })),
  requirements: array(object({ id: uint, targetJobId: uint, flag: uint, order: uint, characterIds: array(uint),
    conditions: array(object({ slot: uint, setId: uint, count: uint, jobIds: array(uint) })) })),
  recruitment: array(object({ key: string, slot: uint, characterId: uint, formationJobId: uint, nameId: uint,
    effectiveJobId: nullable(uint), jobResolution: { enum: ['formation', 'character-default', 'unresolved'] }, raceId: nullable(uint), minLevel: uint, maxLevel: uint })),
  formations: array(object({ id: uint, headerKey: string, unitKeys: array(string), unreferencedUnitKeys: array(string) })),
});
export const DATASET_JSON_SCHEMA: S = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://github.com/hitsmaxft/ffta2-editor/core/schema/dataset-v1.json',
  title: DATASET_SCHEMA,
  ...object({ schema: { const: DATASET_SCHEMA }, coreVersion: string, layoutId: { const: 'ffta2-usa-sysdata-v1' }, layoutSha256: hash,
    source: ref('source'), tables: object(Object.fromEntries([...TABLE_SPECS, FORMATION_HEADER, FORMATION_UNIT].map((spec) => [spec.domain, array(ref('rawRecord'))]))),
    texts: map(ref('text')), relations, quests: array(ref('quest')),
    textReference: nullable(object({ alignment: { const: 'stable-text-id' }, source: ref('source'), texts: map(ref('text')), missingIds: array(string) })),
    diagnostics: array(ref('diagnostic')) }),
  $defs: { source, text, rawRecord: raw, diagnostic, quest },
};
