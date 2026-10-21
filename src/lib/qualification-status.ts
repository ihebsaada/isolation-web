import type { Qualification } from './leads.ts';

export const qualificationStatuses = ['qualified', 'pending', 'low_intent', 'rejected'] as const;
export type QualificationStatus = typeof qualificationStatuses[number];

// Called only after full server validation. null then means unresolved coverage,
// not insufficient intent. Invalid/incomplete requests never reach persistence.
export function storedQualification(classification: Qualification | null): QualificationStatus {
  if (classification === null) return 'pending';
  if (classification === 'qualified' || classification === 'low_intent') return classification;
  return 'rejected';
}
