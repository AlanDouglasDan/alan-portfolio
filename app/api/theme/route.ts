import { NextResponse } from "next/server";

/**
 * Theme persistence.
 *
 * The choice is stored in a cookie set here rather than in localStorage, so the
 * server renders the right theme on the first byte. A localStorage theme can
 * only be read after hydration, which is why sites that use it flash.
 * CLAUDE.md §4.1.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json().catch(() => null);

  const theme =
    typeof body === "object" && body !== null && "theme" in body
      ? (body as { theme: unknown }).theme
      : null;

  if (theme !== "dark" && theme !== "light") {
    return NextResponse.json({ error: "theme must be 'dark' or 'light'" }, { status: 400 });
  }

  const response = NextResponse.json({ theme });
  response.cookies.set("theme", theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });
  return response;
}
