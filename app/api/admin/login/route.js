import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminToken } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD is not configured on the server." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { password } = body || {};
  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ error: "Password required." }, { status: 400 });
  }

  const given = Buffer.from(password);
  const expected = Buffer.from(adminPassword);
  const ok =
    given.length === expected.length &&
    crypto.timingSafeEqual(given, expected);

  if (!ok) {
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Access denied." }, { status: 401 });
  }

  return NextResponse.json({ token: createAdminToken(adminPassword) });
}
