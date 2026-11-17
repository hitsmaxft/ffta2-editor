// Port of the JOB-domain controller data logic (JavaFX UI stripped):
//   JobController.loadJobs/saveJobs
//   JobGroupController.loadJobGroups/saveJobGroups
//   JobRequirementController.loadJobRequirements/saveJobRequirements
//   CharacterController.loadCharacters/saveCharacters
//
// Models are pure record parsers holding raw indices; the controller owns
// list-size defaults (arm9 count bytes), out-of-range clamping + load warnings
// (Java did these inside model constructors via App globals), and the
// arm9/overlay11 count-byte patches on save.
//
// Load order: text -> abilities -> sprites -> jobs -> characters -> jobGroups
// -> jobRequirements. loadJobs populates abilitySetList itself (Java does the
// same); ability/sprite object resolution is not needed because the TS models
// keep raw numeric indices.

import { Bytes } from '../../core/binary';
import { RomData } from '../romData';
import { JobData, JobGroup, AbilitySet, JobRequirementData } from '../model/job';
import { CharacterData } from '../model/character';

// PatchesController is not ported yet and RomData has no patch-flag fields.
// Work around locally by reproducing PatchesController.loadPatches detection:
//   patchedExpandedTopSprites = arm9.getInt(0x000b5ab4) != 0xe5d00018
// (Java getInt is signed; the literal is negative, so compare unsigned.)
function expandedTopSprites(data: RomData): boolean {
  if (!data.arm9) return false;
  return (data.arm9.peekInt(0x000b5ab4) >>> 0) !== 0xe5d00018;
}

function readU8(b: Bytes, offset: number): number {
  b.position(offset);
  return b.getU8();
}

function writeU8(b: Bytes, offset: number, value: number): void {
  b.position(offset);
  b.putU8(value);
}

// ---------------------------------------------------------------------------
// Jobs + Ability Sets (JobController)
// ---------------------------------------------------------------------------

export function loadJobs(data: RomData): void {
  if (!data.archive) return;
  const arm9 = data.arm9!;

  const abilitySetBytes = data.sysdata!.getFile(2);
  let abilitySetAbilityBytes = data.sysdata!.getFile(3);
  if (abilitySetBytes == null) throw new Error('Ability Sets are null');
  if (abilitySetAbilityBytes == null) throw new Error('Ability Set Abilities are null');
  abilitySetBytes.rewind();
  abilitySetAbilityBytes.rewind();

  const numAbilitysets = readU8(arm9, 0x000cb054) + 1;

  // Workaround for a real-ROM inconsistency: the ability-set table can
  // reference records past the end of sysdata file 3 (e.g. the last set has
  // lastAbilityIndex = 722 while file 3 only holds 722 records, 0..721).
  // Java's strict ByteBuffer slice throws BufferUnderflowException there.
  // The pak stores files contiguously, so extend the read view over the
  // adjacent pak bytes (what a contiguous memory read would see) and warn.
  let maxLastAbilityIndex = -1;
  for (let i = 0; i < numAbilitysets; i++) {
    abilitySetBytes.position(i * 0xc + 2);
    const last = abilitySetBytes.getShort();
    if (last > maxLastAbilityIndex) maxLastAbilityIndex = last;
  }
  abilitySetBytes.rewind();
  const neededAbilityBytes = (maxLastAbilityIndex + 1) * 0xc;
  if (neededAbilityBytes > abilitySetAbilityBytes.limit()) {
    if (abilitySetAbilityBytes.base + neededAbilityBytes > abilitySetAbilityBytes.buf.byteLength) {
      throw new Error('Ability Set Abilities are null');
    }
    data.warnings.push(
      `Ability Set Abilities file is ${abilitySetAbilityBytes.limit()} bytes but ability sets ` +
        `reference up to record ${maxLastAbilityIndex} (${neededAbilityBytes} bytes); ` +
        `extending read into adjacent pak data`
    );
    abilitySetAbilityBytes = abilitySetAbilityBytes.slice(0, neededAbilityBytes);
  }

  const abilitySetDataList: AbilitySet[] = [];
  for (let i = 0; i < numAbilitysets; i++) {
    abilitySetDataList.push(new AbilitySet(abilitySetBytes, abilitySetAbilityBytes, i));
  }
  data.abilitySetList = abilitySetDataList;
  abilitySetBytes.rewind();
  abilitySetAbilityBytes.rewind();

  const jobDataBytes = data.sysdata!.getFile(1);
  if (jobDataBytes == null) throw new Error('Jobs are null');
  jobDataBytes.rewind();

  const expanded = expandedTopSprites(data);
  const jobDataList: JobData[] = [];
  const numJobs = readU8(arm9, 0x000cafdc) + 1;
  for (let i = 0; i < numJobs; i++) {
    const job = new JobData(jobDataBytes, i, expanded);
    // Java JobData(bytes, id) clamps out-of-range ability-set indices to
    // abilitySetList.get(0) and records a load warning. The TS model keeps the
    // raw byte, so do it here.
    if (job.abilitySet >= data.abilitySetList.length) {
      const name = data.jobNames[i]?.string ?? '';
      data.warnings.push(
        `Job ${i} (${name}): Ability Set ${job.abilitySet} not found. Defaulting to 0`
      );
      job.abilitySet = 0;
    }
    jobDataList.push(job);
  }
  data.jobDataList = jobDataList;
  jobDataBytes.rewind();
}

