// ============================================================
// /api/video/room — إنشاء/جلب غرفة فيديو (Daily.co) لموعد أونلاين
// - لا يحتاج أي طرف لتسجيل دخول (الغرف والتوكنات تُولَّد على الخادم)
// - مفتاح Daily يُقرأ من متغيّر البيئة DAILY_API_KEY فقط (لا يُكشف للواجهة)
// - يتحقق أن العيادة مفعّلة لها الميزة (telemedicine_enabled)
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ldqaohjnlxiwvaijcsbm.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const DAILY_API = "https://api.daily.co/v1";
const DAILY_KEY = process.env.DAILY_API_KEY || "";

type DailyRoom = { name?: string; url?: string; error?: string };

async function dailyFetch(path: string, init?: RequestInit) {
  return fetch(`${DAILY_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DAILY_KEY}`,
      ...(init?.headers ?? {}),
    },
  });
}

/** ينشئ غرفة Daily تنتهي صلاحيتها بعد ساعتين */
async function createRoom(apptId: number): Promise<DailyRoom | null> {
  const rand = Math.random().toString(36).slice(2, 10);
  const name = `nabd-${apptId}-${rand}`;
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 2;
  const res = await dailyFetch("/rooms", {
    method: "POST",
    body: JSON.stringify({
      name,
      privacy: "private",
      properties: {
        exp,
        enable_chat: true,
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: false,
        eject_at_room_exp: true,
      },
    }),
  });
  if (!res.ok) {
    console.error("daily createRoom:", await res.text());
    return null;
  }
  return (await res.json()) as DailyRoom;
}

/** توكن دخول (مالك للطبيب، ضيف للمريض) */
async function createToken(roomName: string, isOwner: boolean, userName: string): Promise<string | null> {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 2;
  const res = await dailyFetch("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify({ properties: { room_name: roomName, is_owner: isOwner, user_name: userName, exp } }),
  });
  if (!res.ok) {
    console.error("daily createToken:", await res.text());
    return null;
  }
  const json = (await res.json()) as { token?: string };
  return json.token ?? null;
}

async function getDoctor(req: NextRequest) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data?.user ?? null;
}

// ── الطبيب: ينشئ/يدخل الغرفة ──
export async function POST(req: NextRequest) {
  try {
    if (!DAILY_KEY) return NextResponse.json({ error: "not_configured" }, { status: 500 });

    const user = await getDoctor(req);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { appointmentId } = (await req.json()) as { appointmentId?: number };
    if (!appointmentId) return NextResponse.json({ error: "missing_id" }, { status: 400 });

    const { data: clinic } = await supabaseAdmin
      .from("clinics").select("telemedicine_enabled, name, owner").eq("user_id", user.id).maybeSingle();
    if (!clinic?.telemedicine_enabled) {
      return NextResponse.json({ error: "feature_disabled" }, { status: 403 });
    }

    const { data: appt } = await supabaseAdmin
      .from("appointments")
      .select("id, user_id, is_online, room_name, call_status")
      .eq("id", appointmentId).eq("user_id", user.id).maybeSingle();
    if (!appt) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!appt.is_online) return NextResponse.json({ error: "not_online" }, { status: 400 });

    let roomName = appt.room_name as string | null;
    let roomUrl = "";

    if (roomName) {
      // تحقق أن الغرفة ما زالت موجودة (قد تكون انتهت صلاحيتها)
      const check = await dailyFetch(`/rooms/${roomName}`);
      if (check.ok) {
        const r = (await check.json()) as DailyRoom;
        roomUrl = r.url ?? "";
      } else {
        roomName = null;
      }
    }

    if (!roomName) {
      const room = await createRoom(appt.id as number);
      if (!room?.name || !room.url) return NextResponse.json({ error: "room_failed" }, { status: 500 });
      roomName = room.name;
      roomUrl = room.url;
      await supabaseAdmin.from("appointments").update({ room_name: roomName }).eq("id", appt.id);
    }

    await supabaseAdmin.from("appointments")
      .update({ call_status: "active", call_started_at: new Date().toISOString() })
      .eq("id", appt.id);

    const doctorName = (clinic.owner as string) || (clinic.name as string) || "Doctor";
    const token = await createToken(roomName, true, doctorName);
    if (!token) return NextResponse.json({ error: "token_failed" }, { status: 500 });

    return NextResponse.json({ ok: true, roomName, roomUrl, token, clinicName: clinic.name ?? "" });
  } catch (e) {
    console.error("video/room POST:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// ── المريض: يدخل الغرفة عبر رقم الموعد (بدون تسجيل دخول) ──
export async function GET(req: NextRequest) {
  try {
    if (!DAILY_KEY) return NextResponse.json({ error: "not_configured" }, { status: 500 });

    const apptId = req.nextUrl.searchParams.get("appt");
    const guestName = (req.nextUrl.searchParams.get("name") || "").trim();
    if (!apptId) return NextResponse.json({ error: "missing_id" }, { status: 400 });

    const { data: appt } = await supabaseAdmin
      .from("appointments")
      .select("id, user_id, is_online, room_name, call_status")
      .eq("id", Number(apptId)).maybeSingle();
    if (!appt || !appt.is_online) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const { data: clinic } = await supabaseAdmin
      .from("clinics").select("name").eq("user_id", appt.user_id).maybeSingle();
    const clinicName = (clinic?.name as string) ?? "";

    // الغرفة تُنشأ عند دخول الطبيب — قبلها ينتظر المريض
    if (!appt.room_name) {
      return NextResponse.json({ ok: true, waiting: true, clinicName });
    }

    const check = await dailyFetch(`/rooms/${appt.room_name}`);
    if (!check.ok) {
      // انتهت صلاحية الغرفة أو حُذفت — يعود للانتظار حتى يبدأ الطبيب من جديد
      return NextResponse.json({ ok: true, waiting: true, clinicName });
    }
    const room = (await check.json()) as DailyRoom;

    // بلا اسم بعد: نعيد فقط الجاهزية ليُدخل المريض اسمه
    if (!guestName) {
      return NextResponse.json({ ok: true, waiting: false, ready: true, clinicName });
    }

    const token = await createToken(appt.room_name as string, false, guestName.slice(0, 40));
    if (!token) return NextResponse.json({ error: "token_failed" }, { status: 500 });

    return NextResponse.json({
      ok: true, waiting: false, ready: true,
      roomName: appt.room_name, roomUrl: room.url ?? "", token, clinicName,
    });
  } catch (e) {
    console.error("video/room GET:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
