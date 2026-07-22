"use client";
import AppIcon from "@/components/AppIcon";
// ============================================================
// NABD - نبض | Messages Page — صفحة الرسائل
// Route: /messages
// ============================================================

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import PageIntro from "@/components/PageIntro";
import SharedSidebar from "@/components/SharedSidebar";

type Lang = "ar" | "en";
type PlanType = "basic" | "pro" | "enterprise" | "shared_basic" | "shared_pro" | "shared_enterprise";

interface Message {
  id: number;
  from_id: string;
  to_id: string;
  from_role: "admin" | "doctor";
  body: string;
  is_read: boolean;
  created_at: string;
  expires_at: string;
}

const ADMIN_ID = "admin";

// ── صوت الإشعار (Web Audio API — لا يحتاج ملف خارجي) ──────
function playMsgSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch { /* صامت إذا لم يدعم المتصفح */ }
}

export default function MessagesPage() {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [lang, setLang]         = useState<Lang>("ar");
  const [userId, setUserId]     = useState<string>("");
  const [plan, setPlan]         = useState<PlanType>("basic");
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody]         = useState("");
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string>("");
  const [mounted, setMounted]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  const isAr = lang === "ar";

  useEffect(() => {
    setMounted(true);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      setUserId(user.id);

      const savedLang = localStorage.getItem("lang") as Lang | null;
      if (savedLang) setLang(savedLang);

      const { data: cl } = await supabase.from("clinics").select("plan").eq("user_id", user.id).single();
      if (cl?.plan) setPlan(cl.plan as PlanType);

      await loadMessages(user.id);
      setLoading(false);

      await supabase.from("clinic_messages")
        .update({ is_read: true })
        .eq("to_id", user.id)
        .eq("is_read", false);
    })();
  }, []);

  // Realtime — يستمع للرسائل الواردة من الأدمن (to_id = هوية الطبيب)
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`messages-clinic-${userId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "clinic_messages",
        filter: `to_id=eq.${userId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => [...prev, newMsg]);
        if (newMsg.from_role === "admin") {
          playMsgSound();
        }
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        supabase.from("clinic_messages").update({ is_read: true }).eq("id", newMsg.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    if (!loading) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
  }, [loading]);

  async function loadMessages(uid: string) {
    const { data, error: fetchError } = await supabase
      .from("clinic_messages")
      .select("*")
      .or(`from_id.eq.${uid},to_id.eq.${uid}`)
      .order("created_at", { ascending: true });

    if (fetchError) { console.error("loadMessages:", fetchError); return; }
    setMessages(data ?? []);
  }

  async function sendMessage() {
    if (!body.trim() || !userId) return;
    setSending(true); setError("");
    const { error: insertError } = await supabase.from("clinic_messages").insert({
      from_id: userId, to_id: ADMIN_ID, from_role: "doctor", body: body.trim(),
    });
    if (!insertError) {
      setBody("");
      await loadMessages(userId);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } else {
      setError(isAr ? "حدث خطأ أثناء الإرسال" : "Error sending message");
      setTimeout(() => setError(""), 4000);
    }
    setSending(false);
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString(isAr ? "ar-SA-u-ca-gregory-nu-latn" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function getExpiryLabel(iso: string): string {
    const exp = new Date(iso);
    const diffH = Math.round((exp.getTime() - Date.now()) / 3600000);
    if (diffH <= 0) return isAr ? "انتهت" : "Expired";
    if (diffH < 24) return isAr ? `تنتهي بعد ${diffH}س` : `${diffH}h left`;
    return "";
  }

  if (!mounted || loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"Rubik,sans-serif",color:"#888" }}>
      {isAr ? "جارٍ التحميل..." : "Loading..."}
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }

        .msg-root {
          height: 100vh;
          font-family: 'Rubik', sans-serif;
          background: #f5f7fa;
          overflow: hidden;
        }

        /* ── المحتوى الرئيسي ── */
        .msg-main {
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: margin .3s cubic-bezier(.4,0,.2,1);
          min-width: 0;
        }

        /* ── Header ── */
        .msg-header {
          background: #0863ba;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .msg-header-icon {
          width: 40px; height: 40px;
          background: rgba(255,255,255,.15);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0;
        }
        .msg-header-title { font-size: 16px; font-weight: 800; color: #fff; }
        .msg-header-sub   { font-size: 12px; color: rgba(255,255,255,.7); }
        .msg-header-badge {
          margin-inline-start: auto;
          font-size: 11px;
          color: rgba(255,255,255,.65);
          background: rgba(255,255,255,.12);
          border-radius: 8px;
          padding: 4px 10px;
          white-space: nowrap;
        }

        /* ── قائمة الرسائل ── */
        .msg-list {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          -webkit-overflow-scrolling: touch;
        }
        .msg-empty {
          text-align: center; color: #aaa; margin-top: 60px; font-size: 14px; line-height: 1.8;
        }

        /* ── فقاعة رسالة ── */
        .msg-bubble-wrap { display: flex; }
        .msg-bubble-wrap.me  { justify-content: flex-end; }
        .msg-bubble-wrap.them { justify-content: flex-start; }

        .msg-bubble {
          max-width: 75%;
          padding: 10px 14px;
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
          box-shadow: 0 1px 4px rgba(0,0,0,.08);
        }
        .msg-bubble.me {
          background: #0863ba; color: #fff;
          border-radius: 16px 16px 4px 16px;
        }
        .msg-bubble.them {
          background: #fff; color: #1a2840;
          border-radius: 16px 16px 16px 4px;
        }
        .msg-bubble-sender {
          font-size: 11px; font-weight: 700; color: #0863ba; margin-bottom: 4px;
        }
        .msg-bubble-meta {
          font-size: 10px; opacity: .5; margin-top: 4px;
          display: flex; justify-content: space-between; gap: 8px;
        }
        .msg-bubble-expiry { color: #e67e22; }
        .msg-bubble.me .msg-bubble-expiry { color: rgba(255,255,255,.7); }

        /* ── صندوق الإدخال ── */
        .msg-input-bar {
          background: #fff;
          border-top: 1.5px solid #eef0f3;
          padding: 10px 14px;
          display: flex;
          gap: 10px;
          align-items: flex-end;
          flex-shrink: 0;
        }
        .msg-textarea {
          flex: 1;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1.5px solid #e0e0e0;
          font-family: 'Rubik', sans-serif;
          font-size: 14px;
          resize: none;
          outline: none;
          line-height: 1.6;
          transition: border-color .2s;
          min-width: 0;
        }
        .msg-textarea:focus { border-color: #0863ba; }
        .msg-send-btn {
          padding: 10px 18px;
          border-radius: 12px;
          background: #0863ba;
          color: #fff;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 700;
          font-family: 'Rubik', sans-serif;
          white-space: nowrap;
          flex-shrink: 0;
          transition: opacity .2s;
        }
        .msg-send-btn:disabled { opacity: .45; cursor: default; }

        .msg-error {
          background: #fdf0f0; border-top: 1px solid #fcc;
          padding: 8px 16px; color: #c0392b; font-size: 13px; text-align: center;
        }

        /* ═══════════════════════════════════
           MOBILE
        ═══════════════════════════════════ */
        @media (max-width: 768px) {
          .msg-main {
            position: fixed;
            top: 0; left: 0; right: 0;
            bottom: 72px;
            margin: 0 !important;
            height: auto;
          }
          .msg-header {
            padding: 12px 14px;
            padding-inline-start: 60px; /* مساحة لزر البرجر */
          }
          .msg-header-badge { display: none; }
          .msg-header-title { font-size: 15px; }
          .msg-list {
            padding: 12px 12px 8px;
            /* padding-bottom يحسب تلقائياً بالـ safe area */
            padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
          }
          .msg-bubble { max-width: 88%; font-size: 13px; }
          .msg-input-bar {
            padding: 8px 10px;
            padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
            gap: 8px;
          }
          .msg-textarea { font-size: 14px; padding: 9px 12px; }
          .msg-send-btn { padding: 9px 14px; font-size: 13px; }
        }
      `}</style>

      <div
        className="msg-root"
        style={{ direction: isAr ? "rtl" : "ltr" }}
      >
        <PageIntro pageKey="messages" lang={lang} />
        <SharedSidebar
          lang={lang as "ar"|"en"}
          setLang={setLang as (l:"ar"|"en")=>void}
          activePage="messages"
          plan={plan}
          planLoading={loading}
          onCollapse={(c) => setSidebarWidth(c ? 70 : 240)}
        />

        {/* ── المحتوى الرئيسي ── */}
        <div
          className="msg-main"
          style={{ [isAr ? "marginRight" : "marginLeft"]: sidebarWidth }}
        >
          {/* Header */}
          <div className="msg-header">
            <div className="msg-header-icon"><AppIcon glyph="💬" /></div>
            <div>
              <div className="msg-header-title">{isAr ? "المراسلة" : "Messages"}</div>
              <div className="msg-header-sub">{isAr ? "التواصل مع فريق نبض" : "Contact NABD Team"}</div>
            </div>
            <div className="msg-header-badge">
              {isAr ? "الرسائل تُحذف تلقائياً بعد 48 ساعة" : "Messages auto-delete after 48h"}
            </div>
          </div>

          {/* قائمة الرسائل */}
          <div className="msg-list">
            {messages.length === 0 && (
              <div className="msg-empty">
                {isAr
                  ? "لا توجد رسائل بعد.\nسيتواصل معك فريق نبض قريباً "
                  : "No messages yet.\nThe NABD team will reach out to you soon "}
              </div>
            )}

            {messages.map(msg => {
              const isMe = msg.from_role === "doctor";
              const expiry = msg.expires_at ? getExpiryLabel(msg.expires_at) : "";
              return (
                <div key={msg.id} className={`msg-bubble-wrap ${isMe ? "me" : "them"}`}>
                  <div className={`msg-bubble ${isMe ? "me" : "them"}`}>
                    {!isMe && <div className="msg-bubble-sender">نبض <AppIcon glyph="💙" /></div>}
                    {msg.body}
                    <div className="msg-bubble-meta">
                      <span>{formatTime(msg.created_at)}</span>
                      {expiry && <span className="msg-bubble-expiry">{expiry}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* خطأ */}
          {error && <div className="msg-error">{error}</div>}

          {/* صندوق الكتابة */}
          <div className="msg-input-bar">
            <textarea
              className="msg-textarea"
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder={isAr
                ? "اكتب رسالتك... (Enter للإرسال)"
                : "Type a message... (Enter to send)"}
              rows={2}
            />
            <button
              className="msg-send-btn"
              onClick={sendMessage}
              disabled={sending || !body.trim()}
            >
              {sending ? "..." : (isAr ? "إرسال" : "Send")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
