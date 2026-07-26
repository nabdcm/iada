"use client";

// ============================================================
// BodyMapSection — مخطط الجسم لتحديد الإصابات والعمليات
// انقر على الجسم لإضافة علامة، وانقر على علامة موجودة لتعديلها.
// ============================================================

import { useMemo, useRef, useState } from "react";
import {
  BODY_SILHOUETTE, BACK_GUIDES, MARKER_META, regionAt, newMarkerId,
  type BodyMap, type BodyMarker, type BodyView, type MarkerType,
} from "@/lib/bodyMap";

type Lang = "ar" | "en";

const BR = { primary: "#0863ba", ink: "#353535", muted: "#8a97a6", border: "#eef0f3", bg: "#f7f9fc" };

const IS: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: `1.5px solid ${BR.border}`, fontFamily: "Rubik,sans-serif",
  fontSize: 13, outline: "none", background: "#fff", color: BR.ink,
};

const T = {
  ar: {
    title: "مخطط الجسم", hint: "انقر على أي موضع في الجسم لتسجيل إصابة أو عملية أو ألم",
    front: "أمامي", back: "خلفي",
    markers: "العلامات المسجّلة", empty: "لا توجد علامات مسجّلة بعد",
    type: "النوع", label: "الوصف", labelPh: "مثال: كسر في الزند، استئصال زائدة...",
    date: "التاريخ", notes: "ملاحظات", notesPh: "تفاصيل إضافية...",
    region: "المنطقة", save: "حفظ", cancel: "إلغاء", delete: "حذف",
    newTitle: "علامة جديدة", editTitle: "تعديل العلامة",
    confirmDel: "حذف هذه العلامة؟",
  },
  en: {
    title: "Body Map", hint: "Click anywhere on the body to record an injury, surgery or pain",
    front: "Front", back: "Back",
    markers: "Recorded Markers", empty: "No markers recorded yet",
    type: "Type", label: "Description", labelPh: "e.g. Ulna fracture, appendectomy...",
    date: "Date", notes: "Notes", notesPh: "Additional details...",
    region: "Region", save: "Save", cancel: "Cancel", delete: "Delete",
    newTitle: "New Marker", editTitle: "Edit Marker",
    confirmDel: "Delete this marker?",
  },
};

interface Props {
  lang: Lang;
  map: BodyMap | null | undefined;
  onChange: (m: BodyMap) => void;
  readOnly?: boolean;
}

