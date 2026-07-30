/**
 * Net a resident's stored dues against their prepaid advance balance.
 * A resident fully covered by advance has zero effective dues (never negative).
 * This is the single source of truth for "how much does this resident actually
 * owe" — call it everywhere dues are displayed or summed rather than inlining
 * the subtraction (buildDues, toResidentDto, and any future consumer).
 */
export function effectiveDues(duesPaisa: number, advanceBalancePaisa: number): number {
  return Math.max(0, duesPaisa - advanceBalancePaisa);
}
