import { NextResponse } from "next/server";
import {
  equal,
  newSession,
  cookieName,
  sessionSeconds,
  sameOrigin,
  sheet,
  limitedBody,
  privateHeaders,
} from "@/lib/lead-server";
import { createHash } from "node:crypto";
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const b = await limitedBody(req),
      code = process.env.LEADS_ACCESS_CODE;
    if (!code || code.length < 16)
      return NextResponse.json(
        { error: "Access unavailable" },
        { status: 503 },
      );
    const ip =
      req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const key = createHash("sha256").update(ip).digest("hex");
    if (!(await sheet("loginAttempt", { key })).allowed)
      return NextResponse.json(
        { error: "Too many attempts. Retry in 15 minutes." },
        { status: 429, headers: privateHeaders },
      );
    if (typeof b.code !== "string" || !equal(b.code, code))
      return NextResponse.json(
        { error: "Code incorrect" },
        { status: 401, headers: privateHeaders },
      );
    const response = NextResponse.json(
      { ok: true },
      { headers: privateHeaders },
    );
    response.cookies.set(cookieName, newSession(), {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: sessionSeconds,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Access unavailable" },
      { status: 503, headers: privateHeaders },
    );
  }
}
