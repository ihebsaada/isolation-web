import { authenticated, sheet, privateHeaders } from '@/lib/lead-server';
import { csv, filterLeads } from '@/lib/lead-record';
export async function GET(req:Request){if(!await authenticated())return new Response('Unauthorized',{status:401,headers:privateHeaders});try{return new Response(csv(filterLeads((await sheet('list')).leads,new URL(req.url).searchParams)),{headers:{...privateHeaders,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="leads.csv"'}});}catch{return new Response('Storage unavailable',{status:503,headers:privateHeaders});}}
