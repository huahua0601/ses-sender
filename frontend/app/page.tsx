"use client";
import React, { useState, useEffect, createContext, useContext, useCallback } from "react";

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
const ConfirmCtx = createContext<{confirm:(t:string,m:string)=>Promise<boolean>}>({confirm:async()=>false});
const useConfirm = () => useContext(ConfirmCtx);

function ConfirmProvider({children}:{children:React.ReactNode}) {
  const [s,setS]=useState({open:false,title:"",msg:""}); const ref=React.useRef<(v:boolean)=>void>();
  const confirm=useCallback((title:string,msg:string):Promise<boolean>=>new Promise(r=>{ref.current=r;setS({open:true,title,msg});}),[]);
  const yes=()=>{ref.current?.(true);setS(s=>({...s,open:false}));}; const no=()=>{ref.current?.(false);setS(s=>({...s,open:false}));};
  return <ConfirmCtx.Provider value={{confirm}}>{children}
    {s.open&&<div className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/50" onClick={no}/>
      <div className="relative bg-white rounded-2xl shadow-2xl animate-scale-in" style={{width:420,maxWidth:"90vw"}}>
        <div className="p-6"><h3 className="text-lg font-bold text-gray-800">{s.title}</h3><p className="text-sm text-gray-500 mt-2 whitespace-pre-line">{s.msg}</p></div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={no} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">取消</button>
          <button onClick={yes} className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600">确认删除</button>
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
function LoginPage({onLogin}) {
  const [u,setU]=useState("");const [p,setP]=useState("");const [err,setErr]=useState("");const [ld,setLd]=useState(false);
  const go=async(e)=>{e.preventDefault();setErr("");setLd(true);try{await onLogin(u,p);}catch(e){setErr(e.message);}finally{setLd(false);}};
  return <div className="min-h-screen flex items-center justify-center" style={{background:"linear-gradient(135deg,#3C50E0 0%,#6366F1 50%,#8B5CF6 100%)"}}>
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full" style={{maxWidth:400}}>
      <div className="text-center mb-8"><div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-3"><span className="text-white text-xl font-bold">S</span></div><h1 className="text-2xl font-bold text-gray-800">SES Sender</h1><p className="text-gray-400 text-sm mt-1">邮件批量发送管理平台</p></div>
      <form onSubmit={go} className="space-y-4">
        {err&&<div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">{err}</div>}
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">用户名</label><input className="w-full h-11 px-4 border border-gray-200 rounded-lg text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" value={u} onChange={e=>setU(e.target.value)}/></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">密码</label><input type="password" className="w-full h-11 px-4 border border-gray-200 rounded-lg text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" value={p} onChange={e=>setP(e.target.value)}/></div>
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
  const [tab,setTab]=useState("users");
  return <div className="min-h-screen flex">
    <Sidebar menus={[{id:"users",icon:"👤",label:"用户管理"},{id:"identities",icon:"🔐",label:"发送实体"},{id:"templates",icon:"📋",label:"邮件模版"},{id:"test",icon:"📧",label:"测试邮件"}]} active={tab} setActive={setTab}/>
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 flex items-center px-6 bg-white border-b border-gray-100 shadow-sm flex-shrink-0"><h2 className="text-lg font-semibold text-gray-800">{{users:"用户管理",identities:"发送实体",templates:"邮件模版",test:"测试邮件"}[tab]}</h2></header>
      <main className="flex-1 p-6 overflow-auto">{tab==="users"&&<AdminUsers/>}{tab==="identities"&&<AdminIdentities/>}{tab==="templates"&&<AdminTemplates/>}{tab==="test"&&<AdminTestEmail/>}</main>
    </div>
  </div>;
}

function UserApp() {
  const [tab,setTab]=useState("groups");
  return <div className="min-h-screen flex">
    <Sidebar menus={[{id:"groups",icon:"📁",label:"客群管理"},{id:"templates",icon:"📋",label:"邮件模版"},{id:"send",icon:"🚀",label:"批量发送"}]} active={tab} setActive={setTab}/>
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 flex items-center px-6 bg-white border-b border-gray-100 shadow-sm flex-shrink-0"><h2 className="text-lg font-semibold text-gray-800">{{groups:"客群管理",templates:"邮件模版",send:"批量发送"}[tab]}</h2></header>
      <main className="flex-1 p-6 overflow-auto">{tab==="groups"&&<UserGroups/>}{tab==="templates"&&<UserTemplates/>}{tab==="send"&&<UserSend/>}</main>
    </div>
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
  const toggle=async(u)=>{await fetch(`${API}/admin/users/${u.id}`,{method:"PUT",headers:authH(token),body:JSON.stringify({is_active:!u.is_active})});load();};

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
  const load=async()=>{const d=await(await fetch(`${API}/admin/identities`,{headers:authH(token)})).json();setList(Array.isArray(d)?d:[]);}; useEffect(()=>{load();},[]);
  const ve=async()=>{if(!ne)return;const r=await fetch(`${API}/admin/identities/verify-email?email=${ne}`,{method:"POST",headers:authH(token)});if(r.ok){toast("success","验证邮件已发送",ne);setNe("");load();}else{const e=await r.json();toast("error","失败",e.detail);}};
  const vd=async()=>{if(!nd)return;const r=await fetch(`${API}/admin/identities/verify-domain?domain=${nd}`,{method:"POST",headers:authH(token)});const d=await r.json();if(r.ok){toast("info","请添加 TXT 记录",`_amazonses.${nd} -> ${d.token}`);setNd("");load();}else toast("error","失败",d.detail);};

  return <Card title="发送实体管理">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div className="flex gap-2"><Input placeholder="邮箱地址" value={ne} onChange={e=>setNe(e.target.value)}/><Btn onClick={ve} className="flex-shrink-0">验证邮箱</Btn></div>
      <div className="flex gap-2"><Input placeholder="域名 (example.com)" value={nd} onChange={e=>setNd(e.target.value)}/><Btn variant="success" onClick={vd} className="flex-shrink-0">验证域名</Btn></div>
    </div>
    <div className="overflow-x-auto"><table className="w-full">
      <thead><tr className="border-b border-gray-100">{["实体名称","类型","验证状态"].map(h=><th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">{h}</th>)}</tr></thead>
      <tbody>{list.map(i=><tr key={i.identity} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
        <td className="py-3 px-4 text-sm font-medium text-gray-800">{i.identity}</td>
        <td className="py-3 px-4 text-sm text-gray-500">{i.type==="EmailAddress"?"邮箱":"域名"}</td>
        <td className="py-3 px-4"><Badge color={i.verification_status==="Success"?"green":"orange"}>{i.verification_status==="Success"?"已验证":"验证中"}</Badge></td>
      </tr>)}</tbody>
    </table></div>
  </Card>;
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
  const delG=async(id)=>{if(!await cfm("删除客群","将删除此客群及其所有联系人，不可恢复。"))return;await fetch(`${API}/groups/${id}`,{method:"DELETE",headers:authH(token)});if(sel===id){setSel(null);setCs([]);}loadG(gP,gS);};

  const updR=(i,f,v)=>{const r=[...rows];r[i][f]=v;setRows(r);};
  const addR=()=>setRows([...rows,{name:"",email:""}]);
  const rmR=(i)=>{if(rows.length>1)setRows(rows.filter((_,j)=>j!==i));};
  const saveC=async()=>{const v=rows.filter(r=>r.email.trim());if(!v.length)return toast("warning","请至少填写一个邮箱");for(const r of v)await fetch(`${API}/contacts`,{method:"POST",headers:authH(token),body:JSON.stringify({name:r.name.trim(),email:r.email.trim(),group_id:sel})});toast("success",`已添加 ${v.length} 个联系人`);setRows([{name:"",email:""}]);setShowAddContact(false);loadC(sel,cP,cS);loadG(gP,gS);};
  const delC=async(id)=>{await fetch(`${API}/contacts/${id}`,{method:"DELETE",headers:authH(token)});loadC(sel,cP,cS);loadG(gP,gS);};

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
            <Btn variant="danger" size="sm" onClick={e=>{e.stopPropagation();delG(g.id);}}>删除</Btn>
          </div>
        </div>)}{gs.length===0&&<p className="text-center py-8 text-sm text-gray-400">暂无客群</p>}</div>
        <Pager page={gP} totalPages={gTP} total={gT} onPageChange={p=>loadG(p,gS)}/>
      </Card>

      {/* 右：联系人 */}
      <div className="lg:col-span-2"><Card title={sel?`联系人管理`:"请选择一个客群"} extra={sel&&<div className="flex gap-2">
        <Btn variant="outline" size="sm" onClick={dlTpl}>下载模版</Btn>
        <label><Btn variant="outline" size="sm" className="cursor-pointer">Excel导入</Btn><input type="file" accept=".xlsx,.xls" className="hidden" onChange={ulCs}/></label>
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
              <td className="py-3 px-4"><Btn variant="danger" size="sm" onClick={()=>delC(c.id)}>删除</Btn></td>
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

  const load=async()=>{const d=await(await fetch(`${API}${apiPrefix}`,{headers:authH(token)})).json();setList(Array.isArray(d)?d:[]);}; useEffect(()=>{load();},[]);

  const create=async()=>{
    if(!f.name||!f.subject||!f.html_body)return toast("warning","请填写完整");
    const r=await fetch(`${API}${apiPrefix}`,{method:"POST",headers:authH(token),body:JSON.stringify(f)});
    if(r.ok){toast("success","模版创建成功");setShowCreate(false);load();}
    else{const e=await r.json();toast("error","失败",e.detail);}
  };

  const openEdit=(t)=>{setEditId(t.id);setF({name:t.name,subject:t.subject,html_body:t.html_body});setShowEdit(true);};

  const update=async()=>{
    if(!f.subject||!f.html_body)return toast("warning","请填写完整");
    const r=await fetch(`${API}${apiPrefix}/${editId}`,{method:"PUT",headers:authH(token),body:JSON.stringify({subject:f.subject,html_body:f.html_body})});
    if(r.ok){toast("success","模版已更新");setShowEdit(false);load();}
    else{const e=await r.json();toast("error","更新失败",e.detail);}
  };

  const del=async(t)=>{if(!await cfm("删除模版",`确定删除「${t.name}」？不可恢复。`))return;const r=await fetch(`${API}${apiPrefix}/${t.id}`,{method:"DELETE",headers:authH(token)});if(r.ok){toast("success","已删除");load();}else{const e=await r.json();toast("error","失败",e.detail);}};

  return <>
    {/* 新建弹框 */}
    <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="新建邮件模版" width={580}>
      <div className="space-y-4">
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">模版名称</label><Input placeholder="输入模版名称" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">邮件主题</label><Input placeholder="支持 {{name}} 变量" value={f.subject} onChange={e=>setF({...f,subject:e.target.value})}/></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">HTML 内容</label><Textarea placeholder="邮件正文 HTML" value={f.html_body} onChange={e=>setF({...f,html_body:e.target.value})}/></div>
        <div className="flex justify-end gap-2"><Btn variant="outline" onClick={()=>setShowCreate(false)}>取消</Btn><Btn variant="success" onClick={create}>保存模版</Btn></div>
      </div>
    </Modal>

    {/* 编辑弹框 */}
    <Modal open={showEdit} onClose={()=>setShowEdit(false)} title={`编辑模版 - ${f.name}`} width={580}>
      <div className="space-y-4">
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">模版名称</label><Input value={f.name} disabled className="bg-gray-50 opacity-60"/></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">邮件主题</label><Input placeholder="支持 {{name}} 变量" value={f.subject} onChange={e=>setF({...f,subject:e.target.value})}/></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">HTML 内容</label><Textarea placeholder="邮件正文 HTML" value={f.html_body} onChange={e=>setF({...f,html_body:e.target.value})}/></div>
        <div className="flex justify-end gap-2"><Btn variant="outline" onClick={()=>setShowEdit(false)}>取消</Btn><Btn onClick={update}>保存修改</Btn></div>
      </div>
    </Modal>

    <Card title="邮件模版" extra={<Btn size="sm" onClick={()=>{setF({name:"",subject:"",html_body:""});setShowCreate(true);}}>+ 新建模版</Btn>}>
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
  useEffect(()=>{Promise.all([fetch(`${API}/user/templates`,{headers:authH(token)}).then(r=>r.json()),fetch(`${API}/groups`,{headers:authH(token)}).then(r=>r.json())]).then(([t,g])=>{setTs(Array.isArray(t)?t:[]);setGs(Array.isArray(g?.items)?g.items:Array.isArray(g)?g:[]);});},[]);
  const send=async()=>{if(!f.templateId||!f.groupId)return toast("warning","请选择模版和客群");if(!user.email)return toast("warning","发送邮箱未配置","请联系管理员");setLd(true);try{const r=await fetch(`${API}/send-bulk`,{method:"POST",headers:authH(token),body:JSON.stringify({TemplateId:parseInt(f.templateId),GroupId:parseInt(f.groupId)})});const d=await r.json();if(r.ok)toast("success","发送成功",`邮箱: ${d.source}\n批次: ${d.batches}\n人数: ${d.total_contacts}`);else toast("error","失败",d.detail);}catch{toast("error","网络错误");}finally{setLd(false);}};

  return <div style={{maxWidth:640}}><Card title="批量发送邮件">
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4"><span className="text-sm text-indigo-700">发送邮箱：<strong>{user.email||"未配置（请联系管理员）"}</strong></span></div>
      <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">邮件模版</label><Select value={f.templateId} onChange={e=>setF({...f,templateId:e.target.value})}><option value="">选择邮件模版</option>{ts.map(t=><option key={t.id} value={t.id}>{t.name} - {t.subject}</option>)}</Select></div>
      <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">目标客群</label><Select value={f.groupId} onChange={e=>setF({...f,groupId:e.target.value})}><option value="">选择目标客群</option>{gs.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</Select></div>
      <Btn onClick={send} disabled={ld||!user.email} className="w-full" size="lg">{ld?"发送中...":"开始批量发送"}</Btn>
    </div>
  </Card></div>;
}
