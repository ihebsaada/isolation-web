import { NextResponse } from 'next/server';
import { cookieName, sameOrigin } from '@/lib/lead-server';
export async function POST(req:Request){if(!sameOrigin(req))return new Response('Forbidden',{status:403});const response=NextResponse.json({ok:true});response.cookies.set(cookieName,'',{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:0});return response;}
