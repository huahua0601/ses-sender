"use client";
import React, { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const authH = (t) => ({ Authorization: `Bearer ${t}`, "Content-Type": "application/json" });

// ===== Toast =====
type TT = "success"|"error"|"info"|"warning";
const ToastCtx = createContext<{toast:(t:TT,title:string,msg?:string)=>void}>({toast:()=>{}});
const useToast = () => useContext(ToastCtx);

function ToastProvider({children}:{children:React.ReactNode}) {
  const [list,setList]=useState<{id:number;type:TT;title:string;msg:string}[]>([]);
  const toast=useCallback((type:TT,title:string,msg="")=>{
    const id=Date.now(); setList(p=>[...p,{id,type,title,msg}]); setTimeout(()=>setList(p=>p.filter(t=>t.id!==id)),4000);
  },[]);
  const colors={success:"#10B981",error:"#EF4444",info:"#3B82F6",warning:"#F59E0B"};
  const icons={success:"✓",error:"✕",info:"i",warning:"!"};
  return <ToastCtx.Provider value={{toast}}>{children}
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3" style={{width:380}}>
      {list.map(t=><div key={t.id} className="animate-slide-in bg-white rounded-xl shadow-lg border border-gray-100 p-4 flex gap-3">
        <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0" style={{background:colors[t.type]}}>{icons[t.type]}</span>
        <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-800">{t.title}</p>{t.msg&&<p className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">{t.msg}</p>}</div>
        <button onClick={()=>setList(p=>p.filter(x=>x.id!==t.id))} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
      </div>)}
    </div>
  </ToastCtx.Provider>;
}

// ===== Confirm =====
const ConfirmCtx = createContext<{confirm:(t:string,m:string,btn?:string)=>Promise<boolean>}>({confirm:async()=>false});
const useConfirm = () => useContext(ConfirmCtx);

function ConfirmProvider({children}:{children:React.ReactNode}) {
  const [s,setS]=useState({open:false,title:"",msg:"",btn:"确认"}); const ref=React.useRef<(v:boolean)=>void>();
  const confirm=useCallback((title:string,msg:string,btn="确认"):Promise<boolean>=>new Promise(r=>{ref.current=r;setS({open:true,title,msg,btn});}),[]);
  const yes=()=>{ref.current?.(true);setS(s=>({...s,open:false}));}; const no=()=>{ref.current?.(false);setS(s=>({...s,open:false}));};
  return <ConfirmCtx.Provider value={{confirm}}>{children}
    {s.open&&<div className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/50" onClick={no}/>
      <div className="relative bg-white rounded-2xl shadow-2xl animate-scale-in" style={{width:420,maxWidth:"90vw"}}>
        <div className="p-6"><h3 className="text-lg font-bold text-gray-800">{s.title}</h3><p className="text-sm text-gray-500 mt-2 whitespace-pre-line">{s.msg}</p></div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={no} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">取消</button>
          <button onClick={yes} className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600">{s.btn}</button>
        </div>
      </div>
    </div>}
  </ConfirmCtx.Provider>;
}

// ===== Auth =====
const AuthCtx = createContext(null); const useAuth=()=>useContext(AuthCtx);

