import type { DeliverableCategory } from '../types.js';

export const DELIVERABLE_CATEGORIES: DeliverableCategory[] = ['Frontend', 'Backend', 'Database / API', 'QA & DevOps'];
export const DELIVERABLE_COMPLEXITIES = ['simple', 'standard', 'complex'] as const;
export type DeliverableComplexity = typeof DELIVERABLE_COMPLEXITIES[number];

const SUGGESTED_HOURS: Record<DeliverableComplexity, number> = { simple: 4, standard: 8, complex: 16 };

export interface DeliverableInput {
  description: string;
  hours?: number;
  category: string;
  complexity?: string;
}

export interface NormalizedDeliverable {
  description: string;
  hours: number;
  category: DeliverableCategory;
  complexity: DeliverableComplexity;
}

export function suggestedHours(complexity: DeliverableComplexity): number {
  return SUGGESTED_HOURS[complexity];
}

export function normalizeDeliverables(input: unknown): NormalizedDeliverable[] {
  if (!Array.isArray(input) || input.length === 0) throw new Error('At least one deliverable with a description and hours is required.');
  return input.map((item, index) => {
    const value = item as DeliverableInput;
    const description = typeof value?.description === 'string' ? value.description.trim() : '';
    const category = value?.category as DeliverableCategory;
    const complexity = (value?.complexity || 'standard') as DeliverableComplexity;
    const hours = value?.hours === undefined ? suggestedHours(complexity) : value.hours;
    if (!description) throw new Error(`Deliverable ${index + 1} needs a description.`);
    if (!DELIVERABLE_CATEGORIES.includes(category)) throw new Error(`Deliverable ${index + 1} has an invalid category.`);
    if (!DELIVERABLE_COMPLEXITIES.includes(complexity)) throw new Error(`Deliverable ${index + 1} has an invalid complexity.`);
    if (typeof hours !== 'number' || !Number.isFinite(hours) || hours <= 0) throw new Error(`Deliverable ${index + 1} needs positive hours.`);
    return { description, hours, category, complexity };
  });
}

export function calculateEstimate(deliverables: Array<{ hours: number }>, hourlyRate: number) {
  const hours = deliverables.reduce((total, deliverable) => total + deliverable.hours, 0);
  return { hours, cost: hours * hourlyRate };
}