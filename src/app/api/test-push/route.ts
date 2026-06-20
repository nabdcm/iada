import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabaseAdmin.functions.invoke("send-push", {
    body: {
      user_id: "bd3c5b4a-9d93-4d07-b044-b0422136c86e",
      title: "نبض — اختبار 2",
      body: "تجربة ثانية بعد تصحيح الأيقونة ✅",
      url: "/dashboard",
    },
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, result: data });
}
