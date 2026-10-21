import { buildLead, captureAttribution, validateStep, type Project } from './leads.ts';
import { normalizeProject } from './project-normalization.ts';
import { storedQualification } from './qualification-status.ts';
export const callStatuses = ['new', 'contacted', 'appointment', 'unreachable', 'refused'] as const;
export const columns = ['lead_id','submitted_at','name','phone','email','city','postal_code','homeowner','property_type','insulation_need','project_timeline','intent','qualification_status','qualification_pending','consent','utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','gclid','landing_path','referrer','source','campaign','ad','creative','utm_id','call_status','notes'] as const;
export type LeadRecord = Record<typeof columns[number], string>;
export function makeRecord(input: unknown): LeadRecord {
  if (!input || typeof input !== 'object') throw new Error('Invalid submission');
  const body = input as Record<string, unknown>;
  if (body.website !== '' || typeof body.lead_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.lead_id)) throw new Error('Invalid submission');
  const raw = body.project as Project;
  const answers = ['owner', 'detached', 'estimate'];
  if (!raw || typeof raw.consent !== 'boolean' || Object.entries(raw).some(([k,v]) => k !== 'consent' && !(answers.includes(k) && typeof v === 'boolean') && (typeof v !== 'string' || v.length > 254))) throw new Error('Invalid project');
  for (const key of ['city','postalCode','owner','detached','need','timing','estimate','name','phone','email'] as const) if (typeof raw[key] !== 'string' && !(answers.includes(key) && typeof raw[key] === 'boolean')) throw new Error('Missing field');
  const p = normalizeProject(raw);
  for (let step = 0; step < 4; step++) if (validateStep(step,p)) throw new Error('Invalid project');
  const query = new URLSearchParams();
  for (const key of ['source','campaign','ad','creative','utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','fbclid','gclid']) if (typeof body[key] === 'string') query.set(key,body[key] as string);
  const lead = buildLead(p,captureAttribution(query.toString()));
  const result = Object.fromEntries(columns.map(k=>[k,''])) as LeadRecord;
  Object.assign(result, captureAttribution(query.toString()));
  for (const k of columns) result[k] = result[k] ?? '';
  const status = storedQualification(lead.classification);
  return Object.assign(result,{lead_id:body.lead_id,submitted_at:new Date().toISOString(),name:lead.project.name,phone:lead.project.phone,email:lead.project.email,city:lead.project.city,postal_code:lead.project.postalCode,homeowner:p.owner,property_type:p.detached === 'oui' ? 'detached' : 'other',insulation_need:p.need,project_timeline:p.timing,intent:p.estimate,qualification_status:status,qualification_pending:String(lead.qualification_pending),consent:String(p.consent),landing_path:typeof body.landing_path === 'string' ? body.landing_path.slice(0,500) : '',referrer:typeof body.referrer === 'string' ? body.referrer.slice(0,500) : '',call_status:'new',notes:''});
}
export function filterLeads(rows: LeadRecord[], params: URLSearchParams) {
  const q=(params.get('q')||'').toLowerCase();
  return rows.filter(r=>(!q || r.name.toLowerCase().includes(q) || r.phone.includes(q.replace(/[^0-9]/g,'') || q)) && (!params.get('qualification') || r.qualification_status===params.get('qualification')) && (!params.get('status') || r.call_status===params.get('status'))).sort((a,b)=>b.submitted_at.localeCompare(a.submitted_at));
}
export function csv(rows: LeadRecord[]) {
  const cell=(v:string)=>'"'+(/^[\s]*[=+@\-\t\r]/.test(v) ? "'"+v : v).replaceAll('"','""')+'"';
  return '\uFEFF'+[columns.join(','),...rows.map(r=>columns.map(k=>cell(r[k]||'')).join(','))].join('\r\n');
}
