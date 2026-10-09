import { needs, timings, serviceCoverage } from '../data/isolation.ts';
export type Project = {
  city: string; postalCode: string; owner: string; detached: string;
  need: string; timing: string; estimate: string;
  name: string; phone: string; email: string; consent: boolean;
};
export type Qualification = 'qualified' | 'unqualified_owner' | 'unqualified_property_type' | 'out_of_area' | 'low_intent';
export type Coverage = { validated: boolean; postalCodes: readonly string[] };
// Only exact postal codes approved by the client. Never infer coverage from region names.
export { serviceCoverage } from '../data/isolation.ts';
export const emptyProject: Project = { city: '', postalCode: '', owner: '', detached: '', need: '', timing: '', estimate: '', name: '', phone: '', email: '', consent: false };
export { needs } from '../data/isolation.ts';
export { timings } from '../data/isolation.ts';
export const attributionKeys = ['source', 'campaign', 'ad', 'creative', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'fbclid', 'gclid'] as const;
export type Attribution = Record<(typeof attributionKeys)[number], string | null>;
export function captureAttribution(query: string): Attribution {
  const params = new URLSearchParams(query);
  return Object.fromEntries(attributionKeys.map(key => [key, params.get(key)?.slice(0, 500) ?? null])) as Attribution;
}
export const normalizePostalCode = (value: string) => value.replace(/\s/g, '').toUpperCase();
export function coverageStatus(postalCode: string, coverage: Coverage = serviceCoverage): 'pending' | 'inside' | 'outside' {
  if (!coverage.validated) return 'pending';
  return coverage.postalCodes.some(code => normalizePostalCode(code) === normalizePostalCode(postalCode)) ? 'inside' : 'outside';
}
// null means pending, never qualified. Priority follows the form order.
export function classify(project: Project, coverage: Coverage = serviceCoverage): Qualification | null {
  if (coverageStatus(project.postalCode, coverage) === 'outside') return 'out_of_area';
  if (project.owner === 'non') return 'unqualified_owner';
  if (project.detached === 'non') return 'unqualified_property_type';
  if (project.timing === 'Je me renseigne pour le moment' || project.estimate === 'non') return 'low_intent';
  if (coverageStatus(project.postalCode, coverage) !== 'inside') return null;
  if ([0, 1, 2, 3].some(step => validateStep(step, project))) return null;
  return 'qualified';
}
export function validateStep(step: number, project: Project): string | null {
  if (step === 0 && (project.city.trim().length < 2 || !/^[ABCEGHJ-NPRSTVXY][0-9][ABCEGHJ-NPRSTV-Z]\s?[0-9][ABCEGHJ-NPRSTV-Z][0-9]$/i.test(project.postalCode.trim()))) return 'Indiquez votre ville et un code postal canadien valide (ex. : H2X 1Y4).';
  if (step === 1 && ![project.owner, project.detached].every(value => value === 'oui' || value === 'non')) return 'Répondez aux deux questions sur votre habitation.';
  if (step === 2 && (!needs.some(value => value === project.need) || !timings.some(value => value === project.timing) || !['oui', 'non'].includes(project.estimate))) return 'Précisez votre besoin, votre délai et votre souhait d’estimation et de contact.';
  if (step === 3) {
    if (project.name.trim().length < 2) return 'Indiquez votre nom.';
    if (!/^(1)?[2-9]\d{2}[2-9]\d{6}$/.test(project.phone.replace(/\D/g, ''))) return 'Indiquez un numéro de téléphone canadien valide.';
    if (project.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(project.email.trim())) return 'Indiquez une adresse courriel valide.';
    if (!project.consent) return 'Votre consentement au rappel est nécessaire pour préparer cette demande.';
  }
  return null;
}
export function buildLead(project: Project, attribution: Attribution, coverage: Coverage = serviceCoverage) {
  const classification = classify(project, coverage);
  const timestamp = new Date().toISOString();
  return { ...attribution, lead_id: crypto.randomUUID(), timestamp,
    project: { ...project, city: project.city.trim(), name: project.name.trim(), email: project.email.trim(), phone: project.phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''), postalCode: normalizePostalCode(project.postalCode) },
    classification, qualification_pending: classification === null, coverage_status: coverageStatus(project.postalCode, coverage),
    consent: { accepted: project.consent, timestamp: project.consent ? timestamp : null, version: 'isolation-v1', purpose: 'rappel_isolation' }, delivery: 'not_sent' as const };
}
export function qualificationMessage(classification: Qualification | null): string {
  switch (classification) {
    case 'unqualified_owner': return 'Cette demande d’estimation s’adresse aux propriétaires. Aucune coordonnée n’est nécessaire pour votre situation.';
    case 'unqualified_property_type': return 'Cette demande d’estimation concerne les maisons individuelles. Aucune coordonnée n’est nécessaire pour votre type de propriété.';
    case 'out_of_area': return 'Votre code postal se situe hors des zones confirmées. Nous ne vous demandons pas de coordonnées.';
    case 'low_intent': return 'Vous souhaitez vous renseigner seulement ou ne souhaitez pas être contacté. Votre démarche reste distincte d’une demande d’estimation.';
    case 'qualified': return 'Votre projet correspond aux critères renseignés.';
    default: return 'Votre projet est préparé. Votre secteur doit encore être vérifié à partir du code postal indiqué.';
  }
}
