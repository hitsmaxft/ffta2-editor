import type { RawRecord, TableSpec, Diagnostic } from './types';
import { ENUMS } from './layout';
import { fail } from './errors';
import { sha256 } from './encoding';

export async function decodeRecord(bytes: Uint8Array, spec: TableSpec, recordIndex: number, resource: string,
  diagnostics: Diagnostic[] = [], key = `${spec.domain}:${recordIndex + spec.idBase}`): Promise<RawRecord> {
  if (bytes.length !== spec.stride) fail('RECORD_SIZE', resource, 'Record does not match the declared layout', { key, expected: spec.stride, actual: bytes.length });
  const values: Record<string, number> = {};
  const enumValues: RawRecord['enums'] = {};
  const unknownFields: string[] = [];
  for (const field of spec.fields) {
    let value = 0;
    for (let i = 0; i < field.bytes; i++) value += bytes[field.offset + i] * 2 ** (i * 8);
    values[field.key] = value;
    if (field.unknown) unknownFields.push(field.key);
    if (field.enum) {
      const symbol = ENUMS[field.enum]?.find((entry) => entry.value === value)?.name ?? null;
      const known = symbol !== null && !/^_0x|MAYBE|QUESTION/.test(symbol);
      enumValues[field.key] = { value, symbol, known };
      if (!known) diagnostics.push({ severity: 'warning', code: 'UNKNOWN_ENUM', resource, recordKey: key, field: field.key, value, message: `Unresolved ${field.enum} value; raw value preserved` });
    }
  }
  const id = recordIndex + spec.idBase;
  return { key, id, fields: values, enums: enumValues, unknownFields,
    nameTextId: spec.nameTable === undefined ? null : `message:0:${spec.nameTable}:${id}`,
    descriptionTextId: spec.descriptionTable === undefined ? null : `message:0:${spec.descriptionTable}:${id}`,
    source: { resource, tableId: spec.tableId, recordIndex, stride: spec.stride, sha256: await sha256(bytes) } };
}