export default function Home() {
  const [user,setUser]=useState(null); const [token,setToken]=useState("");
  useEffect(()=>{const t=localStorage.getItem("ses_token"),u=localStorage.getItem("ses_user");if(t&&u){setToken(t);setUser(JSON.parse(u));}},[]);
  const login=async(un,pw)=>{const r=await fetch(`${API}/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:un,password:pw})});if(!r.ok){const e=await r.json();throw new Error(e.detail||"登录失败");}const d=await r.json();setToken(d.access_token);setUser(d.user);localStorage.setItem("ses_token",d.access_token);localStorage.setItem("ses_user",JSON.stringify(d.user));};
  const logout=()=>{setToken("");setUser(null);localStorage.removeItem("ses_token");localStorage.removeItem("ses_user");};
  if(!user) return <ToastProvider><LoginPage onLogin={login}/></ToastProvider>;
  return <ToastProvider><ConfirmProvider><AuthCtx.Provider value={{user,token,logout}}>{user.is_admin?<AdminApp/>:<UserApp/>}</AuthCtx.Provider></ConfirmProvider></ToastProvider>;
}

// ===== Login =====
// ===== Captcha =====
function useSimpleCaptcha() {
  const [code,setCode]=useState(""); const [canvas,setCanvas]=useState<HTMLCanvasElement|null>(null);
  const generate=useCallback(()=>{
    const chars="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let c=""; for(let i=0;i<4;i++) c+=chars[Math.floor(Math.random()*chars.length)];
    setCode(c);
    if(canvas){
      const ctx=canvas.getContext("2d"); if(!ctx)return;
      const w=canvas.width, h=canvas.height;
      // 背景
      ctx.fillStyle="#f0f0f0"; ctx.fillRect(0,0,w,h);
      // 干扰线
      for(let i=0;i<4;i++){ctx.strokeStyle=`hsl(${Math.random()*360},50%,70%)`; ctx.beginPath(); ctx.moveTo(Math.random()*w,Math.random()*h); ctx.lineTo(Math.random()*w,Math.random()*h); ctx.stroke();}
      // 干扰点
      for(let i=0;i<30;i++){ctx.fillStyle=`hsl(${Math.random()*360},40%,70%)`; ctx.fillRect(Math.random()*w,Math.random()*h,2,2);}
      // 文字
      for(let i=0;i<c.length;i++){
        ctx.save();
        ctx.font=`${20+Math.random()*6}px "Courier New", monospace`;
        ctx.fillStyle=`hsl(${Math.random()*360},70%,35%)`;
        ctx.translate(18+i*26, 28+Math.random()*6);
        ctx.rotate((Math.random()-0.5)*0.4);
        ctx.fillText(c[i],0,0);
        ctx.restore();
      }
    }
  },[canvas]);
  const ref=useCallback((el:HTMLCanvasElement|null)=>{setCanvas(el);},[]);
  useEffect(()=>{if(canvas)generate();},[canvas,generate]);
  const verify=(input:string)=>input.toLowerCase()===code.toLowerCase();
  return {ref,generate,verify};
}

function LoginPage({onLogin}) {
  const [u,setU]=useState("");const [p,setP]=useState("");const [captchaInput,setCaptchaInput]=useState("");
  const [err,setErr]=useState("");const [ld,setLd]=useState(false);
  const captcha=useSimpleCaptcha();

  const go=async(e)=>{
    e.preventDefault(); setErr("");
    if(!captcha.verify(captchaInput)){setErr("验证码错误");captcha.generate();setCaptchaInput("");return;}
    setLd(true);try{await onLogin(u,p);}catch(e){setErr(e.message);captcha.generate();setCaptchaInput("");}finally{setLd(false);}
  };

  return <div className="min-h-screen flex items-center justify-center" style={{background:"linear-gradient(135deg,#3C50E0 0%,#6366F1 50%,#8B5CF6 100%)"}}>
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full" style={{maxWidth:400}}>
      <div className="text-center mb-8"><div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-3"><span className="text-white text-xl font-bold">S</span></div><h1 className="text-2xl font-bold text-gray-800">SES Sender</h1><p className="text-gray-400 text-sm mt-1">邮件批量发送管理平台</p></div>
      <form onSubmit={go} className="space-y-4">
        {err&&<div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">{err}</div>}
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">用户名</label><input className="w-full h-11 px-4 border border-gray-200 rounded-lg text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" value={u} onChange={e=>setU(e.target.value)}/></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">密码</label><input type="password" className="w-full h-11 px-4 border border-gray-200 rounded-lg text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" value={p} onChange={e=>setP(e.target.value)}/></div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">验证码</label>
          <div className="flex gap-3">
            <input className="flex-1 h-11 px-4 border border-gray-200 rounded-lg text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition tracking-widest" placeholder="请输入验证码" value={captchaInput} onChange={e=>setCaptchaInput(e.target.value)} autoComplete="off"/>
            <canvas ref={captcha.ref} width={120} height={40} onClick={captcha.generate} className="rounded-lg cursor-pointer border border-gray-200 flex-shrink-0 hover:opacity-80 transition" title="点击刷新验证码"/>
          </div>
          <p className="text-xs text-gray-400 mt-1">点击图片可刷新验证码</p>
        </div>
        <button type="submit" disabled={ld} className="w-full h-11 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">{ld?"登录中...":"登 录"}</button>
      </form>
    </div>
  </div>;
}

// ===== Sidebar =====
function Sidebar({menus,active,setActive,title="SES Sender"}) {
  const {user,logout}=useAuth();
  return <aside className="w-64 flex-shrink-0 flex flex-col overflow-y-auto" style={{background:"#1C2434"}}>
    <div className="h-16 flex items-center px-6 gap-3 flex-shrink-0"><div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center"><span className="text-white font-bold text-sm">S</span></div><span className="text-white text-lg font-bold">{title}</span></div>
    <div className="px-5 mt-4 mb-2"><p className="text-xs font-semibold uppercase tracking-wider" style={{color:"#8A99AF"}}>菜单</p></div>
    <nav className="flex-1">{menus.map(m=><div key={m.id} onClick={()=>setActive(m.id)} className={`sidebar-link ${active===m.id?"active":""}`}><span className="text-lg">{m.icon}</span><span>{m.label}</span></div>)}</nav>
    <div className="p-5 border-t" style={{borderColor:"#333A48"}}>
      <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center"><span className="text-white text-sm font-bold">{(user.display_name||user.username)[0]?.toUpperCase()}</span></div>
        <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{user.display_name||user.username}</p><p className="text-xs truncate" style={{color:"#8A99AF"}}>{user.email||"管理员"}</p></div>
      </div>
      <button onClick={logout} className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
        退出登录
      </button>
    </div>
  </aside>;
}

// ===== Card / Table / Badge / Pagination =====
function Card({title,extra,children}:{title?:string;extra?:React.ReactNode;children:React.ReactNode}) {
  return <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
    {title&&<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h3 className="text-base font-semibold text-gray-800">{title}</h3>{extra}</div>}
    <div className="p-6">{children}</div>
  </div>;
}

function Badge({color,children}:{color:"green"|"blue"|"red"|"orange"|"gray";children:React.ReactNode}) {
  const cls={green:"bg-emerald-50 text-emerald-600",blue:"bg-blue-50 text-blue-600",red:"bg-red-50 text-red-600",orange:"bg-amber-50 text-amber-600",gray:"bg-gray-100 text-gray-500"};
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls[color]}`}>{children}</span>;
}

function Input({className="",...props}:any) { return <input className={`w-full h-10 px-3.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition ${className}`} {...props}/>; }
function Textarea(props:any) { return <textarea className="w-full min-h-[100px] px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition resize-y" {...props}/>; }
function Select(props:any) { return <select className="w-full h-10 px-3.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white cursor-pointer" {...props}/>; }

function Btn({variant="primary",size="md",className="",...props}:any) {
  const base="inline-flex items-center justify-center font-medium rounded-lg transition";
  const vs={primary:"bg-indigo-600 text-white hover:bg-indigo-700",success:"bg-emerald-500 text-white hover:bg-emerald-600",danger:"bg-red-500 text-white hover:bg-red-600",warning:"bg-amber-500 text-white hover:bg-amber-600",outline:"border border-gray-200 text-gray-600 hover:bg-gray-50 bg-white"};
  const ss={sm:"h-8 px-3 text-xs",md:"h-10 px-4 text-sm",lg:"h-11 px-5 text-sm"};
  return <button className={`${base} ${vs[variant]||vs.primary} ${ss[size]||ss.md} ${className} disabled:opacity-50`} {...props}/>;
}

function Pager({page,totalPages,total,onPageChange}) {
  if(total===0) return null;
  const pages=[]; for(let i=Math.max(1,page-2);i<=Math.min(totalPages,page+2);i++) pages.push(i);
  return <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
    <span className="text-xs text-gray-400">共 {total} 条 · 第 {page}/{totalPages} 页</span>
    {totalPages>1&&<div className="flex gap-1">
      <Btn key="prev" variant="outline" size="sm" disabled={page<=1} onClick={()=>onPageChange(page-1)}>上一页</Btn>
      {pages.map(p=><Btn key={p} variant={p===page?"primary":"outline"} size="sm" onClick={()=>onPageChange(p)}>{p}</Btn>)}
      <Btn key="next" variant="outline" size="sm" disabled={page>=totalPages} onClick={()=>onPageChange(page+1)}>下一页</Btn>
    </div>}
  </div>;
}

// ===== Modal =====
function Modal({open,onClose,title,width=480,children}:{open:boolean;onClose:()=>void;title:string;width?:number;children:React.ReactNode}) {
  if(!open) return null;
  return <div className="fixed inset-0 z-[9998] flex items-center justify-center animate-fade-in">
    <div className="absolute inset-0 bg-black/50" onClick={onClose}/>
    <div className="relative bg-white rounded-2xl shadow-2xl animate-scale-in flex flex-col" style={{width,maxWidth:"90vw",maxHeight:"85vh"}}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
      </div>
      <div className="p-6 overflow-y-auto flex-1">{children}</div>
    </div>
  </div>;
}

// ===== Admin App =====
function AdminApp() {
  const [tab,setTab]=useState("stats");
  return <div className="min-h-screen flex">
    <Sidebar menus={[{id:"stats",icon:"📊",label:"发送统计"},{id:"users",icon:"👤",label:"用户管理"},{id:"identities",icon:"🔐",label:"发送实体"},{id:"templates",icon:"📋",label:"邮件模版"},{id:"test",icon:"📧",label:"测试邮件"},{id:"details",icon:"📬",label:"邮件明细"}]} active={tab} setActive={setTab}/>
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 flex items-center px-6 bg-white border-b border-gray-100 shadow-sm flex-shrink-0"><h2 className="text-lg font-semibold text-gray-800">{{stats:"发送统计",users:"用户管理",identities:"发送实体",templates:"邮件模版",test:"测试邮件",details:"邮件明细"}[tab]}</h2></header>
      <main className="flex-1 p-6 overflow-auto">{tab==="stats"&&<AdminStats/>}{tab==="users"&&<AdminUsers/>}{tab==="identities"&&<AdminIdentities/>}{tab==="templates"&&<AdminTemplates/>}{tab==="test"&&<AdminTestEmail/>}{tab==="details"&&<EmailDetails/>}</main>
    </div>
  </div>;
}

function UserApp() {
  const [tab,setTab]=useState("groups");
  return <div className="min-h-screen flex">
    <Sidebar menus={[{id:"groups",icon:"📁",label:"客群管理"},{id:"templates",icon:"📋",label:"邮件模版"},{id:"send",icon:"🚀",label:"批量发送"},{id:"history",icon:"📊",label:"发送历史"},{id:"details",icon:"📧",label:"邮件明细"}]} active={tab} setActive={setTab}/>
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 flex items-center px-6 bg-white border-b border-gray-100 shadow-sm flex-shrink-0"><h2 className="text-lg font-semibold text-gray-800">{{groups:"客群管理",templates:"邮件模版",send:"批量发送",history:"发送历史",details:"邮件明细"}[tab]}</h2></header>
      <main className="flex-1 p-6 overflow-auto">{tab==="groups"&&<UserGroups/>}{tab==="templates"&&<UserTemplates/>}{tab==="send"&&<UserSend/>}{tab==="history"&&<SendingHistory/>}{tab==="details"&&<EmailDetails/>}</main>
    </div>
  </div>;
}

// ===== Admin: Stats =====
function AdminStats() {
  const {token}=useAuth();
  const [stats,setStats]=useState(null);
  const [jobs,setJobs]=useState([]); const [page,setPage]=useState(1); const [total,setTotal]=useState(0); const [totalPages,setTotalPages]=useState(1);

  const loadStats=async()=>{try{setStats(await(await fetch(`${API}/admin/sending-stats`,{headers:authH(token)})).json());}catch{}};
  const loadJobs=async(p=1)=>{try{const d=await(await fetch(`${API}/admin/sending-jobs?page=${p}&page_size=10`,{headers:authH(token)})).json();setJobs(d.items||[]);setTotal(d.total||0);setTotalPages(d.total_pages||1);setPage(d.page||1);}catch{setJobs([]);}};
  useEffect(()=>{loadStats();loadJobs(1);},[]);

  const statCard=(label,value,sub,color)=>(
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-3xl font-bold mt-1" style={{color}}>{value}</p>
      {sub&&<p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );

  return <div className="space-y-6">
    {/* 全局概览卡片 */}
    {stats?.summary&&<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCard("发送用户数",stats.summary.total_users,"位用户使用了邮件发送","#3C50E0")}
      {statCard("总发送批次",stats.summary.total_jobs,"批次邮件发送任务","#8B5CF6")}
      {statCard("总发送人数",stats.summary.total_contacts,"封邮件已发送","#10B981")}
      {statCard("发送成功率",stats.summary.success_rate+"%","批次级别成功率","#F59E0B")}
    </div>}

    {/* 按用户统计 */}
    <Card title="用户发送统计" extra={<Btn variant="outline" size="sm" onClick={()=>{loadStats();loadJobs(1);}}>刷新</Btn>}>
      <div className="overflow-x-auto"><table className="w-full">
        <thead><tr className="border-b border-gray-100">{["用户名","显示名称","发送邮箱","发送批次","发送人数","成功","失败","首次发送","最近发送"].map(h=><th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-3 whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{(stats?.users||[]).map(u=><tr key={u.user_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
          <td className="py-3 px-3 text-sm font-medium text-gray-800">{u.username}</td>
          <td className="py-3 px-3 text-sm text-gray-600">{u.display_name}</td>
          <td className="py-3 px-3 text-sm text-gray-500">{u.email||"-"}</td>
          <td className="py-3 px-3 text-sm text-gray-800 text-center font-medium">{u.total_jobs}</td>
          <td className="py-3 px-3 text-sm text-center font-medium" style={{color:"#3C50E0"}}>{u.total_contacts}</td>
          <td className="py-3 px-3 text-center"><Badge color="green">{u.success_count}</Badge></td>
          <td className="py-3 px-3 text-center">{u.failed_count>0?<Badge color="red">{u.failed_count}</Badge>:<span className="text-gray-300">0</span>}</td>
          <td className="py-3 px-3 text-xs text-gray-400 whitespace-nowrap">{u.first_send?new Date(u.first_send).toLocaleString():"-"}</td>
          <td className="py-3 px-3 text-xs text-gray-400 whitespace-nowrap">{u.last_send?new Date(u.last_send).toLocaleString():"-"}</td>
        </tr>)}</tbody>
      </table></div>
      {(!stats?.users||stats.users.length===0)&&<p className="text-center py-8 text-sm text-gray-400">暂无发送数据</p>}
    </Card>

    {/* 全部发送记录 */}
    <Card title="全部发送记录">
      <div className="overflow-x-auto"><table className="w-full">
        <thead><tr className="border-b border-gray-100">{["批次ID","用户","模版","客群","发送邮箱","人数","状态","发送时间"].map(h=><th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-3 whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{jobs.map(j=><tr key={j.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
          <td className="py-3 px-3 text-xs text-gray-500 font-mono">{j.batch_id}</td>
          <td className="py-3 px-3 text-sm text-gray-800">{j.display_name||j.username}</td>
          <td className="py-3 px-3 text-sm text-gray-600">{j.template_name}</td>
          <td className="py-3 px-3 text-sm text-gray-600">{j.group_name}</td>
          <td className="py-3 px-3 text-sm text-gray-500">{j.source_email}</td>
          <td className="py-3 px-3 text-sm text-gray-800 text-center">{j.total_contacts}</td>
          <td className="py-3 px-3">{j.status==="success"?<Badge color="green">成功</Badge>:j.status==="partial"?<Badge color="orange">部分</Badge>:j.status==="queued"?<Badge color="gray">排队中</Badge>:j.status==="sending"?<Badge color="blue">发送中</Badge>:<Badge color="red">失败</Badge>}</td>
          <td className="py-3 px-3 text-xs text-gray-400 whitespace-nowrap">{j.created_at?new Date(j.created_at).toLocaleString():"-"}</td>
        </tr>)}</tbody>
      </table></div>
      {jobs.length===0&&<p className="text-center py-8 text-sm text-gray-400">暂无发送记录</p>}
      <Pager page={page} totalPages={totalPages} total={total} onPageChange={p=>loadJobs(p)}/>
    </Card>
  </div>;
}

// ===== Admin: Users =====
function AdminUsers() {
  const {token}=useAuth(); const {toast}=useToast();
  const [users,setUsers]=useState([]); 
  const [showCreate,setShowCreate]=useState(false);
  const [showEdit,setShowEdit]=useState(false);
  const [f,setF]=useState({username:"",display_name:"",password:"",email:"",is_admin:false});
  const [editUser,setEditUser]=useState(null);
  const [editEmail,setEditEmail]=useState("");
  const [editName,setEditName]=useState("");
  const [newPwd,setNewPwd]=useState("");

  const load=async()=>{setUsers(await(await fetch(`${API}/admin/users`,{headers:authH(token)})).json());}; useEffect(()=>{load();},[]);
  const create=async()=>{if(!f.username||!f.password||!f.email)return toast("warning","请填写完整信息");const r=await fetch(`${API}/admin/users`,{method:"POST",headers:authH(token),body:JSON.stringify(f)});if(r.ok){toast("success","用户创建成功");setShowCreate(false);load();}else{const e=await r.json();toast("error","失败",e.detail);}};
  const {confirm:cfm}=useConfirm();
  const toggle=async(u)=>{const action=u.is_active?"禁用":"启用";if(!await cfm(`${action}用户`,`确定${action}用户「${u.username}」？`))return;await fetch(`${API}/admin/users/${u.id}`,{method:"PUT",headers:authH(token),body:JSON.stringify({is_active:!u.is_active})});load();};

  const openEdit=(u)=>{setEditUser(u);setEditEmail(u.email||"");setEditName(u.display_name||"");setNewPwd("");setShowEdit(true);};
  const saveEdit=async()=>{
    const body:any={display_name:editName,email:editEmail};
    if(newPwd) body.password=newPwd;
    const r=await fetch(`${API}/admin/users/${editUser.id}`,{method:"PUT",headers:authH(token),body:JSON.stringify(body)});
    if(r.ok){toast("success","用户信息已更新");setShowEdit(false);load();}
    else{const e=await r.json();toast("error","更新失败",e.detail);}
  };

  return <>
    {/* 添加用户弹框 */}
    <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="添加用户" width={500}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">用户名 *</label><Input placeholder="登录用户名" value={f.username} onChange={e=>setF({...f,username:e.target.value})}/></div>
          <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">显示名称</label><Input placeholder="用户显示名称" value={f.display_name} onChange={e=>setF({...f,display_name:e.target.value})}/></div>
          <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">密码 *</label><Input type="password" placeholder="登录密码" value={f.password} onChange={e=>setF({...f,password:e.target.value})}/></div>
          <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">发送邮箱 *</label><Input placeholder="user@domain.com" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" className="rounded" checked={f.is_admin} onChange={e=>setF({...f,is_admin:e.target.checked})}/>管理员权限</label>
        <div className="flex justify-end gap-2"><Btn variant="outline" onClick={()=>setShowCreate(false)}>取消</Btn><Btn variant="success" onClick={create}>创建用户</Btn></div>
      </div>
    </Modal>

    {/* 编辑用户弹框 */}
    <Modal open={showEdit} onClose={()=>setShowEdit(false)} title={`编辑用户 - ${editUser?.username}`} width={460}>
      <div className="space-y-4">
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">用户名</label><Input value={editUser?.username||""} disabled className="bg-gray-50 opacity-60"/></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">显示名称</label><Input value={editName} onChange={e=>setEditName(e.target.value)}/></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">发送邮箱</label><Input placeholder="user@domain.com" value={editEmail} onChange={e=>setEditEmail(e.target.value)}/></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">重置密码</label><Input type="password" placeholder="留空则不修改密码" value={newPwd} onChange={e=>setNewPwd(e.target.value)}/><p className="text-xs text-gray-400 mt-1">不填写则保持原密码不变</p></div>
        <div className="flex justify-end gap-2"><Btn variant="outline" onClick={()=>setShowEdit(false)}>取消</Btn><Btn onClick={saveEdit}>保存修改</Btn></div>
      </div>
    </Modal>

    <Card title="用户列表" extra={<Btn size="sm" onClick={()=>{setF({username:"",display_name:"",password:"",email:"",is_admin:false});setShowCreate(true);}}>+ 添加用户</Btn>}>
      <div className="overflow-x-auto"><table className="w-full">
        <thead><tr className="border-b border-gray-100">{["用户名","显示名称","发送邮箱","角色","状态","操作"].map(h=><th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">{h}</th>)}</tr></thead>
        <tbody>{users.map(u=><tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
          <td className="py-3 px-4 text-sm font-medium text-gray-800">{u.username}</td>
          <td className="py-3 px-4 text-sm text-gray-600">{u.display_name}</td>
          <td className="py-3 px-4 text-sm text-gray-500">{u.email||"-"}</td>
          <td className="py-3 px-4"><Badge color={u.is_admin?"red":"blue"}>{u.is_admin?"管理员":"用户"}</Badge></td>
          <td className="py-3 px-4"><Badge color={u.is_active?"green":"gray"}>{u.is_active?"启用":"禁用"}</Badge></td>
          <td className="py-3 px-4 flex gap-1">
            <Btn variant="primary" size="sm" onClick={()=>openEdit(u)}>编辑</Btn>
            <Btn variant={u.is_active?"warning":"success"} size="sm" onClick={()=>toggle(u)}>{u.is_active?"禁用":"启用"}</Btn>
          </td>
        </tr>)}</tbody>
      </table></div>
    </Card>
  </>;
}

// ===== Admin: Identities =====
function AdminIdentities() {
  const {token}=useAuth(); const {toast}=useToast();
  const [list,setList]=useState([]); const [ne,setNe]=useState(""); const [nd,setNd]=useState("");
  const [rep,setRep]=useState(null);

  const load=async()=>{const d=await(await fetch(`${API}/admin/identities`,{headers:authH(token)})).json();setList(Array.isArray(d)?d:[]);};
  const loadRep=async()=>{try{setRep(await(await fetch(`${API}/admin/identities/reputation`,{headers:authH(token)})).json());}catch{}};
  useEffect(()=>{load();loadRep();},[]);

  const ve=async()=>{if(!ne)return;const r=await fetch(`${API}/admin/identities/verify-email?email=${ne}`,{method:"POST",headers:authH(token)});if(r.ok){toast("success","验证邮件已发送",ne);setNe("");load();}else{const e=await r.json();toast("error","失败",e.detail);}};
  const vd=async()=>{if(!nd)return;const r=await fetch(`${API}/admin/identities/verify-domain?domain=${nd}`,{method:"POST",headers:authH(token)});const d=await r.json();if(r.ok){toast("info","请添加 TXT 记录",`_amazonses.${nd} -> ${d.token}`);setNd("");load();}else toast("error","失败",d.detail);};

  const repCard=(label,value,sub,color)=>(
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-bold mt-1" style={{color}}>{value}</p>
      {sub&&<p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );

  return <div className="space-y-6">
    {/* 账户信誉概览 */}
    {rep&&<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {repCard("账户状态", rep.enforcement_status, rep.production_access?"生产模式":"沙箱模式", rep.enforcement_status==="HEALTHY"?"#10B981":"#EF4444")}
      {repCard("24h 已发送", `${rep.sent_last_24h} / ${rep.max_24h_send}`, `发送速率 ${rep.max_send_rate}/秒`, "#3C50E0")}
      {repCard("退信率", rep.bounce_rate+"%", "近 7 天平均（<5% 为健康）", rep.bounce_rate<5?"#10B981":"#EF4444")}
      {repCard("投诉率", rep.complaint_rate+"%", "近 7 天平均（<0.1% 为健康）", rep.complaint_rate<0.1?"#10B981":"#EF4444")}
    </div>}

    {/* 发送实体管理 */}
    <Card title="发送实体管理" extra={<Btn variant="outline" size="sm" onClick={()=>{load();loadRep();}}>刷新</Btn>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="flex gap-2"><Input placeholder="邮箱地址" value={ne} onChange={e=>setNe(e.target.value)}/><Btn onClick={ve} className="flex-shrink-0">验证邮箱</Btn></div>
        <div className="flex gap-2"><Input placeholder="域名 (example.com)" value={nd} onChange={e=>setNd(e.target.value)}/><Btn variant="success" onClick={vd} className="flex-shrink-0">验证域名</Btn></div>
      </div>
      <div className="overflow-x-auto"><table className="w-full">
        <thead><tr className="border-b border-gray-100">{["实体名称","类型","验证状态","DKIM","DKIM签名"].map(h=><th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">{h}</th>)}</tr></thead>
        <tbody>{list.map(i=><tr key={i.identity} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
          <td className="py-3 px-4 text-sm font-medium text-gray-800">{i.identity}</td>
          <td className="py-3 px-4 text-sm text-gray-500">{i.type==="EmailAddress"?"邮箱":"域名"}</td>
          <td className="py-3 px-4"><Badge color={i.verification_status==="Success"?"green":"orange"}>{i.verification_status==="Success"?"已验证":"验证中"}</Badge></td>
          <td className="py-3 px-4"><Badge color={i.dkim_status==="SUCCESS"?"green":i.dkim_status==="PENDING"?"orange":"gray"}>{i.dkim_status}</Badge></td>
          <td className="py-3 px-4"><Badge color={i.dkim_signing?"green":"gray"}>{i.dkim_signing?"已启用":"未启用"}</Badge></td>
        </tr>)}</tbody>
      </table></div>
    </Card>
  </div>;
}

// ===== Admin: Templates =====
function AdminTemplates() {
  return <TemplateManager apiPrefix="/admin/templates" />;
}

// ===== Admin: Test Email =====
function AdminTestEmail() {
  const {token}=useAuth(); const {toast}=useToast();
  const [ids,setIds]=useState([]); const [f,setF]=useState({source:"",to:"",subject:"",html_body:""}); const [ld,setLd]=useState(false);
  useEffect(()=>{fetch(`${API}/admin/identities`,{headers:authH(token)}).then(r=>r.json()).then(d=>setIds(Array.isArray(d)?d.filter(x=>x.verification_status==="Success"):[]));} ,[]);
  const send=async()=>{if(!f.source||!f.to||!f.subject||!f.html_body)return toast("warning","请填写完整");setLd(true);try{const r=await fetch(`${API}/admin/test-email`,{method:"POST",headers:authH(token),body:JSON.stringify(f)});const d=await r.json();if(r.ok)toast("success","发送成功",`MessageId: ${d.message_id}`);else toast("error","失败",d.detail);}catch{toast("error","网络错误");}finally{setLd(false);}};

  return <div style={{maxWidth:640}}><Card title="发送测试邮件">
    <div className="space-y-4">
      <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">发送者</label>
        <div className="flex gap-2"><Select style={{flex:1}} onChange={e=>{if(e.target.value)setF({...f,source:e.target.value});}}><option value="">从已验证实体选择...</option>{ids.map(i=><option key={i.identity} value={i.identity}>{i.identity}</option>)}</Select><Input style={{flex:1}} placeholder="或手动输入" value={f.source} onChange={e=>setF({...f,source:e.target.value})}/></div>
        <p className="text-xs text-gray-400 mt-1">域名验证后可使用 user@yourdomain.com</p></div>
      <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">收件人</label><Input placeholder="收件人邮箱" value={f.to} onChange={e=>setF({...f,to:e.target.value})}/></div>
      <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">主题</label><Input placeholder="邮件主题" value={f.subject} onChange={e=>setF({...f,subject:e.target.value})}/></div>
      <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">内容</label><Textarea placeholder="HTML 内容" value={f.html_body} onChange={e=>setF({...f,html_body:e.target.value})}/></div>
      <Btn onClick={send} disabled={ld} className="w-full" size="lg">{ld?"发送中...":"发送测试邮件"}</Btn>
    </div>
  </Card></div>;
}

// ===== User: Groups =====
function UserGroups() {
  const {token}=useAuth(); const {toast}=useToast(); const {confirm:cfm}=useConfirm();
  const [gs,setGs]=useState([]); const [gS,setGS]=useState(""); const [gP,setGP]=useState(1); const [gT,setGT]=useState(0); const [gTP,setGTP]=useState(1);
  const [sel,setSel]=useState(null); const [cs,setCs]=useState([]); const [cS,setCS]=useState(""); const [cP,setCP]=useState(1); const [cT,setCT]=useState(0); const [cTP,setCTP]=useState(1);

  // 弹框状态
  const [showAddGroup,setShowAddGroup]=useState(false);
  const [showEditGroup,setShowEditGroup]=useState(false);
  const [editGroupId,setEditGroupId]=useState(null);
  const [ng,setNg]=useState("");
  const [ngDesc,setNgDesc]=useState("");
  const [showAddContact,setShowAddContact]=useState(false);
  const [rows,setRows]=useState([{name:"",email:""}]);

  const PAGE_SIZE = 10;
  const loadG=async(p=gP,s=gS)=>{try{const d=await(await fetch(`${API}/groups?page=${p}&page_size=${PAGE_SIZE}&search=${encodeURIComponent(s)}`,{headers:authH(token)})).json();setGs(d.items||[]);setGT(d.total||0);setGTP(d.total_pages||1);setGP(d.page||1);}catch{setGs([]);}};
  useEffect(()=>{loadG(1,"");},[]);
  const searchG=(v)=>{setGS(v);loadG(1,v);};
  const loadC=async(gid,p=1,s="")=>{try{const d=await(await fetch(`${API}/groups/${gid}/contacts?page=${p}&page_size=${PAGE_SIZE}&search=${encodeURIComponent(s)}`,{headers:authH(token)})).json();setCs(d.items||[]);setCT(d.total||0);setCTP(d.total_pages||1);setCP(d.page||1);setSel(gid);}catch{setCs([]);}};
  const searchC=(v)=>{setCS(v);if(sel)loadC(sel,1,v);};

  const addG=async()=>{if(!ng)return toast("warning","请输入客群名称");await fetch(`${API}/groups`,{method:"POST",headers:authH(token),body:JSON.stringify({name:ng,description:ngDesc})});toast("success","客群创建成功");setNg("");setNgDesc("");setShowAddGroup(false);loadG(1,gS);};
  const openEditG=(g)=>{setEditGroupId(g.id);setNg(g.name);setNgDesc(g.description||"");setShowEditGroup(true);};
  const updateG=async()=>{if(!ng)return toast("warning","请输入客群名称");const r=await fetch(`${API}/groups/${editGroupId}`,{method:"PUT",headers:authH(token),body:JSON.stringify({name:ng,description:ngDesc})});if(r.ok){toast("success","客群已更新");setShowEditGroup(false);loadG(gP,gS);}else{const e=await r.json();toast("error","更新失败",e.detail);}};
  const delG=async(g)=>{if(!await cfm("删除客群",`确定删除客群「${g.name}」及其所有 ${g.contact_count} 个联系人？\n此操作不可恢复。`,"确认删除"))return;await fetch(`${API}/groups/${g.id}`,{method:"DELETE",headers:authH(token)});if(sel===g.id){setSel(null);setCs([]);}loadG(gP,gS);};

  const updR=(i,f,v)=>{const r=[...rows];r[i][f]=v;setRows(r);};
  const addR=()=>setRows([...rows,{name:"",email:""}]);
  const rmR=(i)=>{if(rows.length>1)setRows(rows.filter((_,j)=>j!==i));};
  const saveC=async()=>{const v=rows.filter(r=>r.email.trim());if(!v.length)return toast("warning","请至少填写一个邮箱");for(const r of v)await fetch(`${API}/contacts`,{method:"POST",headers:authH(token),body:JSON.stringify({name:r.name.trim(),email:r.email.trim(),group_id:sel})});toast("success",`已添加 ${v.length} 个联系人`);setRows([{name:"",email:""}]);setShowAddContact(false);loadC(sel,cP,cS);loadG(gP,gS);};
  const delC=async(c)=>{if(!await cfm("删除联系人",`确定删除联系人「${c.name||c.email}」？\n邮箱: ${c.email}`,"确认删除"))return;await fetch(`${API}/contacts/${c.id}`,{method:"DELETE",headers:authH(token)});loadC(sel,cP,cS);loadG(gP,gS);};

  const dlTpl=()=>window.open(`${API}/contacts/template/download?token=${token}`,"_blank");
  const dlCs=()=>{if(sel)window.open(`${API}/groups/${sel}/contacts/download?token=${token}`,"_blank");};
  const ulCs=async(e)=>{const file=e.target.files[0];if(!file||!sel)return;const fd=new FormData();fd.append("file",file);const r=await fetch(`${API}/groups/${sel}/contacts/upload`,{method:"POST",headers:{Authorization:`Bearer ${token}`},body:fd});const d=await r.json();if(r.ok){toast("success","导入成功",d.message);loadC(sel,1,cS);loadG(gP,gS);}else toast("error","导入失败",d.detail);e.target.value="";};

  return <>
    {/* 新建客群弹框 */}
    <Modal open={showAddGroup} onClose={()=>setShowAddGroup(false)} title="新建客群" width={440}>
      <div className="space-y-4">
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">客群名称</label><Input placeholder="输入客群名称" value={ng} onChange={e=>setNg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addG()}/></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">描述（可选）</label><Input placeholder="客群描述" value={ngDesc} onChange={e=>setNgDesc(e.target.value)}/></div>
        <div className="flex justify-end gap-2"><Btn variant="outline" onClick={()=>setShowAddGroup(false)}>取消</Btn><Btn onClick={addG}>创建客群</Btn></div>
      </div>
    </Modal>

    {/* 编辑客群弹框 */}
    <Modal open={showEditGroup} onClose={()=>setShowEditGroup(false)} title="编辑客群" width={440}>
      <div className="space-y-4">
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">客群名称</label><Input value={ng} onChange={e=>setNg(e.target.value)}/></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">描述</label><Input placeholder="客群描述" value={ngDesc} onChange={e=>setNgDesc(e.target.value)}/></div>
        <div className="flex justify-end gap-2"><Btn variant="outline" onClick={()=>setShowEditGroup(false)}>取消</Btn><Btn onClick={updateG}>保存修改</Btn></div>
      </div>
    </Modal>

    {/* 添加联系人弹框 */}
    <Modal open={showAddContact} onClose={()=>setShowAddContact(false)} title="添加联系人" width={580}>
      <div className="space-y-3">
        {rows.map((r,i)=><div key={i} className="flex gap-2 items-center">
          <Input placeholder="姓名" value={r.name} onChange={e=>updR(i,"name",e.target.value)}/>
          <Input placeholder="邮箱 *" value={r.email} onChange={e=>updR(i,"email",e.target.value)}/>
          {rows.length>1&&<button onClick={()=>rmR(i)} className="text-gray-400 hover:text-red-500 text-xl leading-none px-1 flex-shrink-0">&times;</button>}
        </div>)}
        <Btn variant="outline" size="sm" onClick={addR}>+ 添加一行</Btn>
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Btn variant="outline" onClick={()=>setShowAddContact(false)}>取消</Btn>
          <Btn variant="success" onClick={saveC}>批量保存</Btn>
        </div>
      </div>
    </Modal>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 左：客群 */}
      <Card title="我的客群" extra={<Btn size="sm" onClick={()=>{setNg("");setShowAddGroup(true);}}>+ 新建客群</Btn>}>
        <Input placeholder="搜索客群..." value={gS} onChange={e=>searchG(e.target.value)} className="mb-4"/>
        <div className="space-y-1">{gs.map(g=><div key={g.id} onClick={()=>{setCS("");loadC(g.id,1,"");}} className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition ${sel===g.id?"bg-indigo-50 text-indigo-700":"hover:bg-gray-50 text-gray-700"}`}>
          <span className={`text-sm ${sel===g.id?"font-semibold":""}`}>{g.name} <span className="text-xs text-gray-400">({g.contact_count})</span></span>
          <div className="flex gap-1">
            <Btn variant="outline" size="sm" onClick={e=>{e.stopPropagation();openEditG(g);}}>编辑</Btn>
            <Btn variant="danger" size="sm" onClick={e=>{e.stopPropagation();delG(g);}}>删除</Btn>
          </div>
        </div>)}{gs.length===0&&<p className="text-center py-8 text-sm text-gray-400">暂无客群</p>}</div>
        <Pager page={gP} totalPages={gTP} total={gT} onPageChange={p=>loadG(p,gS)}/>
      </Card>

      {/* 右：联系人 */}
      <div className="lg:col-span-2"><Card title={sel?`联系人管理`:"请选择一个客群"} extra={sel&&<div className="flex gap-2">
        <Btn variant="outline" size="sm" onClick={dlTpl}>下载模版</Btn>
        <label className="inline-flex items-center justify-center font-medium rounded-lg transition h-8 px-3 text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 bg-white cursor-pointer">Excel导入<input type="file" accept=".xlsx,.xls" className="hidden" onChange={ulCs}/></label>
        <Btn variant="outline" size="sm" onClick={dlCs}>导出Excel</Btn>
        <Btn variant="success" size="sm" onClick={()=>{setRows([{name:"",email:""}]);setShowAddContact(true);}}>+ 添加联系人</Btn>
      </div>}>
        {sel?<>
          <div className="flex items-center gap-3 mb-4"><Input placeholder="搜索姓名或邮箱..." value={cS} onChange={e=>searchC(e.target.value)}/><span className="text-sm text-gray-400 whitespace-nowrap">共 {cT} 人</span></div>
          <div className="overflow-x-auto"><table className="w-full">
            <thead><tr className="border-b border-gray-100">{["姓名","邮箱","操作"].map(h=><th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">{h}</th>)}</tr></thead>
            <tbody>{cs.map(c=><tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
              <td className="py-3 px-4 text-sm text-gray-800">{c.name}</td>
              <td className="py-3 px-4 text-sm text-gray-500">{c.email}</td>
              <td className="py-3 px-4"><Btn variant="danger" size="sm" onClick={()=>delC(c)}>删除</Btn></td>
            </tr>)}</tbody>
          </table></div>
          {cs.length===0&&<p className="text-center py-8 text-sm text-gray-400">暂无联系人</p>}
          <Pager page={cP} totalPages={cTP} total={cT} onPageChange={p=>loadC(sel,p,cS)}/>
        </>:<p className="text-center py-16 text-gray-400">请在左侧选择一个客群</p>}
      </Card></div>
    </div>
  </>;
}

// ===== User: Templates =====
function UserTemplates() {
  return <TemplateManager apiPrefix="/user/templates" />;
}

// ===== Shared: Template Manager =====
function TemplateManager({apiPrefix}:{apiPrefix:string}) {
  const {token}=useAuth(); const {toast}=useToast(); const {confirm:cfm}=useConfirm();
  const [list,setList]=useState([]);
  const [showCreate,setShowCreate]=useState(false);
  const [showEdit,setShowEdit]=useState(false);
  const [f,setF]=useState({name:"",subject:"",html_body:""});
  const [editId,setEditId]=useState(null);
  const [previewTab,setPreviewTab]=useState<"code"|"preview"|"split">("split");

  const load=async()=>{const d=await(await fetch(`${API}${apiPrefix}`,{headers:authH(token)})).json();setList(Array.isArray(d)?d:[]);}; useEffect(()=>{load();},[]);

  const create=async()=>{
    if(!f.name||!f.subject||!f.html_body)return toast("warning","请填写完整");
    const r=await fetch(`${API}${apiPrefix}`,{method:"POST",headers:authH(token),body:JSON.stringify(f)});
    if(r.ok){toast("success","模版创建成功");setShowCreate(false);load();}
    else{const e=await r.json();toast("error","失败",e.detail);}
  };

  const openEdit=(t)=>{setEditId(t.id);setF({name:t.name,subject:t.subject,html_body:t.html_body});setShowEdit(true);setPreviewTab("split");};

  const update=async()=>{
    if(!f.subject||!f.html_body)return toast("warning","请填写完整");
    const r=await fetch(`${API}${apiPrefix}/${editId}`,{method:"PUT",headers:authH(token),body:JSON.stringify({subject:f.subject,html_body:f.html_body})});
    if(r.ok){toast("success","模版已更新");setShowEdit(false);load();}
    else{const e=await r.json();toast("error","更新失败",e.detail);}
  };

  const del=async(t)=>{if(!await cfm("删除模版",`确定删除「${t.name}」？不可恢复。`,"确认删除"))return;const r=await fetch(`${API}${apiPrefix}/${t.id}`,{method:"DELETE",headers:authH(token)});if(r.ok){toast("success","已删除");load();}else{const e=await r.json();toast("error","失败",e.detail);}};

  // HTML 片段快捷工具栏
  const snippets = [
    {label:"标题",icon:"H",html:'<h1 style="color:#333;font-size:24px;">标题文字</h1>\n'},
    {label:"段落",icon:"P",html:'<p style="color:#555;font-size:14px;line-height:1.8;">段落内容</p>\n'},
    {label:"按钮",icon:"▣",html:'<a href="https://example.com" style="display:inline-block;padding:12px 28px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;">点击按钮</a>\n'},
    {label:"图片",icon:"🖼",html:'<img src="https://via.placeholder.com/600x200" alt="图片" style="max-width:100%;height:auto;border-radius:8px;" />\n'},
    {label:"分割线",icon:"—",html:'<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />\n'},
    {label:"表格",icon:"⊞",html:'<table style="width:100%;border-collapse:collapse;">\n  <tr style="background:#f3f4f6;">\n    <th style="padding:10px 16px;text-align:left;border-bottom:2px solid #e5e7eb;">列1</th>\n    <th style="padding:10px 16px;text-align:left;border-bottom:2px solid #e5e7eb;">列2</th>\n  </tr>\n  <tr>\n    <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;">内容</td>\n    <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;">内容</td>\n  </tr>\n</table>\n'},
    {label:"卡片",icon:"☐",html:'<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin:16px 0;">\n  <h2 style="margin:0 0 8px;color:#333;font-size:18px;">卡片标题</h2>\n  <p style="margin:0;color:#666;font-size:14px;">卡片内容描述</p>\n</div>\n'},
    {label:"页脚",icon:"⊥",html:'<div style="text-align:center;padding:20px 0;border-top:1px solid #e5e7eb;margin-top:30px;">\n  <p style="color:#999;font-size:12px;">© 2026 Your Company. All rights reserved.</p>\n  <p style="color:#999;font-size:12px;"><a href="{{unsubscribe_url}}" style="color:#999;">取消订阅</a></p>\n</div>\n'},
  ];

  const variables = [
    {label:"姓名",val:"{{name}}"},
    {label:"邮箱",val:"{{email}}"},
    {label:"公司",val:"{{company}}"},
    {label:"日期",val:"{{date}}"},
  ];

  const insertSnippet = (html:string) => {
    setF(prev=>({...prev,html_body:prev.html_body+html}));
  };

  const insertVariable = (val:string) => {
    setF(prev=>({...prev,html_body:prev.html_body+val}));
  };

  // 图片上传
  const [uploading,setUploading]=useState(false);
  const fileInputRef=useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast("warning","只支持图片文件"); return; }
    if (file.size > 5*1024*1024) { toast("warning","图片不能超过 5MB"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${API}/upload/image`, {method:"POST", headers:{"Authorization":`Bearer ${token}`}, body:fd});
      if (!r.ok) { const e = await r.json(); toast("error","上传失败",e.detail); return; }
      const d = await r.json();
      const imgUrl = `${API}${d.url}`;
      const imgHtml = `<img src="${imgUrl}" alt="${file.name}" style="max-width:100%;height:auto;border-radius:8px;" />\n`;
      setF(prev=>({...prev,html_body:prev.html_body+imgHtml}));
      toast("success","图片已上传",file.name);
    } catch { toast("error","上传失败","网络错误"); }
    finally { setUploading(false); }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) uploadImage(file);
        return;
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith("image/")) { uploadImage(files[i]); return; }
    }
  };

  // 邮件完整 HTML 包装（用于预览）
  const getPreviewHtml = (body:string) => {
    const subjectLine = f.subject ? f.subject.replace(/\{\{(\w+)\}\}/g, '<span style="background:#fef3c7;padding:1px 4px;border-radius:3px;color:#92400e;">$1</span>') : '';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;}</style></head><body>
      <div style="max-width:640px;margin:0 auto;background:#fff;">
        ${subjectLine ? `<div style="background:#f8fafc;padding:12px 20px;border-bottom:1px solid #e5e7eb;"><span style="color:#9ca3af;font-size:12px;">主题：</span><span style="color:#374151;font-size:13px;">${subjectLine}</span></div>` : ''}
        <div style="padding:24px 20px;">${body.replace(/\{\{(\w+)\}\}/g, '<span style="background:#fef3c7;padding:1px 4px;border-radius:3px;color:#92400e;font-size:inherit;">$1</span>')}</div>
      </div>
    </body></html>`;
  };

  // 编辑区域渲染函数（不作为组件，避免重渲染导致输入框失焦）
  const renderEditor = (isCreate:boolean) => (
    <div className="space-y-4">
      {isCreate && <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">模版名称</label><Input placeholder="输入模版名称" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></div>}
      {!isCreate && <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">模版名称</label><Input value={f.name} disabled className="bg-gray-50 opacity-60"/></div>}
      <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">邮件主题</label><Input placeholder="支持 {{name}} 变量" value={f.subject} onChange={e=>setF({...f,subject:e.target.value})}/></div>

      {/* 视图切换 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">HTML 内容</label>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {([["code","代码"],["split","分屏"],["preview","预览"]] as const).map(([id,label])=>(
              <button key={id} onClick={()=>setPreviewTab(id)} className={`px-3 py-1 text-xs rounded-md transition-all ${previewTab===id?"bg-white text-indigo-600 shadow-sm font-medium":"text-gray-500 hover:text-gray-700"}`}>{label}</button>
            ))}
          </div>
        </div>

        {/* 工具栏 */}
        <div className="flex flex-wrap items-center gap-1 mb-2 p-2 bg-gray-50 border border-gray-200 rounded-t-lg">
          <span className="text-xs text-gray-400 mr-1">插入：</span>
          {snippets.map(s=>(
            <button key={s.label} onClick={()=>insertSnippet(s.html)} title={s.label}
              className="px-2 py-1 text-xs bg-white border border-gray-200 rounded-md hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all text-gray-600">
              <span className="mr-0.5">{s.icon}</span>{s.label}
            </button>
          ))}
          <span className="w-px h-5 bg-gray-200 mx-1"/>
          {/* 上传图片 */}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e=>{const file=e.target.files?.[0];if(file)uploadImage(file);e.target.value="";}}/>
          <button onClick={()=>fileInputRef.current?.click()} disabled={uploading}
            className="px-2 py-1 text-xs bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-all text-emerald-700 disabled:opacity-50">
            {uploading?"上传中...":"📤 上传图片"}
          </button>
          <span className="w-px h-5 bg-gray-200 mx-1"/>
          <span className="text-xs text-gray-400 mr-1">变量：</span>
          {variables.map(v=>(
            <button key={v.val} onClick={()=>insertVariable(v.val)}
              className="px-2 py-1 text-xs bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-all text-amber-700 font-mono">
              {v.val}
            </button>
          ))}
          <span className="text-xs text-gray-300 ml-auto">支持粘贴/拖拽图片</span>
        </div>

        {/* 编辑器 + 预览 */}
        <div className={`border border-gray-200 rounded-b-lg overflow-hidden ${previewTab==="split"?"flex":""}`} style={{minHeight:320}}
          onDragOver={e=>{e.preventDefault();e.stopPropagation();}} onDrop={handleDrop}>
          {(previewTab==="code"||previewTab==="split") && (
            <div className={previewTab==="split"?"w-1/2 border-r border-gray-200":"w-full"}>
              <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400"/>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"/>
                <span className="w-2.5 h-2.5 rounded-full bg-green-400"/>
                <span className="text-xs text-gray-400 ml-2">HTML 源码</span>
              </div>
              <textarea
                value={f.html_body}
                onChange={e=>setF({...f,html_body:e.target.value})}
                onPaste={handlePaste}
                placeholder="在此编写 HTML 邮件内容...&#10;&#10;支持：粘贴图片 (Ctrl+V) / 拖拽图片到此处"
                className="w-full h-full p-3 text-sm font-mono text-gray-700 bg-gray-900 text-green-400 resize-none outline-none"
                style={{minHeight:280,background:"#1e1e2e",color:"#a6e3a1",caretColor:"#fff"}}
                spellCheck={false}
              />
            </div>
          )}
          {(previewTab==="preview"||previewTab==="split") && (
            <div className={previewTab==="split"?"w-1/2":"w-full"}>
              <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200 flex items-center gap-1.5">
                <span className="text-xs text-gray-400">📧 邮件预览</span>
                {f.html_body && <span className="text-xs text-green-500 ml-auto">实时预览</span>}
              </div>
              <div className="bg-white" style={{minHeight:280}}>
                {f.html_body ? (
                  <iframe
                    srcDoc={getPreviewHtml(f.html_body)}
                    className="w-full border-0"
                    style={{minHeight:280,height:"100%"}}
                    sandbox="allow-same-origin"
                    title="邮件预览"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-300 text-sm" style={{minHeight:280}}>
                    <div className="text-center"><p className="text-3xl mb-2">📧</p><p>在左侧编写 HTML 后</p><p>此处将实时预览邮件效果</p></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Btn variant="outline" onClick={()=>{isCreate?setShowCreate(false):setShowEdit(false);}}>取消</Btn>
        {isCreate ? <Btn variant="success" onClick={create}>保存模版</Btn> : <Btn onClick={update}>保存修改</Btn>}
      </div>
    </div>
  );

  return <>
    {/* 新建弹框 */}
    <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="新建邮件模版" width={1000}>
      {renderEditor(true)}
    </Modal>

    {/* 编辑弹框 */}
    <Modal open={showEdit} onClose={()=>setShowEdit(false)} title={`编辑模版 - ${f.name}`} width={1000}>
      {renderEditor(false)}
    </Modal>

    <Card title="邮件模版" extra={<Btn size="sm" onClick={()=>{setF({name:"",subject:"",html_body:""});setShowCreate(true);setPreviewTab("split");}}>+ 新建模版</Btn>}>
      <div className="overflow-x-auto"><table className="w-full">
        <thead><tr className="border-b border-gray-100">{["模版名称","邮件主题","创建时间","操作"].map(h=><th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">{h}</th>)}</tr></thead>
        <tbody>{list.map(t=><tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
          <td className="py-3 px-4 text-sm font-medium text-gray-800">{t.name}</td>
          <td className="py-3 px-4 text-sm text-gray-500">{t.subject}</td>
          <td className="py-3 px-4 text-sm text-gray-400">{t.created_at?new Date(t.created_at).toLocaleString():"-"}</td>
          <td className="py-3 px-4 flex gap-1"><Btn variant="primary" size="sm" onClick={()=>openEdit(t)}>编辑</Btn><Btn variant="danger" size="sm" onClick={()=>del(t)}>删除</Btn></td>
        </tr>)}</tbody>
      </table></div>
      {list.length===0&&<p className="text-center py-8 text-sm text-gray-400">暂无模版</p>}
    </Card>
  </>;
}

// ===== User: Send =====
function UserSend() {
  const {token,user}=useAuth(); const {toast}=useToast();
  const [ts,setTs]=useState([]); const [gs,setGs]=useState([]); const [f,setF]=useState({templateId:"",groupId:""}); const [ld,setLd]=useState(false);
  const [progress,setProgress]=useState(null as any);
  const pollRef=useRef(null as any);

  useEffect(()=>{Promise.all([fetch(`${API}/user/templates`,{headers:authH(token)}).then(r=>r.json()),fetch(`${API}/groups`,{headers:authH(token)}).then(r=>r.json())]).then(([t,g])=>{setTs(Array.isArray(t)?t:[]);setGs(Array.isArray(g?.items)?g.items:Array.isArray(g)?g:[]);});},[]);
  useEffect(()=>()=>{if(pollRef.current)clearInterval(pollRef.current);},[]);

  const pollProgress=(batchId:string)=>{
    if(pollRef.current)clearInterval(pollRef.current);
    pollRef.current=setInterval(async()=>{
      try{
        const r=await fetch(`${API}/sending-jobs/${batchId}/progress`,{headers:authH(token)});
        if(!r.ok)return;
        const d=await r.json();
        setProgress(d);
        if(d.status==="success"||d.status==="failed"||d.status==="partial"){
          clearInterval(pollRef.current);pollRef.current=null;setLd(false);
          if(d.status==="success")toast("success","发送完成",`已发送 ${d.sent_count}/${d.total_contacts} 封`);
          else if(d.status==="partial")toast("warning","部分发送成功",d.error_message||"");
          else toast("error","发送失败",d.error_message||"");
        }
      }catch{}
    },1500);
  };

  const send=async()=>{
    if(!f.templateId||!f.groupId)return toast("warning","请选择模版和客群");
    if(!user.email)return toast("warning","发送邮箱未配置","请联系管理员");
    setLd(true);setProgress(null);
    try{
      const r=await fetch(`${API}/send-bulk`,{method:"POST",headers:authH(token),body:JSON.stringify({TemplateId:parseInt(f.templateId),GroupId:parseInt(f.groupId)})});
      const d=await r.json();
      if(r.ok){
        toast("info","任务已创建",`正在后台发送 ${d.total_contacts} 封邮件...`);
        setProgress({batch_id:d.batch_id,status:"queued",total_contacts:d.total_contacts,sent_count:0,progress:0});
        pollProgress(d.batch_id);
      }else{toast("error","失败",d.detail);setLd(false);}
    }catch{toast("error","网络错误");setLd(false);}
  };

  const stText=(s:string)=>({"queued":"排队中","sending":"发送中...","success":"发送完成","partial":"部分成功","failed":"发送失败"}[s]||s);
  const stColor=(s:string)=>({"queued":"#6B7280","sending":"#3B82F6","success":"#10B981","partial":"#F59E0B","failed":"#EF4444"}[s]||"#6B7280");

  return <div style={{maxWidth:640}}><Card title="批量发送邮件">
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4"><span className="text-sm text-indigo-700">发送邮箱：<strong>{user.email||"未配置（请联系管理员）"}</strong></span></div>
      <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">邮件模版</label><Select value={f.templateId} onChange={e=>setF({...f,templateId:e.target.value})}><option value="">选择邮件模版</option>{ts.map(t=><option key={t.id} value={t.id}>{t.name} - {t.subject}</option>)}</Select></div>
      <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">目标客群</label><Select value={f.groupId} onChange={e=>setF({...f,groupId:e.target.value})}><option value="">选择目标客群</option>{gs.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</Select></div>
      <Btn onClick={send} disabled={ld||!user.email} className="w-full" size="lg">{ld?"发送中...":"开始批量发送"}</Btn>
      {progress&&<div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{color:stColor(progress.status)}}>{stText(progress.status)}</span>
          <span className="text-xs text-gray-400 font-mono">{progress.batch_id}</span>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>已发送 {progress.sent_count} / {progress.total_contacts} 封</span>
            <span className="font-medium">{progress.progress}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{width:`${progress.progress}%`,background:progress.status==="failed"?"#EF4444":progress.status==="success"?"#10B981":"#6366F1"}}/>
          </div>
        </div>
        {progress.status==="sending"&&<div className="flex items-center gap-2 text-xs text-blue-500"><span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/>正在发送中，请勿关闭页面...</div>}
        {progress.error_message&&<p className="text-xs text-red-500">{progress.error_message}</p>}
      </div>}
    </div>
  </Card></div>;
}

// ===== Sending History =====
function SendingHistory() {
  const {token}=useAuth();
  const [jobs,setJobs]=useState([]); const [page,setPage]=useState(1); const [total,setTotal]=useState(0); const [totalPages,setTotalPages]=useState(1);
  const [showMetrics,setShowMetrics]=useState(false);
  const [metricsJob,setMetricsJob]=useState(null);
  const [metrics,setMetrics]=useState(null);
  const [metricsLoading,setMetricsLoading]=useState(false);
  const [detailsTab,setDetailsTab]=useState<"metrics"|"details">("metrics");
  const [details,setDetails]=useState([]);
  const [detailsLoading,setDetailsLoading]=useState(false);

  const load=async(p=page)=>{
    try{const d=await(await fetch(`${API}/sending-jobs?page=${p}&page_size=10`,{headers:authH(token)})).json();setJobs(d.items||[]);setTotal(d.total||0);setTotalPages(d.total_pages||1);setPage(d.page||1);}catch{setJobs([]);}
  };
  useEffect(()=>{load(1);},[]);

  const openMetrics=async(job)=>{
    setMetricsJob(job);setMetrics(null);setDetails([]);setShowMetrics(true);setMetricsLoading(true);setDetailsTab("details");
    // 并行加载指标和明细
    try{
      const [mRes,dRes]=await Promise.all([
        fetch(`${API}/sending-jobs/${job.batch_id}/metrics`,{headers:authH(token)}),
        fetch(`${API}/sending-jobs/${job.batch_id}/details`,{headers:authH(token)}),
      ]);
      const mData=await mRes.json(); setMetrics(mData);
      const dData=await dRes.json(); setDetails(Array.isArray(dData)?dData:[]);
    }catch{setMetrics(null);setDetails([]);}
    finally{setMetricsLoading(false);}
  };

  const statusBadge=(s)=>{
    if(s==="success") return <Badge color="green">发送成功</Badge>;
    if(s==="partial") return <Badge color="orange">部分成功</Badge>;
    return <Badge color="red">发送失败</Badge>;
  };

  const metricCard=(label,value,rate,color)=>(
    <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{color}}>{value}</p>
      {rate!==undefined&&<p className="text-xs mt-1" style={{color}}>{rate}%</p>}
    </div>
  );

  // 邮件明细状态标签
  const sendStatusBadge=(s)=>{
    if(s==="Success") return <Badge color="green">已接受</Badge>;
    if(s==="MessageRejected") return <Badge color="red">被拒绝</Badge>;
    if(s==="Pending") return <Badge color="gray">等待中</Badge>;
    return <Badge color="orange">{s}</Badge>;
  };
  const deliveryBadge=(d)=>{
    if(!d) return <span className="text-xs text-gray-300">—</span>;
    if(d==="Delivery") return <Badge color="green">已送达</Badge>;
    if(d==="Sent") return <Badge color="blue">已发出</Badge>;
    if(d==="Bounce") return <Badge color="red">退信</Badge>;
    if(d==="Reject") return <Badge color="red">被拒绝</Badge>;
    return <Badge color="gray">{d}</Badge>;
  };

  return <>
    <Modal open={showMetrics} onClose={()=>setShowMetrics(false)} title={`批次详情 - ${metricsJob?.batch_id||""}`} width={960}>
      {metricsLoading?<div className="text-center py-12 text-gray-400">加载中...</div>:<div>
        {/* Tab 切换 */}
        <div className="flex gap-1 mb-4 border-b border-gray-100">
          {([["details","📋 邮件明细"],["metrics","📊 聚合指标"]] as const).map(([id,label])=>(
            <button key={id} onClick={()=>setDetailsTab(id)} className={`px-4 py-2 text-sm border-b-2 transition-all ${detailsTab===id?"border-indigo-500 text-indigo-600 font-medium":"border-transparent text-gray-400 hover:text-gray-600"}`}>{label}</button>
          ))}
        </div>

        {/* 基本信息 - 始终显示 */}
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div><span className="text-gray-400">模版：</span><span className="text-gray-800">{metricsJob?.template_name}</span></div>
          <div><span className="text-gray-400">客群：</span><span className="text-gray-800">{metricsJob?.group_name}</span></div>
          <div><span className="text-gray-400">发送邮箱：</span><span className="text-gray-800">{metricsJob?.source_email}</span></div>
          <div><span className="text-gray-400">发送时间：</span><span className="text-gray-800">{metricsJob?.created_at?new Date(metricsJob.created_at).toLocaleString():"-"}</span></div>
        </div>

        {/* 邮件明细 Tab */}
        {detailsTab==="details"&&(
          <div>
            {details.length>0?(
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">
                    {["收件人","发送状态","送达状态","打开","点击","送达时间","打开时间"].map(h=><th key={h} className="text-left text-xs font-medium text-gray-500 py-2.5 px-3 whitespace-nowrap">{h}</th>)}
                  </tr></thead>
                  <tbody>{details.map((d,i)=><tr key={d.id||i} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="py-2.5 px-3 text-sm text-gray-700 font-mono">{d.recipient}</td>
                    <td className="py-2.5 px-3">{sendStatusBadge(d.send_status)}</td>
                    <td className="py-2.5 px-3">
                      {deliveryBadge(d.delivery_status)}
                      {d.bounce_type&&<span className="ml-1 text-xs text-red-400">({d.bounce_type}{d.bounce_subtype?`/${d.bounce_subtype}`:""})</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">{d.open_count>0?<span className="text-green-600 font-medium">{d.open_count}次</span>:<span className="text-gray-300">—</span>}</td>
                    <td className="py-2.5 px-3 text-center">{d.click_count>0?<span className="text-blue-600 font-medium">{d.click_count}次</span>:<span className="text-gray-300">—</span>}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-400 whitespace-nowrap">{d.delivery_time?new Date(d.delivery_time).toLocaleString():"—"}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-400 whitespace-nowrap">{d.first_open_time?new Date(d.first_open_time).toLocaleString():"—"}</td>
                  </tr>)}</tbody>
                </table>
                {/* 汇总 */}
                <div className="bg-gray-50 px-3 py-2 flex gap-4 text-xs text-gray-500">
                  <span>共 {details.length} 封</span>
                  <span>已接受: {details.filter(d=>d.send_status==="Success").length}</span>
                  <span>已送达: {details.filter(d=>d.delivery_status==="Delivery").length}</span>
                  <span>退信: {details.filter(d=>d.delivery_status==="Bounce").length}</span>
                  <span>已打开: {details.filter(d=>d.open_count>0).length}</span>
                  <span>已点击: {details.filter(d=>d.click_count>0).length}</span>
                </div>
              </div>
            ):(
              <div className="text-center py-8 text-gray-400 text-sm">
                <p>暂无邮件明细数据</p>
                <p className="mt-1 text-xs">新发送的邮件会自动记录明细，历史邮件没有明细记录</p>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3">送达/打开/点击状态通过 SNS Webhook 实时更新。如未配置 SNS Event Destination，则只有"发送状态"列有数据。</p>
          </div>
        )}

        {/* 聚合指标 Tab */}
        {detailsTab==="metrics"&&(
          metrics?<div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {metricCard("发送数",metrics.send,undefined,"#3C50E0")}
              {metricCard("送达数",metrics.delivery,metrics.delivery_rate,"#10B981")}
              {metricCard("打开数",metrics.open,metrics.open_rate,"#8B5CF6")}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {metricCard("退信数",metrics.bounce,metrics.bounce_rate,"#EF4444")}
              {metricCard("投诉数",metrics.complaint,undefined,"#F59E0B")}
              {metricCard("点击数",metrics.click,undefined,"#3B82F6")}
              {metricCard("拒绝数",metrics.reject,undefined,"#6B7280")}
            </div>
            <div className="space-y-2">
              <div><div className="flex justify-between text-xs mb-1"><span className="text-gray-500">送达率</span><span className="font-medium" style={{color:"#10B981"}}>{metrics.delivery_rate}%</span></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${metrics.delivery_rate}%`,background:"#10B981"}}/></div></div>
              <div><div className="flex justify-between text-xs mb-1"><span className="text-gray-500">打开率</span><span className="font-medium" style={{color:"#8B5CF6"}}>{metrics.open_rate}%</span></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${metrics.open_rate}%`,background:"#8B5CF6"}}/></div></div>
              <div><div className="flex justify-between text-xs mb-1"><span className="text-gray-500">退信率</span><span className="font-medium" style={{color:"#EF4444"}}>{metrics.bounce_rate}%</span></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${metrics.bounce_rate}%`,background:"#EF4444"}}/></div></div>
            </div>
            <p className="text-xs text-gray-400">数据来源：AWS CloudWatch（指标可能有 5-15 分钟延迟）</p>
          </div>:<div className="text-center py-12 text-gray-400">暂无指标数据（需配置 Configuration Set 和 CloudWatch Event Destination）</div>
        )}
      </div>}
    </Modal>

    <Card title="发送历史" extra={<Btn variant="outline" size="sm" onClick={()=>load(1)}>刷新</Btn>}>
      <div className="overflow-x-auto"><table className="w-full">
        <thead><tr className="border-b border-gray-100">{["批次ID","模版","客群","发送邮箱","联系人数","状态","发送时间","操作"].map(h=><th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-3 whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{jobs.map(j=><tr key={j.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
          <td className="py-3 px-3 text-xs text-gray-500 font-mono">{j.batch_id}</td>
          <td className="py-3 px-3 text-sm text-gray-800">{j.template_name}</td>
          <td className="py-3 px-3 text-sm text-gray-800">{j.group_name}</td>
          <td className="py-3 px-3 text-sm text-gray-500">{j.source_email}</td>
          <td className="py-3 px-3 text-sm text-gray-600 text-center">{j.total_contacts}</td>
          <td className="py-3 px-3">{statusBadge(j.status)}</td>
          <td className="py-3 px-3 text-xs text-gray-400 whitespace-nowrap">{j.created_at?new Date(j.created_at).toLocaleString():"-"}</td>
          <td className="py-3 px-3"><Btn variant="primary" size="sm" onClick={()=>openMetrics(j)}>查看详情</Btn></td>
        </tr>)}</tbody>
      </table></div>
      {jobs.length===0&&<p className="text-center py-8 text-sm text-gray-400">暂无发送记录</p>}
      <Pager page={page} totalPages={totalPages} total={total} onPageChange={p=>load(p)}/>
    </Card>
  </>;
}

// ===== Email Details =====
function EmailDetails() {
  const {token}=useAuth();
  const [items,setItems]=useState([] as any[]);
  const [page,setPage]=useState(1);
  const [total,setTotal]=useState(0);
  const [totalPages,setTotalPages]=useState(1);
  const [loading,setLoading]=useState(false);

  // 搜索条件
  const [recipient,setRecipient]=useState("");
  const [batchId,setBatchId]=useState("");
  const [sendStatus,setSendStatus]=useState("");
  const [deliveryStatus,setDeliveryStatus]=useState("");

  const load=async(p=1)=>{
    setLoading(true);
    try{
      const params=new URLSearchParams({page:String(p),page_size:"20"});
      if(recipient)params.set("recipient",recipient);
      if(batchId)params.set("batch_id",batchId);
      if(sendStatus)params.set("send_status",sendStatus);
      if(deliveryStatus)params.set("delivery_status",deliveryStatus);
      const r=await fetch(`${API}/email-details?${params}`,{headers:authH(token)});
      const d=await r.json();
      setItems(d.items||[]);setTotal(d.total||0);setTotalPages(d.total_pages||1);setPage(p);
    }catch{}finally{setLoading(false);}
  };

  useEffect(()=>{load();},[]);

  const doSearch=()=>{load(1);};
  const doReset=()=>{setRecipient("");setBatchId("");setSendStatus("");setDeliveryStatus("");setTimeout(()=>load(1),0);};

  const sendBadge=(s:string)=>{
    if(s==="Success")return <Badge color="green">已接受</Badge>;
    if(s==="Pending")return <Badge color="gray">等待中</Badge>;
    if(s==="Failed"||s==="MessageRejected")return <Badge color="red">{s}</Badge>;
    return <Badge color="orange">{s||"—"}</Badge>;
  };
  const delivBadge=(s:string|null)=>{
    if(!s)return <span className="text-gray-300">—</span>;
    if(s==="Delivery")return <Badge color="green">已送达</Badge>;
    if(s==="Bounce")return <Badge color="red">退信</Badge>;
    if(s==="Reject")return <Badge color="red">拒绝</Badge>;
    if(s==="Sent")return <Badge color="blue">已发出</Badge>;
    return <Badge color="orange">{s}</Badge>;
  };
  const fmtTime=(t:string|null)=>t?new Date(t).toLocaleString():"—";

  return <>
    <Card title="邮件明细" extra={<Btn variant="secondary" size="sm" onClick={()=>load(page)}>刷新</Btn>}>
      {/* 搜索栏 */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">收件人</label>
          <Input placeholder="搜索收件人邮箱" value={recipient} onChange={(e:any)=>setRecipient(e.target.value)} onKeyDown={(e:any)=>e.key==="Enter"&&doSearch()}/>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">批次ID</label>
          <Input placeholder="搜索批次ID" value={batchId} onChange={(e:any)=>setBatchId(e.target.value)} onKeyDown={(e:any)=>e.key==="Enter"&&doSearch()}/>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">发送状态</label>
          <Select value={sendStatus} onChange={(e:any)=>setSendStatus(e.target.value)}>
            <option value="">全部</option>
            <option value="Success">已接受</option>
            <option value="Pending">等待中</option>
            <option value="Failed">失败</option>
            <option value="MessageRejected">被拒绝</option>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">送达状态</label>
          <Select value={deliveryStatus} onChange={(e:any)=>setDeliveryStatus(e.target.value)}>
            <option value="">全部</option>
            <option value="Delivery">已送达</option>
            <option value="Bounce">退信</option>
            <option value="Sent">已发出</option>
            <option value="Reject">拒绝</option>
          </Select>
        </div>
        <div className="flex gap-2">
          <Btn size="sm" onClick={doSearch} className="flex-1">搜索</Btn>
          <Btn variant="secondary" size="sm" onClick={doReset} className="flex-1">重置</Btn>
        </div>
      </div>

      {/* 统计 */}
      <div className="mb-3 flex items-center gap-4 text-xs text-gray-500">
        <span>共 <strong className="text-gray-800">{total}</strong> 封</span>
        {loading&&<span className="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"/>}
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
            <th className="py-2 px-3 font-medium">收件人</th>
            <th className="py-2 px-3 font-medium">批次ID</th>
            <th className="py-2 px-3 font-medium">模版</th>
            <th className="py-2 px-3 font-medium">客群</th>
            <th className="py-2 px-3 font-medium">发送状态</th>
            <th className="py-2 px-3 font-medium">送达状态</th>
            <th className="py-2 px-3 font-medium">打开</th>
            <th className="py-2 px-3 font-medium">点击</th>
            <th className="py-2 px-3 font-medium">送达时间</th>
            <th className="py-2 px-3 font-medium">打开时间</th>
          </tr></thead>
          <tbody>{items.map((d,i)=><tr key={d.id||i} className="border-b border-gray-50 hover:bg-gray-50 transition">
            <td className="py-2.5 px-3 font-mono text-xs">{d.recipient}</td>
            <td className="py-2.5 px-3"><span className="text-xs text-gray-400 font-mono">{d.batch_id?.slice(0,18)}</span></td>
            <td className="py-2.5 px-3 text-xs text-gray-600">{d.template_name||"—"}</td>
            <td className="py-2.5 px-3 text-xs text-gray-600">{d.group_name||"—"}</td>
            <td className="py-2.5 px-3">{sendBadge(d.send_status)}</td>
            <td className="py-2.5 px-3">{delivBadge(d.delivery_status)}</td>
            <td className="py-2.5 px-3 text-center">{d.open_count>0?<span className="text-green-600 font-medium">{d.open_count}次</span>:<span className="text-gray-300">—</span>}</td>
            <td className="py-2.5 px-3 text-center">{d.click_count>0?<span className="text-blue-600 font-medium">{d.click_count}次</span>:<span className="text-gray-300">—</span>}</td>
            <td className="py-2.5 px-3 text-xs text-gray-500">{fmtTime(d.delivery_time)}</td>
            <td className="py-2.5 px-3 text-xs text-gray-500">{fmtTime(d.first_open_time)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {items.length===0&&<p className="text-center py-8 text-sm text-gray-400">{loading?"加载中...":"暂无邮件明细"}</p>}
      <Pager page={page} totalPages={totalPages} total={total} onPageChange={p=>load(p)}/>
    </Card>
  </>;
}
