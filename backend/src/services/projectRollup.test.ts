import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateProjectRollup } from './projectRollup.js';

describe('calculateProjectRollup', () => {
  it('keeps original scope separate and adds only approved change deliverables', () => {
    const result = calculateProjectRollup(
      [{ id: 'one', project_id: 'project', description: 'Build', hours: 10, category: 'Backend', complexity: 'standard' }],
      [
        { deliverables: [{ id: 'change-one', request_id: 'request', description: 'Export', hours: 4, category: 'Frontend', complexity: 'simple' }], cost: 1200, timeline_days: 2 },
        { deliverables: [{ id: 'change-two', request_id: 'request', description: 'Tests', hours: 3, category: 'QA & DevOps', complexity: 'simple' }], cost: 2400, timeline_days: 3 },
        { deliverables: [{ id: 'change-one', request_id: 'request', description: 'Export', hours: 4, category: 'Frontend', complexity: 'simple' }], hourly_rate: 300, timeline_days: 2 },
        { deliverables: [{ id: 'change-two', request_id: 'request', description: 'Tests', hours: 3, category: 'QA & DevOps', complexity: 'simple' }], hourly_rate: 800, timeline_days: 3 },
      ],
      8000,
      15,
    );
    assert.deepEqual(result, { originalHours: 10, approvedChangeHours: 7, totalHours: 17, approvedChangeCount: 2, originalBudget: 8000, approvedChangeCost: 3600, currentBudget: 11600, originalTimelineDays: 15, approvedChangeTimelineDays: 5, currentTimelineDays: 20 });
  });
});