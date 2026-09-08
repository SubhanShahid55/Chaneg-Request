import { stringify } from 'csv-stringify/sync';

/**
 * Build a CSV string from an array of change-request rows.
 * Each row is a flat object with the columns we want to export.
 */
export function buildCsv(
  rows: Array<Record<string, unknown>>,
  columns: string[]
): string {
  return stringify(rows, {
    header: true,
    columns,
  });
}
