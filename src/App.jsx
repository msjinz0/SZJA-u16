import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine
} from "recharts";
import { supabase } from "./lib/supabase";

// ════════════════════════════════════════════════════════
// 🏒 SZJA U16 JÉGHOKI — SPORT SCIENCE PLATFORM v4.0
// ════════════════════════════════════════════════════════
// Supabase-integrated version — all data persists!

const C={bg:"#060a13",bg2:"#0c1121",card:"#111a2e",cardH:"#162040",brd:"#1c2a48",tx:"#e4eaf4",txM:"#7f90b0",txD:"#4a5d80",g:"#10b981",gD:"rgba(16,185,129,.12)",y:"#f59e0b",yD:"rgba(245,158,11,.12)",r:"#ef4444",rD:"rgba(239,68,68,.12)",b:"#3b82f6",bD:"rgba(59,130,246,.12)",p:"#8b5cf6",pD:"rgba(139,92,246,.12)",cy:"#06b6d4",o:"#f97316",oD:"rgba(249,115,22,.12)",a:"#06d6a0",aD:"rgba(6,214,160,.12)",aG:"rgba(6,214,160,.25)"};

const POSITIONS=["C","LW","RW","LD","RD","G"];
const POS_L={C:"Center",LW:"Bal szélső",RW:"Jobb szélső",LD:"Bal védő",RD:"Jobb védő",G:"Kapus"};
const WK=["sleep_quality","sleep_duration","soreness","fatigue","stress","mood"];
const WL=["Alvásminőség","Alvásidő","Izomláz","Fáradtság","Stressz","Hangulat"];
const DEF_TT=["Taktikai","Technikai","Power skating","Lövőedzés","Játékforma","Kapusedzés"];
const DEF_DT=["Erő","Kondíció","Kardió","Core/Stabilitás","Mobilitás","Sprint"];
const IL=["Váll","Csípőflexor","Térd (MCL)","Boka","Ágyék","Comb","Agyrázkódás","Egyéb"];
const IT=["Kontakt sérülés","Nem-kontakt","Túlterhelés","Agyrázkódás","Izomhúzódás"];
const RTP=["Sérült","Rehab","Egyéni on-ice","Kontaktmentes","Teljes edzés","Meccsképes"];
const _genPin=()=>String(Math.floor(1000+Math.random()*9000));

// ── Compute player metrics from wellness + rpe logs ──
function computeMetrics(player, wellnessLogs, rpeLogs, forceLogs) {
  const wl = wellnessLogs.filter(w => w.player_id === player.id).sort((a,b) => a.date.localeCompare(b.date));
  const rl = rpeLogs.filter(r => r.player_id === player.id).sort((a,b) => a.date.localeCompare(b.date));
  const fl = forceLogs.filter(f => f.player_id === player.id).sort((a,b) => a.date.localeCompare(b.date));

  // Build 28-day data
  const days = [];
  for (let d = 27; d >= 0; d--) {
    const dt = new Date(); dt.setDate(dt.getDate() - d);
    const ds = dt.toISOString().split("T")[0];
    const dl = `${dt.getMonth()+1}/${dt.getDate()}`;
    const wDay = wl.find(w => w.date === ds);
    const rDay = rl.filter(r => r.date === ds);
    const fDay = fl.find(f => f.date === ds);
    const wv = wDay ? WK.map(k => wDay[k] || 3) : [3,3,3,3,3,3];
    const ws = (wv.reduce((a,b) => a+b, 0) / 30) * 100;
    const dayLoad = rDay.reduce((s, r) => s + (r.load || r.rpe * r.duration), 0) || Math.round(200 + Math.random() * 300);
    const jh = fDay ? Number(fDay.jump_height) : 30 + Math.random() * 8;
    const pf = fDay ? Number(fDay.peak_force) : 2000 + Math.random() * 500;
    const as = fDay ? Number(fDay.asymmetry) : Math.random() * 15;
    days.push({ date: ds, dl, wv, ws: Math.round(ws*10)/10, load: dayLoad, jh: Math.round(jh*10)/10, pf: Math.round(pf), as: Math.round(as*10)/10 });
  }

  const avg = a => a.length ? a.reduce((s,v) => s+v, 0) / a.length : 0;
  const sdd = a => { const m = avg(a); return Math.sqrt(a.reduce((s,v) => s+(v-m)**2, 0) / (a.length||1)); };
  const cur = days[27];
  const ac = days.slice(-7).reduce((s,d) => s+d.load, 0);
  const ch = days.reduce((s,d) => s+d.load, 0) / 4;
  const acwr = ch > 0 ? Math.round(ac/ch*100)/100 : 0;
  const jm = avg(days.map(d => d.jh));
  const fm = avg(days.map(d => d.pf));
  const wm = avg(days.map(d => d.ws));
  const wsd = sdd(days.map(d => d.ws));
  const wz = wsd > 0 ? (cur.ws - wm) / wsd : 0;
  const jd = jm > 0 ? ((cur.jh - jm) / jm) * 100 : 0;
  const fd = fm > 0 ? ((cur.pf - fm) / fm) * 100 : 0;
  const nm = (v,a,b) => Math.max(0, Math.min(1, (v-a)/(b-a)));
  const rd = Math.round((nm(wz,-2,2)*.3 + Math.max(0,Math.min(1,1-Math.abs(acwr-1.1)))*.25 + nm(jd,-10,10)*.2 + nm(fd,-10,10)*.15 + (1-nm(cur.as,0,25))*.1)*100)/100;
  const st = rd >= .75 ? "GREEN" : rd >= .5 ? "YELLOW" : "RED";
  const al = [];
  if (acwr > 1.5) al.push({t:"d",m:"ACWR > 1.5"});
  if (acwr < .8) al.push({t:"w",m:"ACWR < 0.8"});
  if (jd < -5) al.push({t:"d",m:`Jump ↓${Math.abs(jd).toFixed(1)}%`});
  if (cur.as > 15) al.push({t:"d",m:`Asym ${cur.as.toFixed(1)}%`});

  return {
    ...player, days, ac, ch: Math.round(ch), acwr, jm: Math.round(jm*10)/10, fm: Math.round(fm),
    jd: Math.round(jd*10)/10, fd: Math.round(fd*10)/10, as: cur.as, rd, st, al, cur,
    grip: Math.round(30 + player.weight * 0.4), shot: Math.round(50 + player.weight * 0.5),
    sp30: Math.round((4.5 - player.height * 0.002) * 100) / 100,
    tests: [{t:"Shot speed",v:Math.round(50+player.weight*.5)+" km/h"},{t:"Grip",v:Math.round(30+player.weight*.4)+" kg"},{t:"Sprint 30m",v:Math.round((4.5-player.height*.002)*100)/100+"s"},{t:"Jump",v:cur.jh+"cm"},{t:"Asym",v:cur.as.toFixed(1)+"%"}],
  };
}

// ── Recharts Tooltip ──
const CTip=({active,payload,label})=>{if(!active||!payload)return null;return<div style={{background:"#1a2235ee",border:"1px solid "+C.brd,borderRadius:8,padding:"8px 12px"}}><div style={{fontSize:10,color:C.txM,marginBottom:4}}>{label}</div>{payload.map((p,i)=><div key={i} style={{fontSize:11,color:p.color,fontWeight:600}}>{p.name}: {typeof p.value==="number"?p.value.toFixed(1):p.value}</div>)}</div>};

