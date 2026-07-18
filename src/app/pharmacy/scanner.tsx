"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════════
// ماسح الباركود بكاميرا الجهاز (يعمل على الهاتف والكمبيوتر)
// يستخدم html5-qrcode مع تحميل ديناميكي لتفادي مشاكل SSR
// ═══════════════════════════════════════════════════════════════
type ScannerProps = {
  onScan: (code: string) => void;
  onClose: () => void;
  lang: "ar" | "en";
  title?: string;
};

export function CameraScanner({ onScan, onClose, lang, title }: ScannerProps) {
  const isAr = lang === "ar";
  const containerId = "nabd-qr-reader";
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const lastScan = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  useEffect(() => {
    let cancelled = false;
    let html5Qr: { stop: () => Promise<void>; clear: () => void } | null = null;

    (async () => {
      try {
        const mod = await import("html5-qrcode");
        if (cancelled) return;
        const Html5Qrcode = mod.Html5Qrcode;
        const instance = new Html5Qrcode(containerId, { verbose: false });
        html5Qr = instance as unknown as { stop: () => Promise<void>; clear: () => void };
        scannerRef.current = html5Qr;

        await instance.start(
          { facingMode: "environment" }, // الكاميرا الخلفية على الهاتف
          { fps: 10, qrbox: { width: 250, height: 160 }, aspectRatio: 1.4 },
          (decodedText: string) => {
            // منع القراءة المكررة لنفس الكود خلال 1.5 ثانية
            const now = Date.now();
            if (decodedText === lastScan.current.code && now - lastScan.current.at < 1500) return;
            lastScan.current = { code: decodedText, at: now };
            // اهتزاز خفيف كتأكيد (إن كان مدعومًا)
            if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(60);
            onScan(decodedText.trim());
          },
          () => { /* تجاهل أخطاء الإطار غير الحاوي على باركود */ }
        );
        if (!cancelled) setReady(true);
      } catch (e) {
        console.error("scanner error:", e);
        if (!cancelled) setError(isAr ? "تعذّر تشغيل الكاميرا. تأكد من منح صلاحية الوصول للكاميرا." : "Could not start camera. Check camera permission.");
      }
    })();

    return () => {
      cancelled = true;
      if (html5Qr) {
        html5Qr.stop().then(() => html5Qr?.clear()).catch(() => {});
      }
    };
  }, [onScan, isAr]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "#111", borderRadius: 22, padding: "18px", width: "min(96vw,420px)", boxShadow: "0 24px 80px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>📷 {title || (isAr ? "مسح الباركود" : "Scan Barcode")}</h2>
          <button onClick={onClose} style={{ border: "none", background: "rgba(255,255,255,.12)", color: "#fff", cursor: "pointer", fontSize: 18, width: 34, height: 34, borderRadius: "50%" }}>✕</button>
        </div>
        {error ? (
          <div style={{ background: "rgba(231,76,60,.15)", border: "1.5px solid rgba(231,76,60,.4)", borderRadius: 12, padding: "20px", textAlign: "center", color: "#ff9b8f" }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>📵</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{error}</div>
          </div>
        ) : (
          <>
            <div id={containerId} style={{ width: "100%", borderRadius: 14, overflow: "hidden", background: "#000", minHeight: 240 }} />
            <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: ready ? "#4ade80" : "#888", fontWeight: 600 }}>
              {ready ? (isAr ? "● الكاميرا جاهزة — وجّهها نحو الباركود" : "● Ready — point at barcode") : (isAr ? "جارِ تشغيل الكاميرا..." : "Starting camera...")}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// قناة المزامنة اللحظية بين أجهزة نفس الحساب (Supabase Realtime)
// كل جهاز مفتوح على نفس user_id يستقبل أحداث المسح فورًا
// ═══════════════════════════════════════════════════════════════
export type ScanEvent = {
  code: string;
  mode: string;        // inventory | sale | stock_in | stock_out | query | return
  device: string;      // معرّف الجهاز المرسِل
  ts: number;
};

export function usePharmacyChannel(
  supabase: SupabaseClient,
  userId: string | null,
  onRemoteScan: (ev: ScanEvent) => void
) {
  const channelRef = useRef<ReturnType<SupabaseClient["channel"]> | null>(null);
  const [online, setOnline] = useState(false);
  const [peers, setPeers] = useState(0);
  const deviceId = useRef<string>(
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random())
  );
  const cbRef = useRef(onRemoteScan);
  cbRef.current = onRemoteScan;

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`pharmacy:${userId}`, {
      config: { broadcast: { self: false }, presence: { key: deviceId.current } },
    });
    channelRef.current = channel;

    channel.on("broadcast", { event: "scan" }, (payload: { payload: ScanEvent }) => {
      cbRef.current(payload.payload);
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      setPeers(Object.keys(state).length);
    });

    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        setOnline(true);
        channel.track({ device: deviceId.current, at: Date.now() });
      } else {
        setOnline(false);
      }
    });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setOnline(false);
    };
  }, [supabase, userId]);

  // بثّ حدث مسح لكل الأجهزة الأخرى
  const broadcastScan = useCallback((code: string, mode: string) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "scan",
      payload: { code, mode, device: deviceId.current, ts: Date.now() } as ScanEvent,
    });
  }, []);

  return { online, peers, broadcastScan, deviceId: deviceId.current };
}
