import { attributionKeys, captureAttribution } from './leads.ts';
export function attributionHref(path: string, query: string): string {
  const values = captureAttribution(query), params = new URLSearchParams();
  for (const key of attributionKeys) if (values[key] !== null) params.set(key, values[key]);
  return path + (params.size ? '?' + params.toString() : '');
}