// ── UI Atoms ──
const Badge=({status:s})=>{const m={GREEN:{bg:C.gD,c:C.g,l:"Ready"},YELLOW:{bg:C.yD,c:C.y,l:"Monitor"},RED:{bg:C.rD,c:C.r,l:"Alert"}}[s]||{bg:C.yD,c:C.y,l:"?"};return<span style={{padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:700,background:m.bg,color:m.c,textTransform:"uppercase",letterSpacing:.5}}>{m.l}</span>};
const RBadge=({phase:p})=>{const cl=[C.r,C.o,C.y,C.y,C.b,C.g][p]||C.txM;return<span style={{padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:700,background:cl+"15",color:cl}}>{RTP[p]}</span>};
const Met=({label,value,unit,delta,color,icon,sm})=><div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:sm?"12px 14px":"18px 22px",flex:1,minWidth:sm?110:150}}><div style={{fontSize:10,color:C.txM,textTransform:"uppercase",letterSpacing:1,marginBottom:6,display:"flex",alignItems:"center",gap:5}}>{icon&&<span style={{fontSize:13}}>{icon}</span>}{label}</div><div style={{fontSize:sm?20:26,fontWeight:800,color:color||C.tx,lineHeight:1.1}}>{value}{unit&&<span style={{fontSize:12,fontWeight:400,color:C.txM,marginLeft:3}}>{unit}</span>}</div>{delta!==undefined&&<div style={{fontSize:11,color:delta>0?C.g:delta<0?C.r:C.txM,marginTop:3,fontWeight:600}}>{delta>0?"▲":delta<0?"▼":"—"} {Math.abs(delta).toFixed(1)}%</div>}</div>;
const Sec=({children,sub})=><div style={{marginBottom:14}}><h2 style={{fontSize:15,fontWeight:700,color:C.tx,margin:0}}>{children}</h2>{sub&&<p style={{fontSize:11,color:C.txM,margin:"3px 0 0"}}>{sub}</p>}</div>;
const Btn=({children,onClick,v,sz,disabled,full,style:sx})=>{const vs={primary:{background:C.a,color:"#000"},secondary:{background:C.bg2,color:C.txM,border:"1px solid "+C.brd},danger:{background:C.rD,color:C.r},blue:{background:C.bD,color:C.b},orange:{background:C.oD,color:C.o},ghost:{background:"transparent",color:C.txM},green:{background:C.gD,color:C.g},purple:{background:C.pD,color:C.p}};const szs={sm:{padding:"5px 12px",fontSize:11},md:{padding:"9px 18px",fontSize:12},lg:{padding:"13px 26px",fontSize:13}};return<button onClick={disabled?undefined:onClick} style={{border:"none",borderRadius:10,cursor:disabled?"default":"pointer",fontWeight:700,opacity:disabled?.5:1,display:"inline-flex",alignItems:"center",gap:6,whiteSpace:"nowrap",justifyContent:full?"center":undefined,width:full?"100%":undefined,...szs[sz||"md"],...vs[v||"primary"],...sx}}>{children}</button>};
const Inp=({label,value,onChange,type,ph,opts,style:s})=><div style={{marginBottom:12,...s}}>{label&&<label style={{fontSize:11,color:C.txM,display:"block",marginBottom:5,fontWeight:600}}>{label}</label>}{opts?<select value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"9px 12px",borderRadius:9,background:C.bg2,border:"1px solid "+C.brd,color:C.tx,fontSize:12,outline:"none",boxSizing:"border-box"}}>{opts.map(o=><option key={typeof o==="string"?o:o.v} value={typeof o==="string"?o:o.v}>{typeof o==="string"?o:o.l}</option>)}</select>:type==="textarea"?<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={ph} rows={3} style={{width:"100%",padding:"9px 12px",borderRadius:9,background:C.bg2,border:"1px solid "+C.brd,color:C.tx,fontSize:12,outline:"none",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/>:<input type={type||"text"} value={value} onChange={e=>onChange(e.target.value)} placeholder={ph} style={{width:"100%",padding:"9px 12px",borderRadius:9,background:C.bg2,border:"1px solid "+C.brd,color:C.tx,fontSize:12,outline:"none",boxSizing:"border-box"}}/>}</div>;
const Modal=({open,onClose,title,children,w})=>{if(!open)return null;return<div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}><div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.7)"}}/><div onClick={e=>e.stopPropagation()} style={{position:"relative",background:C.card,border:"1px solid "+C.brd,borderRadius:16,padding:24,width:w||560,maxWidth:"95vw",maxHeight:"88vh",overflow:"auto"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><h3 style={{fontSize:17,fontWeight:800,color:C.tx,margin:0}}>{title}</h3><button onClick={onClose} style={{background:"transparent",border:"none",color:C.txM,fontSize:18,cursor:"pointer"}}>✕</button></div>{children}</div></div>};
const Spinner=()=><div style={{display:"flex",justifyContent:"center",padding:40}}><div style={{width:32,height:32,border:"3px solid "+C.brd,borderTop:"3px solid "+C.a,borderRadius:"50%",animation:"spin 1s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

// ═══ LOGIN ═══
const Login=({onLogin})=>{
  const[mode,setMode]=useState("coach");const[pin,setPin]=useState("");const[err,setErr]=useState("");const[pN,setPN]=useState("");const[loading,setLoading]=useState(false);
  const add=async d=>{if(pin.length>=4)return;const np=pin+d;setPin(np);setErr("");
    if(np.length===4){setLoading(true);const{data,error}=await supabase.from("coaches").select("*").eq("pin",np).eq("active",true).single();setLoading(false);if(data)onLogin({type:"coach",user:data});else{setErr("Hibás PIN");setPin("")}}};
  const loginPlayer=async()=>{if(!pN.trim()||!pin)return;setLoading(true);const{data,error}=await supabase.from("players").select("*").ilike("name",`%${pN}%`).eq("pin",pin).eq("active",true).single();setLoading(false);if(data)onLogin({type:"player",user:data});else setErr("Hibás név vagy PIN")};
  return<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:400,maxWidth:"95vw"}}>
    <div style={{textAlign:"center",marginBottom:32}}><div style={{width:64,height:64,borderRadius:16,background:`linear-gradient(135deg,${C.a},${C.b})`,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:28,marginBottom:12,boxShadow:"0 8px 32px "+C.aG}}>🏒</div><h1 style={{fontSize:22,fontWeight:900,color:C.tx,margin:"0 0 4px"}}>SportSci Platform</h1><p style={{fontSize:14,color:C.a,fontWeight:800,margin:0}}>SZJA U16 Jéghoki</p></div>
    <div style={{display:"flex",gap:4,marginBottom:18,background:C.bg2,padding:4,borderRadius:12}}>{[{k:"coach",l:"🏒 Edző"},{k:"player",l:"⚽ Játékos RPE"}].map(m=><button key={m.k} onClick={()=>{setMode(m.k);setErr("");setPin("")}} style={{flex:1,padding:11,borderRadius:10,border:"none",background:mode===m.k?C.card:"transparent",color:mode===m.k?C.tx:C.txM,cursor:"pointer",fontSize:12,fontWeight:700}}>{m.l}</button>)}</div>
    <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:16,padding:24}}>
      {mode==="coach"?<div>
        <p style={{fontSize:12,color:C.txM,marginBottom:18}}>Adja meg a 4 jegyű PIN kódját</p>
        <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:20}}>{[0,1,2,3].map(i=><div key={i} style={{width:44,height:52,borderRadius:11,background:C.bg2,border:"2px solid "+(pin.length>i?C.a:C.brd),display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:C.tx}}>{pin[i]?"●":""}</div>)}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,maxWidth:240,margin:"0 auto"}}>{[1,2,3,4,5,6,7,8,9,null,0,"⌫"].map((n,i)=><button key={i} onClick={()=>{if(n==="⌫"){setPin(p=>p.slice(0,-1));setErr("")}else if(n!==null)add(String(n))}} style={{height:44,borderRadius:10,border:"1px solid "+C.brd,background:n===null?"transparent":C.bg2,color:C.tx,fontSize:16,fontWeight:700,cursor:n===null?"default":"pointer",visibility:n===null?"hidden":"visible"}}>{n}</button>)}</div>
      </div>:<div>
        <Inp label="Játékos neve" value={pN} onChange={setPN} ph="pl. Kovács Bence"/>
        <Inp label="Egyéni PIN" value={pin} onChange={v=>{setPin(v);setErr("")}} type="password" ph="4 jegyű PIN"/>
        <Btn full onClick={loginPlayer} disabled={loading}>🏒 Belépés</Btn>
        <div style={{marginTop:10,padding:8,background:C.bg2,borderRadius:8,fontSize:10,color:C.txD}}>Kérd el a PIN kódodat az edzőtől!</div>
      </div>}
      {loading&&<div style={{textAlign:"center",marginTop:12,color:C.a,fontSize:12}}>⏳ Betöltés...</div>}
      {err&&<div style={{marginTop:14,padding:8,borderRadius:8,background:C.rD,color:C.r,fontSize:12,fontWeight:600,textAlign:"center"}}>{err}</div>}
    </div>
  </div></div>;
};

