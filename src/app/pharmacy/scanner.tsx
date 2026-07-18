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
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void; getState?: () => number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(true);
  const lastScan = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const startedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let instance: {
      start: (a: unknown, b: unknown, c: (t: string) => void, d: (e: string) => void) => Promise<void>;
      stop: () => Promise<void>; clear: () => void; getState?: () => number;
    } | null = null;

    const handleDecoded = (decodedText: string) => {
      const now = Date.now();
      if (decodedText === lastScan.current.code && now - lastScan.current.at < 1500) return;
      lastScan.current = { code: decodedText, at: now };
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(60);
      onScan(decodedText.trim());
    };

    (async () => {
      try {
        if (typeof window === "undefined") return;
        // تأكد أن المتصفح يدعم الكاميرا أصلًا
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("NO_MEDIA_DEVICES");
        }
        const mod = await import("html5-qrcode");
        if (cancelled) return;
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = mod;

        // كل صيغ باركود الأدوية الشائعة (خطي) + QR
        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.QR_CODE,
        ];

        instance = new Html5Qrcode(containerId, { formatsToSupport, verbose: false }) as unknown as typeof instance;
        scannerRef.current = instance as unknown as { stop: () => Promise<void>; clear: () => void };

        // صندوق مسح عريض يناسب الباركود الخطي، ونسبيّ لعرض الشاشة
        const qrboxFn = (vw: number, vh: number) => {
          const w = Math.floor(Math.min(vw, vh) * 0.82);
          return { width: w, height: Math.floor(w * 0.62) };
        };

        const config = { fps: 10, qrbox: qrboxFn, aspectRatio: 1.3333, disableFlip: false };

        // محاولة الكاميرا الخلفية أولًا، ثم أي كاميرا كاحتياط
        try {
          await instance!.start({ facingMode: { exact: "environment" } }, config, handleDecoded, () => {});
        } catch {
          if (cancelled) return;
          await instance!.start({ facingMode: "environment" }, config, handleDecoded, () => {});
        }
        startedRef.current = true;
        if (!cancelled) { setReady(true); setStarting(false); }
      } catch (e) {
        console.error("scanner error:", e);
        if (cancelled) return;
        setStarting(false);
        const msg = String((e as Error)?.message || e);
        if (msg.includes("NO_MEDIA_DEVICES")) {
          setError(isAr ? "المتصفح لا يدعم الكاميرا. جرّب Chrome أو Safari محدّثًا." : "Browser has no camera support. Try updated Chrome/Safari.");
        } else if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
          setError(isAr ? "تم رفض إذن الكاميرا. فعّل الإذن من إعدادات المتصفح ثم أعد المحاولة." : "Camera permission denied. Enable it in browser settings.");
        } else if (msg.includes("NotFoundError") || msg.includes("no camera") || msg.includes("Requested device not found")) {
          setError(isAr ? "لم يُعثر على كاميرا في الجهاز." : "No camera found on this device.");
        } else if (msg.includes("NotReadableError") || msg.includes("in use")) {
          setError(isAr ? "الكاميرا مشغولة بتطبيق آخر. أغلق التطبيقات الأخرى وأعد المحاولة." : "Camera in use by another app.");
        } else if (msg.includes("secure") || msg.includes("https") || msg.includes("insecure")) {
          setError(isAr ? "الكاميرا تعمل فقط عبر اتصال آمن (HTTPS)." : "Camera requires a secure (HTTPS) connection.");
        } else {
          setError((isAr ? "تعذّر تشغيل الكاميرا: " : "Could not start camera: ") + msg);
        }
      }
    })();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s && startedRef.current) {
        // أوقف فقط إن كانت الكاميرا قد بدأت فعلًا (تفادي خطأ stop قبل start)
        Promise.resolve().then(() => s.stop()).then(() => s.clear()).catch(() => {});
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
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.6 }}>{error}</div>
            <button onClick={onClose} style={{ marginTop: 14, padding: "8px 18px", background: "rgba(255,255,255,.12)", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Rubik',sans-serif" }}>{isAr ? "إغلاق" : "Close"}</button>
          </div>
        ) : (
          <>
            <div id={containerId} style={{ width: "100%", borderRadius: 14, overflow: "hidden", background: "#000", minHeight: 260 }} />
            <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: ready ? "#4ade80" : "#888", fontWeight: 600 }}>
              {ready ? (isAr ? "● وجّه الكاميرا نحو باركود الدواء" : "● Point at the barcode") : starting ? (isAr ? "جارِ تشغيل الكاميرا..." : "Starting camera...") : ""}
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
