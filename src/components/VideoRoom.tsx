"use client";

// ============================================================
// VideoRoom — غرفة فيديو Jitsi مدمجة (بدون حزم npm)
// تحمّل external_api.js من meet.jit.si وتُنشئ الغرفة داخل الصفحة
// ============================================================

import { useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  interface Window { JitsiMeetExternalAPI?: any }
}

const JITSI_DOMAIN = "meet.jit.si";

type Props = {
  roomName: string;
  displayName: string;
  isDoctor?: boolean;
  onLeave?: () => void;
  lang?: "ar" | "en";
};

function loadJitsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) { resolve(); return; }
    const existing = document.getElementById("jitsi-external-api");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("load failed")));
      return;
    }
    const s = document.createElement("script");
    s.id = "jitsi-external-api";
    s.src = `https://${JITSI_DOMAIN}/external_api.js`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("load failed"));
    document.body.appendChild(s);
  });
}

export default function VideoRoom({ roomName, displayName, isDoctor = false, onLeave, lang = "ar" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const isAr = lang === "ar";

  useEffect(() => {
    let disposed = false;

    loadJitsiScript()
      .then(() => {
        if (disposed || !containerRef.current || !window.JitsiMeetExternalAPI) return;
        const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName },
          lang: isAr ? "ar" : "en",
          configOverwrite: {
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            enableWelcomePage: false,
          },
          interfaceConfigOverwrite: {
            MOBILE_APP_PROMO: false,
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DEFAULT_BACKGROUND: "#044d96",
            TOOLBAR_BUTTONS: [
              "microphone", "camera", "desktop", "fullscreen",
              "hangup", "chat", "settings", "raisehand", "tileview",
            ],
          },
        });
        apiRef.current = api;
        setStatus("ready");
        api.addEventListener("readyToClose", () => { onLeave?.(); });
        api.addEventListener("videoConferenceLeft", () => { onLeave?.(); });
      })
      .catch(() => { if (!disposed) setStatus("error"); });

    return () => {
      disposed = true;
      try { apiRef.current?.dispose?.(); } catch { /* ignore */ }
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#044d96", borderRadius: 16, overflow: "hidden" }}>
      {status !== "ready" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", gap: 14, zIndex: 2 }}>
          {status === "loading" ? (
            <>
              <div style={{ width: 42, height: 42, border: "3px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "vrSpin 1s linear infinite" }} />
              <span style={{ fontSize: 14, fontFamily: "'Rubik',sans-serif" }}>{isAr ? "جارٍ تجهيز الغرفة..." : "Preparing room..."}</span>
              <style>{`@keyframes vrSpin{to{transform:rotate(360deg)}}`}</style>
            </>
          ) : (
            <span style={{ fontSize: 14, fontFamily: "'Rubik',sans-serif", textAlign: "center", padding: 20 }}>
              {isAr ? "تعذّر تحميل غرفة الفيديو. تحقق من الإنترنت وأعد المحاولة." : "Failed to load video room. Check your connection and retry."}
            </span>
          )}
        </div>
      )}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