// ═══ PLAYER RPE (MOBILE) ═══
const PRPE=({player,events,onLogout,onRefresh})=>{
  const[selEv,setSelEv]=useState(null);const[rpe,setRpe]=useState(5);const[done,setDone]=useState(false);const[saving,setSaving]=useState(false);
  const[wv,setWv]=useState(Object.fromEntries(WK.map(k=>[k,3])));
  const today=new Date().toISOString().split("T")[0];const todayEvs=events.filter(e=>e.date===today);
  const rCol=v=>v<=3?C.g:v<=6?C.y:v<=8?C.o:C.r;const ws=((Object.values(wv).reduce((a,b)=>a+b,0)/30)*100).toFixed(0);

  const submitAll=async()=>{
    setSaving(true);
    // Save wellness
    await supabase.from("wellness_logs").upsert({player_id:player.id,date:today,...wv,wellness_score:Number(ws)},{onConflict:"player_id,date"});
    // Save RPE
    if(selEv){await supabase.from("rpe_logs").upsert({player_id:player.id,event_id:selEv.id,date:today,rpe,duration:selEv.duration},{onConflict:"player_id,event_id"})}
    setSaving(false);setDone(true);if(onRefresh)onRefresh();
  };

  if(done)return<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center",padding:40}}><div style={{fontSize:52}}>✅</div><h2 style={{color:C.tx,fontSize:18,fontWeight:700,marginTop:12}}>Rögzítve!</h2><p style={{color:C.txM,fontSize:13,marginTop:4}}>RPE: {rpe}/10 · Wellness: {ws}%</p><div style={{marginTop:16,display:"flex",gap:8,justifyContent:"center"}}><Btn onClick={()=>{setDone(false);setSelEv(null);setRpe(5)}}>Új kitöltés</Btn><Btn v="ghost" onClick={onLogout}>Kilépés</Btn></div></div></div>;

  return<div style={{minHeight:"100vh",background:C.bg,padding:16,maxWidth:460,margin:"0 auto"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div><h2 style={{fontSize:16,fontWeight:800,color:C.tx,margin:0}}>Szia, {player.name.split(" ").pop()}! 🏒</h2><p style={{fontSize:11,color:C.txM,margin:"3px 0 0"}}>SZJA U16</p></div><Btn v="ghost" sz="sm" onClick={onLogout}>Kilépés</Btn></div>
    {!selEv?<div>
      <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:14,marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700,color:C.tx,marginBottom:10}}>💚 Wellness <span style={{color:C.a}}>{ws}%</span></div>
        {WL.map((l,i)=><div key={i} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:C.txM}}>{l}</span><span style={{fontSize:11,fontWeight:700,color:C.a}}>{wv[WK[i]]}/5</span></div><div style={{display:"flex",gap:3}}>{[1,2,3,4,5].map(v=><button key={v} onClick={()=>setWv(p=>({...p,[WK[i]]:v}))} style={{flex:1,height:30,borderRadius:6,border:"none",background:wv[WK[i]]>=v?(v<=2?C.rD:v<=3?C.yD:C.gD):C.bg2,color:wv[WK[i]]>=v?(v<=2?C.r:v<=3?C.y:C.g):C.txD,cursor:"pointer",fontWeight:700,fontSize:11}}>{v}</button>)}</div></div>)}
      </div>
      <Sec sub="Válassz RPE kitöltéshez">Mai események</Sec>
      {todayEvs.length===0?<div style={{textAlign:"center",padding:30,background:C.card,borderRadius:12}}><p style={{color:C.txM}}>📅 Nincs mai esemény</p><Btn style={{marginTop:12}} onClick={submitAll} disabled={saving}>{saving?"⏳":"💾"} Csak wellness mentése</Btn></div>
      :todayEvs.map(ev=><div key={ev.id} onClick={()=>setSelEv(ev)} style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:14,marginBottom:8,cursor:"pointer"}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:700,color:C.tx}}>{ev.type==="match"?"🏒":"⛸️"} {ev.title}</span><span style={{fontSize:11,color:C.txM}}>{ev.time}</span></div><div style={{fontSize:11,color:C.txM,marginTop:3}}>{ev.duration}p · {ev.subtype||ev.opponent||""}</div></div>)}
    </div>:<div>
      <Btn v="ghost" sz="sm" onClick={()=>setSelEv(null)}>← Vissza</Btn>
      <div style={{textAlign:"center",margin:"24px 0"}}><div style={{fontSize:64,fontWeight:900,color:rCol(rpe),lineHeight:1}}>{rpe}</div><div style={{fontSize:12,color:C.txM,marginTop:6}}>{rpe<=2?"Nagyon könnyű":rpe<=4?"Könnyű":rpe<=6?"Közepes":rpe<=8?"Nehéz":"Maximális"}</div></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:20}}>{[1,2,3,4,5,6,7,8,9,10].map(v=><button key={v} onClick={()=>setRpe(v)} style={{height:46,borderRadius:10,border:rpe===v?"2px solid "+rCol(v):"1px solid "+C.brd,background:rpe===v?rCol(v)+"20":C.card,color:rpe===v?rCol(v):C.txM,fontSize:16,fontWeight:800,cursor:"pointer"}}>{v}</button>)}</div>
      <div style={{fontSize:11,color:C.txM,textAlign:"center",marginBottom:14}}>Terhelés: <strong style={{color:C.b}}>{rpe*selEv.duration} AU</strong></div>
      <Btn full sz="lg" onClick={submitAll} disabled={saving}>{saving?"⏳ Mentés...":"💾 Mentés"}</Btn>
    </div>}
  </div>;
};

