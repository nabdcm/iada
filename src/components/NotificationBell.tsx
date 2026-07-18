"use client";
import AppIcon from "@/components/AppIcon";
// ============================================================
// NotificationBell.tsx — جرس الإشعارات + لوحة القراءة
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface NotificationItem {
  id: number;
  title: string;
  body: string | null;
  url: string | null;
  read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  userId?: string;
  lang?: "ar" | "en";
  /** "light" للأماكن الداكنة (الشريط الجانبي)، "dark" للأماكن الفاتحة (شريط الداشبورد) */
  variant?: "light" | "dark";
}

function timeAgo(iso: string, isAr: boolean): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return isAr ? "الآن" : "now";
  if (m < 60) return isAr ? `قبل ${m} د` : `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return isAr ? `قبل ${h} س` : `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return isAr ? `قبل ${d} ي` : `${d}d`;
  return new Date(iso).toLocaleDateString(isAr ? "ar-SA-u-ca-gregory-nu-latn" : "en-US", {
    day: "numeric", month: "short",
  });
}

export default function NotificationBell({ userId, lang = "ar", variant = "dark" }: NotificationBellProps) {
  const isAr = lang === "ar";
  const router = useRouter();

  const [uid, setUid] = useState<string>(userId ?? "");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = items.filter(n => !n.read).length;

  // ─── تحديد هوية المستخدم ──────────────────────────────────
  useEffect(() => {
    if (userId) { setUid(userId); return; }
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUid(data.user.id);
    });
  }, [userId]);

  // ─── جلب الإشعارات ────────────────────────────────────────
  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, url, read, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(30);
      setItems((data as NotificationItem[]) ?? []);
    } catch { /* تجاهل */ }
    finally { setLoading(false); }
  }, [uid]);

  useEffect(() => { if (uid) load(); }, [uid, load]);

  // ─── Realtime + تحديث دوري احتياطي ────────────────────────
  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`notif-${uid}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        (payload) => setItems(prev => [payload.new as NotificationItem, ...prev].slice(0, 30)))
      .subscribe();
    const poll = setInterval(load, 45000);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [uid, load]);

  // ─── إغلاق عند النقر خارج اللوحة ──────────────────────────
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onEsc); };
  }, [open]);

  // ─── تعليم الكل كمقروء ────────────────────────────────────
  const markAllRead = async () => {
    if (!uid || unread === 0) return;
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await supabase.from("notifications").update({ read: true }).eq("user_id", uid).eq("read", false);
    } catch { /* تجاهل */ }
  };

  const openItem = async (n: NotificationItem) => {
    if (!n.read) {
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      try { await supabase.from("notifications").update({ read: true }).eq("id", n.id); } catch { /* تجاهل */ }
    }
    setOpen(false);
    if (n.url) router.push(n.url);
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) load();
  };

  const iconColor = variant === "dark" ? "#0863ba" : "rgba(255,255,255,.85)";
  const btnBg     = variant === "dark" ? "#fff" : "rgba(255,255,255,.08)";
  const btnBorder = variant === "dark" ? "1.5px solid #eef0f3" : "1.5px solid rgba(255,255,255,.2)";

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      <button
        onClick={toggle}
        aria-label={isAr ? "الإشعارات" : "Notifications"}
        style={{
          width: 40, height: 40, borderRadius: 10, background: btnBg, border: btnBorder,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", transition: "all .15s",
        }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 4, insetInlineEnd: 4, minWidth: 16, height: 16, padding: "0 4px",
            background: "#ef4444", color: "#fff", borderRadius: 8, fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          dir={isAr ? "rtl" : "ltr"}
          style={{
            position: "absolute", top: 48, ...(isAr ? { right: 0 } : { left: 0 }), width: 340, maxWidth: "calc(100vw - 32px)",
            background: "#fff", border: "1.5px solid #eef0f3", borderRadius: 14,
            boxShadow: "0 12px 32px rgba(0,0,0,.12)", zIndex: 1000, overflow: "hidden",
            fontFamily: "Rubik, sans-serif",
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", borderBottom: "1px solid #eef0f3",
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>
              {isAr ? "الإشعارات" : "Notifications"}
            </span>
            {unread > 0 && (
              <button onClick={markAllRead} style={{
                background: "none", border: "none", color: "#0863ba", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "Rubik, sans-serif",
              }}>
                {isAr ? "تعليم الكل كمقروء" : "Mark all read"}
              </button>
            )}
          </div>

          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {loading && items.length === 0 ? (
              <div style={{ padding: "28px 16px", textAlign: "center", color: "#aaa", fontSize: 13 }}>
                {isAr ? "جارٍ التحميل..." : "Loading..."}
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#aaa", fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: .5 }}><AppIcon glyph="🔔" /></div>
                {isAr ? "لا توجد إشعارات بعد" : "No notifications yet"}
              </div>
            ) : (
              items.map(n => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  style={{
                    display: "block", width: "100%", textAlign: isAr ? "right" : "left",
                    padding: "12px 16px", border: "none", borderBottom: "1px solid #f4f6f9",
                    background: n.read ? "#fff" : "#f0f6fe", cursor: "pointer",
                    fontFamily: "Rubik, sans-serif",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    {!n.read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#0863ba", marginTop: 6, flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: "#1a1a2e", marginBottom: 2 }}>
                        {n.title}
                      </div>
                      {n.body && (
                        <div style={{ fontSize: 12, color: "#667", lineHeight: 1.4, wordBreak: "break-word" }}>
                          {n.body}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: "#aab", marginTop: 4 }}>
                        {timeAgo(n.created_at, isAr)}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
