import { authenticated, sheet, privateHeaders } from '@/lib/lead-server';
import { csv, filterLeads } from '@/lib/lead-record';
import { callCenterCsv } from '@/lib/call-center-export';

export async function GET(req: Request) {
  if (!await authenticated()) return new Response('Unauthorized', { status: 401, headers: privateHeaders });
  try {
    const params = new URL(req.url).searchParams;
    const rows = filterLeads((await sheet('list')).leads, params);
    const callCenter = params.get('format') === 'call-center';
    return new Response(callCenter ? callCenterCsv(rows) : csv(rows), {
      headers: {
        ...privateHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${callCenter ? 'leads-centre-appels' : 'leads'}.csv"`,
      },
    });
  } catch {
    return new Response('Storage unavailable', { status: 503, headers: privateHeaders });
  }
}
