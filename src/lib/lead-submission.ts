import type { buildLead } from './leads.ts';
export type LeadPayload = ReturnType<typeof buildLead>;
export type LeadReceipt = { accepted: true; lead_id: string; qualification_status?: string };
export type LeadReceiver = (payload: LeadPayload, signal: AbortSignal) => Promise<Response>;
// Connect an approved same-origin endpoint after server validation and durable storage exist.
export const leadReceiver: LeadReceiver = (payload, signal) => fetch('/api/leads', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal});
export class SubmissionUnavailableError extends Error {}
export async function submitLead(payload: LeadPayload, signal: AbortSignal, receiver: LeadReceiver | undefined = leadReceiver, timeoutMs = 15000): Promise<LeadReceipt> {
  if (!receiver) throw new SubmissionUnavailableError('Lead reception is not configured.');
  signal.throwIfAborted();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: () => void = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    onAbort = () => reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(() => reject(new Error('Lead reception timed out.')), timeoutMs);
  });
  const receive = async (): Promise<LeadReceipt> => {
    const response = await receiver(payload, signal);
    signal.throwIfAborted();
    if (!response.ok) throw new Error('Lead reception failed.');
    const receipt: unknown = await response.json();
    signal.throwIfAborted();
    if (typeof receipt !== 'object' || receipt === null || !('accepted' in receipt) || receipt.accepted !== true || !('lead_id' in receipt) || receipt.lead_id !== payload.lead_id) throw new Error('Unconfirmed lead receipt.');
    return { accepted: true, lead_id: payload.lead_id, ...('qualification_status' in receipt && typeof receipt.qualification_status === 'string' ? {qualification_status:receipt.qualification_status} : {}) };
  };
  try { return await Promise.race([receive(), interrupted]); }
  finally { clearTimeout(timer); signal.removeEventListener('abort', onAbort); }
}
