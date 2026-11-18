import type { Dataset, Diagnostic, RawRecord } from './types';

export function buildRelations(tables: Dataset['tables'], diagnostics: Diagnostic[]): Dataset['relations'] {
  const maps = Object.fromEntries(Object.entries(tables).map(([domain, rows]) => [domain, new Map(rows.map((row) => [row.id, row]))]));
  const warn = (record: RawRecord, field: string, value: number, code = 'UNRESOLVED_REFERENCE') => {
    diagnostics.push({ severity: 'warning', code, resource: record.source.resource, recordKey: record.key, field, value, message: 'Reference is unresolved; no fallback or adjacent-table read was applied' });
  };
  const jobSets = tables.jobs.map((job) => {
    const setId = job.fields.abilitySet, resolved = maps.sets.has(setId);
    if (!resolved) warn(job, 'abilitySet', setId);
    return { jobId: job.id, setId, resolved };
  });
  const jobsForSet = (id: number) => jobSets.filter((link) => link.resolved && link.setId === id).map((link) => link.jobId);
  const setMemberships = tables.sets.map((set) => {
    const first = set.fields.first, last = set.fields.last;
    const members: Dataset['relations']['setMemberships'][number]['members'] = [];
    let complete = true;
    // Keep the original inclusive range. Bound expansion of malicious ranges;
    // a missing member is explicit, never borrowed from the following pak file.
    if (last >= first) {
      const stop = Math.min(last, Math.max(first, tables.entries.length));
      for (let id = first; id <= stop; id++) {
        const entry = maps.entries.get(id);
        if (!entry) {
          complete = false; warn(set, 'last', id, 'OUTSIDE_ENTRY_TABLE');
          members.push({ entryId: id, abilityId: null, maxAP: null });
        } else {
          const abilityId = entry.fields.ability;
          if (!maps.active.has(abilityId)) { complete = false; warn(entry, 'ability', abilityId); }
          members.push({ entryId: id, abilityId, maxAP: entry.fields.maxAP });
        }
      }
      if (last > stop) complete = false;
    }
    return { setId: set.id, first, last, complete, members };
  });
  const teaching: Dataset['relations']['teaching'] = [];
  for (const gear of tables.equipment) {
    const groupIds = [gear.fields.jobGroup1, gear.fields.jobGroup2, gear.fields.jobGroup3];
    const jobs = new Set<number>(); let groupsResolved = true;
    for (const groupId of groupIds) {
      const group = maps.jobGroups.get(groupId);
      if (!group) { groupsResolved = false; warn(gear, 'jobGroup', groupId); continue; }
      for (const id of Object.values(group.fields)) if (id) {
        jobs.add(id);
        if (!maps.jobs.has(id)) { groupsResolved = false; warn(group, 'job', id); }
      }
    }
    for (let slot = 1; slot <= 3; slot++) {
      const abilityId = gear.fields[`ability${slot}`];
      if (!abilityId) continue;
      const resolved = groupsResolved && (maps.active.has(abilityId) || maps.reaction.has(abilityId) || maps.support.has(abilityId));
      if (!resolved) warn(gear, `ability${slot}`, abilityId);
      teaching.push({ equipmentId: gear.id, slot, abilityId, jobGroupIds: groupIds, jobIds: [...jobs].sort((a, b) => a - b), resolved });
    }
  }
  const requirements = tables.requirements.map((record) => {
    const f = record.fields;
    if (!maps.jobs.has(f.jobId)) warn(record, 'jobId', f.jobId);
    return { id: record.id, targetJobId: f.jobId, flag: f.flag, order: f.indexOrder, characterIds: [f.character1, f.character2],
      conditions: [1, 2, 3].map((slot) => {
        const setId = f[`job${slot}`];
        if (!maps.sets.has(setId)) warn(record, `job${slot}`, setId);
        return { slot, setId, count: f[`abilityNum${slot}`], jobIds: jobsForSet(setId) };
      }) };
  });
  const formations = tables.formationHeaders.map((header) => {
    const units = tables.formationUnits.filter((unit) => unit.source.tableId === header.id * 2 + 1);
    return { id: header.id, headerKey: header.key, unitKeys: units.slice(0, header.fields.numUnits).map((unit) => unit.key),
      unreferencedUnitKeys: units.slice(header.fields.numUnits).map((unit) => unit.key) };
  });
  const recruitment = tables.formationUnits.filter((unit) => unit.source.tableId === 1 && unit.id < (tables.formationHeaders[0]?.fields.numUnits ?? 0)).map((unit) => {
    const f = unit.fields;
    const character = maps.characters.get(f.character);
    let effectiveJobId: number | null = f.job || (f.character ? character?.fields.defaultJob ?? null : null);
    const jobResolution = f.job ? 'formation' as const : effectiveJobId ? 'character-default' as const : 'unresolved' as const;
    if (effectiveJobId === null || !maps.jobs.has(effectiveJobId)) {
      warn(unit, f.job ? 'job' : 'character', f.job || f.character); effectiveJobId = null;
    }
    if (f.minLevel > f.maxLevel) warn(unit, 'minLevel', f.minLevel, 'INVALID_LEVEL_RANGE');
    return { key: unit.key, slot: unit.id, characterId: f.character, formationJobId: f.job,
      nameId: f.name || (f.character ? character?.fields.name ?? 0 : 0), effectiveJobId, jobResolution,
      raceId: effectiveJobId === null ? null : maps.jobs.get(effectiveJobId)!.fields.race,
      minLevel: f.minLevel, maxLevel: f.maxLevel };
  });
  for (const record of tables.active) {
    const id = record.fields.learnedAbilityId;
    if (id && !maps.active.has(id) && !maps.reaction.has(id) && !maps.support.has(id)) warn(record, 'learnedAbilityId', id);
  }
  return { jobSets, setMemberships, teaching, requirements, recruitment, formations };
}
