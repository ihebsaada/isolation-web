export type AdvertisingConsent = 'accepted' | 'refused';
export const advertisingConsentKey = 'isolation-advertising-consent-v1';
const choices = new WeakMap<object, AdvertisingConsent>();
const listeners = new Set<() => void>();
export function subscribeAdvertisingConsent(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function advertisingConsent(): AdvertisingConsent | null {
  if (typeof window === 'undefined') return null;
  const memory = choices.get(window);
  if (memory) return memory;
  try {
    const saved = sessionStorage.getItem(advertisingConsentKey);
    return saved === 'accepted' || saved === 'refused' ? saved : null;
  } catch { return null; }
}

export function setAdvertisingConsent(choice: AdvertisingConsent) {
  choices.set(window, choice);
  try { sessionStorage.setItem(advertisingConsentKey, choice); } catch { /* Current-page choice still applies. */ }
  if (window.fbq) {
    // Remove events still waiting for the library when consent is withdrawn.
    if (choice === 'refused' && Array.isArray(window.fbq.queue)) {
      window.fbq.queue = window.fbq.queue.filter(args => args[0] !== 'track' && args[0] !== 'trackCustom');
    }
    try { window.fbq('consent', choice === 'accepted' ? 'grant' : 'revoke'); } catch { /* Application guards still block events. */ }
  }
  listeners.forEach(listener => listener());
}

export function metaConfigured() {
  return process.env.NEXT_PUBLIC_META_PIXEL_ENABLED === 'true' && /^\d+$/.test(process.env.NEXT_PUBLIC_META_PIXEL_ID || '');
}

export function canTrackMeta() {
  return metaConfigured() && typeof window !== 'undefined' &&
    !window.location?.pathname.startsWith('/leads') && advertisingConsent() === 'accepted';
}