// ═══ TEAM DASHBOARD ═══
const TeamDash=({players,onSelect})=>{
  const[sort,setSort]=useState("rd");const[dir,setDir]=useState("asc");const[filter,setFilter]=useState("ALL");
  const s=useMemo(()=>({avg:(players.reduce((s,p)=>s+p.rd,0)/players.length*100).toFixed(0),g:players.filter(p=>p.st==="GREEN").length,y:players.filter(p=>p.st==="YELLOW").length,r:players.filter(p=>p.st==="RED").length,al:players.reduce((s,p)=>s+p.al.length,0)}),[players]);
  const sorted=useMemo(()=>{let f=filter==="ALL"?players:players.filter(p=>p.st===filter);return[...f].sort((a,b)=>dir==="asc"?(a[sort]>b[sort]?1:-1):(a[sort]<b[sort]?1:-1))},[players,sort,dir,filter]);
  const ds=k=>{if(sort===k)setDir(d=>d==="asc"?"desc":"asc");else{setSort(k);setDir("asc")}};
  return<div>
    <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}><Met label="Átl. Readiness" value={s.avg+"%"} icon="🧠" color={Number(s.avg)>=75?C.g:C.y}/><Met label="Green" value={s.g} icon="✅" color={C.g}/><Met label="Yellow" value={s.y} icon="⚡" color={C.y}/><Met label="Red" value={s.r} icon="🚨" color={C.r}/><Met label="Riasztás" value={s.al} icon="🔔" color={C.r}/></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
      <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:18}}><Sec sub="Csapat eloszlás">Readiness %</Sec><ResponsiveContainer width="100%" height={170}><BarChart data={sorted.map(p=>({n:p.name.split(" ")[1]||p.name.split(" ")[0],v:Math.round(p.rd*100)}))}><CartesianGrid strokeDasharray="3 3" stroke={C.brd}/><XAxis dataKey="n" tick={{fontSize:8,fill:C.txD}}/><YAxis tick={{fontSize:9,fill:C.txM}} domain={[0,100]}/><Tooltip content={<CTip/>}/><Bar dataKey="v" name="%" radius={[3,3,0,0]}>{sorted.map((p,i)=><Cell key={i} fill={p.st==="GREEN"?C.g:p.st==="YELLOW"?C.y:C.r} fillOpacity={.65}/>)}</Bar></BarChart></ResponsiveContainer></div>
      <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:18}}><Sec sub="0.8–1.3 optimális">ACWR</Sec><ResponsiveContainer width="100%" height={170}><BarChart data={sorted.map(p=>({n:p.name.split(" ")[1]||p.name.split(" ")[0],v:p.acwr}))}><CartesianGrid strokeDasharray="3 3" stroke={C.brd}/><XAxis dataKey="n" tick={{fontSize:8,fill:C.txD}}/><YAxis tick={{fontSize:9,fill:C.txM}} domain={[0,2]}/><Tooltip content={<CTip/>}/><ReferenceLine y={1.5} stroke={C.r} strokeDasharray="4 4"/><ReferenceLine y={0.8} stroke={C.y} strokeDasharray="4 4"/><Bar dataKey="v" name="ACWR" radius={[3,3,0,0]}>{sorted.map((p,i)=><Cell key={i} fill={p.acwr>1.5?C.r:p.acwr<.8?C.y:C.g} fillOpacity={.65}/>)}</Bar></BarChart></ResponsiveContainer></div>
    </div>
    <div style={{display:"flex",gap:5,marginBottom:12}}>{["ALL","RED","YELLOW","GREEN"].map(f=><Btn key={f} sz="sm" v={filter===f?"primary":"secondary"} onClick={()=>setFilter(f)}>{f==="ALL"?"Mind":f}</Btn>)}</div>
    <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{borderBottom:"1px solid "+C.brd}}>{[{k:"name",l:"Játékos"},{k:"pos",l:"Poz"},{k:"acwr",l:"ACWR"},{k:"jd",l:"Jump Δ"},{k:"as",l:"Asym"},{k:"rd",l:"Readiness"},{k:"st",l:"Státusz"}].map(c=><th key={c.k} onClick={()=>ds(c.k)} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:sort===c.k?C.a:C.txM,textTransform:"uppercase",cursor:"pointer"}}>{c.l}{sort===c.k&&(dir==="asc"?" ↑":" ↓")}</th>)}</tr></thead><tbody>{sorted.map(p=><tr key={p.id} onClick={()=>onSelect(p)} style={{borderBottom:"1px solid "+C.brd,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.cardH} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><td style={{padding:"9px 12px",fontWeight:600,color:C.tx,fontSize:12}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${C.a}40,${C.b}40)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:C.a,flexShrink:0}}>{p.name.split(" ").map(n=>n[0]).join("")}</div>{p.name}</div></td><td style={{padding:9,color:C.txM,fontSize:11}}>{p.pos}</td><td style={{padding:9,color:p.acwr>1.5?C.r:p.acwr<.8?C.y:C.g,fontWeight:700}}>{p.acwr.toFixed(2)}</td><td style={{padding:9,color:p.jd<-5?C.r:p.jd>0?C.g:C.y,fontWeight:700}}>{p.jd>0?"+":""}{p.jd}%</td><td style={{padding:9,color:p.as>15?C.r:C.g,fontWeight:700}}>{p.as.toFixed(1)}%</td><td style={{padding:9}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:40,height:4,borderRadius:2,background:C.bg2,overflow:"hidden"}}><div style={{width:p.rd*100+"%",height:"100%",borderRadius:2,background:p.st==="GREEN"?C.g:p.st==="YELLOW"?C.y:C.r}}/></div><span style={{fontSize:11,fontWeight:700}}>{(p.rd*100).toFixed(0)}%</span></div></td><td style={{padding:9}}><Badge status={p.st}/></td></tr>)}</tbody></table></div>
  </div>;
};

