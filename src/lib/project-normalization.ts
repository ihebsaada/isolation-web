import { needs, timings } from '../data/isolation.ts';
import type { Project } from './leads.ts';

export function comparisonKey(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function answer(value: unknown): string {
  if (value === true) return 'oui';
  if (value === false) return 'non';
  if (typeof value !== 'string') return '';
  const key = comparisonKey(value);
  if (['oui', 'yes', 'true'].includes(key)) return 'oui';
  if (['non', 'no', 'false'].includes(key)) return 'non';
  return value; // Unknown values remain invalid; never infer a positive answer.
}

function option(value: unknown, options: readonly string[]): string {
  if (typeof value !== 'string') return '';
  return options.find(item => comparisonKey(item) === comparisonKey(value)) ?? value;
}

// Do not normalize identity/location strings destructively or infer consent.
// Consent is accepted only as the explicit boolean produced by the checkbox.
export function normalizeProject(project: Project): Project {
  return { ...project, owner: answer(project.owner), detached: answer(project.detached),
    estimate: answer(project.estimate), need: option(project.need, needs),
    timing: option(project.timing, timings) };
}
