"use client";
// ============================================================
// NABD - نبض | Messages Page — صفحة الرسائل
// Route: /messages
// ============================================================

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
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

// ADMIN_ID ثابت — الأدمن يُعرَّف بأنه من from_role=admin أو يُجلب من قاعدة البيانات
const ADMIN_WELL_KNOWN_ROLE = "admin";

export default function MessagesPage() {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [lang, setLang]         = useState<Lang>("ar");
  const [userId, setUserId]     = useState<string>("");
  const [plan, setPlan]         = useState<PlanType>("basic");
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody]         = useState("");
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [adminId, setAdminId]   = useState<string>("");
  const [error, setError]       = useState<string>("");
  const bottomRef               = useRef<HTMLDivElement>(null);

  const isAr = lang === "ar";

  // تحميل المستخدم والرسائل
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      setUserId(user.id);

      // جلب اللغة من localStorage
      const savedLang = localStorage.getItem("lang") as Lang | null;
      if (savedLang) setLang(savedLang);

      // جلب الخطة
      const { data: cl } = await supabase.from("clinics").select("plan").eq("user_id", user.id).single();
      if (cl?.plan) setPlan(cl.plan as PlanType);

      // جلب الرسائل
      await loadMessages(user.id);
      setLoading(false);

      // تعليم كل الرسائل الواردة كمقروءة
      await supabase.from("clinic_messages")
        .update({ is_read: true })
        .eq("to_id", user.id)
        .eq("is_read", false);
    })();
  }, []);

  // Realtime — الجدول الصحيح هو clinic_messages
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`messages-clinic-${userId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "clinic_messages",          // ✅ الجدول الصحيح
        filter: `to_id=eq.${userId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => [...prev, newMsg]);
        // استخراج adminId من أول رسالة واردة
        if (newMsg.from_role === ADMIN_WELL_KNOWN_ROLE && !adminId) {
          setAdminId(newMsg.from_id);
        }
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        supabase.from("clinic_messages").update({ is_read: true }).eq("id", newMsg.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // تمرير للأسفل عند التحميل
  useEffect(() => {
    if (!loading) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
  }, [loading]);

  async function loadMessages(uid: string) {
    const { data, error: fetchError } = await supabase
      .from("clinic_messages")
      .select("*")
      .or(`from_id.eq.${uid},to_id.eq.${uid}`)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("loadMessages error:", fetchError);
      return;
    }

    setMessages(data ?? []);

    // استخراج ID الأدمن من الرسائل
    const adminMsg = (data ?? []).find((m: Message) => m.from_role === ADMIN_WELL_KNOWN_ROLE);
    if (adminMsg) setAdminId(adminMsg.from_id);
  }

  async function sendMessage() {
    if (!body.trim() || !userId) return;

    // إذا لم نجد adminId من الرسائل، نحاول إرسال رسالة للأدمن عبر API
    if (!adminId) {
      setError(isAr ? "لا يمكن الإرسال الآن — لم يتواصل فريق نبض بعد. سيتم الرد عليك قريباً." : "Cannot send yet — NABD team hasn't initiated contact. You'll hear from us soon.");
      setTimeout(() => setError(""), 4000);
      return;
    }

    setSending(true);
    setError("");
    const { error: insertError } = await supabase.from("clinic_messages").insert({
      from_id: userId,
      to_id: adminId,
      from_role: "doctor",
      body: body.trim(),
    });

    if (!insertError) {
      setBody("");
      await loadMessages(userId);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } else {
      setError(isAr ? "حدث خطأ أثناء الإرسال" : "Error sending message");
    }
    setSending(false);
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString(isAr ? "ar-SA" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function getExpiryLabel(iso: string): string {
    const exp = new Date(iso);
    const now = new Date();
    const diffH = Math.round((exp.getTime() - now.getTime()) / 3600000);
    if (diffH <= 0) return isAr ? "انتهت صلاحيتها" : "Expired";
    if (diffH < 2) return isAr ? `تنتهي بعد ${diffH} ساعة` : `Expires in ${diffH}h`;
    if (diffH < 24) return isAr ? `تنتهي بعد ${diffH} ساعة` : `Expires in ${diffH}h`;
    return "";
  }

  if (loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"Rubik,sans-serif",color:"#888" }}>
      {isAr ? "جارٍ التحميل..." : "Loading..."}
    </div>
  );

  return (
    <div style={{ display:"flex",height:"100vh",fontFamily:"Rubik,sans-serif",direction: isAr?"rtl":"ltr",background:"#f5f7fa" }}>
      <SharedSidebar lang={lang as "ar"|"en"} setLang={setLang as (l:"ar"|"en")=>void} activePage="messages" plan={plan} onCollapse={(c) => setSidebarWidth(c ? 70 : 240)} />

      {/* المحادثة */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",[isAr?"marginRight":"marginLeft"]:sidebarWidth,transition:"margin .3s" }}>
        {/* Header */}
        <div style={{ background:"#0863ba",padding:"16px 20px",display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:40,height:40,background:"rgba(255,255,255,.15)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>💬</div>
          <div>
            <div style={{ fontSize:16,fontWeight:800,color:"#fff" }}>{isAr ? "المراسلة" : "Messages"}</div>
            <div style={{ fontSize:12,color:"rgba(255,255,255,.7)" }}>{isAr ? "التواصل مع فريق نبض" : "Contact NABD Team"}</div>
          </div>
          <div style={{ marginRight:"auto",fontSize:11,color:"rgba(255,255,255,.6)",background:"rgba(255,255,255,.1)",borderRadius:8,padding:"4px 10px" }}>
            {isAr ? "الرسائل تُحذف تلقائياً بعد 48 ساعة" : "Messages auto-delete after 48h"}
          </div>
        </div>

        {/* الرسائل */}
        <div style={{ flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:10 }}>
          {messages.length === 0 && (
            <div style={{ textAlign:"center",color:"#aaa",marginTop:60,fontSize:14 }}>
              {isAr ? "لا توجد رسائل بعد. سيتواصل معك فريق نبض قريباً 👋" : "No messages yet. The NABD team will reach out to you soon 👋"}
            </div>
          )}
          {messages.map(msg => {
            const isMe = msg.from_role === "doctor";
            const expiry = msg.expires_at ? getExpiryLabel(msg.expires_at) : "";
            return (
              <div key={msg.id} style={{ display:"flex",justifyContent: isMe ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth:"75%", padding:"10px 14px", borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: isMe ? "#0863ba" : "#fff",
                  color: isMe ? "#fff" : "#1a2840",
                  boxShadow: "0 1px 4px rgba(0,0,0,.08)",
                  fontSize: 14, lineHeight: 1.6, whiteSpace:"pre-wrap",
                }}>
                  {!isMe && <div style={{ fontSize:11,fontWeight:700,color:"#0863ba",marginBottom:4 }}>نبض 💙</div>}
                  {msg.body}
                  <div style={{ fontSize:10,opacity:.5,marginTop:4,display:"flex",justifyContent:"space-between",gap:8 }}>
                    <span>{formatTime(msg.created_at)}</span>
                    {expiry && <span style={{ color: isMe ? "rgba(255,255,255,.6)" : "#e67e22" }}>{expiry}</span>}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* رسالة خطأ */}
        {error && (
          <div style={{ background:"#fdf0f0",borderTop:"1px solid #fcc",padding:"8px 16px",color:"#c0392b",fontSize:13,textAlign:"center" }}>
            {error}
          </div>
        )}

        {/* صندوق الكتابة */}
        <div style={{ background:"#fff",borderTop:"1px solid #eef0f3",padding:"12px 16px",display:"flex",gap:10,alignItems:"flex-end" }}>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={isAr ? "اكتب رسالتك... (Enter للإرسال، Shift+Enter لسطر جديد)" : "Type a message... (Enter to send, Shift+Enter for new line)"}
            rows={2}
            style={{ flex:1,padding:"10px 14px",borderRadius:12,border:"1.5px solid #e0e0e0",fontFamily:"Rubik,sans-serif",fontSize:14,resize:"none",outline:"none",lineHeight:1.6 }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !body.trim() || !adminId}
            style={{ padding:"10px 20px",borderRadius:12,background:"#0863ba",color:"#fff",border:"none",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"Rubik,sans-serif",opacity:(sending||!body.trim()||!adminId)?0.5:1,whiteSpace:"nowrap" }}>
            {sending ? "..." : (isAr ? "إرسال" : "Send")}
          </button>
        </div>
      </div>
    </div>
  );
}
