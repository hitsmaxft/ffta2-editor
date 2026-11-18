import type { Dataset, PackageManifest } from './types';
import { CORE_VERSION, DATASET_SCHEMA, PACKAGE_SCHEMA } from './types';
import { canonicalJson, sha256, utf8 } from './encoding';
import { DATASET_JSON_SCHEMA } from './schema';
import { getLayout } from './layout';
import { fail } from './errors';
import Ajv2020 from 'ajv/dist/2020';
const validateDataset = new Ajv2020({ strict: true, allErrors: true }).compile(DATASET_JSON_SCHEMA);

/** Same bytes for the same source/options/core version; no timestamps or paths. */
export async function createDataPackage(dataset: Dataset): Promise<Record<string, Uint8Array>> {
  if (!validateDataset(dataset)) fail('DATASET_SCHEMA', 'dataset', 'Dataset does not conform to its versioned schema', { errors: validateDataset.errors });
  const files: Record<string, Uint8Array> = {
    'dataset.json': utf8(canonicalJson(dataset)),
    'layout.json': utf8(canonicalJson(getLayout())),
    'dataset.schema.json': utf8(canonicalJson(DATASET_JSON_SCHEMA)),
  };
  const manifest: PackageManifest = { schema: PACKAGE_SCHEMA, datasetSchema: DATASET_SCHEMA, coreVersion: CORE_VERSION,
    source: dataset.source, layoutSha256: dataset.layoutSha256, files: {} };
  for (const [name, bytes] of Object.entries(files)) manifest.files[name] = { bytes: bytes.length, sha256: await sha256(bytes) };
  files['manifest.json'] = utf8(canonicalJson(manifest));
  return files;
}
function json<T>(bytes: Uint8Array | undefined, name: string): T {
  if (!bytes) fail('PACKAGE_FILE_MISSING', name, 'Package file is missing');
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as T; }
  catch { fail('INVALID_JSON', name, 'Package file is not valid UTF-8 JSON'); }
}
export async function verifyDataPackage(files: Record<string, Uint8Array>, expected: {
  romSha256: string; edition?: Dataset['source']['edition']; manifestSha256?: string;
}): Promise<{ manifest: PackageManifest; dataset: Dataset }> {
  if (!/^[a-f0-9]{64}$/.test(expected.romSha256)) fail('INVALID_OPTIONS', 'package', 'Expected ROM SHA-256 is required');
  const names = ['dataset.json', 'layout.json', 'dataset.schema.json', 'manifest.json'];
  if (Object.keys(files).sort().join('|') !== names.sort().join('|')) fail('PACKAGE_FILES', 'package', 'Unexpected or missing package files');
  if (expected.manifestSha256 && await sha256(files['manifest.json']) !== expected.manifestSha256) fail('MANIFEST_SHA_MISMATCH', 'manifest.json', 'Manifest differs from its approved hash');
  const manifest = json<PackageManifest>(files['manifest.json'], 'manifest.json');
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) fail('INVALID_MANIFEST', 'manifest.json', 'Manifest must be a JSON object');
  if (manifest.schema !== PACKAGE_SCHEMA || manifest.datasetSchema !== DATASET_SCHEMA || manifest.coreVersion !== CORE_VERSION) fail('UNSUPPORTED_SCHEMA', 'manifest.json', 'Unsupported package/schema/core version');
  if (manifest.source?.romSha256 !== expected.romSha256 || (expected.edition && manifest.source.edition !== expected.edition)) fail('PACKAGE_SOURCE_MISMATCH', 'manifest.json', 'Package does not match the expected source identity');
  const required = names.filter((name) => name !== 'manifest.json').sort();
  if (!manifest.files || Object.keys(manifest.files).sort().join('|') !== required.join('|')) fail('PACKAGE_FILES', 'manifest.json', 'Manifest file list differs from the package contract');
  for (const name of required) {
    const bytes = files[name], declared = manifest.files[name];
    if (!declared || typeof declared !== 'object' || !Number.isSafeInteger(declared.bytes) || declared.bytes < 0 || typeof declared.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(declared.sha256)) fail('INVALID_MANIFEST', 'manifest.json', 'Invalid file identity', { name });
    if (bytes.length !== declared.bytes || await sha256(bytes) !== declared.sha256) fail('PACKAGE_CHECKSUM', name, 'Package file digest or size differs');
  }
  if (await sha256(files['dataset.schema.json']) !== await sha256(utf8(canonicalJson(DATASET_JSON_SCHEMA)))) fail('SCHEMA_CONTENT_MISMATCH', 'dataset.schema.json', 'Schema content differs from this core');
  if (await sha256(files['layout.json']) !== manifest.layoutSha256 || manifest.layoutSha256 !== await sha256(utf8(canonicalJson(getLayout())))) fail('LAYOUT_MISMATCH', 'layout.json', 'Layout identity differs from this core');
  const dataset = json<Dataset>(files['dataset.json'], 'dataset.json');
  if (!validateDataset(dataset)) fail('DATASET_SCHEMA', 'dataset.json', 'Dataset does not conform to its versioned schema', { errors: validateDataset.errors });
  if (dataset.schema !== DATASET_SCHEMA || dataset.coreVersion !== CORE_VERSION || dataset.layoutSha256 !== manifest.layoutSha256 || canonicalJson(dataset.source) !== canonicalJson(manifest.source)) fail('DATASET_BINDING', 'dataset.json', 'Dataset source/schema binding differs from manifest');
  return { manifest, dataset };
}

/** Bilingual alignment uses only stable IDs and an explicitly bound peer ROM.
 * It cannot borrow another edition's labels or replace the primary source. */
export function attachTextReference(primary: Dataset, reference: Dataset): Dataset {
  if (primary.layoutSha256 !== reference.layoutSha256 || primary.source.edition !== reference.source.edition) fail('REFERENCE_EDITION_MISMATCH', 'reference', 'Text peer must share the layout and declared gameplay edition');
  for (const [domain, rows] of Object.entries(primary.tables)) {
    const peerRows = reference.tables[domain as keyof Dataset['tables']];
    if (rows.length !== peerRows.length) fail('REFERENCE_GAMEPLAY_MISMATCH', 'reference', 'Text peer gameplay table counts differ', { domain });
    const peer = new Map(peerRows.map((record) => [record.key, record]));
    for (const row of rows) if (peer.get(row.key)?.source.sha256 !== row.source.sha256) fail('REFERENCE_GAMEPLAY_MISMATCH', 'reference', 'Text peer gameplay records differ', { domain, key: row.key });
  }
  return { ...primary, textReference: { alignment: 'stable-text-id', source: reference.source, texts: reference.texts,
    missingIds: Object.keys(primary.texts).filter((id) => !(id in reference.texts)).sort() } };
}
