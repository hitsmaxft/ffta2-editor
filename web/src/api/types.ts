/** Public read-only analysis contract. IDs are scoped to their original tables. */
export const CORE_VERSION = '0.1.0';
export const DATASET_SCHEMA = 'ffta2-editor.dataset/1';
export const PACKAGE_SCHEMA = 'ffta2-editor.package/1';
export type Edition = 'standard' | 'acj';
export type Domain = 'characters' | 'jobs' | 'sets' | 'entries' | 'active' | 'animations' | 'reaction' | 'support' | 'requirements' | 'equipment' | 'jobGroups' | 'formationHeaders' | 'formationUnits' | 'consumables' | 'loot' | 'questInfo' | 'quests';
export interface FieldSpec { key: string; offset: number; bytes: number; enum?: string; unknown?: boolean }
export interface TableSpec { domain: Domain; tableId: number; stride: number; idBase: number; nameTable?: number; descriptionTable?: number; fields: FieldSpec[] }
export interface Diagnostic {
  severity: 'warning' | 'error'; code: string; resource: string; recordKey: string | null;
  field: string | null; value: number | null; message: string;
}
export interface ResourceIdentity { bytes: number; sha256: string }
export interface RawRecord {
  key: string; id: number; fields: Record<string, number>;
  enums: Record<string, { value: number; symbol: string | null; known: boolean }>;
  unknownFields: string[]; nameTextId: string | null; descriptionTextId: string | null;
  source: { resource: string; tableId: number; recordIndex: number; stride: number; sha256: string };
}
export interface TextRecord {
  id: string; value: string; plain: string; sha256: string; unknownCodes: string[];
  language: string; state: 'present' | 'empty';
  source: { resource: string; tableId: number; stringId: number; offset: number; bytes: number; lines: number; header: Record<string, number> };
  tokens: { kind: 'text' | 'line-break' | 'page-break' | 'control' | 'unknown'; value: string }[];
}
export interface SetMembership {
  setId: number; first: number; last: number; complete: boolean;
  members: { entryId: number; abilityId: number | null; maxAP: number | null }[];
}
export interface Teaching { equipmentId: number; slot: number; abilityId: number; jobGroupIds: number[]; jobIds: number[]; resolved: boolean }
export interface Requirement {
  id: number; targetJobId: number; flag: number; order: number; characterIds: number[];
  conditions: { slot: number; setId: number; count: number; jobIds: number[] }[];
}
export interface Recruit {
  key: string; slot: number; characterId: number; formationJobId: number; nameId: number;
  effectiveJobId: number | null; jobResolution: 'formation' | 'character-default' | 'unresolved';
  raceId: number | null; minLevel: number; maxLevel: number;
}
export interface QuestView {
  id: number; infoKey: string | null; dataKey: string; emptySlot: boolean;
  textIds: { name: string; description: string; detail: string };
  textPresent: { name: boolean; description: boolean; detail: boolean };
  category: { raw: number; symbol: string | null; known: boolean };
  dispatch: { raw: number; enabled: boolean | null; recommendedJobId: number; resolvedJob: boolean };
  conditions: { field: string; raw: number; status: 'field-identified' | 'semantic-unknown';
    reference: { domain: string; id: number; resolved: boolean } | null }[];
  prerequisites: { status: 'unresolved'; questIds: null };
  completion: { status: 'unresolved'; startEventRaw: number | null; endEventRaw: number | null };
  rewards: { interpretation: 'stored-configuration'; gilRaw: number; apRaw: number; cpRaw: number; expRaw: number;
    items: { slot: number; raw: number; itemId: number; amountRaw: number; flagRaw: number | null;
      state: 'empty' | 'resolved' | 'missing'; textId: string }[] };
}
export interface Dataset {
  schema: typeof DATASET_SCHEMA; coreVersion: string; layoutId: string; layoutSha256: string;
  source: { romSha256: string; romBytes: number; gameCode: string; edition: Edition; version: string;
    wordTableSha256: string | null; textLanguage: string; resources: Record<string, ResourceIdentity> };
  tables: Record<Domain, RawRecord[]>; texts: Record<string, TextRecord>;
  relations: {
    jobSets: { jobId: number; setId: number; resolved: boolean }[];
    setMemberships: SetMembership[]; teaching: Teaching[]; requirements: Requirement[];
    recruitment: Recruit[];
    formations: { id: number; headerKey: string; unitKeys: string[]; unreferencedUnitKeys: string[] }[];
  };
  quests: QuestView[];
  textReference: { alignment: 'stable-text-id'; source: Dataset['source']; texts: Record<string, TextRecord>; missingIds: string[] } | null;
  diagnostics: Diagnostic[];
}
export interface AnalyzeOptions {
  expectedSha256: string; edition: Edition; version: string; textLanguage?: string;
  /** Explicit caller-supplied charset bytes. No translated names are built in. */
  wordTable?: { bytes: Uint8Array; format: string };
  /** Reject unresolved references/unknown enum values instead of emitting warnings. */
  strictDiagnostics?: boolean;
}
export interface PackageManifest {
  schema: typeof PACKAGE_SCHEMA; datasetSchema: typeof DATASET_SCHEMA; coreVersion: string;
  source: Dataset['source']; layoutSha256: string;
  files: Record<string, { bytes: number; sha256: string }>;
}
