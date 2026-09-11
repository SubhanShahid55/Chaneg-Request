import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateEstimate, normalizeDeliverables } from './estimate.js';

describe('estimate calculations', () => {
  it('derives hours and cost from deliverables instead of a raw total', () => {
    const deliverables = normalizeDeliverables([
      { description: 'Build form', hours: 8, category: 'Frontend', complexity: 'standard' },
      { description: 'Add endpoint', hours: 12, category: 'Backend', complexity: 'complex' },
    ]);

    assert.deepEqual(calculateEstimate(deliverables, 180), { hours: 20, cost: 3600 });
    assert.notEqual(calculateEstimate(deliverables, 180).cost, 3000);
  });

  it('suggests hours from complexity when a line item does not override them', () => {
    const deliverables = normalizeDeliverables([
      { description: 'QA pass', category: 'QA & DevOps', complexity: 'simple' },
    ]);

    assert.equal(deliverables[0].hours, 4);
  });
});
