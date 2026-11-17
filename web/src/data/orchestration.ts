// Domain load/save orchestration. Mirrors MainController.load/save ordering.

import { RomData } from './romData';
import { loadMessages, saveMessages } from './text';
import { loadAbilities, saveAbilities } from './controllers/ability';
import { loadSprites, saveSprites } from './controllers/sprites';
import {
  loadJobs, saveJobs, loadCharacters, saveCharacters,
  loadJobGroups, saveJobGroups, loadJobRequirements, saveJobRequirements,
} from './controllers/job';
import {
  loadEquipment, saveEquipment, loadConsumables, saveConsumables,
  loadLoot, saveLoot, loadItemTables, saveItemTables, loadLawBonus, saveLawBonus,
  loadBazaar, saveBazaar, loadAuctions, saveAuctions,
} from './controllers/item';
import { loadFormations, saveFormations, loadQuests, saveQuests } from './controllers/quest';

// MainController.load order (loadPatches is not ported; sbn loads in loadSprites).
export function loadAll(data: RomData): void {
  loadMessages(data);
  loadAbilities(data);
  loadSprites(data);
  loadJobs(data);
  loadCharacters(data);
  loadJobGroups(data);
  loadJobRequirements(data);
  loadEquipment(data);
  loadConsumables(data);
  loadLoot(data);
  loadItemTables(data);
  loadLawBonus(data);
  loadFormations(data);
  loadQuests(data);
  loadBazaar(data);
  loadAuctions(data);
}

// MainController.save order (jobs before sprites, unlike load).
export function saveAll(data: RomData): void {
  saveMessages(data);
  saveAbilities(data);
  saveJobs(data);
  saveSprites(data);
  saveCharacters(data);
  saveJobGroups(data);
  saveJobRequirements(data);
  saveEquipment(data);
  saveConsumables(data);
  saveLoot(data);
  saveItemTables(data);
  saveLawBonus(data);
  saveFormations(data);
  saveQuests(data);
  saveBazaar(data);
  saveAuctions(data);
}