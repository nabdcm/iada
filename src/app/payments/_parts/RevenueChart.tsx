"use client";
// ============================================================
// src/app/payments/_parts/RevenueChart.tsx
// رسم بياني لإيرادات الأشهر.
// ============================================================

import { T } from "./translations";

export function RevenueChart({ lang, months, revenueData }: { lang: string; months: string[]; revenueData: number[] }) {
  const tr = T[lang];
  const max = Math.max(...revenueData, 1);
  const now = new Date();
  const lastSixMonths = Array.from({length:6},(_,i)=>{
    const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1);
    return tr.months[d.getMonth()];
  });

  return (
    <div style={{ background:"#fff",borderRadius:16,padding:"22px 24px",border:"1.5px solid #eef0f3",boxShadow:"0 2px 16px rgba(8,99,186,.06)" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24 }}>
        <h3 style={{ fontSize:15,fontWeight:700,color:"#353535" }}>{tr.revenueChart}</h3>
        <span style={{ fontSize:12,color:"#aaa",background:"#f7f9fc",padding:"4px 12px",borderRadius:20 }}>
          {tr.months[now.getMonth()]} {now.getFullYear()}
        </span>
      </div>
      {/* Bars */}
      <div style={{ display:"flex",alignItems:"flex-end",gap:10,height:120,marginBottom:12 }}>
        {revenueData.map((v,i)=>{
          const isLast = i===5;
          const h = Math.round((v/max)*100);
          return (
            <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6 }}>
              <div style={{ fontSize:10,color:isLast?"#2e7d32":"#ccc",fontWeight:isLast?700:400 }}>{v>=1000?(v/1000).toFixed(0)+"k":v} ل.س</div>
              <div style={{ width:"100%",position:"relative",height:100,display:"flex",alignItems:"flex-end" }}>
                <div style={{
                  width:"100%",borderRadius:"6px 6px 0 0",
                  height:`${h}%`,minHeight:6,
                  background: isLast
                    ? "linear-gradient(180deg,#2e7d32,#66bb6a)"
                    : "linear-gradient(180deg,#a4c4e4,#d0e8f4)",
                  transition:"height .8s cubic-bezier(.4,0,.2,1)",
                  boxShadow: isLast?"0 4px 12px rgba(46,125,50,.2)":undefined,
                }}/>
              </div>
            </div>
          );
        })}
      </div>
      {/* Month labels */}
      <div style={{ display:"flex",gap:10 }}>
        {lastSixMonths.map((m,i)=>(
          <div key={i} style={{ flex:1,textAlign:"center",fontSize:11,color:i===5?"#2e7d32":"#bbb",fontWeight:i===5?700:400 }}>{m}</div>
        ))}
      </div>
    </div>
  );
}


export default RevenueChart;
