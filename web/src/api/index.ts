/** The supported public entry point; DOM-free and read-only. */
export * from './types';
export { analyzeRom, recordByKey } from './analyze';
export { createDataPackage, verifyDataPackage, attachTextReference } from './package';
export { getLayout, TABLE_SPECS, FORMATION_HEADER, FORMATION_UNIT } from './layout';
export { RomAnalysisError } from './errors';
export { readIndexedPak, validateNds } from './containers';
export { decodeRecord } from './records';
export { plainText, displayTokens } from './text';
export { canonicalJson, sha256 } from './encoding';
export { DATASET_JSON_SCHEMA } from './schema';
export { openImageSession, type ImageSession, type PixelImage } from './images';
