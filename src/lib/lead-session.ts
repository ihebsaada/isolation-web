import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
export const cookieName='leads_session';
export const sessionSeconds=8*60*60;
function secret() { const s=process.env.LEADS_ACCESS_CODE; if(!s || s.length<16) throw new Error('Access code not configured'); return s; }
export function equal(a:string,b:string) { const hash=(v:string)=>createHmac('sha256','compare').update(v).digest(); return timingSafeEqual(hash(a),hash(b)); }
export function newSession() { const value=`${Math.floor(Date.now()/1000)+sessionSeconds}.${randomBytes(16).toString('hex')}`; return value+'.'+createHmac('sha256',secret()).update(value).digest('hex'); }
export function validSession(token:string) { try {const [exp,nonce,sig,...rest]=token.split('.');return !rest.length && Number(exp)>Date.now()/1000 && Number(exp)<=Date.now()/1000+sessionSeconds+5 && !!nonce && equal(sig||'',createHmac('sha256',secret()).update(`${exp}.${nonce}`).digest('hex'));}catch{return false;} }
