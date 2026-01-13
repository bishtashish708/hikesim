import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const allowBypass = process.env.ALLOW_ADMIN_BYPASS === "true" || process.env.NODE_ENV !== "production";
  const host = request.headers.get("host") ?? "";
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  if (!isLocalhost) {
    return NextResponse.json({ enabled: false });
  }
  const cookie = request.headers.get("cookie") ?? "";
  const enabled = allowBypass && cookie.includes("admin_bypass=1");
  return NextResponse.json({ enabled });
}

export async function POST(request: Request) {
  const allowBypass = process.env.ALLOW_ADMIN_BYPASS === "true" || process.env.NODE_ENV !== "production";
  const host = request.headers.get("host") ?? "";
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  if (!isLocalhost) {
    return NextResponse.json({ error: "Admin bypass only available on localhost." }, { status: 403 });
  }
  if (!allowBypass) {
    return NextResponse.json({ error: "Admin bypass disabled." }, { status: 403 });
  }
  const body = (await request.json()) as { enabled?: boolean };
  const response = NextResponse.json({ ok: true, enabled: Boolean(body.enabled) });
  if (body.enabled) {
    response.cookies.set("admin_bypass", "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  } else {
    response.cookies.set("admin_bypass", "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}
