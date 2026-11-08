import { prisma } from './prisma';
import { COMPLIANCE_OBLIGATIONS, currentCycle } from './compliance-ghana';

export async function ensureComplianceItems(now = new Date()) {
  const rows = COMPLIANCE_OBLIGATIONS.map((definition) => {
    const cycle = currentCycle(definition, now);
    return {
      catalogKey: definition.key,
      period: cycle.period,
      title: definition.title,
      authority: definition.authority,
      category: definition.category,
      statute: definition.statute || null,
      frequency: definition.frequency,
      dueDate: cycle.dueDate
    };
  });
  await prisma.complianceObligation.createMany({ data: rows, skipDuplicates: true });
}
