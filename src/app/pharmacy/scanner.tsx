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
  /** وضع مستمر (فورم البيع): لا تُغلق الكاميرا بعد المسح، كل قراءة تُضاف مباشرة */
  continuous?: boolean;
};

export function CameraScanner({ onScan, onClose, lang, title, continuous = false }: ScannerProps) {
  const isAr = lang === "ar";
  const containerId = "nabd-qr-reader";
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void; getState?: () => number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(true);
  const lastScan = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  // تأكيد القراءة: لا نقبل الكود إلا بعد قراءته متطابقًا عدة مرات متتالية
  const confirm = useRef<{ code: string; hits: number; at: number }>({ code: "", hits: 0, at: 0 });
  const startedRef = useRef(false);
  const doneRef = useRef(false); // منع أي معالجة بعد أول مسح ناجح
  const onScanRef = useRef(onScan);   onScanRef.current = onScan;
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose;
  const continuousRef = useRef(continuous); continuousRef.current = continuous;
  const [lastAdded, setLastAdded] = useState<string>("");
  const [scanCount, setScanCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let instance: {
      start: (a: unknown, b: unknown, c: (t: string) => void, d: (e: string) => void) => Promise<void>;
      stop: () => Promise<void>; clear: () => void; getState?: () => number;
    } | null = null;

    // فحص checksum لباركود EAN/UPC الرقمي — يرفض القراءات المشوّهة
    const validChecksum = (c: string): boolean => {
      if (!/^\d+$/.test(c)) return true; // غير رقمي (Code128/QR) — لا checksum قياسي
      if (![8, 12, 13].includes(c.length)) return c.length >= 4; // أطوال أخرى: نقبلها كما هي
      let sum = 0;
      for (let i = 0; i < c.length - 1; i++) {
        const d = c.charCodeAt(c.length - 2 - i) - 48;
        sum += i % 2 === 0 ? d * 3 : d;
      }
      return (10 - (sum % 10)) % 10 === c.charCodeAt(c.length - 1) - 48;
    };

    const handleDecoded = (raw: string) => {
      if (doneRef.current) return;
      const now = Date.now();
      const candidate = raw.trim();
      if (!validChecksum(candidate)) return; // قراءة مشوّهة — تجاهل

      // تصويت: نفس الكود يجب أن يُقرأ 3 مرات متتالية خلال ثانية ليُقبل
      const cf = confirm.current;
      if (candidate === cf.code && now - cf.at < 1000) { cf.hits += 1; cf.at = now; }
      else { confirm.current = { code: candidate, hits: 1, at: now }; }
      if (confirm.current.hits < 3) return;
      confirm.current = { code: "", hits: 0, at: 0 };

      const decodedText = candidate;
      if (decodedText === lastScan.current.code && now - lastScan.current.at < 1500) return;
      lastScan.current = { code: decodedText, at: now };
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(60);
      const code = decodedText.trim();
      if (continuousRef.current) {
        // وضع البيع المستمر: أضف مباشرة وواصل المسح دون إغلاق
        onScanRef.current(code);
        setLastAdded(code); setScanCount(c => c + 1);
        return;
      }
      doneRef.current = true;
      // أوقف الكاميرا فورًا ثم أغلق النافذة تلقائيًا وبلّغ بالنتيجة
      const s = scannerRef.current;
      const finish = () => { onScanRef.current(code); onCloseRef.current(); };
      if (s && startedRef.current) {
        s.stop().then(() => s.clear()).catch(() => {}).finally(finish);
      } else finish();
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
        // فقط الصيغ الموثوقة ذات checksum — الصيغ الأخرى (ITF/CODE_39/CODABAR) كانت سبب القراءات الخاطئة
        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.QR_CODE,
        ];

        instance = new Html5Qrcode(containerId, { formatsToSupport, verbose: false }) as unknown as typeof instance;
        scannerRef.current = instance as unknown as { stop: () => Promise<void>; clear: () => void };

        // صندوق مسح عريض يناسب الباركود الخطي، ونسبيّ لعرض الشاشة
        const qrboxFn = (vw: number, vh: number) => {
          const w = Math.floor(Math.min(vw, vh) * 0.82);
          return { width: w, height: Math.floor(w * 0.62) };
        };

        const config = {
          fps: 15, qrbox: qrboxFn, aspectRatio: 1.3333, disableFlip: false,
          // دقة أعلى = قراءة أدق للباركود الخطي
          videoConstraints: {
            facingMode: "environment",
            width: { ideal: 1920, max: 3840 }, height: { ideal: 1080, max: 2160 },
            // تركيز مستمر + تقريب خفيف إن دعمه الجهاز — يحسّن قراءة الخطوط الرفيعة
            advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
          },
        } as Record<string, unknown>;

        // محاولة الكاميرا الخلفية أولًا، ثم أي كاميرا كاحتياط
        try {
          await instance!.start({ facingMode: { exact: "environment" } }, config, handleDecoded, () => {});
        } catch {
          if (cancelled) return;
          delete (config as { videoConstraints?: unknown }).videoConstraints;
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
      if (s && startedRef.current && !doneRef.current) {
        // أوقف فقط إن كانت الكاميرا قد بدأت فعلًا (تفادي خطأ stop قبل start)
        Promise.resolve().then(() => s.stop()).then(() => s.clear()).catch(() => {});
      }
      scannerRef.current = null;
    };
    // deps فارغة عمدًا: تشغيل الكاميرا مرة واحدة فقط عند الفتح (كان إعادة إنشاء onScan يفتح كاميرا ثانية)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "#111", borderRadius: 22, padding: "18px", width: "min(96vw,420px)", boxShadow: "0 24px 80px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>📷 {title || (continuous ? (isAr ? "مسح البيع المستمر" : "Live Sale Scan") : (isAr ? "مسح الباركود" : "Scan Barcode"))}</h2>
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
            {continuous && scanCount > 0 && (
              <div key={scanCount} style={{ marginTop: 10, background: "rgba(74,222,128,.14)", border: "1.5px solid rgba(74,222,128,.45)", borderRadius: 11, padding: "9px 13px", display: "flex", alignItems: "center", gap: 9, animation: "barcodeIn .3s ease both" }}>
                <span style={{ fontSize: 17 }}>✅</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#4ade80" }}>{isAr ? "أُضيف للفاتورة" : "Added to sale"} ({scanCount})</div>
                  <div style={{ fontSize: 10, color: "#9fdcb6", fontFamily: "monospace", letterSpacing: 1, direction: "ltr" }}>{lastAdded}</div>
                </div>
              </div>
            )}
            {continuous && (
              <button onClick={onClose} style={{ width: "100%", marginTop: 12, padding: "12px", background: "linear-gradient(135deg,#8e44ad,#7a35a0)", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 800, fontFamily: "'Rubik',sans-serif", boxShadow: "0 5px 18px rgba(142,68,173,.4)" }}>
                {isAr ? "✔ إنهاء المسح والعودة للفاتورة" : "✔ Done — back to sale"}
              </button>
            )}
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