export function saveJobs(data: RomData): void {
  const arm9 = data.arm9!;
  const expanded = expandedTopSprites(data);

  const jobs = data.jobDataList;
  const newJobDataBytes = Bytes.alloc(jobs.length * 0x48);
  for (const job of jobs) {
    newJobDataBytes.putBytes(job.toBytes(expanded));
  }
  data.sysdata!.setFile(1, newJobDataBytes.rewind());
  // Patch arm9 code with new Job length
  writeU8(arm9, 0x000cafdc, jobs.length - 1);
  writeU8(arm9, 0x000cafe0, jobs.length - 1);

  let firstAbilityIndex = 0;
  const abilitySets = data.abilitySetList;
  const newAbilitySetBytes = Bytes.alloc(abilitySets.length * 0xc);
  let totalAbilities = 0;
  for (const set of abilitySets) totalAbilities += set.abilities.length;
  const newAbilitySetAbilityBytes = Bytes.alloc(totalAbilities * 0xc);
  for (const abilitySet of abilitySets) {
    const [setBytes, abilityBytes] = abilitySet.tobytes(firstAbilityIndex);
    newAbilitySetBytes.putBytes(setBytes);
    newAbilitySetAbilityBytes.putBytes(abilityBytes);
    firstAbilityIndex += abilitySet.abilities.length;
  }

  data.sysdata!.setFile(2, newAbilitySetBytes.rewind());
  // Patch code with new Ability Set length
  writeU8(arm9, 0x000cb054, abilitySets.length - 1);
  writeU8(arm9, 0x000cb058, abilitySets.length - 1);
  writeU8(arm9, 0x000b81dc, abilitySets.length);
  const overlay11 = data.overlay11!;
  writeU8(overlay11, 0x4898, abilitySets.length);
  writeU8(overlay11, 0x83f8, abilitySets.length);

  data.sysdata!.setFile(3, newAbilitySetAbilityBytes.rewind());
  // Patch code with new Ability Set Abilities length
  arm9.position(0x000cb1d0);
  arm9.putInt(firstAbilityIndex - 1);
}

// ---------------------------------------------------------------------------
// Characters (CharacterController)
// ---------------------------------------------------------------------------

export function loadCharacters(data: RomData): void {
  if (!data.archive) return;

  const characterDataBytes = data.sysdata!.getFile(0);
  if (characterDataBytes == null) throw new Error('Characters are null');
  characterDataBytes.rewind();

  const expanded = expandedTopSprites(data);
  const characterDataList: CharacterData[] = [];
  const numCharacters = readU8(data.arm9!, 0x000cb018) + 1;
  for (let i = 0; i < numCharacters; i++) {
    characterDataList.push(new CharacterData(characterDataBytes, i, expanded));
  }
  data.characterList = characterDataList;
  characterDataBytes.rewind();
}

