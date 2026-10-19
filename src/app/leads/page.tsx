import { authenticated } from '@/lib/lead-server';
import LeadViewer from './viewer';
export const dynamic='force-dynamic';
export const metadata={title:'Accès aux demandes',robots:{index:false,follow:false}};
export default async function Page(){return <LeadViewer authorized={await authenticated()}/>;}
