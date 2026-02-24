import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine
} from "recharts";

// ════════════════════════════════════════════════════════
// 🏒 SZJA U16 JÉGHOKI — SPORT SCIENCE PLATFORM v3.0 🏒
// ════════════════════════════════════════════════════════

const C={bg:"#060a13",bg2:"#0c1121",card:"#111a2e",cardH:"#162040",brd:"#1c2a48",tx:"#e4eaf4",txM:"#7f90b0",txD:"#4a5d80",g:"#10b981",gD:"rgba(16,185,129,.12)",y:"#f59e0b",yD:"rgba(245,158,11,.12)",r:"#ef4444",rD:"rgba(239,68,68,.12)",b:"#3b82f6",bD:"rgba(59,130,246,.12)",p:"#8b5cf6",pD:"rgba(139,92,246,.12)",cy:"#06b6d4",o:"#f97316",oD:"rgba(249,115,22,.12)",a:"#06d6a0",aD:"rgba(6,214,160,.12)",aG:"rgba(6,214,160,.25)"};

const _sd=s=>{let h=0;for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}return Math.abs(h)};
const _rng=s=>{let x=s;return()=>{x=(x*16807)%2147483647;return(x-1)/2147483646}};

const POSITIONS=["C","LW","RW","LD","RD","G"];
const POS_L={C:"Center",LW:"Bal szélső",RW:"Jobb szélső",LD:"Bal védő",RD:"Jobb védő",G:"Kapus"};
const DEFAULT_ROSTER=[
  {id:1,name:"Kovács Bence",pos:"G",age:15,ht:175,wt:68,pin:"2001",active:true},
  {id:2,name:"Tóth Márk",pos:"G",age:14,ht:172,wt:65,pin:"2002",active:true},
  {id:3,name:"Nagy Dávid",pos:"C",age:15,ht:178,wt:70,pin:"2003",active:true},
  {id:4,name:"Szabó Levente",pos:"LW",age:14,ht:170,wt:62,pin:"2004",active:true},
  {id:5,name:"Horváth Ádám",pos:"RW",age:15,ht:176,wt:69,pin:"2005",active:true},
  {id:6,name:"Varga Máté",pos:"LD",age:14,ht:174,wt:67,pin:"2006",active:true},
  {id:7,name:"Kiss Dominik",pos:"RD",age:15,ht:180,wt:73,pin:"2007",active:true},
  {id:8,name:"Molnár Balázs",pos:"C",age:14,ht:168,wt:60,pin:"2008",active:true},
  {id:9,name:"Németh Krisztián",pos:"LW",age:16,ht:182,wt:75,pin:"2009",active:true},
  {id:10,name:"Farkas Roland",pos:"RW",age:15,ht:177,wt:71,pin:"2010",active:true},
  {id:11,name:"Papp Gergő",pos:"LD",age:14,ht:171,wt:64,pin:"2011",active:true},
  {id:12,name:"Balogh Tamás",pos:"RD",age:15,ht:179,wt:72,pin:"2012",active:true},
  {id:13,name:"Takács Péter",pos:"C",age:14,ht:173,wt:66,pin:"2013",active:true},
  {id:14,name:"Juhász Norbert",pos:"LW",age:16,ht:181,wt:74,pin:"2014",active:true},
  {id:15,name:"Lakatos Zsolt",pos:"RW",age:15,ht:175,wt:68,pin:"2015",active:true},
  {id:16,name:"Simon András",pos:"LD",age:14,ht:170,wt:63,pin:"2016",active:true},
  {id:17,name:"Fekete Richárd",pos:"C",age:15,ht:177,wt:70,pin:"2017",active:true},
  {id:18,name:"Szűcs Attila",pos:"RD",age:14,ht:172,wt:65,pin:"2018",active:true},
  {id:19,name:"Kis Botond",pos:"LW",age:15,ht:176,wt:69,pin:"2019",active:true},
  {id:20,name:"Vincze Noel",pos:"RW",age:14,ht:174,wt:67,pin:"2020",active:true},
];
const _genPin=()=>String(Math.floor(1000+Math.random()*9000));
const WK=["sq","sd","so","fa","st","mo"];
const WL=["Alvásminőség","Alvásidő","Izomláz","Fáradtság","Stressz","Hangulat"];
const DEF_T=["Taktikai","Technikai","Power skating","Lövőedzés","Játékforma","Kapusedzés"];
const DEF_D=["Erő","Kondíció","Kardió","Core/Stabilitás","Mobilitás","Sprint"];
const IL=["Váll","Csípőflexor","Térd (MCL)","Boka","Ágyék","Comb","Agyrázkódás","Egyéb"];
const IT=["Kontakt sérülés","Nem-kontakt","Túlterhelés","Agyrázkódás","Izomhúzódás"];
const RTP=["Sérült","Rehab","Egyéni on-ice","Kontaktmentes","Teljes edzés","Meccsképes"];
const COACHES=[
  {id:"c1",name:"Szabó Tamás",role:"HEAD_COACH",pin:"1234"},
  {id:"c2",name:"Kiss András",role:"COACH",pin:"5678"},
  {id:"c3",name:"Tóth Péter",role:"COACH",pin:"9012"},
  {id:"c4",name:"Admin",role:"ADMIN",pin:"0000"},
];

// ── Data Generation ──
function buildPlayers(roster){
  return roster.filter(p=>p.active).map((pl,idx)=>{
    const name=pl.name;
    const r=_rng(_sd(name)+42),pos=pl.pos,fit=60+r()*30,age=pl.age||14+Math.floor(r()*3),ht=pl.ht||160+Math.floor(r()*25),wt=pl.wt||50+Math.floor(r()*25);
    const days=[];
    for(let d=27;d>=0;d--){
      const dr=_rng(_sd(name)+d*7);
      const wv=WK.map(()=>Math.max(1,Math.min(5,Math.round(2.5+(dr()-.4)*3))));
      const ws=(wv.reduce((a,b)=>a+b,0)/30)*100;
      const dur=Math.round(60+dr()*50),rpe=Math.max(1,Math.min(10,Math.round(4+(dr()-.3)*6)));
      const jh=28+fit*.15+(dr()-.5)*6,pf=1800+fit*10+(dr()-.5)*300,as=Math.abs((dr()-.5)*20);
      const dt=new Date();dt.setDate(dt.getDate()-d);
      days.push({date:dt.toISOString().split("T")[0],dl:`${dt.getMonth()+1}/${dt.getDate()}`,wv,ws:Math.round(ws*10)/10,dur,rpe,load:rpe*dur,jh:Math.round(jh*10)/10,pf:Math.round(pf),as:Math.round(as*10)/10});
    }
    const avg=a=>a.reduce((s,v)=>s+v,0)/a.length;
    const sdd=a=>{const m=avg(a);return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/a.length)};
    const cur=days[27],ac=days.slice(-7).reduce((s,d)=>s+d.load,0),ch=days.reduce((s,d)=>s+d.load,0)/4,acwr=ch>0?Math.round(ac/ch*100)/100:0;
    const jm=avg(days.map(d=>d.jh)),fm=avg(days.map(d=>d.pf)),wm=avg(days.map(d=>d.ws)),wsd=sdd(days.map(d=>d.ws));
    const wz=wsd>0?(cur.ws-wm)/wsd:0,jd=((cur.jh-jm)/jm)*100,fd=((cur.pf-fm)/fm)*100;
    const nm=(v,a,b)=>Math.max(0,Math.min(1,(v-a)/(b-a)));
    const rd=Math.round((nm(wz,-2,2)*.3+Math.max(0,Math.min(1,1-Math.abs(acwr-1.1)))*.25+nm(jd,-10,10)*.2+nm(fd,-10,10)*.15+(1-nm(cur.as,0,25))*.1)*100)/100;
    const st=rd>=.75?"GREEN":rd>=.5?"YELLOW":"RED";
    const al=[];
    if(acwr>1.5)al.push({t:"d",m:"ACWR > 1.5"});if(acwr<.8)al.push({t:"w",m:"ACWR < 0.8"});
    if(jd<-5)al.push({t:"d",m:`Jump ↓${Math.abs(jd).toFixed(1)}%`});if(cur.as>15)al.push({t:"d",m:`Asym ${cur.as.toFixed(1)}%`});
    const grip=Math.round(30+fit*.3+(r()-.5)*10),shot=Math.round(70+fit*.5+(r()-.5)*15),sp30=Math.round((4.2+r()*.8)*100)/100;
    const anthro=Array(6).fill(0).map((_,i)=>{const dt=new Date();dt.setMonth(dt.getMonth()-i*2);return{d:dt.toISOString().split("T")[0].slice(5),h:ht-i*.3+r()*.5,w:wt-i*.4+r()*.6}}).reverse();
    return{id:idx+1,name,pos,age,ht,wt,days,ac,ch:Math.round(ch),acwr,jm:Math.round(jm*10)/10,fm:Math.round(fm),jd:Math.round(jd*10)/10,fd:Math.round(fd*10)/10,wz:Math.round(wz*100)/100,as:cur.as,rd,st,al,cur,grip,shot,sp30,anthro,
      tests:[{t:"On-ice sprint",v:"4.82s"},{t:"Shot speed",v:shot+" km/h"},{t:"Grip strength",v:grip+" kg"},{t:"Sprint 30m",v:sp30+"s"},{t:"Broad jump",v:Math.round(200+fit*1.5)+" cm"}]};
  });
}

