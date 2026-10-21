import type { LeadRecord } from './lead-record.ts';
import type { QualificationStatus } from './qualification-status.ts';

export const callCenterColumns = [
  'Date', 'Nom', 'Téléphone', 'Email', 'Ville', 'Code postal', 'Propriétaire',
  'Type de propriété', 'Besoin', 'Délai du projet', 'Intention', 'Qualification',
  'Statut appel', 'Notes', 'Source', 'Campagne', 'Créative',
] as const;

const qualifications: Record<QualificationStatus, string> = {
  qualified: 'Qualifié', pending: 'À vérifier', low_intent: 'Faible intention', rejected: 'Rejeté',
};
const statuses: Record<string, string> = {
  new: 'Nouveau', contacted: 'Contacté', appointment: 'Rendez-vous',
  unreachable: 'Injoignable', refused: 'Refusé',
};
const yesNo = (value: string) => value === 'oui' ? 'Oui' : value === 'non' ? 'Non' : value;
const dateFormat = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  timeZoneName: 'short',
});

function localDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = Object.fromEntries(dateFormat.formatToParts(date).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} ${parts.timeZoneName}`;
}

// Plain text only: quoting handles delimiters/newlines, prefixes neutralize
// spreadsheet formulas. The BOM preserves French accents when opened in Excel.
function cell(value: string) {
  const text = /^[\s]*[=+@\-\t\r]/.test(value) ? "'" + value : value;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function callCenterCsv(rows: LeadRecord[]): string {
  return '\uFEFF' + [
    callCenterColumns.map(cell).join(','),
    ...rows.map(row => [
      localDate(row.submitted_at), row.name, row.phone, row.email, row.city,
      row.postal_code, yesNo(row.homeowner),
      row.property_type === 'detached' ? 'Maison individuelle' : row.property_type === 'other' ? 'Autre' : row.property_type,
      row.insulation_need, row.project_timeline, yesNo(row.intent),
      (qualifications[row.qualification_status as QualificationStatus] || row.qualification_status) +
        (row.qualification_pending === 'true' ? ' — secteur à vérifier' : ''),
      statuses[row.call_status] || row.call_status, row.notes,
      row.utm_source || row.source, row.utm_campaign || row.campaign,
      row.utm_content || [row.creative, row.ad].filter(Boolean).join(' / '),
    ].map(value => cell(value || '')).join(',')),
  ].join('\r\n');
}
