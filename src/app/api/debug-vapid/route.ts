import { NextResponse } from "next/server";

export async function GET() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  return NextResponse.json({
    hasPublic: pub.length > 0,
    publicLen: pub.length,
    publicPrefix: pub.slice(0, 6),
  });
}
