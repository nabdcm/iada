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

// adminId يُجلب ديناميكياً من أول رسالة أدمن

export default function MessagesPage() {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [lang, setLang]         = useState<Lang>("ar");
  const [userId, setUserId]     = useState<string>("");
  const [plan, setPlan]         = useState<PlanType>("basic");
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody]         = useState("");
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const bottomRef               = useRef<HTMLDivElement>(null);

  const isAr = lang === "ar";

  // تحميل المستخدم والرسائل
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      setUserId(user.id);

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

  // Realtime
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `to_id=eq.${userId}`,  // رسائل واردة للطبيب
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        supabase.from("clinic_messages").update({ is_read: true }).eq("id", (payload.new as Message).id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // تمرير للأسفل عند التحميل
  useEffect(() => {
    if (!loading) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
  }, [loading]);

  const [adminSenderId, setAdminSenderId] = useState<string>("");

  async function loadMessages(uid: string) {
    const { data } = await supabase
      .from("clinic_messages")
      .select("*")
      .or(`from_id.eq.${uid},to_id.eq.${uid}`)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
    // استخراج ID الأدمن من الرسائل الواردة
    const adminMsg = (data ?? []).find((m: any) => m.from_role === "admin");
    if (adminMsg) setAdminSenderId(adminMsg.from_id);
  }

  async function sendMessage() {
    if (!body.trim() || !userId) return;
    setSending(true);
    const { error } = await supabase.from("clinic_messages").insert({
      from_id: userId, to_id: adminSenderId,  // ID الأدمن من آخر رسالة
      from_role: "doctor", body: body.trim(),
    });
    if (!error) {
      setBody("");
      await loadMessages(userId);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    setSending(false);
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString(isAr ? "ar-SA" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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
        </div>

        {/* الرسائل */}
        <div style={{ flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:10 }}>
          {messages.length === 0 && (
            <div style={{ textAlign:"center",color:"#aaa",marginTop:60,fontSize:14 }}>
              {isAr ? "لا توجد رسائل بعد. ابدأ المحادثة مع فريق نبض 👋" : "No messages yet. Start a conversation with NABD team 👋"}
            </div>
          )}
          {messages.map(msg => {
            const isMe = msg.from_role === "doctor";
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
                  <div style={{ fontSize:10,opacity:.6,marginTop:4,textAlign: isMe ? "left" : "right" }}>
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* صندوق الكتابة */}
        <div style={{ background:"#fff",borderTop:"1px solid #eef0f3",padding:"12px 16px",display:"flex",gap:10,alignItems:"flex-end" }}>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={isAr ? "اكتب رسالتك... (Enter للإرسال)" : "Type a message... (Enter to send)"}
            rows={2}
            style={{ flex:1,padding:"10px 14px",borderRadius:12,border:"1.5px solid #e0e0e0",fontFamily:"Rubik,sans-serif",fontSize:14,resize:"none",outline:"none",lineHeight:1.6 }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !body.trim()}
            style={{ padding:"10px 20px",borderRadius:12,background:"#0863ba",color:"#fff",border:"none",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"Rubik,sans-serif",opacity:sending||!body.trim()?0.5:1,whiteSpace:"nowrap" }}>
            {sending ? "..." : (isAr ? "إرسال" : "Send")}
          </button>
        </div>
      </div>
    </div>
  );
}
