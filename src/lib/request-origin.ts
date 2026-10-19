export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin || origin === "null") return false;

  try {
    const requestUrl = new URL(req.url);
    const development = process.env.NODE_ENV !== "production";
    // Vercel supplies these headers. Do not trust client-supplied forwarding
    // headers on a production server outside that trusted proxy boundary.
    const forwarded = development || process.env.VERCEL === "1";
    const host = (forwarded && req.headers.get("x-forwarded-host")) ||
      req.headers.get("host") || requestUrl.host;
    const protocol = (forwarded && req.headers.get("x-forwarded-proto")) ||
      requestUrl.protocol.slice(0, -1);

    // Reject lists and URL components instead of choosing an ambiguous origin.
    if (!host || /[\s,/@\\?#]/.test(host) || !["http", "https"].includes(protocol)) {
      return false;
    }
    const expected = new URL(`${protocol}://${host}`);
    const local = expected.hostname === "localhost" || expected.hostname === "127.0.0.1";

    if (development) {
      if (!local || protocol !== "http") return false;
      const port = expected.port ? `:${expected.port}` : "";
      return origin === `http://127.0.0.1${port}` || origin === `http://localhost${port}`;
    }

    // Local aliases are exclusively a development exception.
    return !local && origin === expected.origin;
  } catch {
    return false;
  }
}
