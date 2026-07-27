import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, account_type, reason, user_id } = body || {};

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "البريد الإلكتروني مطلوب" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("account_deletion_requests").insert({
      email,
      account_type: account_type || null,
      reason: reason || null,
      user_id: user_id || null,
    });

    if (error) {
      console.error("account-deletion-request insert error:", error);
      return NextResponse.json({ error: "تعذر إرسال الطلب، حاول لاحقاً" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("account-deletion-request error:", e);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
