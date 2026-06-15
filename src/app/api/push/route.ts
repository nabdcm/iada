import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

webpush.setVapidDetails(
  "mailto:support@nabd.clinic",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { user_id, title, body, url, tag, actions, requireInteraction } = await req.json();

    if (!user_id || !title) {
      return NextResponse.json({ error: "user_id and title required" }, { status: 400 });
    }

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (!subs || subs.length === 0) {
      return NextResponse.json({ sent: 0, message: "no subscriptions" });
    }

    const payload = JSON.stringify({
      title,
      body:   body ?? "",
      icon:   "/Logo_Nabd.svg",
      badge:  "/Logo_Nabd.svg",
      tag:    tag ?? "nabd",
      data:   { url: url ?? "/appointments" },
      actions: actions ?? [],
      requireInteraction: requireInteraction ?? false,
    });

    let sent = 0;
    const expired: string[] = [];

    await Promise.all(subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expired.push(sub.endpoint);
        }
      }
    }));

    if (expired.length > 0) {
      await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", expired);
    }

    return NextResponse.json({ sent, expired: expired.length });
  } catch (err) {
    console.error("push error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
// build trigger
