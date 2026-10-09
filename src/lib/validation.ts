import type { Project } from './leads.ts';
import { needs, timings } from '../data/isolation.ts';
export function firstInvalidField(step:number,p:Project):keyof Project|null {
  if(step===0){if(p.city.trim().length<2)return 'city';if(!/^[ABCEGHJ-NPRSTVXY][0-9][ABCEGHJ-NPRSTV-Z]\s?[0-9][ABCEGHJ-NPRSTV-Z][0-9]$/i.test(p.postalCode.trim()))return 'postalCode';}
  if(step===1){if(!['oui','non'].includes(p.owner))return 'owner';if(!['oui','non'].includes(p.detached))return 'detached';}
  if(step===2){if(!needs.some(v=>v===p.need))return 'need';if(!timings.some(v=>v===p.timing))return 'timing';if(!['oui','non'].includes(p.estimate))return 'estimate';}
  if(step===3){if(p.name.trim().length<2)return 'name';if(!/^(1)?[2-9]\d{2}[2-9]\d{6}$/.test(p.phone.replace(/\D/g,'')))return 'phone';if(p.email.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim()))return 'email';if(!p.consent)return 'consent';}
  return null;
}
