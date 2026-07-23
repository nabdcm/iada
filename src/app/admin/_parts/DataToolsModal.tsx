"use client";
// ============================================================
// src/app/admin/_parts/DataToolsModal.tsx
// نافذة تصدير/استيراد بيانات العيادات — مستخرَجة من page.tsx
// ============================================================

import React, { useState, useRef } from "react";
import AppIcon from "@/components/AppIcon";
import { T } from "./translations";
import { exportClinicData, importClinicData, downloadJSON, downloadCSV, type ImportResult } from "./data-tools";
import type { Lang, ClinicData } from "./types";

interface DataToolsModalProps {
  lang: Lang;
  clinics: ClinicData[];
  onClose: () => void;
}

export const DataToolsModal = ({ lang, clinics, onClose }: DataToolsModalProps) => {
  const tr = T[lang];
  const dt = tr.dataTools;
  const isAr = lang === "ar";

  const [activeMode, setActiveMode]     = useState<"export" | "import">("export");
  const [selectedId,  setSelectedId]    = useState<string>("");
  const [exporting,   setExporting]     = useState(false);
  const [exportDone,  setExportDone]    = useState<"json"|"csv"|null>(null);

  // Import state
  const [importData,    setImportData]    = useState<Record<string, unknown> | null>(null);
  const [importing,     setImporting]     = useState(false);
  const [importResult,  setImportResult]  = useState<ImportResult | null>(null);
  const [importError,   setImportError]   = useState("");
  const [dragOver,      setDragOver]      = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const selectedClinic = clinics.find(c => c.user_id === selectedId);

  const handleExport = async (format: "json" | "csv") => {
    if (!selectedClinic?.user_id) return;
    setExporting(true);
    try {
      const data = await exportClinicData(selectedClinic);
      const safeName = selectedClinic.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_");
      const date = new Date().toISOString().slice(0, 10);
      if (format === "json") {
        downloadJSON(data, `NABD_${safeName}_${date}.json`);
      } else {
        downloadCSV(data.patients as Record<string, unknown>[], `NABD_${safeName}_patients_${date}.csv`);
      }
      setExportDone(format);
      setTimeout(() => setExportDone(null), 3000);
    } catch { /* ignore */ }
    setExporting(false);
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".json")) { setImportError(isAr ? "يجب أن يكون الملف بصيغة JSON" : "File must be JSON format"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        setImportData(parsed);
        setImportError("");
        setImportResult(null);
      } catch {
        setImportError(isAr ? "الملف غير صالح" : "Invalid file");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!selectedClinic?.user_id || !importData) return;
    setImporting(true);
    setImportError("");
    try {
      const result = await importClinicData(selectedClinic.user_id, importData);
      setImportResult(result);
    } catch (e: unknown) {
      setImportError(String(e));
    }
    setImporting(false);
  };

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "10px 14px", border: "1.5px solid #e8eaed",
    borderRadius: 10, fontFamily: "Rubik, sans-serif", fontSize: 13,
    color: "#353535", background: "#fafbfc", outline: "none",
    direction: isAr ? "rtl" : "ltr",
  };

  const meta = importData
    ? {
        patients:     ((importData.patients     as unknown[]) ?? []).length,
        appointments: ((importData.appointments as unknown[]) ?? []).length,
        payments:     ((importData.payments     as unknown[]) ?? []).length,
        clinicName:   (importData._meta as Record<string, string> | undefined)?.clinic_name ?? "—",
        exportedAt:   (importData._meta as Record<string, string> | undefined)?.exported_at?.slice(0, 10) ?? "—",
      }
    : null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(6px)" }} />
      <div style={{
        position: "relative", zIndex: 1, background: "#fff", borderRadius: 20,
        width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 32px 100px rgba(8,99,186,.2)",
        animation: "modalIn .25s cubic-bezier(.4,0,.2,1)",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1.5px solid #eef0f3", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg,rgba(8,99,186,.04),transparent)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: "rgba(8,99,186,.1)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}><AppIcon glyph="🗄️" /></div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#353535" }}>{dt.title}</h2>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: "#f5f5f5", border: "none", cursor: "pointer", fontSize: 15 }}>✕</button>
        </div>

        {/* Mode Tabs */}
        <div style={{ display: "flex", gap: 4, background: "#f7f9fc", margin: "16px 24px 0", borderRadius: 12, padding: 4 }}>
          {(["export","import"] as const).map(mode => (
            <button key={mode} onClick={() => setActiveMode(mode)} style={{
              flex: 1, padding: "9px", border: "none", borderRadius: 9, cursor: "pointer",
              fontFamily: "Rubik,sans-serif", fontSize: 13, fontWeight: activeMode === mode ? 700 : 400,
              background: activeMode === mode ? "#fff" : "transparent",
              color: activeMode === mode ? "#0863ba" : "#888",
              boxShadow: activeMode === mode ? "0 2px 8px rgba(8,99,186,.1)" : "none",
              transition: "all .18s",
            }}>
              {mode === "export" ? `${dt.exportBtn}` : `${dt.importBtn}`}
            </button>
          ))}
        </div>

        <div style={{ padding: "20px 24px" }}>

          {/* Clinic Selector — مشترك */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 6, textTransform: "uppercase", letterSpacing: .4 }}>{dt.selectClinic}</label>
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setImportData(null); setImportResult(null); setImportError(""); }} style={{ ...inputSt, cursor: "pointer" }}>
              <option value="">{dt.selectClinic}...</option>
              {clinics.filter(c => c.user_id).map(c => (
                <option key={c.user_id} value={c.user_id!}>{c.name} — {c.email}</option>
              ))}
            </select>
          </div>

          {/* ── EXPORT MODE ── */}
          {activeMode === "export" && (
            <div>
              {!selectedId ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#bbb" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}><AppIcon glyph="🏥" /></div>
                  <div style={{ fontSize: 13 }}>{dt.noClinicSelected}</div>
                </div>
              ) : (
                <div>
                  <div style={{ background: "rgba(8,99,186,.04)", border: "1.5px solid rgba(8,99,186,.1)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#353535", marginBottom: 4 }}>{selectedClinic?.name}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{selectedClinic?.email}</div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                      {isAr ? "الخطة:" : "Plan:"} {selectedClinic?.plan} &nbsp;|&nbsp;
                      {isAr ? "الحالة:" : "Status:"} {selectedClinic?.status}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <button
                      onClick={() => handleExport("json")}
                      disabled={exporting}
                      style={{ padding: "14px", background: exportDone === "json" ? "rgba(46,125,50,.08)" : "rgba(8,99,186,.06)", color: exportDone === "json" ? "#2e7d32" : "#0863ba", border: `1.5px solid ${exportDone === "json" ? "rgba(46,125,50,.2)" : "rgba(8,99,186,.2)"}`, borderRadius: 12, fontFamily: "Rubik,sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .2s" }}>
                      {exportDone === "json" ? "✓" : <AppIcon glyph="📄" />} {exportDone === "json" ? dt.exportSuccess : dt.exportJSON}
                    </button>
                    <button
                      onClick={() => handleExport("csv")}
                      disabled={exporting}
                      style={{ padding: "14px", background: exportDone === "csv" ? "rgba(46,125,50,.08)" : "rgba(46,125,50,.06)", color: exportDone === "csv" ? "#2e7d32" : "#2e7d32", border: `1.5px solid ${exportDone === "csv" ? "rgba(46,125,50,.3)" : "rgba(46,125,50,.2)"}`, borderRadius: 12, fontFamily: "Rubik,sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .2s" }}>
                      {exportDone === "csv" ? "✓" : <AppIcon glyph="📊" />} {exportDone === "csv" ? dt.exportSuccess : dt.exportCSV}
                    </button>
                  </div>

                  <div style={{ marginTop: 12, padding: "10px 14px", background: "#f7f9fc", borderRadius: 10, border: "1.5px solid #eef0f3", fontSize: 11, color: "#888", lineHeight: 1.7 }}>
                    <strong style={{ color: "#353535" }}>JSON:</strong> {isAr ? "يشمل المرضى + المواعيد + المدفوعات كاملاً (للاستيراد لاحقاً)" : "Includes patients + appointments + payments (for re-import)"}<br />
                    <strong style={{ color: "#353535" }}>CSV:</strong> {isAr ? "قائمة المرضى فقط — مناسب لـ Excel" : "Patients list only — suitable for Excel"}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── IMPORT MODE ── */}
          {activeMode === "import" && (
            <div>
              {!selectedId ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#bbb" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}><AppIcon glyph="🏥" /></div>
                  <div style={{ fontSize: 13 }}>{dt.noClinicSelected}</div>
                </div>
              ) : importResult ? (
                // نتيجة الاستيراد
                <div>
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}><AppIcon glyph="🎉" /></div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: "#2e7d32" }}>{dt.importSuccess}</h3>
                  </div>
                  {[
                    { icon: "👥", label: isAr ? "المرضى" : "Patients",     r: importResult.patients,     hasUpdated: true },
                    { icon: "📅", label: isAr ? "المواعيد" : "Appointments", r: importResult.appointments, hasUpdated: false },
                    { icon: "💳", label: isAr ? "المدفوعات" : "Payments",    r: importResult.payments,     hasUpdated: false },
                  ].map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f7f9fc", borderRadius: 10, marginBottom: 8, border: "1.5px solid #eef0f3" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18 }}><AppIcon glyph={s.icon} /></span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#353535" }}>{s.label}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "rgba(46,125,50,.1)", color: "#2e7d32", fontWeight: 700 }}>+{s.r.new} {dt.importNew}</span>
                        {s.hasUpdated && (s.r as typeof importResult.patients).updated > 0 && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "rgba(8,99,186,.1)", color: "#0863ba", fontWeight: 700 }}>{(s.r as typeof importResult.patients).updated} {dt.importUpdated}</span>}
                        {(s.r.skipped) > 0 && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "rgba(136,136,136,.1)", color: "#888", fontWeight: 700 }}>{s.r.skipped} {dt.importSkipped}</span>}
                      </div>
                    </div>
                  ))}
                  {importResult.errors.length > 0 && (
                    <div style={{ background: "rgba(192,57,43,.06)", border: "1.5px solid rgba(192,57,43,.15)", borderRadius: 10, padding: "10px 14px", marginTop: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#c0392b", marginBottom: 6 }}><AppIcon glyph="⚠️" /> {importResult.errors.length} {isAr ? "خطأ" : "error(s)"}</div>
                      {importResult.errors.slice(0, 3).map((e, i) => <div key={i} style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>• {e}</div>)}
                    </div>
                  )}
                  <button onClick={() => { setImportResult(null); setImportData(null); }} style={{ width: "100%", marginTop: 16, padding: "11px", background: "#f7f9fc", border: "1.5px solid #eef0f3", borderRadius: 12, fontFamily: "Rubik,sans-serif", fontSize: 13, color: "#666", cursor: "pointer" }}>
                    {dt.close}
                  </button>
                </div>
              ) : (
                <div>
                  {/* Drop zone */}
                  {!importData ? (
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                      onClick={() => fileRef.current?.click()}
                      style={{ border: `2px dashed ${dragOver ? "#0863ba" : "#c8d4e0"}`, borderRadius: 14, padding: "32px 20px", textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(8,99,186,.04)" : "#fafbfc", transition: "all .2s", marginBottom: 16 }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}><AppIcon glyph="📂" /></div>
                      <div style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>{dt.importDropzone}</div>
                      <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>NABD JSON</div>
                    </div>
                  ) : (
                    // معاينة
                    <div style={{ background: "#f7f9fc", borderRadius: 12, padding: "16px", border: "1.5px solid #eef0f3", marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#0863ba", marginBottom: 10, textTransform: "uppercase", letterSpacing: .4 }}><AppIcon glyph="📋" /> {dt.importPreview}</div>
                      <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
                        {isAr ? "المصدر:" : "Source:"} <strong style={{ color: "#353535" }}>{meta?.clinicName}</strong>
                        &nbsp;|&nbsp; {isAr ? "تاريخ:" : "Date:"} <strong style={{ color: "#353535" }}>{meta?.exportedAt}</strong>
                      </div>
                      {[
                        { icon: "👥", count: meta?.patients, label: isAr ? `${dt.importPatients}` : dt.importPatients },
                        { icon: "📅", count: meta?.appointments, label: isAr ? `${dt.importAppointments}` : dt.importAppointments },
                        { icon: "💳", count: meta?.payments, label: isAr ? `${dt.importPayments}` : dt.importPayments },
                      ].map((s, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span><AppIcon glyph={s.icon} /></span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#0863ba" }}>{s.count}</span>
                          <span style={{ fontSize: 12, color: "#888" }}>{s.label}</span>
                        </div>
                      ))}
                      <button onClick={() => setImportData(null)} style={{ marginTop: 8, padding: "6px 12px", background: "#fff", border: "1.5px solid #eef0f3", borderRadius: 8, fontFamily: "Rubik,sans-serif", fontSize: 11, color: "#888", cursor: "pointer" }}>
                        ✕ {isAr ? "تغيير الملف" : "Change file"}
                      </button>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

                  {importError && <div style={{ background: "rgba(192,57,43,.06)", border: "1.5px solid rgba(192,57,43,.15)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#c0392b", marginBottom: 12 }}><AppIcon glyph="⚠️" /> {importError}</div>}

                  {importData && (
                    <div style={{ background: "rgba(230,126,34,.06)", border: "1.5px solid rgba(230,126,34,.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#666", marginBottom: 14, lineHeight: 1.7 }}>
                      <AppIcon glyph="⚠️" /> {isAr
                        ? `سيتم استيراد البيانات إلى عيادة: ${selectedClinic?.name}. المرضى الموجودون بنفس الهاتف لن يُكرَّروا.`
                        : `Data will be imported into: ${selectedClinic?.name}. Existing patients with same phone will not be duplicated.`}
                    </div>
                  )}

                  <button
                    onClick={handleImport}
                    disabled={!importData || importing}
                    style={{ width: "100%", padding: "13px", background: importData && !importing ? "#0863ba" : "#ccc", color: "#fff", border: "none", borderRadius: 12, fontFamily: "Rubik,sans-serif", fontSize: 14, fontWeight: 700, cursor: importData && !importing ? "pointer" : "not-allowed", boxShadow: importData ? "0 4px 16px rgba(8,99,186,.25)" : "none", transition: "all .2s" }}>
                    {importing ? `⏳ ${dt.importing}` : `${dt.importStart}`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── بيانات دخول المدير — مستقلة تماماً عن Supabase ────────
// ============================================================
// ── Admin API helper ────────────────────────────────────────
// ── Admin API helper — يُرسل x-admin-secret من server env فقط ─
// الـ secret لم يعد NEXT_PUBLIC — يُرسَل عبر الـ cookie بدلاً منه

// SESSION_KEY لا يزال مستخدماً لتتبع حالة الـ auth في client بعد التحقق
// SESSION_KEY انتقل إلى ./_parts/session


export default DataToolsModal;
