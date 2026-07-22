// ============================================================
// /api/video/room — إنشاء/جلب غرفة فيديو (Jitsi) لموعد أونلاين
// - مجاني بالكامل (Jitsi Meet العام) — لا مفاتيح API
// - اسم الغرفة عشوائي غير قابل للتخمين ويُخزَّن في الموعد
// - يتحقق أن العيادة مفعّلة لها الميزة (telemedicine_enabled)
// - وصول الطبيب عبر توكن الجلسة؛ وصول المريض عبر رمز الموعد
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ldqaohjnlxiwvaijcsbm.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const JITSI_HOST = "https://meet.jit.si";

function newRoomName(apptId: number): string {
  const rand = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  return `nabd-${apptId}-${rand}`;
}

async function getDoctor(req: NextRequest) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data?.user ?? null;
}

// الطبيب: ينشئ/يدخل الغرفة
export async function POST(req: NextRequest) {
  try {
    const user = await getDoctor(req);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { appointmentId } = (await req.json()) as { appointmentId?: number };
    if (!appointmentId) return NextResponse.json({ error: "missing_id" }, { status: 400 });

    // العيادة مفعّلة للميزة؟
    const { data: clinic } = await supabaseAdmin
      .from("clinics").select("telemedicine_enabled, name").eq("user_id", user.id).maybeSingle();
    if (!clinic?.telemedicine_enabled) {
      return NextResponse.json({ error: "feature_disabled" }, { status: 403 });
    }

    // الموعد يخص هذا الطبيب وهو أونلاين
    const { data: appt } = await supabaseAdmin
      .from("appointments")
      .select("id, user_id, is_online, room_name, call_status")
      .eq("id", appointmentId).eq("user_id", user.id).maybeSingle();
    if (!appt) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!appt.is_online) return NextResponse.json({ error: "not_online" }, { status: 400 });

    let roomName = appt.room_name as string | null;
    if (!roomName) {
      roomName = newRoomName(appt.id as number);
      await supabaseAdmin.from("appointments")
        .update({ room_name: roomName, call_status: "active", call_started_at: new Date().toISOString() })
        .eq("id", appt.id);
    } else if (appt.call_status === "pending") {
      await supabaseAdmin.from("appointments")
        .update({ call_status: "active", call_started_at: new Date().toISOString() })
        .eq("id", appt.id);
    }

    return NextResponse.json({
      ok: true,
      roomName,
      roomUrl: `${JITSI_HOST}/${roomName}`,
      clinicName: clinic.name ?? "",
    });
  } catch (e) {
    console.error("video/room POST:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// المريض: يدخل الغرفة عبر رمز الموعد (بدون تسجيل دخول)
export async function GET(req: NextRequest) {
  try {
    const apptId = req.nextUrl.searchParams.get("appt");
    if (!apptId) return NextResponse.json({ error: "missing_id" }, { status: 400 });

    const { data: appt } = await supabaseAdmin
      .from("appointments")
      .select("id, user_id, is_online, room_name, call_status, date, time")
      .eq("id", Number(apptId)).maybeSingle();
    if (!appt || !appt.is_online) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const { data: clinic } = await supabaseAdmin
      .from("clinics").select("name").eq("user_id", appt.user_id).maybeSingle();

    // الغرفة تُنشأ عند دخول الطبيب — لو لم تُنشأ بعد، المريض ينتظر
    if (!appt.room_name) {
      return NextResponse.json({ ok: true, waiting: true, clinicName: clinic?.name ?? "" });
    }

    return NextResponse.json({
      ok: true,
      waiting: false,
      roomName: appt.room_name,
      roomUrl: `${JITSI_HOST}/${appt.room_name}`,
      clinicName: clinic?.name ?? "",
    });
  } catch (e) {
    console.error("video/room GET:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