export function saveCharacters(data: RomData): void {
  const expanded = expandedTopSprites(data);
  const characters = data.characterList;
  const newCharacterDataBytes = Bytes.alloc(characters.length * 0x1c);
  for (const character of characters) {
    newCharacterDataBytes.putBytes(character.toBytes(expanded));
  }
  data.sysdata!.setFile(0, newCharacterDataBytes.rewind());
  // Patch arm9 code with new Characters length
  writeU8(data.arm9!, 0x000cb018, characters.length - 1);
  writeU8(data.arm9!, 0x000cb01c, characters.length - 1);
}

// ---------------------------------------------------------------------------
// Job Groups (JobGroupController)
// ---------------------------------------------------------------------------

export function loadJobGroups(data: RomData): void {
  if (!data.archive) return;

  const jobGroupBytes = data.sysdata!.getFile(36);
  if (jobGroupBytes == null) throw new Error('Job Group data is null');
  jobGroupBytes.rewind();

  const jobGroupDataList: JobGroup[] = [];
  const numJobGroups = readU8(data.arm9!, 0x000cb8b0) + 1;
  for (let i = 0; i < numJobGroups; i++) {
    jobGroupDataList.push(new JobGroup(jobGroupBytes, i));
  }
  data.jobGroupList = jobGroupDataList;
  jobGroupBytes.rewind();
}

export function saveJobGroups(data: RomData): void {
  const jobGroups = data.jobGroupList;
  const newJobGroupDataBytes = Bytes.alloc(jobGroups.length * 0x4);
  for (const jobGroup of jobGroups) {
    newJobGroupDataBytes.putBytes(jobGroup.toBytes());
  }
  data.sysdata!.setFile(36, newJobGroupDataBytes.rewind());
  // Patch arm9 code with new Job Group length
  writeU8(data.arm9!, 0x000cb8b0, jobGroups.length - 1);
  writeU8(data.arm9!, 0x000cb8b4, jobGroups.length - 1);
}

// ---------------------------------------------------------------------------
// Job Requirements (JobRequirementController)
// ---------------------------------------------------------------------------

export function loadJobRequirements(data: RomData): void {
  if (!data.archive) return;

  const jobRequirementBytes = data.sysdata!.getFile(19);
  if (jobRequirementBytes == null) throw new Error('Job Requirements are null');
  jobRequirementBytes.rewind();

  const abilitySetCount = data.abilitySetList.length;
  const jobRequirementDataList: JobRequirementData[] = [];
  // NOTE: unlike the other counts, Java reads this one WITHOUT +1.
  const numJobRequirements = readU8(data.arm9!, 0x000b80b8);
  for (let i = 0; i < numJobRequirements; i++) {
    // Java JobRequirementData(bytes, id) warns when an ability-set index is
    // out of range (the TS model clamps silently). Inspect the raw record to
    // reproduce the warnings: set indices live at record offsets 6, 8, 10.
    const raw = jobRequirementBytes.getBytesAt(i * 0xc, 0xc);
    for (const off of [6, 8, 10]) {
      if (raw[off] >= abilitySetCount) {
        data.warnings.push(
          `Job Requirement ${i}: Ability Set ${raw[off]} not found. Defaulting to 0`
        );
      }
    }
    jobRequirementDataList.push(new JobRequirementData(jobRequirementBytes, i, abilitySetCount));
  }
  data.jobRequirementList = jobRequirementDataList;
  jobRequirementBytes.rewind();
}

export function saveJobRequirements(data: RomData): void {
  const arm9 = data.arm9!;
  const jobRequirements = data.jobRequirementList;
  const newJobRequirementBytes = Bytes.alloc(jobRequirements.length * 0xc);
  for (const jobRequirement of jobRequirements) {
    newJobRequirementBytes.putBytes(jobRequirement.toBytes());
  }
  data.sysdata!.setFile(19, newJobRequirementBytes.rewind());
  // Patch code with new Job Requirements length
  writeU8(arm9, 0x000cb4bc, jobRequirements.length - 1);
  writeU8(arm9, 0x000cb4c0, jobRequirements.length - 1);
  writeU8(arm9, 0x000b80b8, jobRequirements.length);
  writeU8(arm9, 0x000b7f60, jobRequirements.length);
  writeU8(arm9, 0x000b8290, jobRequirements.length);

  const overlay11 = data.overlay11!;
  writeU8(overlay11, 0x8ccc, jobRequirements.length);
  writeU8(overlay11, 0x9138, jobRequirements.length);
}