function buildEvents(roster){
  const evs=[],now=new Date(),ids=roster.filter(p=>p.active).map(p=>p.id);
  for(let i=-10;i<14;i++){
    const d=new Date(now);d.setDate(d.getDate()+i);const ds=d.toISOString().split("T")[0],dow=d.getDay();
    if(dow===1||dow===3||dow===5)evs.push({id:"t"+i,date:ds,type:"training",title:"Jégedzés",time:"16:30",duration:90,subtype:DEF_T[Math.abs(i)%6],players:ids.slice(0,18),location:"SZJA Jégcsarnok"});
    if(dow===2||dow===4)evs.push({id:"d"+i,date:ds,type:"dry",title:"Szárazedzés",time:"16:00",duration:60,subtype:DEF_D[Math.abs(i)%6],players:ids.slice(0,20),location:"SZJA Konditerem"});
    if(dow===6&&i%3===0)evs.push({id:"m"+i,date:ds,type:"match",title:"Bajnoki",time:"11:00",duration:60,opponent:["FTC U16","Újpest U16","MAC U16","DVTK U16"][Math.abs(i)%4],players:ids.slice(0,20),location:"SZJA Jégcsarnok"});
  }
  return evs;
}

// ── Custom Recharts Tooltip ──
const CTip=({active,payload,label})=>{
  if(!active||!payload)return null;
  return(<div style={{background:"#1a2235ee",border:"1px solid "+C.brd,borderRadius:8,padding:"8px 12px"}}><div style={{fontSize:10,color:C.txM,marginBottom:4}}>{label}</div>{payload.map((p,i)=>(<div key={i} style={{fontSize:11,color:p.color,fontWeight:600}}>{p.name}: {typeof p.value==="number"?p.value.toFixed(1):p.value}</div>))}</div>);
};

// ── UI Atoms ──
const Badge=({status:s})=>{const m={GREEN:{bg:C.gD,c:C.g,l:"Ready"},YELLOW:{bg:C.yD,c:C.y,l:"Monitor"},RED:{bg:C.rD,c:C.r,l:"Alert"}}[s]||{bg:C.yD,c:C.y,l:"?"};return<span style={{padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:700,background:m.bg,color:m.c,textTransform:"uppercase",letterSpacing:.5}}>{m.l}</span>};
const RBadge=({phase:p})=>{const cl=[C.r,C.o,C.y,C.y,C.b,C.g][p]||C.txM;return<span style={{padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:700,background:cl+"15",color:cl}}>{RTP[p]}</span>};
const Met=({label,value,unit,delta,color,icon,sm})=>(
  <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:sm?"12px 14px":"18px 22px",flex:1,minWidth:sm?110:150}}>
    <div style={{fontSize:10,color:C.txM,textTransform:"uppercase",letterSpacing:1,marginBottom:6,display:"flex",alignItems:"center",gap:5}}>{icon&&<span style={{fontSize:13}}>{icon}</span>}{label}</div>
    <div style={{fontSize:sm?20:26,fontWeight:800,color:color||C.tx,lineHeight:1.1}}>{value}{unit&&<span style={{fontSize:12,fontWeight:400,color:C.txM,marginLeft:3}}>{unit}</span>}</div>
    {delta!==undefined&&<div style={{fontSize:11,color:delta>0?C.g:delta<0?C.r:C.txM,marginTop:3,fontWeight:600}}>{delta>0?"▲":delta<0?"▼":"—"} {Math.abs(delta).toFixed(1)}%</div>}
  </div>
);
const Sec=({children,sub})=>(<div style={{marginBottom:14}}><h2 style={{fontSize:15,fontWeight:700,color:C.tx,margin:0}}>{children}</h2>{sub&&<p style={{fontSize:11,color:C.txM,margin:"3px 0 0"}}>{sub}</p>}</div>);
const Btn=({children,onClick,v,sz,disabled,full,style:sx})=>{const vs={primary:{background:C.a,color:"#000"},secondary:{background:C.bg2,color:C.txM,border:"1px solid "+C.brd},danger:{background:C.rD,color:C.r},blue:{background:C.bD,color:C.b},orange:{background:C.oD,color:C.o},ghost:{background:"transparent",color:C.txM},green:{background:C.gD,color:C.g},purple:{background:C.pD,color:C.p}};const szs={sm:{padding:"5px 12px",fontSize:11},md:{padding:"9px 18px",fontSize:12},lg:{padding:"13px 26px",fontSize:13}};return<button onClick={disabled?undefined:onClick} style={{border:"none",borderRadius:10,cursor:disabled?"default":"pointer",fontWeight:700,opacity:disabled?.5:1,display:"inline-flex",alignItems:"center",gap:6,whiteSpace:"nowrap",justifyContent:full?"center":undefined,width:full?"100%":undefined,...szs[sz||"md"],...vs[v||"primary"],...sx}}>{children}</button>};
const Inp=({label,value,onChange,type,ph,opts,style:s})=>(
  <div style={{marginBottom:12,...s}}>
    {label&&<label style={{fontSize:11,color:C.txM,display:"block",marginBottom:5,fontWeight:600}}>{label}</label>}
    {opts?<select value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"9px 12px",borderRadius:9,background:C.bg2,border:"1px solid "+C.brd,color:C.tx,fontSize:12,outline:"none",boxSizing:"border-box"}}>{opts.map(o=><option key={typeof o==="string"?o:o.v} value={typeof o==="string"?o:o.v}>{typeof o==="string"?o:o.l}</option>)}</select>
    :type==="textarea"?<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={ph} rows={3} style={{width:"100%",padding:"9px 12px",borderRadius:9,background:C.bg2,border:"1px solid "+C.brd,color:C.tx,fontSize:12,outline:"none",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/>
    :<input type={type||"text"} value={value} onChange={e=>onChange(e.target.value)} placeholder={ph} style={{width:"100%",padding:"9px 12px",borderRadius:9,background:C.bg2,border:"1px solid "+C.brd,color:C.tx,fontSize:12,outline:"none",boxSizing:"border-box"}}/>}
  </div>
);
const Modal=({open,onClose,title,children,w})=>{if(!open)return null;return<div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}><div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.7)"}}/><div onClick={e=>e.stopPropagation()} style={{position:"relative",background:C.card,border:"1px solid "+C.brd,borderRadius:16,padding:24,width:w||560,maxWidth:"95vw",maxHeight:"88vh",overflow:"auto"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><h3 style={{fontSize:17,fontWeight:800,color:C.tx,margin:0}}>{title}</h3><button onClick={onClose} style={{background:"transparent",border:"none",color:C.txM,fontSize:18,cursor:"pointer"}}>✕</button></div>{children}</div></div>};
const PCk=({players:pl,selected:sel,onChange:oc})=>{if(!pl||!pl.length)return null;const all=sel.length===pl.length;return<div><div style={{marginBottom:6,display:"flex",alignItems:"center",gap:8}}><Btn sz="sm" v={all?"primary":"secondary"} onClick={()=>oc(all?[]:pl.map(p=>p.id))}>{all?"✓ Mind":"Összes"}</Btn><span style={{fontSize:11,color:C.txM}}>{sel.length}/{pl.length}</span></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:3,maxHeight:170,overflowY:"auto"}}>{pl.map(p=>{const s=sel.includes(p.id);return<div key={p.id} onClick={()=>oc(s?sel.filter(i=>i!==p.id):[...sel,p.id])} style={{padding:"6px 8px",borderRadius:7,cursor:"pointer",background:s?C.aD:C.bg2,border:"1px solid "+(s?C.a+"40":C.brd),display:"flex",alignItems:"center",gap:5}}><div style={{width:12,height:12,borderRadius:3,border:"2px solid "+(s?C.a:C.txD),background:s?C.a:"transparent",fontSize:8,color:"#000",fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{s&&"✓"}</div><span style={{fontSize:10,color:s?C.tx:C.txM,fontWeight:s?600:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span></div>})}</div></div>};

// ═══ LOGIN ═══
const Login=({onLogin,roster})=>{
  const[mode,setMode]=useState("coach");const[pin,setPin]=useState("");const[err,setErr]=useState("");const[pN,setPN]=useState("");
  const add=d=>{if(pin.length>=4)return;const np=pin+d;setPin(np);setErr("");if(np.length===4)setTimeout(()=>{const c=COACHES.find(x=>x.pin===np);if(c)onLogin({type:"coach",user:c});else{setErr("Hibás PIN");setPin("");}},200)};
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:400,maxWidth:"95vw"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:64,height:64,borderRadius:16,background:`linear-gradient(135deg,${C.a},${C.b})`,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:28,marginBottom:12,boxShadow:"0 8px 32px "+C.aG}}>🏒</div>
          <h1 style={{fontSize:22,fontWeight:900,color:C.tx,margin:"0 0 4px"}}>SportSci Platform</h1>
          <p style={{fontSize:14,color:C.a,fontWeight:800,margin:0}}>SZJA U16 Jéghoki</p>
        </div>
        <div style={{display:"flex",gap:4,marginBottom:18,background:C.bg2,padding:4,borderRadius:12}}>
          {[{k:"coach",l:"🏒 Edző"},{k:"player",l:"⚽ Játékos RPE"}].map(m=><button key={m.k} onClick={()=>{setMode(m.k);setErr("");setPin("");}} style={{flex:1,padding:11,borderRadius:10,border:"none",background:mode===m.k?C.card:"transparent",color:mode===m.k?C.tx:C.txM,cursor:"pointer",fontSize:12,fontWeight:700}}>{m.l}</button>)}
        </div>
        <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:16,padding:24}}>
          {mode==="coach"?<div>
            <p style={{fontSize:12,color:C.txM,marginBottom:18}}>Adja meg a 4 jegyű PIN kódját</p>
            <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:20}}>{[0,1,2,3].map(i=><div key={i} style={{width:44,height:52,borderRadius:11,background:C.bg2,border:"2px solid "+(pin.length>i?C.a:C.brd),display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:C.tx}}>{pin[i]?"●":""}</div>)}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,maxWidth:240,margin:"0 auto"}}>{[1,2,3,4,5,6,7,8,9,null,0,"⌫"].map((n,i)=><button key={i} onClick={()=>{if(n==="⌫"){setPin(p=>p.slice(0,-1));setErr("");}else if(n!==null)add(String(n));}} style={{height:44,borderRadius:10,border:"1px solid "+C.brd,background:n===null?"transparent":C.bg2,color:C.tx,fontSize:16,fontWeight:700,cursor:n===null?"default":"pointer",visibility:n===null?"hidden":"visible"}}>{n}</button>)}</div>
            <div style={{marginTop:16,padding:10,background:C.bg2,borderRadius:8}}><div style={{fontSize:9,color:C.txD,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Demo PIN kódok</div>{COACHES.map(c=><div key={c.id} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:11}}><span style={{color:C.txM}}>{c.name}</span><span style={{color:C.a,fontFamily:"monospace",fontWeight:700}}>{c.pin}</span></div>)}</div>
          </div>:<div>
            <Inp label="Játékos neve" value={pN} onChange={setPN} ph="pl. Kovács Bence"/>
            <Inp label="Egyéni PIN" value={pin} onChange={v=>{setPin(v);setErr("");}} type="password" ph="4 jegyű PIN"/>
            <Btn full onClick={()=>{const found=roster.find(p=>p.active&&p.name.toLowerCase().includes(pN.toLowerCase())&&p.pin===pin);if(found)onLogin({type:"player",user:{name:found.name,id:found.id}});else setErr("Hibás név vagy PIN");}}>🏒 Belépés</Btn>
            <div style={{marginTop:10,padding:8,background:C.bg2,borderRadius:8,fontSize:10,color:C.txD}}>Kérd el a PIN kódodat az edzőtől!</div>
          </div>}
          {err&&<div style={{marginTop:14,padding:8,borderRadius:8,background:C.rD,color:C.r,fontSize:12,fontWeight:600,textAlign:"center"}}>{err}</div>}
        </div>
      </div>
    </div>
  );
};

