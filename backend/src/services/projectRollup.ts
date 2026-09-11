import type { Deliverable, ProjectDeliverable } from '../types.js';

export function calculateProjectRollup(
  originalDeliverables: ProjectDeliverable[],
  approvedChanges: Array<{ deliverables: Deliverable[]; cost?: number | null; timeline_days?: number | null }>,
  approvedChanges: Array<{ deliverables: Deliverable[]; hourly_rate?: number | null; timeline_days?: number | null }>,
  originalBudget: number | null = null,
  originalTimelineDays: number | null = null,
) {
  const originalHours = originalDeliverables.reduce((total, item) => total + Number(item.hours), 0);
  const changeDeliverables = approvedChanges.flatMap((change) => change.deliverables);
  const approvedChangeHours = changeDeliverables.reduce((total, item) => total + Number(item.hours), 0);
  const approvedChangeCost = approvedChanges.reduce((total, change) => total + Number(change.cost || 0), 0);
  const approvedChangeCost = approvedChanges.reduce((total, change) => {
    const hours = change.deliverables.reduce((sum, item) => sum + Number(item.hours), 0);
    return total + (hours * Number(change.hourly_rate || 0));
  }, 0);
  const approvedChangeTimelineDays = approvedChanges.reduce((total, change) => total + Number(change.timeline_days || 0), 0);
  return {
    originalHours,
    approvedChangeHours,
    totalHours: originalHours + approvedChangeHours,
    approvedChangeCount: approvedChanges.length,
    originalBudget,
    approvedChangeCost,
    currentBudget: originalBudget == null ? null : originalBudget + approvedChangeCost,
    originalTimelineDays,
    approvedChangeTimelineDays,
    currentTimelineDays: originalTimelineDays == null ? null : originalTimelineDays + approvedChangeTimelineDays,
  };
}