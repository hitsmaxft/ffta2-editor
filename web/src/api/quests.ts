import type { Dataset, QuestView } from './types';

/** Field/reference knowledge only; story flags never become guessed quest edges. */
export function questViews(dataset: Pick<Dataset, 'tables' | 'texts'>): QuestView[] {
  const { tables, texts } = dataset;
  const info = new Map(tables.questInfo.map((row) => [row.id, row]));
  const jobs = new Set(tables.jobs.map((row) => row.id));
  const abilities = new Set([...tables.active, ...tables.reaction, ...tables.support].map((row) => row.id));
  const items = new Set([...tables.equipment, ...tables.consumables, ...tables.loot].map((row) => row.id));
  const conditions = ['storyRequirement', 'flagRequirement', 'unknownRequirementIndex', 'unknownRequirementValue', 'monthRequirement', 'dayRequirement',
    'abilityRequirement', 'requiredItem1', 'requiredItemAmount1', 'requiredItem2', 'requiredItemAmount2', 'negotiation', 'aptitude', 'teamwork', 'adaptability', 'days', 'cooldownFailure', 'cooldownSuccess', 'fee', 'questGroup', 'regionFlags', 'questLocation', 'battlefield'];
  return tables.quests.map((quest) => {
    const f = quest.fields, metadata = info.get(quest.id);
    const textIds = { name: `message:0:6:${quest.id}`, description: `message:0:35:${quest.id}`, detail: `questtext:0:${quest.id}:0` };
    return { id: quest.id, infoKey: metadata?.key ?? null, dataKey: quest.key,
      emptySlot: Object.values(f).every((value) => value === 0) && Object.values(metadata?.fields ?? {}).every((value) => value === 0) && Object.values(textIds).every((id) => !texts[id]?.plain),
      textIds, textPresent: { name: textIds.name in texts, description: textIds.description in texts, detail: textIds.detail in texts },
      category: { raw: f.type, symbol: null, known: false },
      dispatch: { raw: f.dispatch, enabled: f.dispatch <= 1 ? f.dispatch === 1 : null, recommendedJobId: f.recommendedDispatch, resolvedJob: jobs.has(f.recommendedDispatch) },
      conditions: conditions.map((field) => {
        let reference: QuestView['conditions'][number]['reference'] = null;
        if (field === 'abilityRequirement') reference = { domain: 'abilities', id: f[field], resolved: abilities.has(f[field]) };
        if (field === 'requiredItem1' || field === 'requiredItem2') reference = { domain: 'items', id: f[field], resolved: items.has(f[field]) };
        if (field === 'questLocation') reference = { domain: 'message:0:5', id: f[field], resolved: `message:0:5:${f[field]}` in texts };
        const status = /^(?:storyRequirement|flagRequirement|unknownRequirement|questGroup|battlefield)/.test(field) ? 'semantic-unknown' as const : 'field-identified' as const;
        return { field, raw: f[field], status, reference };
      }),
      prerequisites: { status: 'unresolved', questIds: null },
      completion: { status: 'unresolved', startEventRaw: metadata?.fields.startEvent ?? null, endEventRaw: metadata?.fields.endEvent ?? null },
      rewards: { interpretation: 'stored-configuration', gilRaw: f.gilReward, apRaw: f.apReward, cpRaw: f.cpReward, expRaw: f.expReward,
        items: [1, 2, 3, 4].map((slot) => {
          const raw = f[`itemReward${slot}`], itemId = raw & 1023;
          return { slot, raw, itemId, amountRaw: raw >>> 10, flagRaw: slot === 4 ? f.itemReward4Flag : null,
            state: raw === 0 ? 'empty' as const : items.has(itemId) ? 'resolved' as const : 'missing' as const, textId: `message:0:11:${itemId}` };
        }) } };
  });
}