// ═══ PLAYER RPE (MOBILE) ═══
const PRPE=({playerName,events,onLogout})=>{
  const[selEv,setSelEv]=useState(null);const[rpe,setRpe]=useState(5);const[done,setDone]=useState(false);
  const[wv,setWv]=useState(Object.fromEntries(WK.map(k=>[k,3])));
  const today=new Date().toISOString().split("T")[0];const todayEvs=events.filter(e=>e.date===today);
  const rCol=v=>v<=3?C.g:v<=6?C.y:v<=8?C.o:C.r;const ws=((Object.values(wv).reduce((a,b)=>a+b,0)/30)*100).toFixed(0);
  if(done)return<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center",padding:40}}><div style={{fontSize:52}}>✅</div><h2 style={{color:C.tx,fontSize:18,fontWeight:700,marginTop:12}}>Rögzítve!</h2><p style={{color:C.txM,fontSize:13,marginTop:4}}>RPE: {rpe}/10 · Wellness: {ws}%</p><div style={{marginTop:16,display:"flex",gap:8,justifyContent:"center"}}><Btn onClick={()=>{setDone(false);setSelEv(null);setRpe(5);}}>Új kitöltés</Btn><Btn v="ghost" onClick={onLogout}>Kilépés</Btn></div></div></div>;
  return(
    <div style={{minHeight:"100vh",background:C.bg,padding:16,maxWidth:460,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div><h2 style={{fontSize:16,fontWeight:800,color:C.tx,margin:0}}>Szia, {playerName.split(" ").pop()}! 🏒</h2><p style={{fontSize:11,color:C.txM,margin:"3px 0 0"}}>SZJA U16</p></div><Btn v="ghost" sz="sm" onClick={onLogout}>Kilépés</Btn></div>
      {!selEv?<div>
        <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:14,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:C.tx,marginBottom:10}}>💚 Wellness <span style={{color:C.a}}>{ws}%</span></div>
          {WL.map((l,i)=><div key={i} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:C.txM}}>{l}</span><span style={{fontSize:11,fontWeight:700,color:C.a}}>{wv[WK[i]]}/5</span></div><div style={{display:"flex",gap:3}}>{[1,2,3,4,5].map(v=><button key={v} onClick={()=>setWv(p=>({...p,[WK[i]]:v}))} style={{flex:1,height:30,borderRadius:6,border:"none",background:wv[WK[i]]>=v?(v<=2?C.rD:v<=3?C.yD:C.gD):C.bg2,color:wv[WK[i]]>=v?(v<=2?C.r:v<=3?C.y:C.g):C.txD,cursor:"pointer",fontWeight:700,fontSize:11}}>{v}</button>)}</div></div>)}
        </div>
        <Sec sub="Válassz RPE kitöltéshez">Mai események</Sec>
        {todayEvs.length===0?<div style={{textAlign:"center",padding:30,background:C.card,borderRadius:12}}><p style={{color:C.txM}}>📅 Nincs mai esemény</p></div>
        :todayEvs.map(ev=><div key={ev.id} onClick={()=>setSelEv(ev)} style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:14,marginBottom:8,cursor:"pointer"}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:700,color:C.tx}}>{ev.type==="match"?"🏒":"⛸️"} {ev.title}</span><span style={{fontSize:11,color:C.txM}}>{ev.time}</span></div><div style={{fontSize:11,color:C.txM,marginTop:3}}>{ev.duration}p · {ev.subtype||ev.opponent||""}</div></div>)}
      </div>:<div>
        <Btn v="ghost" sz="sm" onClick={()=>setSelEv(null)}>← Vissza</Btn>
        <div style={{textAlign:"center",margin:"24px 0"}}><div style={{fontSize:64,fontWeight:900,color:rCol(rpe),lineHeight:1}}>{rpe}</div><div style={{fontSize:12,color:C.txM,marginTop:6}}>{rpe<=2?"Nagyon könnyű":rpe<=4?"Könnyű":rpe<=6?"Közepes":rpe<=8?"Nehéz":"Maximális"}</div></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:20}}>{[1,2,3,4,5,6,7,8,9,10].map(v=><button key={v} onClick={()=>setRpe(v)} style={{height:46,borderRadius:10,border:rpe===v?"2px solid "+rCol(v):"1px solid "+C.brd,background:rpe===v?rCol(v)+"20":C.card,color:rpe===v?rCol(v):C.txM,fontSize:16,fontWeight:800,cursor:"pointer"}}>{v}</button>)}</div>
        <div style={{fontSize:11,color:C.txM,textAlign:"center",marginBottom:14}}>Terhelés: <strong style={{color:C.b}}>{rpe*selEv.duration} AU</strong></div>
        <Btn full sz="lg" onClick={()=>setDone(true)}>💾 Mentés</Btn>
      </div>}
    </div>
  );
};

