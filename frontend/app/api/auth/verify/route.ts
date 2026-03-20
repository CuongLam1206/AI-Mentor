import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Force Node.js runtime — Edge runtime không có Buffer
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { id, signature } = await req.json();

  if (!id || !signature) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // Key C chỉ set trong .env server-side — KHÔNG bao giờ xuống client
  const secret = process.env.LEARNIFY_SECRET;
  if (!secret) {
    console.error("[Auth] LEARNIFY_SECRET chưa được cấu hình!");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Verify: D' = SHA256(B + C)
  const rawSignature = id + secret;
  const expectedSignature = crypto.createHash("sha256").update(rawSignature).digest("hex");

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Decode B (base64) → email = userId
  try {
    const userId = Buffer.from(id, "base64").toString("utf-8");
    if (!userId) throw new Error("Empty");
    return NextResponse.json({ userId });
  } catch {
    return NextResponse.json({ error: "Invalid id encoding" }, { status: 400 });
  }
}