// ═══ PLAYER DETAIL ═══
const PlayerView=({player:p,onBack,injuries})=>{
  const[tab,setTab]=useState("overview");const pInj=injuries.filter(x=>x.player_id===p.id);
  const tabs=[{k:"overview",l:"📊 Áttekintés"},{k:"load",l:"🏋️ Terhelés"},{k:"tests",l:"🧪 Tesztek"},{k:"injury",l:"🏥 ("+pInj.length+")"}];
  const acwrData=p.days.slice(7).map((_,i)=>{const di=i+7;const ac2=p.days.slice(di-6,di+1).reduce((s,d)=>s+d.load,0);const ch2=p.days.slice(0,di+1).reduce((s,d)=>s+d.load,0)/4;return{dl:p.days[di].dl,v:ch2>0?Math.round(ac2/ch2*100)/100:0}});
  return<div>
    <Btn v="ghost" sz="sm" onClick={onBack} style={{marginBottom:10}}>← Vissza</Btn>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:14}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}><div style={{width:46,height:46,borderRadius:12,background:`linear-gradient(135deg,${C.a}30,${C.b}30)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:C.a}}>{p.name.split(" ").map(n=>n[0]).join("")}</div><div><h2 style={{fontSize:20,fontWeight:800,color:C.tx,margin:0}}>{p.name}</h2><div style={{fontSize:12,color:C.txM}}>{POS_L[p.pos]} · {p.age}é · {p.height}cm/{p.weight}kg</div></div><Badge status={p.st}/></div>
      <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:"12px 20px",textAlign:"center"}}><div style={{fontSize:10,color:C.txM}}>READINESS</div><div style={{fontSize:34,fontWeight:900,color:p.st==="GREEN"?C.g:p.st==="YELLOW"?C.y:C.r}}>{(p.rd*100).toFixed(0)}</div></div>
    </div>
    {p.al.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>{p.al.map((a,i)=><span key={i} style={{fontSize:10,padding:"3px 8px",borderRadius:5,fontWeight:600,background:a.t==="d"?C.rD:C.yD,color:a.t==="d"?C.r:C.y}}>⚠ {a.m}</span>)}</div>}
    <div style={{display:"flex",gap:3,marginBottom:16,background:C.bg2,padding:3,borderRadius:9}}>{tabs.map(t=><button key={t.k} onClick={()=>setTab(t.k)} style={{padding:"8px 12px",borderRadius:7,border:"none",background:tab===t.k?C.card:"transparent",color:tab===t.k?C.tx:C.txM,cursor:"pointer",fontSize:11,fontWeight:600}}>{t.l}</button>)}</div>
    {tab==="overview"&&<div>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}><Met sm label="Wellness" value={p.cur.ws.toFixed(0)} unit="%" icon="💚" color={C.g}/><Met sm label="ACWR" value={p.acwr.toFixed(2)} icon="📈" color={p.acwr>1.5?C.r:C.g}/><Met sm label="Jump" value={p.cur.jh} unit="cm" delta={p.jd} icon="🦘" color={C.b}/><Met sm label="Grip" value={p.grip} unit="kg" icon="🤝" color={C.p}/><Met sm label="Shot" value={p.shot} unit="km/h" icon="🏒" color={C.cy}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:18}}><Sec>Wellness 28d</Sec><ResponsiveContainer width="100%" height={200}><AreaChart data={p.days.map(d=>({dl:d.dl,v:d.ws}))}><CartesianGrid strokeDasharray="3 3" stroke={C.brd}/><XAxis dataKey="dl" tick={{fontSize:8,fill:C.txD}}/><YAxis tick={{fontSize:9,fill:C.txM}} domain={[0,100]}/><Tooltip content={<CTip/>}/><Area type="monotone" dataKey="v" name="%" stroke={C.g} fill={C.g} fillOpacity={.1}/></AreaChart></ResponsiveContainer></div>
        <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:18}}><Sec>Wellness Radar</Sec><ResponsiveContainer width="100%" height={200}><RadarChart data={WL.map((l,i)=>({label:l,v:p.cur.wv[i],max:5}))}><PolarGrid stroke={C.brd}/><PolarAngleAxis dataKey="label" tick={{fontSize:9,fill:C.txM}}/><PolarRadiusAxis domain={[0,5]} tick={{fontSize:8,fill:C.txD}}/><Radar name="W" dataKey="v" stroke={C.g} fill={C.g} fillOpacity={.2}/></RadarChart></ResponsiveContainer></div>
      </div>
    </div>}
    {tab==="load"&&<div>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}><Met sm label="Acute" value={p.ac} icon="🔥" color={C.r}/><Met sm label="Chronic" value={p.ch} icon="📊" color={C.b}/><Met sm label="ACWR" value={p.acwr.toFixed(2)} icon="⚖️" color={p.acwr>1.5?C.r:C.g}/></div>
      <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:18,marginBottom:14}}><Sec>Napi terhelés</Sec><ResponsiveContainer width="100%" height={200}><BarChart data={p.days.map(d=>({dl:d.dl,v:d.load}))}><CartesianGrid strokeDasharray="3 3" stroke={C.brd}/><XAxis dataKey="dl" tick={{fontSize:8,fill:C.txD}}/><YAxis tick={{fontSize:9,fill:C.txM}}/><Tooltip content={<CTip/>}/><Bar dataKey="v" name="Load" fill={C.b} fillOpacity={.5} radius={[3,3,0,0]}/></BarChart></ResponsiveContainer></div>
      <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:18}}><Sec>ACWR Trend</Sec><ResponsiveContainer width="100%" height={200}><AreaChart data={acwrData}><CartesianGrid strokeDasharray="3 3" stroke={C.brd}/><XAxis dataKey="dl" tick={{fontSize:8,fill:C.txD}}/><YAxis tick={{fontSize:9,fill:C.txM}} domain={[0,2.2]}/><Tooltip content={<CTip/>}/><ReferenceLine y={1.5} stroke={C.r} strokeDasharray="4 4"/><ReferenceLine y={0.8} stroke={C.y} strokeDasharray="4 4"/><Area type="monotone" dataKey="v" name="ACWR" stroke={C.b} fill={C.b} fillOpacity={.1}/></AreaChart></ResponsiveContainer></div>
    </div>}
    {tab==="tests"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>{p.tests.map((t,i)=><div key={i} style={{background:C.card,border:"1px solid "+C.brd,borderRadius:10,padding:14}}><div style={{fontSize:10,color:C.txM,marginBottom:4}}>{t.t}</div><div style={{fontSize:22,fontWeight:800,color:[C.b,C.p,C.g,C.cy,C.o][i%5]}}>{t.v}</div></div>)}</div>}
    {tab==="injury"&&<div>{pInj.length===0?<p style={{textAlign:"center",padding:40,color:C.g}}>✅ Nincs aktív sérülés</p>:pInj.map(inj=><div key={inj.id} style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:16,marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:14,fontWeight:700,color:C.tx}}>{inj.location} — {inj.type}</span><RBadge phase={inj.rtp_phase}/></div><div style={{display:"flex",gap:3,marginTop:8}}>{RTP.map((_,j)=><div key={j} style={{flex:1,height:5,borderRadius:3,background:j<=inj.rtp_phase?(j<=1?C.r:j<=3?C.y:C.g):C.bg2}}/>)}</div></div>)}</div>}
  </div>;
};

// ═══ CALENDAR ═══
const Cal=({roster,events,onRefresh,tTypes,dTypes,coachId})=>{
  const[mo,setMo]=useState(new Date());const[sel,setSel]=useState(null);const[modal,setModal]=useState(null);const[saving,setSaving]=useState(false);
  const[fT,setFT]=useState("");const[fTi,setFTi]=useState("16:30");const[fD,setFD]=useState("90");const[fS,setFS]=useState("");const[fO,setFO]=useState("");const[fL,setFL]=useState("SZJA Jégcsarnok");
  const y=mo.getFullYear(),m=mo.getMonth(),today=new Date().toISOString().split("T")[0];
  const MN=["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];
  const cells=useMemo(()=>{const r=[];const fd=new Date(y,m,1).getDay();const off=fd===0?6:fd-1;for(let i=0;i<off;i++)r.push(null);for(let d=1;d<=new Date(y,m+1,0).getDate();d++){const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;r.push({day:d,date:ds,evs:events.filter(e=>e.date===ds)})}return r},[y,m,events]);
  const eC=t=>t==="match"?C.g:t==="training"?C.b:C.o;const dEvs=sel?events.filter(e=>e.date===sel):[];
  const openN=t=>{setFT(t==="training"?"Jégedzés":t==="dry"?"Szárazedzés":"Mérkőzés");setFS(t==="training"?tTypes[0]:t==="dry"?dTypes[0]:"Bajnoki");setFD(t==="match"?"60":"90");setFO("");setModal(t)};
  const save=async()=>{setSaving(true);await supabase.from("events").insert({date:sel,type:modal,title:fT,time:fTi,duration:Number(fD),subtype:fS,location:fL,player_ids:roster.filter(p=>p.active).map(p=>p.id),created_by:coachId,...(modal==="match"?{opponent:fO}:{})});setSaving(false);setModal(null);onRefresh()};
  const delEv=async(id)=>{await supabase.from("events").delete().eq("id",id);onRefresh()};
  return<div style={{display:"grid",gridTemplateColumns:"1fr 310px",gap:16}}>
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><Btn v="secondary" sz="sm" onClick={()=>setMo(new Date(y,m-1))}>‹</Btn><h2 style={{fontSize:16,fontWeight:800,color:C.tx,margin:0,minWidth:170,textAlign:"center"}}>{MN[m]} {y}</h2><Btn v="secondary" sz="sm" onClick={()=>setMo(new Date(y,m+1))}>›</Btn><Btn v="secondary" sz="sm" onClick={()=>{setMo(new Date());setSel(today)}} style={{marginLeft:"auto"}}>Ma</Btn></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>{["H","K","Sz","Cs","P","Sz","V"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:10,fontWeight:700,color:C.txD,padding:"6px 0"}}>{d}</div>)}{cells.map((c,i)=>{if(!c)return<div key={"e"+i} style={{background:C.bg2,borderRadius:7,minHeight:68}}/>;const iS=c.date===sel,iT=c.date===today;return<div key={c.date} onClick={()=>setSel(c.date)} style={{background:iS?C.aD:C.card,border:"1px solid "+(iS?C.a+"50":iT?C.b+"40":C.brd),borderRadius:7,minHeight:68,padding:"5px 6px",cursor:"pointer"}}><div style={{fontSize:12,fontWeight:iT?800:600,color:iT?C.b:iS?C.a:C.tx}}>{c.day}</div>{c.evs.slice(0,2).map(ev=><div key={ev.id} style={{fontSize:8,padding:"1px 3px",borderRadius:3,background:eC(ev.type)+"20",color:eC(ev.type),fontWeight:600,marginBottom:1}}>{ev.time}</div>)}</div>})}</div>
    </div>
    <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:16,overflow:"auto"}}>
      {sel?<div><div style={{fontSize:13,fontWeight:700,color:C.tx,marginBottom:4}}>{sel}</div><div style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap"}}><Btn sz="sm" v="blue" onClick={()=>openN("training")}>+ Jég</Btn><Btn sz="sm" v="orange" onClick={()=>openN("dry")}>+ Száraz</Btn><Btn sz="sm" v="green" onClick={()=>openN("match")}>+ Meccs</Btn></div>{dEvs.length===0?<p style={{color:C.txD,textAlign:"center",padding:20}}>Nincs esemény</p>:dEvs.map(ev=><div key={ev.id} style={{background:C.bg2,borderRadius:9,padding:12,marginBottom:6,borderLeft:"3px solid "+eC(ev.type)}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,fontWeight:700,color:C.tx}}>{ev.title}</span><span style={{fontSize:10,color:C.txM}}>{ev.time}</span></div><div style={{fontSize:10,color:C.txM,marginTop:3}}>{ev.duration}p · {ev.subtype||ev.opponent||""}</div><Btn sz="sm" v="danger" onClick={()=>delEv(ev.id)} style={{marginTop:6,padding:"2px 6px",fontSize:9}}>🗑</Btn></div>)}</div>:<p style={{color:C.txD,textAlign:"center",padding:50}}>Válassz napot</p>}
    </div>
    <Modal open={!!modal} onClose={()=>setModal(null)} title={modal==="training"?"⛸️ Jégedzés":modal==="dry"?"💪 Száraz":"🏒 Meccs"}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}><Inp label="Név" value={fT} onChange={setFT}/><Inp label="Idő" value={fTi} onChange={setFTi} type="time"/><Inp label="Perc" value={fD} onChange={setFD} type="number"/><Inp label="Típus" value={fS} onChange={setFS} opts={modal==="training"?tTypes:modal==="dry"?dTypes:["Bajnoki","Edzőmeccs","Kupa"]}/>{modal==="match"&&<Inp label="Ellenfél" value={fO} onChange={setFO}/>}<Inp label="Helyszín" value={fL} onChange={setFL}/></div><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>setModal(null)}>Mégse</Btn><Btn onClick={save} disabled={saving||!fT}>{saving?"⏳":"💾"} Mentés</Btn></div></Modal>
  </div>;
};

// ═══ INJURY MANAGEMENT ═══
const InjMgmt=({roster,injuries,onRefresh,coachId})=>{
  const[modal,setModal]=useState(false);const[fP,setFP]=useState("");const[fL,setFL]=useState(IL[0]);const[fT,setFT]=useState(IT[0]);const[fD,setFD]=useState(new Date().toISOString().split("T")[0]);const[fR,setFR]=useState("");const[fN,setFN]=useState("");const[fPh,setFPh]=useState(0);
  const save=async()=>{if(!fP)return;await supabase.from("injuries").insert({player_id:Number(fP),location:fL,type:fT,date:fD,expected_return:fR||null,notes:fN,rtp_phase:fPh,created_by:coachId});setModal(false);onRefresh()};
  const updRtp=async(id,ph)=>{await supabase.from("injuries").update({rtp_phase:ph}).eq("id",id);onRefresh()};
  const act=injuries.filter(i=>i.rtp_phase<5);
  return<div>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><Sec sub={act.length+" aktív"}>🏥 Sérülések & RTP</Sec><Btn onClick={()=>setModal(true)}>+ Új sérülés</Btn></div>
    {act.length===0?<p style={{textAlign:"center",padding:40,color:C.g}}>✅ Nincs aktív sérülés</p>:act.map(inj=>{const pl=roster.find(x=>x.id===inj.player_id);return<div key={inj.id} style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:16,marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><div><span style={{fontSize:14,fontWeight:700,color:C.tx}}>{pl?.name||"?"}</span><span style={{fontSize:11,color:C.txM,marginLeft:8}}>{pl?.pos}</span></div><RBadge phase={inj.rtp_phase}/></div>
      <div style={{fontSize:12,color:C.txM}}>{inj.location} · {inj.type} · {inj.date}</div>
      {inj.notes&&<div style={{fontSize:11,color:C.txD,marginTop:4,fontStyle:"italic"}}>{inj.notes}</div>}
      <div style={{display:"flex",gap:3,marginTop:8}}>{RTP.map((_,j)=><div key={j} style={{flex:1,height:5,borderRadius:3,background:j<=inj.rtp_phase?(j<=1?C.r:j<=3?C.y:C.g):C.bg2}}/>)}</div>
      <div style={{marginTop:8,display:"flex",gap:3,flexWrap:"wrap"}}>{RTP.map((ph,j)=><Btn key={j} sz="sm" v={j===inj.rtp_phase?"primary":"ghost"} onClick={()=>updRtp(inj.id,j)} style={{padding:"3px 7px",fontSize:9}}>{ph}</Btn>)}</div>
    </div>})}
    <Modal open={modal} onClose={()=>setModal(false)} title="🏥 Új sérülés">
      <Inp label="Játékos" value={fP} onChange={setFP} opts={[{v:"",l:"Válassz..."},...roster.filter(p=>p.active).map(p=>({v:String(p.id),l:p.name+" ("+p.pos+")"}))]}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}><Inp label="Lokáció" value={fL} onChange={setFL} opts={IL}/><Inp label="Típus" value={fT} onChange={setFT} opts={IT}/><Inp label="Dátum" value={fD} onChange={setFD} type="date"/><Inp label="Visszatérés" value={fR} onChange={setFR} type="date"/></div>
      <Inp label="RTP fázis" value={fPh} onChange={v=>setFPh(Number(v))} opts={RTP.map((p,i)=>({v:String(i),l:p}))}/>
      <Inp label="Megjegyzés" value={fN} onChange={setFN} type="textarea"/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>setModal(false)}>Mégse</Btn><Btn onClick={save} disabled={!fP}>💾</Btn></div>
    </Modal>
  </div>;
};

// ═══ SETTINGS (Players + Coaches + Types) ═══
const Sett=({roster,coaches,onRefresh,tT,dT,userRole})=>{
  const[pTab,setPTab]=useState("players");
  const[pModal,setPModal]=useState(null);const[fName,setFName]=useState("");const[fPos,setFPos]=useState("C");const[fAge,setFAge]=useState("15");const[fHt,setFHt]=useState("175");const[fWt,setFWt]=useState("68");
  const[cModal,setCModal]=useState(null);const[cName,setCName]=useState("");const[cRole,setCRole]=useState("COACH");const[cPin,setCPin]=useState("");
  const[nT,setNT]=useState("");const[nD,setND]=useState("");

  const openEditP=p=>{setFName(p.name);setFPos(p.pos);setFAge(String(p.age));setFHt(String(p.height));setFWt(String(p.weight));setPModal(p)};
  const openNewP=()=>{setFName("");setFPos("C");setFAge("15");setFHt("175");setFWt("68");setPModal("new")};
  const saveP=async()=>{if(!fName.trim())return;if(pModal==="new"){await supabase.from("players").insert({name:fName.trim(),pos:fPos,age:Number(fAge),height:Number(fHt),weight:Number(fWt),pin:_genPin()})}else{await supabase.from("players").update({name:fName.trim(),pos:fPos,age:Number(fAge),height:Number(fHt),weight:Number(fWt)}).eq("id",pModal.id)}setPModal(null);onRefresh()};
  const toggleP=async(id,active)=>{await supabase.from("players").update({active:!active}).eq("id",id);onRefresh()};
  const regenPinP=async(id)=>{await supabase.from("players").update({pin:_genPin()}).eq("id",id);onRefresh()};
  const delP=async(id)=>{if(window.confirm("Biztosan törlöd?")){await supabase.from("players").delete().eq("id",id);onRefresh()}};

  const openEditC=c=>{setCName(c.name);setCRole(c.role);setCPin(c.pin);setCModal(c)};
  const openNewC=()=>{setCName("");setCRole("COACH");setCPin(_genPin());setCModal("new")};
  const saveC=async()=>{if(!cName.trim()||!cPin)return;if(cModal==="new"){await supabase.from("coaches").insert({name:cName.trim(),role:cRole,pin:cPin})}else{await supabase.from("coaches").update({name:cName.trim(),role:cRole,pin:cPin}).eq("id",cModal.id)}setCModal(null);onRefresh()};
  const delC=async(id)=>{if(window.confirm("Biztosan törlöd?")){await supabase.from("coaches").delete().eq("id",id);onRefresh()}};
  const toggleC=async(id,active)=>{await supabase.from("coaches").update({active:!active}).eq("id",id);onRefresh()};

  const updTypes=async(field,val)=>{await supabase.from("app_settings").update({[field]:val}).eq("id",1);onRefresh()};

  const isAdmin=userRole==="ADMIN";const isHead=userRole==="HEAD_COACH"||isAdmin;
  const actP=roster.filter(p=>p.active).length;

  const TL=({items,field,nv,setNv,color,label})=><div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:18,marginBottom:14}}>
    <Sec>{label}</Sec>
    <div style={{display:"flex",gap:6,marginBottom:10}}><input value={nv} onChange={e=>setNv(e.target.value)} placeholder="Új típus..." onKeyDown={e=>{if(e.key==="Enter"&&nv.trim()){updTypes(field,[...items,nv.trim()]);setNv("")}}} style={{flex:1,padding:"7px 12px",borderRadius:8,background:C.bg2,border:"1px solid "+C.brd,color:C.tx,fontSize:12,outline:"none"}}/><Btn sz="sm" onClick={()=>{if(nv.trim()){updTypes(field,[...items,nv.trim()]);setNv("")}}} disabled={!nv.trim()}>+</Btn></div>
    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{items.map((t,i)=><span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:7,background:color+"15",color,fontSize:11,fontWeight:600}}>{t}<button onClick={()=>updTypes(field,items.filter((_,j)=>j!==i))} style={{background:"transparent",border:"none",color:C.txD,cursor:"pointer",fontSize:12}}>×</button></span>)}</div>
  </div>;

  return<div style={{maxWidth:750}}>
    <Sec sub="Keret, edzők, típusok">⚙️ Beállítások</Sec>
    <div style={{display:"flex",gap:3,marginBottom:16,background:C.bg2,padding:3,borderRadius:9}}>
      {[{k:"players",l:"👥 Játékosok ("+actP+")"},{k:"types",l:"⛸️ Típusok"},...(isAdmin?[{k:"coaches",l:"🏒 Edzők"}]:[])].map(t=><button key={t.k} onClick={()=>setPTab(t.k)} style={{flex:1,padding:"8px 12px",borderRadius:7,border:"none",background:pTab===t.k?C.card:"transparent",color:pTab===t.k?C.tx:C.txM,cursor:"pointer",fontSize:11,fontWeight:600}}>{t.l}</button>)}
    </div>

    {pTab==="players"&&isHead&&<div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><div style={{fontSize:13,fontWeight:700,color:C.tx}}>👥 Keret ({actP}/{roster.length})</div><Btn sz="sm" onClick={openNewP}>+ Új játékos</Btn></div>
      <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{borderBottom:"1px solid "+C.brd}}>{["","Név","Poz","Kor","Cm/Kg","PIN",""].map((h,i)=><th key={i} style={{padding:"8px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:C.txM}}>{h}</th>)}</tr></thead><tbody>{roster.map(p=><tr key={p.id} style={{borderBottom:"1px solid "+C.brd,opacity:p.active?1:.45}}>
        <td style={{padding:"6px 10px"}}><div onClick={()=>toggleP(p.id,p.active)} style={{width:16,height:16,borderRadius:4,border:"2px solid "+(p.active?C.a:C.txD),background:p.active?C.a:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#000",fontWeight:900}}>{p.active&&"✓"}</div></td>
        <td style={{padding:"6px 10px",fontSize:12,fontWeight:600,color:C.tx}}>{p.name}</td>
        <td style={{padding:"6px 10px",fontSize:11,color:C.txM}}>{p.pos}</td>
        <td style={{padding:"6px 10px",fontSize:11,color:C.txM}}>{p.age}é</td>
        <td style={{padding:"6px 10px",fontSize:11,color:C.txM}}>{p.height}/{p.weight}</td>
        <td style={{padding:"6px 10px"}}><span style={{fontSize:13,color:C.a,fontFamily:"monospace",fontWeight:800,letterSpacing:2}}>{p.pin}</span></td>
        <td style={{padding:"6px 10px"}}><div style={{display:"flex",gap:4}}><Btn sz="sm" v="secondary" onClick={()=>openEditP(p)} style={{padding:"3px 8px",fontSize:9}}>✏️</Btn><Btn sz="sm" v="secondary" onClick={()=>regenPinP(p.id)} style={{padding:"3px 8px",fontSize:9}}>🔄</Btn><Btn sz="sm" v="danger" onClick={()=>delP(p.id)} style={{padding:"3px 8px",fontSize:9}}>🗑</Btn></div></td>
      </tr>)}</tbody></table></div>
      <div style={{marginTop:14,background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:16}}><Sec>📋 PIN lista nyomtatáshoz</Sec><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>{roster.filter(p=>p.active).map(p=><div key={p.id} style={{background:C.bg2,borderRadius:8,padding:"8px 12px",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:C.tx,fontWeight:600}}>{p.name}</span><span style={{fontSize:14,color:C.a,fontFamily:"monospace",fontWeight:800}}>{p.pin}</span></div>)}</div></div>
    </div>}
    {pTab==="players"&&!isHead&&<p style={{color:C.txM,textAlign:"center",padding:30}}>Nincs jogosultságod a keret kezeléséhez.</p>}

    {pTab==="types"&&<div>
      <TL items={tT} field="training_types" nv={nT} setNv={setNT} color={C.b} label="⛸️ Jégedzés típusok"/>
      <TL items={dT} field="dry_types" nv={nD} setNv={setND} color={C.o} label="💪 Szárazedzés típusok"/>
    </div>}

    {pTab==="coaches"&&isAdmin&&<div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><div style={{fontSize:13,fontWeight:700,color:C.tx}}>🏒 Edzők ({coaches.length})</div><Btn sz="sm" onClick={openNewC}>+ Új edző</Btn></div>
      <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{borderBottom:"1px solid "+C.brd}}>{["","Név","Jogosultság","PIN",""].map((h,i)=><th key={i} style={{padding:"8px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:C.txM}}>{h}</th>)}</tr></thead><tbody>{coaches.map(c=><tr key={c.id} style={{borderBottom:"1px solid "+C.brd,opacity:c.active!==false?1:.45}}>
        <td style={{padding:"6px 10px"}}><div onClick={()=>toggleC(c.id,c.active!==false)} style={{width:16,height:16,borderRadius:4,border:"2px solid "+(c.active!==false?C.a:C.txD),background:c.active!==false?C.a:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#000",fontWeight:900}}>{c.active!==false&&"✓"}</div></td>
        <td style={{padding:"6px 10px",fontSize:12,fontWeight:600,color:C.tx}}>{c.name}</td>
        <td style={{padding:"6px 10px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:5,background:c.role==="ADMIN"?C.pD:c.role==="HEAD_COACH"?C.gD:C.bD,color:c.role==="ADMIN"?C.p:c.role==="HEAD_COACH"?C.g:C.b,fontWeight:700}}>{c.role==="ADMIN"?"Admin":c.role==="HEAD_COACH"?"Vezetőedző":"Edző"}</span></td>
        <td style={{padding:"6px 10px",fontSize:13,color:C.a,fontFamily:"monospace",fontWeight:800}}>{c.pin}</td>
        <td style={{padding:"6px 10px"}}><div style={{display:"flex",gap:4}}><Btn sz="sm" v="secondary" onClick={()=>openEditC(c)} style={{padding:"3px 8px",fontSize:9}}>✏️</Btn><Btn sz="sm" v="danger" onClick={()=>delC(c.id)} style={{padding:"3px 8px",fontSize:9}}>🗑</Btn></div></td>
      </tr>)}</tbody></table></div>
    </div>}

    <Modal open={pModal!==null} onClose={()=>setPModal(null)} title={pModal==="new"?"➕ Új játékos":"✏️ Szerkesztés"} w={480}>
      <Inp label="Teljes név" value={fName} onChange={setFName} ph="Vezetéknév Keresztnév"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}><Inp label="Pozíció" value={fPos} onChange={setFPos} opts={POSITIONS.map(p=>({v:p,l:p+" — "+POS_L[p]}))}/><Inp label="Életkor" value={fAge} onChange={setFAge} type="number"/><Inp label="Magasság" value={fHt} onChange={setFHt} type="number"/><Inp label="Súly" value={fWt} onChange={setFWt} type="number"/></div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>setPModal(null)}>Mégse</Btn><Btn onClick={saveP} disabled={!fName.trim()}>💾</Btn></div>
    </Modal>
    <Modal open={cModal!==null} onClose={()=>setCModal(null)} title={cModal==="new"?"➕ Új edző":"✏️ Edző szerkesztése"} w={480}>
      <Inp label="Név" value={cName} onChange={setCName} ph="Név"/>
      <Inp label="Jogosultság" value={cRole} onChange={setCRole} opts={[{v:"COACH",l:"Edző"},{v:"HEAD_COACH",l:"Vezetőedző"},{v:"ADMIN",l:"Admin"}]}/>
      <Inp label="PIN kód" value={cPin} onChange={setCPin} ph="4 jegyű PIN"/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>setCModal(null)}>Mégse</Btn><Btn onClick={saveC} disabled={!cName.trim()||!cPin}>💾</Btn></div>
    </Modal>
  </div>;
};

// ═══ ALERTS ═══
const Alrt=({players})=>{
  const all=players.flatMap(p=>p.al.map(a=>({...a,player:p.name,st:p.st})));
  const dangers=all.filter(a=>a.t==="d"),warns=all.filter(a=>a.t==="w");
  return<div style={{maxWidth:600}}>
    <Sec sub={all.length+" aktív"}>🔔 Riasztások</Sec>
    {dangers.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:700,color:C.r,marginBottom:8}}>🚨 KRITIKUS</div>{dangers.map((a,i)=><div key={i} style={{background:C.rD,borderRadius:9,padding:"10px 14px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:12,fontWeight:700,color:C.tx}}>{a.player}</div><div style={{fontSize:11,color:C.r}}>{a.m}</div></div><Badge status={a.st}/></div>)}</div>}
    {warns.length>0&&<div><div style={{fontSize:11,fontWeight:700,color:C.y,marginBottom:8}}>⚡ FIGYELMEZTETÉS</div>{warns.map((a,i)=><div key={i} style={{background:C.yD,borderRadius:9,padding:"10px 14px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:12,fontWeight:700,color:C.tx}}>{a.player}</div><div style={{fontSize:11,color:C.y}}>{a.m}</div></div><Badge status={a.st}/></div>)}</div>}
    {all.length===0&&<div style={{textAlign:"center",padding:50}}><h3 style={{color:C.g}}>✅ Minden rendben</h3></div>}
  </div>;
};

// ═══ MAIN APP ═══
export default function App() {
  const [auth, setAuth] = useState(null);
  const [view, setView] = useState("team");
  const [selP, setSelP] = useState(null);
  const [sb, setSb] = useState(true);
  const [loading, setLoading] = useState(false);

  // Data from Supabase
  const [roster, setRoster] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [events, setEvents] = useState([]);
  const [injuries, setInjuries] = useState([]);
  const [wellnessLogs, setWellnessLogs] = useState([]);
  const [rpeLogs, setRpeLogs] = useState([]);
  const [forceLogs, setForceLogs] = useState([]);
  const [tT, setTT] = useState(DEF_TT);
  const [dT, setDT] = useState(DEF_DT);

  // Load all data
  const loadAll = useCallback(async () => {
    setLoading(true);
    const [pRes, cRes, eRes, iRes, wRes, rRes, fRes, sRes] = await Promise.all([
      supabase.from("players").select("*").order("id"),
      supabase.from("coaches").select("*").order("created_at"),
      supabase.from("events").select("*").order("date"),
      supabase.from("injuries").select("*").order("date", { ascending: false }),
      supabase.from("wellness_logs").select("*").gte("date", new Date(Date.now() - 28*86400000).toISOString().split("T")[0]),
      supabase.from("rpe_logs").select("*").gte("date", new Date(Date.now() - 28*86400000).toISOString().split("T")[0]),
      supabase.from("force_plate_logs").select("*").gte("date", new Date(Date.now() - 28*86400000).toISOString().split("T")[0]),
      supabase.from("app_settings").select("*").eq("id", 1).single(),
    ]);
    if (pRes.data) setRoster(pRes.data);
    if (cRes.data) setCoaches(cRes.data);
    if (eRes.data) setEvents(eRes.data);
    if (iRes.data) setInjuries(iRes.data);
    if (wRes.data) setWellnessLogs(wRes.data);
    if (rRes.data) setRpeLogs(rRes.data);
    if (fRes.data) setForceLogs(fRes.data);
    if (sRes.data) { setTT(sRes.data.training_types || DEF_TT); setDT(sRes.data.dry_types || DEF_DT); }
    setLoading(false);
  }, []);

  useEffect(() => { if (auth) loadAll(); }, [auth, loadAll]);

  // Compute player metrics
  const players = useMemo(() => {
    return roster.filter(p => p.active).map(p => computeMetrics(p, wellnessLogs, rpeLogs, forceLogs));
  }, [roster, wellnessLogs, rpeLogs, forceLogs]);

  const alC = players.reduce((s, p) => s + p.al.length, 0);
  const actI = injuries.filter(i => i.rtp_phase < 5).length;

  if (!auth) return <Login onLogin={setAuth} />;
  if (auth.type === "player") return <PRPE player={auth.user} events={events} onLogout={() => setAuth(null)} onRefresh={loadAll} />;
  if (loading && !roster.length) return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><Spinner/></div>;

  const userRole = auth.user.role;
  const nav = [{k:"team",l:"Dashboard",i:"👥"},{k:"calendar",l:"Naptár",i:"📅"},{k:"injury",l:"Sérülések",i:"🏥",badge:actI},{k:"alerts",l:"Riasztások",i:"🔔",badge:alC},{k:"settings",l:"Beállítások",i:"⚙️"}];

  return (
    <div style={{display:"flex",height:"100vh",background:C.bg,overflow:"hidden",fontFamily:"'Inter',-apple-system,sans-serif"}}>
      <div style={{width:sb?200:52,background:C.bg2,borderRight:"1px solid "+C.brd,display:"flex",flexDirection:"column",transition:"width .25s",flexShrink:0,overflow:"hidden"}}>
        <div style={{padding:sb?"14px":"14px 8px",borderBottom:"1px solid "+C.brd,display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>setSb(p=>!p)}>
          <div style={{width:30,height:30,borderRadius:8,background:`linear-gradient(135deg,${C.a},${C.b})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>🏒</div>
          {sb&&<div><div style={{fontSize:12,fontWeight:800,color:C.tx}}>SportSci</div><div style={{fontSize:9,color:C.a,fontWeight:700}}>SZJA U16</div></div>}
        </div>
        <div style={{padding:"8px 4px",flex:1}}>{nav.map(n=>{const act=view===n.k||(n.k==="team"&&view==="player");return<button key={n.k} onClick={()=>{setView(n.k);setSelP(null)}} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:sb?"7px 10px":"7px",borderRadius:8,border:"none",background:act?C.aD:"transparent",color:act?C.a:C.txM,cursor:"pointer",marginBottom:2,justifyContent:sb?"flex-start":"center",position:"relative"}}><span style={{fontSize:14}}>{n.i}</span>{sb&&<span style={{fontSize:11,fontWeight:600}}>{n.l}</span>}{n.badge>0&&<span style={{position:sb?"relative":"absolute",top:sb?"auto":0,right:sb?"auto":0,marginLeft:sb?"auto":0,background:C.r,color:"#fff",fontSize:8,fontWeight:800,padding:"1px 4px",borderRadius:8}}>{n.badge}</span>}</button>})}</div>
        {sb&&<div style={{padding:"10px 14px",borderTop:"1px solid "+C.brd}}>
          <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{auth.user.name}</div>
          <div style={{fontSize:10,color:C.a}}>{userRole==="ADMIN"?"Admin":userRole==="HEAD_COACH"?"Vezetőedző":"Edző"}</div>
          <Btn v="ghost" sz="sm" onClick={()=>setAuth(null)} style={{marginTop:6,width:"100%",justifyContent:"center"}}>Kilépés</Btn>
        </div>}
      </div>
      <div style={{flex:1,overflow:"auto"}}>
        <div style={{padding:"11px 20px",borderBottom:"1px solid "+C.brd,display:"flex",justifyContent:"space-between",alignItems:"center",background:C.bg2,position:"sticky",top:0,zIndex:10}}>
          <div><h1 style={{fontSize:15,fontWeight:800,color:C.tx,margin:0}}>{view==="team"?"Dashboard":view==="player"?(selP?.name||""):view==="calendar"?"Naptár":view==="injury"?"Sérülések":view==="alerts"?"Riasztások":"Beállítások"}</h1><div style={{fontSize:10,color:C.txM}}>{new Date().toLocaleDateString("hu-HU",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>{loading&&<span style={{fontSize:10,color:C.a}}>⏳</span>}<span style={{padding:"3px 8px",borderRadius:6,background:C.aD,fontSize:10,fontWeight:600,color:C.a}}>v4.0</span></div>
        </div>
        <div style={{padding:"16px 20px",maxWidth:1300}}>
          {view==="team"&&<TeamDash players={players} onSelect={p=>{setSelP(p);setView("player")}}/>}
          {view==="player"&&selP&&<PlayerView player={selP} onBack={()=>setView("team")} injuries={injuries}/>}
          {view==="calendar"&&<Cal roster={roster} events={events} onRefresh={loadAll} tTypes={tT} dTypes={dT} coachId={auth.user.id}/>}
          {view==="injury"&&<InjMgmt roster={roster} injuries={injuries} onRefresh={loadAll} coachId={auth.user.id}/>}
          {view==="alerts"&&<Alrt players={players}/>}
          {view==="settings"&&<Sett roster={roster} coaches={coaches} onRefresh={loadAll} tT={tT} dT={dT} userRole={userRole}/>}
        </div>
      </div>
    </div>
  );
}