// ═══ TEAM DASHBOARD ═══
const TeamDash=({players,onSelect})=>{
  const[sort,setSort]=useState("rd");const[dir,setDir]=useState("asc");const[filter,setFilter]=useState("ALL");
  const s=useMemo(()=>({avg:(players.reduce((s,p)=>s+p.rd,0)/players.length*100).toFixed(0),g:players.filter(p=>p.st==="GREEN").length,y:players.filter(p=>p.st==="YELLOW").length,r:players.filter(p=>p.st==="RED").length,al:players.reduce((s,p)=>s+p.al.length,0)}),[players]);
  const sorted=useMemo(()=>{let f=filter==="ALL"?players:players.filter(p=>p.st===filter);return[...f].sort((a,b)=>dir==="asc"?(a[sort]>b[sort]?1:-1):(a[sort]<b[sort]?1:-1))},[players,sort,dir,filter]);
  const ds=k=>{if(sort===k)setDir(d=>d==="asc"?"desc":"asc");else{setSort(k);setDir("asc")}};
  return(
    <div>
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}><Met label="Átl. Readiness" value={s.avg+"%"} icon="🧠" color={Number(s.avg)>=75?C.g:C.y}/><Met label="Green" value={s.g} icon="✅" color={C.g}/><Met label="Yellow" value={s.y} icon="⚡" color={C.y}/><Met label="Red" value={s.r} icon="🚨" color={C.r}/><Met label="Riasztás" value={s.al} icon="🔔" color={C.r}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
        <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:18}}>
          <Sec sub="Csapat eloszlás">Readiness %</Sec>
          <ResponsiveContainer width="100%" height={170}><BarChart data={sorted.map(p=>({n:p.name.split(" ")[1],v:Math.round(p.rd*100),st:p.st}))}><CartesianGrid strokeDasharray="3 3" stroke={C.brd}/><XAxis dataKey="n" tick={{fontSize:8,fill:C.txD}}/><YAxis tick={{fontSize:9,fill:C.txM}} domain={[0,100]}/><Tooltip content={<CTip/>}/><Bar dataKey="v" name="%" radius={[3,3,0,0]}>{sorted.map((p,i)=><Cell key={i} fill={p.st==="GREEN"?C.g:p.st==="YELLOW"?C.y:C.r} fillOpacity={.65}/>)}</Bar></BarChart></ResponsiveContainer>
        </div>
        <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:18}}>
          <Sec sub="0.8–1.3 optimális zóna">ACWR</Sec>
          <ResponsiveContainer width="100%" height={170}><BarChart data={sorted.map(p=>({n:p.name.split(" ")[1],v:p.acwr}))}><CartesianGrid strokeDasharray="3 3" stroke={C.brd}/><XAxis dataKey="n" tick={{fontSize:8,fill:C.txD}}/><YAxis tick={{fontSize:9,fill:C.txM}} domain={[0,2]}/><Tooltip content={<CTip/>}/><ReferenceLine y={1.5} stroke={C.r} strokeDasharray="4 4"/><ReferenceLine y={0.8} stroke={C.y} strokeDasharray="4 4"/><Bar dataKey="v" name="ACWR" radius={[3,3,0,0]}>{sorted.map((p,i)=><Cell key={i} fill={p.acwr>1.5?C.r:p.acwr<.8?C.y:C.g} fillOpacity={.65}/>)}</Bar></BarChart></ResponsiveContainer>
        </div>
      </div>
      <div style={{display:"flex",gap:5,marginBottom:12}}>{["ALL","RED","YELLOW","GREEN"].map(f=><Btn key={f} sz="sm" v={filter===f?"primary":"secondary"} onClick={()=>setFilter(f)}>{f==="ALL"?"Mind":f}</Btn>)}</div>
      <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid "+C.brd}}>{[{k:"name",l:"Játékos"},{k:"pos",l:"Poz"},{k:"acwr",l:"ACWR"},{k:"jd",l:"Jump Δ"},{k:"as",l:"Asym"},{k:"rd",l:"Readiness"},{k:"st",l:"Státusz"}].map(c=><th key={c.k} onClick={()=>ds(c.k)} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:sort===c.k?C.a:C.txM,textTransform:"uppercase",cursor:"pointer",whiteSpace:"nowrap"}}>{c.l}{sort===c.k&&(dir==="asc"?" ↑":" ↓")}</th>)}</tr></thead>
          <tbody>{sorted.map(p=><tr key={p.id} onClick={()=>onSelect(p)} style={{borderBottom:"1px solid "+C.brd,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.cardH} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <td style={{padding:"9px 12px",fontWeight:600,color:C.tx,fontSize:12}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${C.a}40,${C.b}40)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:C.a,flexShrink:0}}>{p.name.split(" ").map(n=>n[0]).join("")}</div>{p.name}</div></td>
            <td style={{padding:"9px",color:C.txM,fontSize:11}}>{p.pos}</td>
            <td style={{padding:"9px",color:p.acwr>1.5?C.r:p.acwr<.8?C.y:C.g,fontWeight:700,fontSize:12}}>{p.acwr.toFixed(2)}</td>
            <td style={{padding:"9px",color:p.jd<-5?C.r:p.jd>0?C.g:C.y,fontWeight:700,fontSize:12}}>{p.jd>0?"+":""}{p.jd}%</td>
            <td style={{padding:"9px",color:p.as>15?C.r:C.g,fontWeight:700,fontSize:12}}>{p.as.toFixed(1)}%</td>
            <td style={{padding:"9px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:40,height:4,borderRadius:2,background:C.bg2,overflow:"hidden"}}><div style={{width:p.rd*100+"%",height:"100%",borderRadius:2,background:p.st==="GREEN"?C.g:p.st==="YELLOW"?C.y:C.r}}/></div><span style={{fontSize:11,fontWeight:700}}>{(p.rd*100).toFixed(0)}%</span></div></td>
            <td style={{padding:"9px"}}><Badge status={p.st}/></td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
};

// ═══ PLAYER DETAIL ═══
const PlayerView=({player:p,onBack,injuries})=>{
  const[tab,setTab]=useState("overview");
  const pInj=(injuries||[]).filter(x=>x.playerId===p.id);
  const tabs=[{k:"overview",l:"📊 Áttekintés"},{k:"load",l:"🏋️ Terhelés"},{k:"force",l:"⚡ Force Plate"},{k:"tests",l:"🧪 Tesztek"},{k:"anthro",l:"📏 Fejlődés"},{k:"injury",l:"🏥 Sérülés ("+pInj.length+")"}];
  const acwrData=p.days.slice(7).map((_,i)=>{const di=i+7;const ac2=p.days.slice(di-6,di+1).reduce((s,d)=>s+d.load,0);const ch2=p.days.slice(0,di+1).reduce((s,d)=>s+d.load,0)/4;return{dl:p.days[di].dl,v:ch2>0?Math.round(ac2/ch2*100)/100:0}});
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:14}}>
        <div>
          <Btn v="ghost" sz="sm" onClick={onBack} style={{marginBottom:10}}>← Vissza a csapathoz</Btn>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:46,height:46,borderRadius:12,background:`linear-gradient(135deg,${C.a}30,${C.b}30)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:C.a}}>{p.name.split(" ").map(n=>n[0]).join("")}</div>
            <div><h2 style={{fontSize:20,fontWeight:800,color:C.tx,margin:0}}>{p.name}</h2><div style={{fontSize:12,color:C.txM}}>{POS_L[p.pos]} · {p.age} éves · {p.ht} cm / {p.wt} kg</div></div>
            <Badge status={p.st}/>
          </div>
        </div>
        <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:"12px 20px",textAlign:"center"}}><div style={{fontSize:10,color:C.txM,textTransform:"uppercase"}}>Readiness Score</div><div style={{fontSize:34,fontWeight:900,color:p.st==="GREEN"?C.g:p.st==="YELLOW"?C.y:C.r}}>{(p.rd*100).toFixed(0)}</div></div>
      </div>
      {p.al.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>{p.al.map((a,i)=><span key={i} style={{fontSize:10,padding:"3px 8px",borderRadius:5,fontWeight:600,background:a.t==="d"?C.rD:C.yD,color:a.t==="d"?C.r:C.y}}>⚠ {a.m}</span>)}</div>}
      <div style={{display:"flex",gap:3,marginBottom:16,background:C.bg2,padding:3,borderRadius:9,overflowX:"auto"}}>{tabs.map(t=><button key={t.k} onClick={()=>setTab(t.k)} style={{padding:"8px 12px",borderRadius:7,border:"none",background:tab===t.k?C.card:"transparent",color:tab===t.k?C.tx:C.txM,cursor:"pointer",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{t.l}</button>)}</div>
      {tab==="overview"&&<div>
        <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}><Met sm label="Wellness" value={p.cur.ws.toFixed(0)} unit="%" icon="💚" color={C.g}/><Met sm label="ACWR" value={p.acwr.toFixed(2)} icon="📈" color={p.acwr>1.5?C.r:C.g}/><Met sm label="Jump" value={p.cur.jh} unit="cm" delta={p.jd} icon="🦘" color={C.b}/><Met sm label="Grip" value={p.grip} unit="kg" icon="🤝" color={C.p}/><Met sm label="Shot" value={p.shot} unit="km/h" icon="🏒" color={C.cy}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:18}}>
            <Sec sub="28 napos trend">Wellness Score</Sec>
            <ResponsiveContainer width="100%" height={200}><AreaChart data={p.days.map(d=>({dl:d.dl,v:d.ws}))}><CartesianGrid strokeDasharray="3 3" stroke={C.brd}/><XAxis dataKey="dl" tick={{fontSize:8,fill:C.txD}}/><YAxis tick={{fontSize:9,fill:C.txM}} domain={[0,100]}/><Tooltip content={<CTip/>}/><Area type="monotone" dataKey="v" name="%" stroke={C.g} fill={C.g} fillOpacity={.1}/></AreaChart></ResponsiveContainer>
          </div>
          <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:18}}>
            <Sec sub="Mai értékek">Wellness Radar</Sec>
            <ResponsiveContainer width="100%" height={200}><RadarChart data={WL.map((l,i)=>({label:l,v:p.cur.wv[i],max:5}))}><PolarGrid stroke={C.brd}/><PolarAngleAxis dataKey="label" tick={{fontSize:9,fill:C.txM}}/><PolarRadiusAxis domain={[0,5]} tick={{fontSize:8,fill:C.txD}}/><Radar name="Wellness" dataKey="v" stroke={C.g} fill={C.g} fillOpacity={.2}/></RadarChart></ResponsiveContainer>
          </div>
        </div>
      </div>}
      {tab==="load"&&<div>
        <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}><Met sm label="Acute (7 nap)" value={p.ac} icon="🔥" color={C.r}/><Met sm label="Chronic (28 nap)" value={p.ch} icon="📊" color={C.b}/><Met sm label="ACWR" value={p.acwr.toFixed(2)} icon="⚖️" color={p.acwr>1.5?C.r:C.g}/></div>
        <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:18,marginBottom:14}}>
          <Sec>Napi terhelés (sRPE × perc)</Sec>
          <ResponsiveContainer width="100%" height={200}><BarChart data={p.days.map(d=>({dl:d.dl,v:d.load}))}><CartesianGrid strokeDasharray="3 3" stroke={C.brd}/><XAxis dataKey="dl" tick={{fontSize:8,fill:C.txD}}/><YAxis tick={{fontSize:9,fill:C.txM}}/><Tooltip content={<CTip/>}/><Bar dataKey="v" name="Load" fill={C.b} fillOpacity={.5} radius={[3,3,0,0]}/></BarChart></ResponsiveContainer>
        </div>
        <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:18}}>
          <Sec sub="0.8–1.3 optimális sáv">ACWR Trend</Sec>
          <ResponsiveContainer width="100%" height={200}><AreaChart data={acwrData}><CartesianGrid strokeDasharray="3 3" stroke={C.brd}/><XAxis dataKey="dl" tick={{fontSize:8,fill:C.txD}}/><YAxis tick={{fontSize:9,fill:C.txM}} domain={[0,2.2]}/><Tooltip content={<CTip/>}/><ReferenceLine y={1.5} stroke={C.r} strokeDasharray="4 4" label={{value:"1.5",fill:C.r,fontSize:9}}/><ReferenceLine y={0.8} stroke={C.y} strokeDasharray="4 4" label={{value:"0.8",fill:C.y,fontSize:9}}/><Area type="monotone" dataKey="v" name="ACWR" stroke={C.b} fill={C.b} fillOpacity={.1}/></AreaChart></ResponsiveContainer>
        </div>
      </div>}
      {tab==="force"&&<div>
        <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}><Met sm label="Jump Height" value={p.cur.jh} unit="cm" delta={p.jd} icon="🦘" color={C.b}/><Met sm label="Peak Force" value={p.cur.pf} unit="N" delta={p.fd} icon="💪" color={C.p}/><Met sm label="Aszimmetria" value={p.as.toFixed(1)+"%"} icon="⚖️" color={p.as>15?C.r:C.g}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:18}}>
            <Sec sub={"Baseline: "+p.jm+" cm"}>Jump Height Trend</Sec>
            <ResponsiveContainer width="100%" height={200}><AreaChart data={p.days.map(d=>({dl:d.dl,v:d.jh}))}><CartesianGrid strokeDasharray="3 3" stroke={C.brd}/><XAxis dataKey="dl" tick={{fontSize:8,fill:C.txD}}/><YAxis tick={{fontSize:9,fill:C.txM}}/><Tooltip content={<CTip/>}/><ReferenceLine y={p.jm*.95} stroke={C.r} strokeDasharray="4 4"/><Area type="monotone" dataKey="v" name="cm" stroke={C.b} fill={C.b} fillOpacity={.1}/></AreaChart></ResponsiveContainer>
          </div>
          <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:18}}>
            <Sec sub={"Baseline: "+p.fm+" N"}>Peak Force Trend</Sec>
            <ResponsiveContainer width="100%" height={200}><AreaChart data={p.days.map(d=>({dl:d.dl,v:d.pf}))}><CartesianGrid strokeDasharray="3 3" stroke={C.brd}/><XAxis dataKey="dl" tick={{fontSize:8,fill:C.txD}}/><YAxis tick={{fontSize:9,fill:C.txM}}/><Tooltip content={<CTip/>}/><Area type="monotone" dataKey="v" name="N" stroke={C.p} fill={C.p} fillOpacity={.1}/></AreaChart></ResponsiveContainer>
          </div>
        </div>
      </div>}
      {tab==="tests"&&<div>
        <Sec>🧪 Teszteredmények</Sec>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>{p.tests.map((t,i)=><div key={i} style={{background:C.card,border:"1px solid "+C.brd,borderRadius:10,padding:14}}><div style={{fontSize:10,color:C.txM,marginBottom:4}}>{t.t}</div><div style={{fontSize:22,fontWeight:800,color:[C.b,C.cy,C.p,C.g,C.o][i%5]}}>{t.v}</div></div>)}</div>
        <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:18}}>
          <Sec>Játékos profil</Sec>
          <ResponsiveContainer width="100%" height={250}><RadarChart data={[{l:"Sprint",v:Math.min(5,6-p.sp30),mx:5},{l:"Lövés",v:p.shot/25,mx:5},{l:"Grip",v:p.grip/12,mx:5},{l:"Jump",v:p.cur.jh/10,mx:5},{l:"Wellness",v:p.cur.ws/20,mx:5}]}><PolarGrid stroke={C.brd}/><PolarAngleAxis dataKey="l" tick={{fontSize:10,fill:C.txM}}/><PolarRadiusAxis domain={[0,5]} tick={{fontSize:8,fill:C.txD}}/><Radar name="Profil" dataKey="v" stroke={C.cy} fill={C.cy} fillOpacity={.2}/></RadarChart></ResponsiveContainer>
        </div>
      </div>}
      {tab==="anthro"&&<div>
        <Sec>📏 Antropometriai fejlődés</Sec>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:18}}>
            <Sec>Magasság (cm)</Sec>
            <ResponsiveContainer width="100%" height={180}><AreaChart data={p.anthro.map(a=>({d:a.d,v:a.h}))}><CartesianGrid strokeDasharray="3 3" stroke={C.brd}/><XAxis dataKey="d" tick={{fontSize:9,fill:C.txD}}/><YAxis tick={{fontSize:9,fill:C.txM}} domain={["auto","auto"]}/><Tooltip content={<CTip/>}/><Area type="monotone" dataKey="v" name="cm" stroke={C.g} fill={C.g} fillOpacity={.1}/></AreaChart></ResponsiveContainer>
          </div>
          <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:18}}>
            <Sec>Testsúly (kg)</Sec>
            <ResponsiveContainer width="100%" height={180}><AreaChart data={p.anthro.map(a=>({d:a.d,v:a.w}))}><CartesianGrid strokeDasharray="3 3" stroke={C.brd}/><XAxis dataKey="d" tick={{fontSize:9,fill:C.txD}}/><YAxis tick={{fontSize:9,fill:C.txM}} domain={["auto","auto"]}/><Tooltip content={<CTip/>}/><Area type="monotone" dataKey="v" name="kg" stroke={C.b} fill={C.b} fillOpacity={.1}/></AreaChart></ResponsiveContainer>
          </div>
        </div>
      </div>}
      {tab==="injury"&&<div>
        <Sec>{pInj.length} aktív/korábbi sérülés</Sec>
        {pInj.length===0?<div style={{textAlign:"center",padding:40,background:C.card,borderRadius:12}}><p style={{color:C.g,fontSize:14}}>✅ Nincs aktív sérülés</p></div>
        :pInj.map((inj,i)=><div key={i} style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:16,marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:14,fontWeight:700,color:C.tx}}>{inj.location} — {inj.type}</span><RBadge phase={inj.rtpPhase}/></div>
          <div style={{fontSize:11,color:C.txM}}>{inj.date}{inj.expectedReturn&&" → Várható: "+inj.expectedReturn}</div>
          <div style={{display:"flex",gap:3,marginTop:8}}>{RTP.map((_,j)=><div key={j} style={{flex:1,height:5,borderRadius:3,background:j<=inj.rtpPhase?(j<=1?C.r:j<=3?C.y:C.g):C.bg2}}/>)}</div>
        </div>)}
      </div>}
    </div>
  );
};

// ═══ CALENDAR ═══
const Cal=({players,events,setEvents,tTypes,dTypes})=>{
  const[mo,setMo]=useState(new Date());const[sel,setSel]=useState(null);const[modal,setModal]=useState(null);const[vEv,setVEv]=useState(null);
  const[fT,setFT]=useState("");const[fTi,setFTi]=useState("16:30");const[fD,setFD]=useState("90");const[fS,setFS]=useState("");const[fP,setFP]=useState([]);const[fO,setFO]=useState("");const[fL,setFL]=useState("");
  const reset=()=>{setFT("");setFTi("16:30");setFD("90");setFS("");setFP([]);setFO("");setFL("")};
  const y=mo.getFullYear(),m=mo.getMonth(),today=new Date().toISOString().split("T")[0];
  const MN=["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];
  const dim=(y,m)=>new Date(y,m+1,0).getDate();const fdw=(y,m)=>{const d=new Date(y,m,1).getDay();return d===0?6:d-1};
  const cells=useMemo(()=>{const r=[];for(let i=0;i<fdw(y,m);i++)r.push(null);for(let d=1;d<=dim(y,m);d++){const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;r.push({day:d,date:ds,evs:events.filter(e=>e.date===ds)})}return r},[y,m,events]);
  const openN=t=>{reset();setFS(t==="training"?tTypes[0]:t==="dry"?dTypes[0]:"Bajnoki");setFT(t==="training"?"Jégedzés":t==="dry"?"Szárazedzés":"Mérkőzés");setFD(t==="match"?"60":t==="dry"?"60":"90");setModal(t)};
  const save=()=>{setEvents(p=>[...p,{id:"ev"+Date.now(),date:sel,type:modal,title:fT,time:fTi,duration:Number(fD),subtype:fS,players:fP,location:fL,...(modal==="match"?{opponent:fO}:{})}]);setModal(null);reset()};
  const dEvs=sel?events.filter(e=>e.date===sel):[];const eC=t=>t==="match"?C.g:t==="training"?C.b:C.o;
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 310px",gap:16}}>
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}><Btn v="secondary" sz="sm" onClick={()=>setMo(new Date(y,m-1))}>‹</Btn><h2 style={{fontSize:16,fontWeight:800,color:C.tx,margin:0,minWidth:170,textAlign:"center"}}>{MN[m]} {y}</h2><Btn v="secondary" sz="sm" onClick={()=>setMo(new Date(y,m+1))}>›</Btn></div>
          <Btn v="secondary" sz="sm" onClick={()=>{setMo(new Date());setSel(today)}}>Ma</Btn>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
          {["H","K","Sz","Cs","P","Sz","V"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:10,fontWeight:700,color:C.txD,padding:"6px 0"}}>{d}</div>)}
          {cells.map((c,i)=>{if(!c)return<div key={"e"+i} style={{background:C.bg2,borderRadius:7,minHeight:68}}/>;const iS=c.date===sel,iT=c.date===today;
          return<div key={c.date} onClick={()=>setSel(c.date)} style={{background:iS?C.aD:C.card,border:"1px solid "+(iS?C.a+"50":iT?C.b+"40":C.brd),borderRadius:7,minHeight:68,padding:"5px 6px",cursor:"pointer"}}>
            <div style={{fontSize:12,fontWeight:iT?800:600,color:iT?C.b:iS?C.a:C.tx,marginBottom:3}}>{c.day}</div>
            {c.evs.slice(0,2).map(ev=><div key={ev.id} style={{fontSize:8,padding:"1px 3px",borderRadius:3,background:eC(ev.type)+"20",color:eC(ev.type),fontWeight:600,marginBottom:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.type==="match"?"🏒":"⛸️"}{ev.time}</div>)}
            {c.evs.length>2&&<div style={{fontSize:7,color:C.txD}}>+{c.evs.length-2}</div>}
          </div>})}
        </div>
      </div>
      <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:16,overflow:"auto"}}>
        {sel?<div>
          <div style={{fontSize:13,fontWeight:700,color:C.tx,marginBottom:4}}>{new Date(sel+"T12:00").toLocaleDateString("hu-HU",{weekday:"long",month:"long",day:"numeric"})}</div>
          <div style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap"}}><Btn sz="sm" v="blue" onClick={()=>openN("training")}>+ Jégedzés</Btn><Btn sz="sm" v="orange" onClick={()=>openN("dry")}>+ Száraz</Btn><Btn sz="sm" v="green" onClick={()=>openN("match")}>+ Meccs</Btn></div>
          {dEvs.length===0?<p style={{color:C.txD,textAlign:"center",padding:20}}>📭 Nincs esemény ezen a napon</p>
          :dEvs.map(ev=><div key={ev.id} onClick={()=>setVEv(ev)} style={{background:C.bg2,borderRadius:9,padding:12,marginBottom:6,cursor:"pointer",borderLeft:"3px solid "+eC(ev.type)}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,fontWeight:700,color:C.tx}}>{ev.title}</span><span style={{fontSize:10,color:C.txM}}>{ev.time}</span></div>
            <div style={{fontSize:10,color:C.txM,marginTop:3}}>{ev.duration}p · {ev.subtype||ev.opponent||""} · {ev.players?.length||0} fő</div>
          </div>)}
        </div>:<p style={{color:C.txD,textAlign:"center",padding:50}}>📅 Válassz egy napot a naptárból</p>}
      </div>
      <Modal open={!!modal} onClose={()=>{setModal(null);reset()}} title={modal==="training"?"⛸️ Új jégedzés":modal==="dry"?"💪 Új szárazedzés":"🏒 Új mérkőzés"} w={560}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
          <Inp label="Megnevezés" value={fT} onChange={setFT}/><Inp label="Időpont" value={fTi} onChange={setFTi} type="time"/>
          <Inp label="Időtartam (perc)" value={fD} onChange={setFD} type="number"/><Inp label="Típus" value={fS} onChange={setFS} opts={modal==="training"?tTypes:modal==="dry"?dTypes:["Bajnoki","Edzőmeccs","Kupa"]}/>
          {modal==="match"&&<Inp label="Ellenfél" value={fO} onChange={setFO} ph="FTC U16"/>}<Inp label="Helyszín" value={fL} onChange={setFL} ph="SZJA Jégcsarnok"/>
        </div>
        <div style={{marginBottom:14}}><label style={{fontSize:11,color:C.txM,display:"block",marginBottom:6,fontWeight:600}}>Játékosok</label><PCk players={players} selected={fP} onChange={setFP}/></div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>{setModal(null);reset()}}>Mégse</Btn><Btn onClick={save} disabled={!fT||!fP.length}>💾 Mentés</Btn></div>
      </Modal>
      <Modal open={!!vEv} onClose={()=>setVEv(null)} title={vEv?vEv.title:""}>{vEv&&<div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>{[["Időpont",vEv.time],["Időtartam",vEv.duration+"p"],["Típus",vEv.subtype||"-"],["Helyszín",vEv.location||"-"],...(vEv.opponent?[["Ellenfél",vEv.opponent]]:[])].map(([l,v],i)=><div key={i} style={{background:C.bg2,borderRadius:7,padding:10}}><div style={{fontSize:9,color:C.txD}}>{l}</div><div style={{fontSize:13,fontWeight:700,color:C.tx}}>{v}</div></div>)}</div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="danger" sz="sm" onClick={()=>{setEvents(p=>p.filter(e=>e.id!==vEv.id));setVEv(null)}}>🗑 Törlés</Btn><Btn v="secondary" sz="sm" onClick={()=>setVEv(null)}>OK</Btn></div>
      </div>}</Modal>
    </div>
  );
};

// ═══ INJURY MANAGEMENT ═══
const InjMgmt=({players,injuries,setInjuries})=>{
  const[modal,setModal]=useState(false);const[fP,setFP]=useState("");const[fL,setFL]=useState(IL[0]);const[fT,setFT]=useState(IT[0]);const[fD,setFD]=useState(new Date().toISOString().split("T")[0]);const[fR,setFR]=useState("");const[fN,setFN]=useState("");const[fPh,setFPh]=useState(0);
  const save=()=>{if(!fP)return;setInjuries(p=>[...p,{id:"i"+Date.now(),playerId:Number(fP),location:fL,type:fT,date:fD,expectedReturn:fR,notes:fN,rtpPhase:fPh}]);setModal(false)};
  const act=injuries.filter(i=>i.rtpPhase<5);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><Sec sub={act.length+" aktív sérülés"}>🏥 Sérülés-kezelés & RTP</Sec><Btn onClick={()=>setModal(true)}>+ Új sérülés rögzítése</Btn></div>
      {act.length===0?<div style={{textAlign:"center",padding:40,background:C.card,borderRadius:12}}><p style={{color:C.g,fontSize:14}}>✅ Nincs aktív sérülés</p></div>
      :act.map(inj=>{const pl=players.find(x=>x.id===inj.playerId);return<div key={inj.id} style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:16,marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><div><span style={{fontSize:14,fontWeight:700,color:C.tx}}>{pl?.name||"?"}</span><span style={{fontSize:11,color:C.txM,marginLeft:8}}>{pl?.pos}</span></div><RBadge phase={inj.rtpPhase}/></div>
        <div style={{fontSize:12,color:C.txM}}>{inj.location} · {inj.type} · {inj.date}</div>
        {inj.notes&&<div style={{fontSize:11,color:C.txD,marginTop:4,fontStyle:"italic"}}>{inj.notes}</div>}
        <div style={{display:"flex",gap:3,marginTop:8}}>{RTP.map((_,j)=><div key={j} style={{flex:1,height:5,borderRadius:3,background:j<=inj.rtpPhase?(j<=1?C.r:j<=3?C.y:C.g):C.bg2}}/>)}</div>
        <div style={{marginTop:8,display:"flex",gap:3,flexWrap:"wrap"}}>{RTP.map((ph,j)=><Btn key={j} sz="sm" v={j===inj.rtpPhase?"primary":"ghost"} onClick={()=>setInjuries(p=>p.map(x=>x.id===inj.id?{...x,rtpPhase:j}:x))} style={{padding:"3px 7px",fontSize:9}}>{ph}</Btn>)}</div>
      </div>})}
      <Modal open={modal} onClose={()=>setModal(false)} title="🏥 Új sérülés rögzítése">
        <Inp label="Játékos" value={fP} onChange={setFP} opts={[{v:"",l:"Válassz játékost..."},...players.map(p=>({v:String(p.id),l:p.name+" ("+p.pos+")"}))]}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}><Inp label="Sérülés lokáció" value={fL} onChange={setFL} opts={IL}/><Inp label="Sérülés típusa" value={fT} onChange={setFT} opts={IT}/><Inp label="Sérülés dátuma" value={fD} onChange={setFD} type="date"/><Inp label="Várható visszatérés" value={fR} onChange={setFR} type="date"/></div>
        <Inp label="Kezdő RTP fázis" value={fPh} onChange={v=>setFPh(Number(v))} opts={RTP.map((p,i)=>({v:String(i),l:p}))}/>
        <Inp label="Megjegyzés" value={fN} onChange={setFN} type="textarea"/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>setModal(false)}>Mégse</Btn><Btn onClick={save} disabled={!fP}>💾 Mentés</Btn></div>
      </Modal>
    </div>
  );
};

// ═══ SETTINGS ═══
const Sett=({tT,setTT,dT,setDT,roster,setRoster})=>{
  const[nT,setNT]=useState("");const[nD,setND]=useState("");
  const[pModal,setPModal]=useState(null);const[pTab,setPTab]=useState("list");
  const[fName,setFName]=useState("");const[fPos,setFPos]=useState("C");const[fAge,setFAge]=useState("15");const[fHt,setFHt]=useState("175");const[fWt,setFWt]=useState("68");
  const TL=({items,set,nv,setNv,color,label})=><div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:18,marginBottom:14}}>
    <Sec>{label}</Sec>
    <div style={{display:"flex",gap:6,marginBottom:10}}><input value={nv} onChange={e=>setNv(e.target.value)} placeholder="Új típus hozzáadása..." onKeyDown={e=>{if(e.key==="Enter"&&nv.trim()){set(p=>[...p,nv.trim()]);setNv("")}}} style={{flex:1,padding:"7px 12px",borderRadius:8,background:C.bg2,border:"1px solid "+C.brd,color:C.tx,fontSize:12,outline:"none"}}/><Btn sz="sm" onClick={()=>{if(nv.trim()){set(p=>[...p,nv.trim()]);setNv("")}}} disabled={!nv.trim()}>+</Btn></div>
    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{items.map((t,i)=><span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:7,background:color+"15",color,fontSize:11,fontWeight:600}}>{t}<button onClick={()=>set(p=>p.filter((_,j)=>j!==i))} style={{background:"transparent",border:"none",color:C.txD,cursor:"pointer",fontSize:12}}>×</button></span>)}</div>
  </div>;
  const openEdit=(p)=>{setFName(p.name);setFPos(p.pos);setFAge(String(p.age));setFHt(String(p.ht));setFWt(String(p.wt));setPModal(p)};
  const openNew=()=>{setFName("");setFPos("C");setFAge("15");setFHt("175");setFWt("68");setPModal("new")};
  const savePlayer=()=>{if(!fName.trim())return;if(pModal==="new"){const nid=Math.max(0,...roster.map(p=>p.id))+1;setRoster(r=>[...r,{id:nid,name:fName.trim(),pos:fPos,age:Number(fAge),ht:Number(fHt),wt:Number(fWt),pin:_genPin(),active:true}])}else{setRoster(r=>r.map(p=>p.id===pModal.id?{...p,name:fName.trim(),pos:fPos,age:Number(fAge),ht:Number(fHt),wt:Number(fWt)}:p))}setPModal(null)};
  const togglePlayer=(id)=>setRoster(r=>r.map(p=>p.id===id?{...p,active:!p.active}:p));
  const regenPin=(id)=>setRoster(r=>r.map(p=>p.id===id?{...p,pin:_genPin()}:p));
  const removePlayer=(id)=>{if(window.confirm("Biztosan törlöd?"))setRoster(r=>r.filter(p=>p.id!==id))};
  const actCount=roster.filter(p=>p.active).length;
  return(
    <div style={{maxWidth:750}}>
      <Sec sub="Keret, edzéstípusok, hozzáférés">⚙️ Beállítások</Sec>
      <div style={{display:"flex",gap:3,marginBottom:16,background:C.bg2,padding:3,borderRadius:9}}>
        {[{k:"list",l:"👥 Játékosok ("+actCount+")"},{k:"types",l:"⛸️ Edzéstípusok"},{k:"coaches",l:"🏒 Edzők"}].map(t=><button key={t.k} onClick={()=>setPTab(t.k)} style={{flex:1,padding:"8px 12px",borderRadius:7,border:"none",background:pTab===t.k?C.card:"transparent",color:pTab===t.k?C.tx:C.txM,cursor:"pointer",fontSize:11,fontWeight:600}}>{t.l}</button>)}
      </div>
      {pTab==="list"&&<div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:C.tx}}>👥 Keret ({actCount} aktív / {roster.length} összesen)</div>
          <Btn sz="sm" onClick={openNew}>+ Új játékos</Btn>
        </div>
        <div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:"1px solid "+C.brd}}>
              {["","Név","Poz","Kor","Cm/Kg","PIN","Műveletek"].map((h,i)=><th key={i} style={{padding:"8px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:C.txM,textTransform:"uppercase"}}>{h}</th>)}
            </tr></thead>
            <tbody>{roster.map(p=><tr key={p.id} style={{borderBottom:"1px solid "+C.brd,opacity:p.active?1:.45}}>
              <td style={{padding:"6px 10px"}}><div onClick={()=>togglePlayer(p.id)} style={{width:16,height:16,borderRadius:4,border:"2px solid "+(p.active?C.a:C.txD),background:p.active?C.a:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#000",fontWeight:900}}>{p.active&&"✓"}</div></td>
              <td style={{padding:"6px 10px",fontSize:12,fontWeight:600,color:C.tx}}>{p.name}</td>
              <td style={{padding:"6px 10px",fontSize:11,color:C.txM}}>{p.pos}</td>
              <td style={{padding:"6px 10px",fontSize:11,color:C.txM}}>{p.age}é</td>
              <td style={{padding:"6px 10px",fontSize:11,color:C.txM}}>{p.ht}/{p.wt}</td>
              <td style={{padding:"6px 10px"}}><span style={{fontSize:13,color:C.a,fontFamily:"monospace",fontWeight:800,letterSpacing:2}}>{p.pin}</span></td>
              <td style={{padding:"6px 10px"}}><div style={{display:"flex",gap:4}}>
                <Btn sz="sm" v="secondary" onClick={()=>openEdit(p)} style={{padding:"3px 8px",fontSize:9}}>✏️</Btn>
                <Btn sz="sm" v="secondary" onClick={()=>regenPin(p.id)} style={{padding:"3px 8px",fontSize:9}} title="Új PIN">🔄</Btn>
                <Btn sz="sm" v="danger" onClick={()=>removePlayer(p.id)} style={{padding:"3px 8px",fontSize:9}}>🗑</Btn>
              </div></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div style={{marginTop:14,background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:16}}>
          <Sec>📋 PIN lista nyomtatáshoz</Sec>
          <p style={{fontSize:11,color:C.txM,marginBottom:10}}>Oszd ki a játékosoknak – ezzel tudnak belépni a saját wellness/RPE felületükre.</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            {roster.filter(p=>p.active).map(p=><div key={p.id} style={{background:C.bg2,borderRadius:8,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,color:C.tx,fontWeight:600}}>{p.name}</span>
              <span style={{fontSize:14,color:C.a,fontFamily:"monospace",fontWeight:800}}>{p.pin}</span>
            </div>)}
          </div>
        </div>
      </div>}
      {pTab==="types"&&<div>
        <TL items={tT} set={setTT} nv={nT} setNv={setNT} color={C.b} label="⛸️ Jégedzés típusok"/>
        <TL items={dT} set={setDT} nv={nD} setNv={setND} color={C.o} label="💪 Szárazedzés típusok"/>
      </div>}
      {pTab==="coaches"&&<div style={{background:C.card,border:"1px solid "+C.brd,borderRadius:12,padding:18}}>
        <Sec>🏒 Edzői hozzáférés</Sec>
        <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>{COACHES.map(c=><tr key={c.id} style={{borderBottom:"1px solid "+C.brd}}>
          <td style={{padding:"8px 10px",fontSize:12,color:C.tx,fontWeight:600}}>{c.name}</td>
          <td style={{padding:"8px 10px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:5,background:c.role==="HEAD_COACH"?C.gD:c.role==="ADMIN"?C.pD:C.bD,color:c.role==="HEAD_COACH"?C.g:c.role==="ADMIN"?C.p:C.b,fontWeight:700}}>{c.role==="HEAD_COACH"?"Vezetőedző":c.role==="ADMIN"?"Admin":"Edző"}</span></td>
          <td style={{padding:"8px 10px",fontSize:12,color:C.a,fontFamily:"monospace",fontWeight:700}}>{c.pin}</td>
        </tr>)}</tbody></table>
      </div>}
      <Modal open={pModal!==null} onClose={()=>setPModal(null)} title={pModal==="new"?"➕ Új játékos hozzáadása":"✏️ Játékos szerkesztése"} w={480}>
        <Inp label="Teljes név" value={fName} onChange={setFName} ph="Vezetéknév Keresztnév"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
          <Inp label="Pozíció" value={fPos} onChange={setFPos} opts={POSITIONS.map(p=>({v:p,l:p+" — "+POS_L[p]}))}/>
          <Inp label="Életkor" value={fAge} onChange={setFAge} type="number"/>
          <Inp label="Magasság (cm)" value={fHt} onChange={setFHt} type="number"/>
          <Inp label="Testsúly (kg)" value={fWt} onChange={setFWt} type="number"/>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>setPModal(null)}>Mégse</Btn><Btn onClick={savePlayer} disabled={!fName.trim()}>💾 Mentés</Btn></div>
      </Modal>
    </div>
  );
};

// ═══ ALERTS ═══
const Alrt=({players})=>{
  const all=players.flatMap(p=>p.al.map(a=>({...a,player:p.name,st:p.st})));
  const dangers=all.filter(a=>a.t==="d"),warns=all.filter(a=>a.t==="w");
  return(
    <div style={{maxWidth:600}}>
      <Sec sub={all.length+" aktív riasztás"}>🔔 Riasztások</Sec>
      {dangers.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:700,color:C.r,marginBottom:8}}>🚨 KRITIKUS</div>{dangers.map((a,i)=><div key={i} style={{background:C.rD,borderRadius:9,padding:"10px 14px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:12,fontWeight:700,color:C.tx}}>{a.player}</div><div style={{fontSize:11,color:C.r}}>{a.m}</div></div><Badge status={a.st}/></div>)}</div>}
      {warns.length>0&&<div><div style={{fontSize:11,fontWeight:700,color:C.y,marginBottom:8}}>⚡ FIGYELMEZTETÉS</div>{warns.map((a,i)=><div key={i} style={{background:C.yD,borderRadius:9,padding:"10px 14px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:12,fontWeight:700,color:C.tx}}>{a.player}</div><div style={{fontSize:11,color:C.y}}>{a.m}</div></div><Badge status={a.st}/></div>)}</div>}
      {all.length===0&&<div style={{textAlign:"center",padding:50}}><h3 style={{color:C.g}}>✅ Nincs riasztás – minden játékos rendben</h3></div>}
    </div>
  );
};

// ═══ MAIN APP ═══
export default function App(){
  const[auth,setAuth]=useState(null);const[view,setView]=useState("team");const[selP,setSelP]=useState(null);const[sb,setSb]=useState(true);
  const[roster,setRoster]=useState(DEFAULT_ROSTER);
  const[events,setEvents]=useState(()=>buildEvents(DEFAULT_ROSTER));const[tT,setTT]=useState(DEF_T);const[dT,setDT]=useState(DEF_D);
  const[injuries,setInjuries]=useState([{id:"i1",playerId:3,location:"Csípőflexor",type:"Nem-kontakt",date:"2026-02-10",rtpPhase:2,notes:"Edzésen jelentkezett"},{id:"i2",playerId:7,location:"Váll",type:"Kontakt sérülés",date:"2026-02-18",rtpPhase:1,notes:"Meccs közbeni ütközés"}]);
  const players=useMemo(()=>buildPlayers(roster),[roster]);
  const alC=players.reduce((s,p)=>s+p.al.length,0);const actI=injuries.filter(i=>i.rtpPhase<5).length;
  if(!auth)return<Login onLogin={setAuth} roster={roster}/>;
  if(auth.type==="player")return<PRPE playerName={auth.user.name} events={events} onLogout={()=>setAuth(null)}/>;
  const nav=[{k:"team",l:"Dashboard",i:"👥"},{k:"calendar",l:"Naptár",i:"📅"},{k:"injury",l:"Sérülések",i:"🏥",badge:actI},{k:"alerts",l:"Riasztások",i:"🔔",badge:alC},{k:"settings",l:"Beállítások",i:"⚙️"}];
  return(
    <div style={{display:"flex",height:"100vh",background:C.bg,overflow:"hidden",fontFamily:"'Inter',-apple-system,sans-serif"}}>
      <div style={{width:sb?200:52,background:C.bg2,borderRight:"1px solid "+C.brd,display:"flex",flexDirection:"column",transition:"width .25s",flexShrink:0,overflow:"hidden"}}>
        <div style={{padding:sb?"14px":"14px 8px",borderBottom:"1px solid "+C.brd,display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>setSb(p=>!p)}>
          <div style={{width:30,height:30,borderRadius:8,background:`linear-gradient(135deg,${C.a},${C.b})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>🏒</div>
          {sb&&<div><div style={{fontSize:12,fontWeight:800,color:C.tx}}>SportSci</div><div style={{fontSize:9,color:C.a,fontWeight:700}}>SZJA U16</div></div>}
        </div>
        <div style={{padding:"8px 4px",flex:1}}>
          {nav.map(n=>{const act=view===n.k||(n.k==="team"&&view==="player");return<button key={n.k} onClick={()=>{setView(n.k);setSelP(null)}} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:sb?"7px 10px":"7px",borderRadius:8,border:"none",background:act?C.aD:"transparent",color:act?C.a:C.txM,cursor:"pointer",marginBottom:2,justifyContent:sb?"flex-start":"center",position:"relative"}}><span style={{fontSize:14}}>{n.i}</span>{sb&&<span style={{fontSize:11,fontWeight:600}}>{n.l}</span>}{n.badge>0&&<span style={{position:sb?"relative":"absolute",top:sb?"auto":0,right:sb?"auto":0,marginLeft:sb?"auto":0,background:C.r,color:"#fff",fontSize:8,fontWeight:800,padding:"1px 4px",borderRadius:8}}>{n.badge}</span>}</button>})}
        </div>
        {sb&&<div style={{padding:"10px 14px",borderTop:"1px solid "+C.brd}}>
          <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{auth.user.name}</div>
          <div style={{fontSize:10,color:C.a}}>{auth.user.role==="HEAD_COACH"?"Vezetőedző":auth.user.role==="ADMIN"?"Admin":"Edző"}</div>
          <Btn v="ghost" sz="sm" onClick={()=>setAuth(null)} style={{marginTop:6,width:"100%",justifyContent:"center"}}>Kilépés</Btn>
        </div>}
      </div>
      <div style={{flex:1,overflow:"auto"}}>
        <div style={{padding:"11px 20px",borderBottom:"1px solid "+C.brd,display:"flex",justifyContent:"space-between",alignItems:"center",background:C.bg2,position:"sticky",top:0,zIndex:10}}>
          <div>
            <h1 style={{fontSize:15,fontWeight:800,color:C.tx,margin:0}}>{view==="team"?"Dashboard":view==="player"?(selP?.name||""):view==="calendar"?"Naptár":view==="injury"?"Sérülés-kezelés":view==="alerts"?"Riasztások":"Beállítások"}</h1>
            <div style={{fontSize:10,color:C.txM}}>{new Date().toLocaleDateString("hu-HU",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div>
          </div>
          <span style={{padding:"3px 8px",borderRadius:6,background:C.aD,fontSize:10,fontWeight:600,color:C.a}}>v3.0</span>
        </div>
        <div style={{padding:"16px 20px",maxWidth:1300}}>
          {view==="team"&&<TeamDash players={players} onSelect={p=>{setSelP(p);setView("player")}}/>}
          {view==="player"&&selP&&<PlayerView player={selP} onBack={()=>setView("team")} injuries={injuries}/>}
          {view==="calendar"&&<Cal players={players} events={events} setEvents={setEvents} tTypes={tT} dTypes={dT}/>}
          {view==="injury"&&<InjMgmt players={players} injuries={injuries} setInjuries={setInjuries}/>}
          {view==="alerts"&&<Alrt players={players}/>}
          {view==="settings"&&<Sett tT={tT} setTT={setTT} dT={dT} setDT={setDT} roster={roster} setRoster={setRoster}/>}
        </div>
      </div>
    </div>
  );
}

