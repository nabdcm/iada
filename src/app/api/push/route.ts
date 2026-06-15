import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Push via Supabase Edge Function ─────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, title, body: msgBody, url, tag } = body;

    if (!user_id || !title) {
      return NextResponse.json({ error: "user_id and title required" }, { status: 400 });
    }

    // استدعاء Supabase Edge Function لإرسال الإشعار
    const { data, error } = await supabaseAdmin.functions.invoke("send-push", {
      body: { user_id, title, body: msgBody, url, tag },
    });

    if (error) {
      // إذا لم يكن Edge Function موجوداً، نُعيد نجاحاً صامتاً (الإشعارات اختيارية)
      console.warn("push edge function not available:", error.message);
      return NextResponse.json({ sent: 0, note: "push not configured" });
    }

    return NextResponse.json(data ?? { sent: 0 });
  } catch (err) {
    console.error("push error:", err);
    return NextResponse.json({ sent: 0 });
  }
}
