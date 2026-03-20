import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/verify
 * Body: { id: string, signature: string }
 * Returns: { userId: string } hoặc 401
 *
 * Key C (shared secret) chỉ tồn tại server-side, KHÔNG bao giờ xuống client.
 */
export async function POST(req: NextRequest) {
  const { id, signature } = await req.json();

  if (!id || !signature) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // Key C chỉ set trong .env (server-side only — không có prefix NEXT_PUBLIC_)
  const secret = process.env.LEARNIFY_SECRET;
  if (!secret) {
    console.error("[Auth] LEARNIFY_SECRET chưa được cấu hình!");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Verify: D' = B + C
  const expectedSignature = id + secret;
  if (signature !== expectedSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Decode B (base64) → email
  try {
    const userId = Buffer.from(id, "base64").toString("utf-8");
    if (!userId) throw new Error("Empty");
    return NextResponse.json({ userId });
  } catch {
    return NextResponse.json({ error: "Invalid id encoding" }, { status: 400 });
  }
}