export default function BodyMapSection({ lang, map, onChange, readOnly = false }: Props) {
  const isAr = lang === "ar";
  const tr = T[isAr ? "ar" : "en"];

  const [view, setView] = useState<BodyView>("front");
  const [draft, setDraft] = useState<BodyMarker | null>(null);
  const [isNew, setIsNew] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const markers: BodyMarker[] = useMemo(
    () => (Array.isArray(map?.markers) ? map!.markers! : []),
    [map]
  );
  const viewMarkers = markers.filter(m => m.view === view);

  const commit = (next: BodyMarker[]) => onChange({ ...(map ?? {}), markers: next });

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly || draft) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    setIsNew(true);
    setDraft({
      id: newMarkerId(), view,
      x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10,
      region: regionAt(view, x, y),
      type: "injury", label: "",
      date: new Date().toISOString().slice(0, 10),
      notes: null,
    });
  };

  const saveDraft = () => {
    if (!draft) return;
    const clean: BodyMarker = { ...draft, label: draft.label.trim() || MARKER_META[draft.type].ar };
    const next = isNew
      ? [...markers, clean]
      : markers.map(m => (m.id === clean.id ? clean : m));
    commit(next);
    setDraft(null); setIsNew(false);
  };

  const deleteMarker = (id: string) => {
    if (!confirm(tr.confirmDel)) return;
    commit(markers.filter(m => m.id !== id));
    setDraft(null); setIsNew(false);
  };

  return (
    <div style={{ direction: isAr ? "rtl" : "ltr", fontFamily: "Rubik,sans-serif" }}>

      {/* ── رأس القسم ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: BR.ink, margin: 0 }}>{tr.title}</h3>
          <p style={{ fontSize: 12, color: BR.muted, margin: "3px 0 0" }}>{tr.hint}</p>
        </div>
        <div style={{ display: "flex", background: BR.bg, border: `1.5px solid ${BR.border}`, borderRadius: 12, padding: 3 }}>
          {(["front", "back"] as BodyView[]).map(v => (
            <button key={v} type="button" onClick={() => setView(v)}
              style={{
                padding: "7px 18px", borderRadius: 9, border: "none", cursor: "pointer",
                fontFamily: "Rubik,sans-serif", fontSize: 12.5, fontWeight: 700,
                background: view === v ? BR.primary : "transparent",
                color: view === v ? "#fff" : BR.muted, transition: "all .2s",
              }}>
              {v === "front" ? tr.front : tr.back}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(200px,280px) 1fr", gap: 18, alignItems: "start" }}
        className="bodymap-grid">

        {/* ── الرسم ── */}
        <div style={{
          background: "#fff", border: `1.5px solid ${BR.border}`, borderRadius: 14,
          padding: 14, boxShadow: "0 2px 10px rgba(8,99,186,.04)",
        }}>
          <svg
            ref={svgRef}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            onClick={handleSvgClick}
            style={{ width: "100%", height: 420, cursor: readOnly ? "default" : "crosshair", display: "block" }}
          >
            <path d={BODY_SILHOUETTE[view]} fill="#eef4fb" stroke="#c7d8ea" strokeWidth={0.4}
              vectorEffect="non-scaling-stroke" />
            {view === "back" && (
              <path d={BACK_GUIDES} stroke="#c7d8ea" strokeWidth={0.4} strokeDasharray="2 2"
                fill="none" vectorEffect="non-scaling-stroke" />
            )}
            {viewMarkers.map(m => {
              const meta = MARKER_META[m.type];
              const active = draft?.id === m.id;
              return (
                <g key={m.id}
                  onClick={(e) => { e.stopPropagation(); if (readOnly) return; setIsNew(false); setDraft({ ...m }); }}
                  style={{ cursor: readOnly ? "default" : "pointer" }}>
                  <circle cx={m.x} cy={m.y} r={active ? 2.6 : 2} fill={meta.color}
                    stroke="#fff" strokeWidth={0.6} vectorEffect="non-scaling-stroke" opacity={0.92} />
                  {active && (
                    <circle cx={m.x} cy={m.y} r={4} fill="none" stroke={meta.color}
                      strokeWidth={0.5} vectorEffect="non-scaling-stroke" opacity={0.6} />
                  )}
                </g>
              );
            })}
            {isNew && draft && draft.view === view && (
              <circle cx={draft.x} cy={draft.y} r={2.4} fill={MARKER_META[draft.type].color}
                stroke="#fff" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
            )}
          </svg>

          {/* مفتاح الألوان */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BR.border}` }}>
            {(Object.keys(MARKER_META) as MarkerType[]).map(k => (
              <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: BR.muted }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: MARKER_META[k].color, display: "inline-block" }} />
                {MARKER_META[k].ar}
              </span>
            ))}
          </div>
        </div>

        {/* ── اللوحة الجانبية ── */}
        <div>
          {draft ? (
            <div style={{
              background: "#fff", border: `1.5px solid ${BR.primary}30`, borderRadius: 14,
              padding: 16, boxShadow: "0 4px 18px rgba(8,99,186,.08)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h4 style={{ fontSize: 13.5, fontWeight: 800, color: BR.ink, margin: 0 }}>
                  {isNew ? tr.newTitle : tr.editTitle}
                </h4>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: BR.primary,
                  background: "rgba(8,99,186,.08)", borderRadius: 20, padding: "3px 10px",
                }}>
                  {draft.region}
                </span>
              </div>

              <label style={{ fontSize: 11.5, fontWeight: 700, color: BR.muted, display: "block", marginBottom: 6 }}>{tr.type}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {(Object.keys(MARKER_META) as MarkerType[]).map(k => (
                  <button key={k} type="button" onClick={() => setDraft({ ...draft, type: k })}
                    style={{
                      padding: "6px 12px", borderRadius: 20, cursor: "pointer",
                      fontFamily: "Rubik,sans-serif", fontSize: 11.5, fontWeight: 700,
                      border: `1.5px solid ${draft.type === k ? MARKER_META[k].color : BR.border}`,
                      background: draft.type === k ? `${MARKER_META[k].color}14` : "#fff",
                      color: draft.type === k ? MARKER_META[k].color : BR.muted,
                      transition: "all .18s",
                    }}>
                    {MARKER_META[k].ar}
                  </button>
                ))}
              </div>

              <label style={{ fontSize: 11.5, fontWeight: 700, color: BR.muted, display: "block", marginBottom: 6 }}>{tr.label}</label>
              <input value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })}
                placeholder={tr.labelPh} style={{ ...IS, marginBottom: 12 }} />

              <label style={{ fontSize: 11.5, fontWeight: 700, color: BR.muted, display: "block", marginBottom: 6 }}>{tr.date}</label>
              <input type="date" value={draft.date ?? ""} onChange={e => setDraft({ ...draft, date: e.target.value || null })}
                style={{ ...IS, marginBottom: 12 }} />

              <label style={{ fontSize: 11.5, fontWeight: 700, color: BR.muted, display: "block", marginBottom: 6 }}>{tr.notes}</label>
              <textarea value={draft.notes ?? ""} onChange={e => setDraft({ ...draft, notes: e.target.value || null })}
                placeholder={tr.notesPh} style={{ ...IS, minHeight: 70, resize: "vertical", marginBottom: 14 }} />

              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={saveDraft}
                  style={{
                    flex: 1, padding: "11px 0", borderRadius: 11, border: "none", cursor: "pointer",
                    background: BR.primary, color: "#fff", fontFamily: "Rubik,sans-serif",
                    fontSize: 13, fontWeight: 700, boxShadow: "0 4px 14px rgba(8,99,186,.25)",
                  }}>{tr.save}</button>
                {!isNew && (
                  <button type="button" onClick={() => deleteMarker(draft.id)}
                    style={{
                      padding: "11px 16px", borderRadius: 11, border: "1.5px solid rgba(192,57,43,.25)",
                      cursor: "pointer", background: "rgba(192,57,43,.06)", color: "#c0392b",
                      fontFamily: "Rubik,sans-serif", fontSize: 13, fontWeight: 700,
                    }}>{tr.delete}</button>
                )}
                <button type="button" onClick={() => { setDraft(null); setIsNew(false); }}
                  style={{
                    padding: "11px 16px", borderRadius: 11, border: "none", cursor: "pointer",
                    background: BR.bg, color: BR.muted, fontFamily: "Rubik,sans-serif",
                    fontSize: 13, fontWeight: 600,
                  }}>{tr.cancel}</button>
              </div>
            </div>
          ) : (
            <div style={{
              background: "#fff", border: `1.5px solid ${BR.border}`, borderRadius: 14,
              padding: 16, boxShadow: "0 2px 10px rgba(8,99,186,.04)",
            }}>
              <h4 style={{ fontSize: 13, fontWeight: 800, color: BR.ink, margin: "0 0 12px" }}>
                {tr.markers} {markers.length > 0 && <span style={{ color: BR.muted, fontWeight: 600 }}>({markers.length})</span>}
              </h4>
              {markers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "34px 12px", color: "#c8d2dc", fontSize: 13 }}>{tr.empty}</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {markers.map(m => {
                    const meta = MARKER_META[m.type];
                    return (
                      <div key={m.id}
                        onClick={() => { setView(m.view); setIsNew(false); setDraft({ ...m }); }}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px",
                          background: BR.bg, border: `1px solid ${BR.border}`, borderRadius: 11,
                          cursor: readOnly ? "default" : "pointer", transition: "background .15s",
                        }}>
                        <span style={{
                          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                          background: `${meta.color}18`, color: meta.color,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontWeight: 800,
                        }}>{meta.glyph}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: BR.ink }}>{m.label}</div>
                          <div style={{ fontSize: 11, color: BR.muted, marginTop: 2 }}>
                            {m.region} · {m.view === "front" ? tr.front : tr.back}
                            {m.date ? ` · ${m.date}` : ""}
                          </div>
                          {m.notes && (
                            <div style={{ fontSize: 11, color: BR.muted, marginTop: 4, lineHeight: 1.6 }}>{m.notes}</div>
                          )}
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: meta.color,
                          background: `${meta.color}14`, borderRadius: 20, padding: "2px 8px", flexShrink: 0,
                        }}>{meta.ar}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .bodymap-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
