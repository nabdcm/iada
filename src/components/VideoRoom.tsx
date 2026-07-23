"use client";

// ============================================================
// VideoRoom — غرفة فيديو Daily.co مدمجة (Prebuilt عبر CDN)
// لا يحتاج أي طرف لتسجيل دخول — التوكن يُولَّد على الخادم
// ============================================================

import { useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  interface Window { DailyIframe?: any }
}

const DAILY_CDN = "https://unpkg.com/@daily-co/daily-js";

type Props = {
  roomUrl: string;
  token?: string;
  displayName?: string;
  onLeave?: () => void;
  lang?: "ar" | "en";
};

function loadDailyScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.DailyIframe) { resolve(); return; }
    const existing = document.getElementById("daily-js-sdk") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("load failed")));
      return;
    }
    const s = document.createElement("script");
    s.id = "daily-js-sdk";
    s.src = DAILY_CDN;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("load failed"));
    document.body.appendChild(s);
  });
}

export default function VideoRoom({ roomUrl, token, displayName, onLeave, lang = "ar" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const isAr = lang === "ar";

  useEffect(() => {
    let disposed = false;
    if (!roomUrl) return;

    loadDailyScript()
      .then(() => {
        if (disposed || !containerRef.current || !window.DailyIframe) return;

        const frame = window.DailyIframe.createFrame(containerRef.current, {
          showLeaveButton: true,
          showFullscreenButton: true,
          iframeStyle: {
            width: "100%",
            height: "100%",
            border: "0",
            borderRadius: "16px",
          },
        });
        frameRef.current = frame;

        frame.on("left-meeting", () => { onLeave?.(); });
        frame.on("error", () => { setStatus("error"); });

        frame
          .join({ url: roomUrl, ...(token ? { token } : {}), ...(displayName ? { userName: displayName } : {}) })
          .then(() => { if (!disposed) setStatus("ready"); })
          .catch(() => { if (!disposed) setStatus("error"); });
      })
      .catch(() => { if (!disposed) setStatus("error"); });

    return () => {
      disposed = true;
      try { frameRef.current?.destroy?.(); } catch { /* ignore */ }
      frameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomUrl, token]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#0b1f3a", borderRadius: 16, overflow: "hidden" }}>
      {status !== "ready" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", gap: 14, zIndex: 2 }}>
          {status === "loading" ? (
            <>
              <div style={{ width: 42, height: 42, border: "3px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "vrSpin 1s linear infinite" }} />
              <span style={{ fontSize: 14, fontFamily: "'Rubik',sans-serif" }}>{isAr ? "جارٍ تجهيز الغرفة..." : "Preparing room..."}</span>
              <style>{`@keyframes vrSpin{to{transform:rotate(360deg)}}`}</style>
            </>
          ) : (
            <span style={{ fontSize: 14, fontFamily: "'Rubik',sans-serif", textAlign: "center", padding: 20, lineHeight: 1.9 }}>
              {isAr ? "تعذّر تحميل غرفة الفيديو. تحقق من الإنترنت وأعد المحاولة." : "Failed to load video room. Check your connection and retry."}
            </span>
          )}
        </div>
      )}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
