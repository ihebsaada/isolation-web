import { authenticated, sameOrigin, sheet, privateHeaders, limitedBody } from '@/lib/lead-server';
import { makeRecord, filterLeads, callStatuses } from '@/lib/lead-record';
import { NextResponse } from 'next/server';
export async function POST(req:Request){
  if(!sameOrigin(req))return NextResponse.json({error:'Forbidden'},{status:403});
  let record;try{record=makeRecord(await limitedBody(req));}catch{return NextResponse.json({error:'Invalid submission'},{status:400});}
  try{const result=await sheet('append',{lead:record});return NextResponse.json({accepted:true,lead_id:record.lead_id,qualification_status:result.lead.qualification_status},{headers:privateHeaders});}catch{return NextResponse.json({error:'Persistence unavailable'},{status:503});}
}
export async function GET(req:Request){if(!await authenticated())return NextResponse.json({error:'Unauthorized'},{status:401,headers:privateHeaders});try{return NextResponse.json({leads:filterLeads((await sheet('list')).leads,new URL(req.url).searchParams)},{headers:privateHeaders});}catch{return NextResponse.json({error:'Storage unavailable'},{status:503,headers:privateHeaders});}}
export async function PATCH(req:Request){if(!await authenticated())return NextResponse.json({error:'Unauthorized'},{status:401});if(!sameOrigin(req))return NextResponse.json({error:'Forbidden'},{status:403});try{const b=await limitedBody(req);if(typeof b.lead_id!=='string'||!callStatuses.includes(b.call_status)||typeof b.notes!=='string'||b.notes.length>1000)return NextResponse.json({error:'Invalid update'},{status:400});await sheet('update',{lead_id:b.lead_id,call_status:b.call_status,notes:b.notes});return NextResponse.json({ok:true},{headers:privateHeaders});}catch{return NextResponse.json({error:'Update failed'},{status:503});}}
