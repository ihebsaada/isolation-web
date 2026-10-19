import { cookies } from "next/headers";
import { cookieName, validSession } from "./lead-session.ts";
export {
  cookieName,
  sessionSeconds,
  equal,
  newSession,
} from "./lead-session.ts";
export async function authenticated() {
  return validSession((await cookies()).get(cookieName)?.value || "");
}
export { sameOrigin } from "./request-origin.ts";
export async function sheet(
  action: string,
  data: Record<string, unknown> = {},
) {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL,
    token = process.env.GOOGLE_APPS_SCRIPT_SECRET;
  if (!url || !token) throw new Error("Storage not configured");
  if (!url.startsWith("https://script.google.com/"))
    throw new Error("Invalid storage URL");
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify({ action, token, ...data }),
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Storage failed");
  const result = await response.json();
  if (result.ok !== true) throw new Error("Storage failed");
  if (
    action === "append" &&
    (!result.lead ||
      result.lead.lead_id !== (data.lead as { lead_id: string }).lead_id ||
      !["qualified", "low_intent", "rejected"].includes(
        result.lead.qualification_status,
      ))
  )
    throw new Error("Unconfirmed persistence");
  if (action === "list" && !Array.isArray(result.leads))
    throw new Error("Invalid storage response");
  return result;
}
export const privateHeaders = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};
export async function limitedBody(req: Request) {
  const text = await req.text();
  if (text.length > 16000) throw new Error("Too large");
  return JSON.parse(text);
}
