import { needs, timings, serviceCoverage } from "../data/isolation.ts";
import { normalizeProject } from './project-normalization.ts';
import { contactConsentVersion } from '../data/privacy.ts';
import {
  coverageStatus,
  normalizePostalCode,
  validPostalCode,
  type Coverage,
} from "./service-area.ts";
export {
  coverageStatus,
  normalizePostalCode,
  normalizeCity,
} from "./service-area.ts";
export type { Coverage } from "./service-area.ts";
export type Project = {
  city: string;
  postalCode: string;
  owner: string;
  detached: string;
  need: string;
  timing: string;
  estimate: string;
  name: string;
  phone: string;
  email: string;
  consent: boolean;
};
export type Qualification =
  | "qualified"
  | "unqualified_owner"
  | "unqualified_property_type"
  | "out_of_area"
  | "invalid"
  | "low_intent";
// Only exact cities approved by the client; surrounding municipalities stay pending.
export { serviceCoverage } from "../data/isolation.ts";
export const emptyProject: Project = {
  city: "",
  postalCode: "",
  owner: "",
  detached: "",
  need: "",
  timing: "",
  estimate: "",
  name: "",
  phone: "",
  email: "",
  consent: false,
};
export { needs } from "../data/isolation.ts";
export { timings } from "../data/isolation.ts";
export const attributionKeys = [
  "source",
  "campaign",
  "ad",
  "creative",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
] as const;
export type Attribution = Record<
  (typeof attributionKeys)[number],
  string | null
>;
export function captureAttribution(query: string): Attribution {
  const params = new URLSearchParams(query);
  return Object.fromEntries(
    attributionKeys.map((key) => [key, params.get(key)?.slice(0, 500) ?? null]),
  ) as Attribution;
}
// null means pending, never qualified. Priority follows the form order.
export function classify(
  project: Project,
  coverage: Coverage = serviceCoverage,
): Qualification | null {
  project = normalizeProject(project);
  const area = coverageStatus(project.city, project.postalCode, coverage);
  if (project.postalCode.trim() && area === "invalid") return "invalid";
  if (area === "outside") return "out_of_area";
  if (project.owner === "non") return "unqualified_owner";
  if (project.detached === "non") return "unqualified_property_type";
  if (
    project.timing === "Je me renseigne pour le moment" ||
    project.estimate === "non"
  )
    return "low_intent";
  if (area !== "inside") return null;
  if ([0, 1, 2, 3].some((step) => validateStep(step, project))) return null;
  return "qualified";
}
export function validateStep(step: number, project: Project): string | null {
  project = normalizeProject(project);
  if (
    step === 0 &&
    (project.city.trim().length < 2 || !validPostalCode(project.postalCode))
  )
    return "Indiquez votre ville et un code postal canadien valide (ex. : H2X 1Y4).";
  if (
    step === 1 &&
    ![project.owner, project.detached].every(
      (value) => value === "oui" || value === "non",
    )
  )
    return "Répondez aux deux questions sur votre habitation.";
  if (
    step === 2 &&
    (!needs.some((value) => value === project.need) ||
      !timings.some((value) => value === project.timing) ||
      !["oui", "non"].includes(project.estimate))
  )
    return "Précisez votre besoin, votre délai et votre souhait d’estimation et de contact.";
  if (step === 3) {
    if (project.name.trim().length < 2) return "Indiquez votre nom.";
    if (!/^(1)?[2-9]\d{2}[2-9]\d{6}$/.test(project.phone.replace(/\D/g, "")))
      return "Indiquez un numéro de téléphone canadien valide.";
    if (
      project.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(project.email.trim())
    )
      return "Indiquez une adresse courriel valide.";
    if (project.consent !== true)
      return "Votre consentement au rappel est nécessaire pour préparer cette demande.";
  }
  return null;
}
export function buildLead(
  project: Project,
  attribution: Attribution,
  coverage: Coverage = serviceCoverage,
) {
  project = normalizeProject(project);
  const classification = classify(project, coverage);
  const timestamp = new Date().toISOString();
  return {
    ...attribution,
    lead_id: crypto.randomUUID(),
    timestamp,
    project: {
      ...project,
      city: project.city.trim(),
      name: project.name.trim(),
      email: project.email.trim(),
      phone: project.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""),
      postalCode: normalizePostalCode(project.postalCode),
    },
    classification,
    // This flag describes unresolved service coverage, never contact/consent
    // incompleteness and never an automatic assessment of weak intent.
    qualification_pending:
      (classification === null || classification === 'low_intent') &&
      coverageStatus(project.city, project.postalCode, coverage) === 'pending',
    coverage_status: coverageStatus(project.city, project.postalCode, coverage),
    consent: {
      accepted: project.consent,
      timestamp: project.consent ? timestamp : null,
      version: contactConsentVersion,
      purpose: "rappel_isolation",
    },
    delivery: "not_sent" as const,
  };
}
export function qualificationMessage(
  classification: Qualification | null,
): string {
  switch (classification) {
    case "unqualified_owner":
      return "Cette demande d’estimation s’adresse aux propriétaires. Aucune coordonnée n’est nécessaire pour votre situation.";
    case "unqualified_property_type":
      return "Cette demande d’estimation concerne les maisons individuelles. Aucune coordonnée n’est nécessaire pour votre type de propriété.";
    case "out_of_area":
      return "Votre habitation se situe hors des zones confirmées. Nous ne vous demandons pas de coordonnées.";
    case "invalid":
      return "Indiquez un code postal canadien valide.";
    case "low_intent":
      return "Vous souhaitez vous renseigner seulement ou ne souhaitez pas être contacté. Votre démarche reste distincte d’une demande d’estimation.";
    case "qualified":
      return "Votre projet correspond aux critères renseignés.";
    default:
      return "Votre projet est préparé. Votre secteur doit encore être vérifié à partir du code postal indiqué.";
  }
}
