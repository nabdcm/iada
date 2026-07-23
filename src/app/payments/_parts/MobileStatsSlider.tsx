"use client";
// ============================================================
// src/app/payments/_parts/MobileStatsSlider.tsx
// شريط الإحصائيات الأفقي على الشاشات الصغيرة.
// ============================================================

import { useState, useRef } from "react";
import AppIcon from "@/components/AppIcon";
import type { Payment } from "@/lib/supabase";

export function MobileStatsSlider({ stats, methodStats, methodIcon, tr, isAr, numbersHidden, onReveal }: {
  stats: any; methodStats: any[]; methodIcon: any; tr: any; isAr: boolean;
  numbersHidden: boolean; onReveal: () => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const maskVal = (val: number) => numbersHidden ? "••••••" : val.toLocaleString();

  const cards = [
    {
      gradient: "linear-gradient(90deg,#2e7d32,#66bb6a)",
      icon: "💰",
      iconBg: "rgba(46,125,50,.1)",
      value: `${maskVal(stats.totalMonth)} ل.س`,
      valueColor: "#2e7d32",
      label: tr.stats.totalMonth,
      sub: `↑ 12% ${tr.stats.vsLast}`,
      subColor: "#2e7d32",
      eyeColor: "#2e7d32",
      eyeBg: "rgba(46,125,50,.1)",
      eyeBorder: "rgba(46,125,50,.2)",
    },
    {
      gradient: "linear-gradient(90deg,#0863ba,#a4c4e4)",
      icon: "📊",
      iconBg: "rgba(8,99,186,.08)",
      value: `${maskVal(stats.totalYear)} ل.س`,
      valueColor: "#0863ba",
      label: tr.stats.totalYear,
      sub: `${stats.paidCount} ${tr.stats.transactions}`,
      subColor: "#888",
      eyeColor: "#0863ba",
      eyeBg: "rgba(8,99,186,.08)",
      eyeBorder: "rgba(8,99,186,.2)",
    },
    {
      gradient: "linear-gradient(90deg,#e67e22,#f39c12)",
      icon: "⏳",
      iconBg: "rgba(230,126,34,.08)",
      value: `${maskVal(stats.pendingAmt)} ل.س`,
      valueColor: "#e67e22",
      label: tr.stats.pending,
      sub: `${stats.pendingCount} ${tr.stats.unpaidCount}`,
      subColor: "#e67e22",
      eyeColor: "#e67e22",
      eyeBg: "rgba(230,126,34,.08)",
      eyeBorder: "rgba(230,126,34,.2)",
    },
  ];

  const handleScroll = () => {
    if (!trackRef.current) return;
    const scrollLeft = trackRef.current.scrollLeft;
    const cardWidth = trackRef.current.scrollWidth / (cards.length + 1); // +1 for method card
    setActiveIdx(Math.round(Math.abs(scrollLeft) / cardWidth));
  };

  return (
    <div className="stats-slider-wrap" style={{ marginBottom:20 }}>
      <div ref={trackRef} className="stats-slider-track" onScroll={handleScroll}>
        {cards.map((c, i) => (
          <div key={i} className="stat-big" style={{ position:"relative",overflow:"hidden",background:"#fff",border:"1.5px solid #eef0f3",boxShadow:"0 2px 16px rgba(8,99,186,.08)",borderRadius:16,padding:"20px 20px" }}>
            <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:c.gradient,borderRadius:"16px 16px 0 0" }}/>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
              <div style={{ width:40,height:40,background:c.iconBg,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}><AppIcon glyph={c.icon} /></div>
              <button onClick={onReveal} style={{ width:32,height:32,borderRadius:8,background:c.eyeBg,border:`1.5px solid ${c.eyeBorder}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:c.eyeColor,fontSize:15,flexShrink:0 }}><AppIcon glyph={numbersHidden?"👁":"🙈"} /></button>
            </div>
            <div style={{ fontSize:26,fontWeight:900,color:c.valueColor,lineHeight:1 }}>{c.value}</div>
            <div style={{ fontSize:12,color:"#aaa",marginTop:8,fontWeight:500 }}>{c.label}</div>
            <div style={{ fontSize:11,color:c.subColor,marginTop:4,fontWeight:600 }}>{c.sub}</div>
          </div>
        ))}
        {/* طرق الدفع */}
        <div className="stat-big" style={{ position:"relative",overflow:"hidden",background:"#fff",border:"1.5px solid #eef0f3",boxShadow:"0 2px 16px rgba(8,99,186,.08)",borderRadius:16,padding:"20px 20px" }}>
          <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#7b2d8b,#a855f7)",borderRadius:"16px 16px 0 0" }}/>
          <div style={{ fontSize:13,fontWeight:700,color:"#353535",marginBottom:14 }}>
            {isAr?"طرق الدفع":"Payment Methods"}
          </div>
          {methodStats.map((m: any) => (
            <div key={m.k} style={{ marginBottom:10 }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                <span style={{ fontSize:12,color:"#666" }}>{methodIcon[m.k]} {isAr ? (m.k==="cash"?"نقداً":m.k==="card"?"بطاقة":"تحويل") : (m.k==="cash"?"Cash":m.k==="card"?"Card":"Transfer")}</span>
                <span style={{ fontSize:12,fontWeight:700,color:m.color }}>{m.pct}%</span>
              </div>
              <div style={{ height:6,background:"#f0f0f0",borderRadius:10,overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${m.pct}%`,background:m.color,borderRadius:10,transition:"width .8s" }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="stats-slider-dots">
        {[...cards, null].map((_, i) => (
          <span key={i} className={activeIdx === i ? "active" : ""}/>
        ))}
      </div>
    </div>
  );
}


export default MobileStatsSlider;
