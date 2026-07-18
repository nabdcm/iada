"use client";
import AppIcon from "@/components/AppIcon";
// ============================================================
// PushNotifications.tsx — مكوّن طلب إذن الإشعارات
// ============================================================

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC = "BG73PZ28jKm8MniGKb0DJCG45VDuUBJdAJNNRX9VwPr1YD-y4o0vXy4BJRHL1qYoCIKOhuRfHE0QKLca7fq-ZQc";

function urlBase64ToUint8(base64String: string): Uint8Array<ArrayBuffer> {
  const padding  = "=".repeat((4 - base64String.length % 4) % 4);
  const base64   = (base64String + padding).replace(/-/g,"+").replace(/_/g,"/");
  const rawData  = window.atob(base64);
  const buffer   = new ArrayBuffer(rawData.length);
  const output   = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

interface PushNotificationsProps {
  userId: string;
  lang?: "ar" | "en";
}

export default function PushNotifications({ userId, lang = "ar" }: PushNotificationsProps) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading,    setLoading]    = useState(false);

  const isAr = lang === "ar";

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);

    // التحقق من وجود اشتراك
    navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()).then(sub => {
      setSubscribed(!!sub);
    });
  }, []);

  const subscribe = async () => {
    if (!("serviceWorker" in navigator)) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8(VAPID_PUBLIC),
      });

      const json = sub.toJSON();
      const keys = json.keys as { p256dh: string; auth: string };

      await supabase.from("push_subscriptions").upsert({
        user_id:  userId,
        endpoint: json.endpoint!,
        p256dh:   keys.p256dh,
        auth:     keys.auth,
      }, { onConflict: "user_id,endpoint" });

      setSubscribed(true);
    } catch (err) {
      console.error("Push subscription error:", err);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await supabase.from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("endpoint", sub.endpoint);
      }
      setSubscribed(false);
    } catch (err) {
      console.error("Unsubscribe error:", err);
    } finally {
      setLoading(false);
    }
  };

  // غير مدعوم
  if (permission === "unsupported") return null;

  // مرفوض
  if (permission === "denied") return (
    <div style={{ fontSize:12, color:"#aaa", padding:"8px 12px", background:"#fafafa",
      border:"1px solid #f0f0f0", borderRadius:8, display:"flex", alignItems:"center", gap:6 }}>
      <span><AppIcon glyph="🔕" /></span>
      <span>{isAr ? "الإشعارات مرفوضة — فعّلها من إعدادات المتصفح" : "Notifications blocked — enable in browser settings"}</span>
    </div>
  );

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      style={{
        display:"flex", alignItems:"center", gap:8,
        padding:"10px 16px", borderRadius:10, cursor:"pointer",
        fontFamily:"Rubik,sans-serif", fontSize:13, fontWeight:600,
        border: subscribed ? "1.5px solid rgba(46,125,50,.3)" : "1.5px solid rgba(8,99,186,.3)",
        background: subscribed ? "rgba(46,125,50,.07)" : "rgba(8,99,186,.07)",
        color: subscribed ? "#2e7d32" : "#0863ba",
        transition:"all .2s",
        opacity: loading ? 0.7 : 1,
      }}
    >
      <span style={{ fontSize:16, display:"flex" }}><AppIcon glyph={subscribed ? "🔔" : "🔕"} /></span>
      <span>
        {loading
          ? (isAr ? "جارٍ..." : "Loading...")
          : subscribed
            ? (isAr ? "الإشعارات مفعّلة" : "Notifications On")
            : (isAr ? "تفعيل الإشعارات" : "Enable Notifications")
        }
      </span>
    </button>
  );
}
