// src/app/api/delete-clinic/route.ts
// ─── حذف العيادة نهائياً من Auth + كل الجداول ─────────────────
// الترتيب: Auth أولاً (الخطوة القابلة للفشل شبكياً)، ثم الجداول.
// إن فشل Auth لا نلمس الجداول فتبقى العيادة ظاهرة ويمكن إعادة المحاولة.
// إن كان المستخدم غير موجود في Auth أصلاً (يتيم) نكمل حذف الجداول.

import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "../_adminAuth";
import { withTimeout, AUTH_TIMEOUT_MS, DB_TIMEOUT_MS } from "../_withTimeout";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 45;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL  || "https://ldqaohjnlxiwvaijcsbm.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId مطلوب" }, { status: 400 });
    }

    // 1. حذف المستخدم من Auth (بمهلة) — قبل أي حذف من الجداول
    try {
      const { error: authErr } = await withTimeout(
        supabaseAdmin.auth.admin.deleteUser(userId), AUTH_TIMEOUT_MS, "auth.deleteUser"
      );
      if (authErr) {
        const msg = (authErr.message || "").toLowerCase();
        const notFound = authErr.status === 404 || msg.includes("not found") || msg.includes("user_not_found");
        if (!notFound) {
          console.error("delete-clinic auth error:", authErr);
          return NextResponse.json(
            { error: `تعذّر حذف حساب الدخول: ${authErr.message}. لم يُحذف شيء — أعد المحاولة.` },
            { status: 502 }
          );
        }
        // يتيم: لا حساب في Auth — نكمل تنظيف الجداول
      }
    } catch (e) {
      console.error("delete-clinic auth timeout/exception:", e);
      return NextResponse.json(
        { error: "خدمة المصادقة لم تستجب في الوقت المحدد. لم يُحذف شيء — أعد المحاولة بعد قليل." },
        { status: 504 }
      );
    }

    // 2. حذف من الجداول
    const { error: clinicErr } = await withTimeout(
      supabaseAdmin.from("clinics").delete().eq("user_id", userId), DB_TIMEOUT_MS, "clinics.delete"
    );
    if (clinicErr) {
      console.error("delete-clinic clinics error:", clinicErr);
      return NextResponse.json(
        { error: `حُذف حساب الدخول لكن تعذّر حذف سجل العيادة: ${clinicErr.message}. أعد المحاولة لإكمال التنظيف.` },
        { status: 500 }
      );
    }

    const { error: profileErr } = await withTimeout(
      supabaseAdmin.from("clinic_profiles").delete().eq("id", userId), DB_TIMEOUT_MS, "clinic_profiles.delete"
    ).catch(e => ({ error: e as Error }));
    if (profileErr) console.error("delete-clinic profiles error (non-fatal):", profileErr);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("delete-clinic exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
