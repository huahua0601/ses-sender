"use client";
import React, { useState, useEffect } from "react";
import { API, authH, useAuth, useToast, useConfirm, Card, Badge, Btn, Input, Modal } from "../../components/shared";
import { useT } from "../../i18n";

export default function AdminUsers() {
  const {token}=useAuth(); const {toast}=useToast(); const t=useT();
  const [users,setUsers]=useState<any[]>([]);
  const [quotas,setQuotas]=useState<Record<number,number>>({});
  const [showCreate,setShowCreate]=useState(false);
  const [showEdit,setShowEdit]=useState(false);
  const [f,setF]=useState({username:"",display_name:"",password:"",email:"",is_admin:false,daily_send_limit:1000});
  const [editUser,setEditUser]=useState<any>(null);
  const [editEmail,setEditEmail]=useState("");
  const [editName,setEditName]=useState("");
  const [newPwd,setNewPwd]=useState("");
  const [editLimit,setEditLimit]=useState(1000);

  const load=async()=>{
    const [u,q]=await Promise.all([
      fetch(`${API}/admin/users`,{headers:authH(token)}).then(r=>r.json()),
      fetch(`${API}/admin/users/quotas`,{headers:authH(token)}).then(r=>r.json()).catch(()=>({})),
    ]);
    setUsers(Array.isArray(u)?u:[]);
    setQuotas(q||{});
  };
  useEffect(()=>{load();},[]);
  const create=async()=>{if(!f.username||!f.password||!f.email)return toast("warning",t("admin.users.fillComplete"));const r=await fetch(`${API}/admin/users`,{method:"POST",headers:authH(token),body:JSON.stringify(f)});if(r.ok){toast("success",t("admin.users.created"));setShowCreate(false);load();}else{const e=await r.json();toast("error",t("common.failed"),e.detail);}};
  const {confirm:cfm}=useConfirm();
  const toggle=async(u:any)=>{const action=u.is_active?t("admin.users.disable"):t("admin.users.enable");if(!await cfm(action,t("admin.users.enableConfirm",{action,name:u.username})))return;await fetch(`${API}/admin/users/${u.id}`,{method:"PUT",headers:authH(token),body:JSON.stringify({is_active:!u.is_active})});load();};

  const openEdit=(u:any)=>{setEditUser(u);setEditEmail(u.email||"");setEditName(u.display_name||"");setNewPwd("");setEditLimit(u.daily_send_limit||1000);setShowEdit(true);};
  const saveEdit=async()=>{
    const body:any={display_name:editName,email:editEmail,daily_send_limit:editLimit};
    if(newPwd) body.password=newPwd;
    const r=await fetch(`${API}/admin/users/${editUser.id}`,{method:"PUT",headers:authH(token),body:JSON.stringify(body)});
    if(r.ok){toast("success",t("admin.users.updated"));setShowEdit(false);load();}
    else{const e=await r.json();toast("error",t("admin.users.updateFailed"),e.detail);}
  };

  return <>
    <Modal open={showCreate} onClose={()=>setShowCreate(false)} title={t("admin.users.addTitle")} width={500}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">{t("admin.users.username")}</label><Input placeholder={t("admin.users.loginUsername")} value={f.username} onChange={(e:any)=>setF({...f,username:e.target.value})}/></div>
          <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">{t("admin.users.displayName")}</label><Input placeholder={t("admin.users.userDisplayName")} value={f.display_name} onChange={(e:any)=>setF({...f,display_name:e.target.value})}/></div>
          <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">{t("admin.users.password")}</label><Input type="password" placeholder={t("admin.users.loginPassword")} value={f.password} onChange={(e:any)=>setF({...f,password:e.target.value})}/></div>
          <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">{t("admin.users.sendEmail")}</label><Input placeholder="user@domain.com" value={f.email} onChange={(e:any)=>setF({...f,email:e.target.value})}/></div>
          <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">{t("admin.users.dailyLimit")}</label><Input type="number" placeholder="1000" value={f.daily_send_limit} onChange={(e:any)=>setF({...f,daily_send_limit:parseInt(e.target.value)||0})}/></div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" className="rounded" checked={f.is_admin} onChange={(e:any)=>setF({...f,is_admin:e.target.checked})}/>{t("admin.users.isAdmin")}</label>
        <div className="flex justify-end gap-2"><Btn variant="outline" onClick={()=>setShowCreate(false)}>{t("common.cancel")}</Btn><Btn variant="success" onClick={create}>{t("admin.users.createBtn")}</Btn></div>
      </div>
    </Modal>

    <Modal open={showEdit} onClose={()=>setShowEdit(false)} title={t("admin.users.editTitle",{name:editUser?.username})} width={460}>
      <div className="space-y-4">
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">{t("admin.users.username.label")}</label><Input value={editUser?.username||""} disabled className="bg-gray-50 opacity-60"/></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">{t("admin.users.displayName")}</label><Input value={editName} onChange={(e:any)=>setEditName(e.target.value)}/></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">{t("admin.users.sendEmail.label")}</label><Input placeholder="user@domain.com" value={editEmail} onChange={(e:any)=>setEditEmail(e.target.value)}/></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">{t("admin.users.dailyLimit")}</label><Input type="number" value={editLimit} onChange={(e:any)=>setEditLimit(parseInt(e.target.value)||0)}/><p className="text-xs text-gray-400 mt-1">{t("admin.users.dailyLimitHint")}</p></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">{t("admin.users.resetPassword")}</label><Input type="password" placeholder={t("admin.users.resetPasswordHint")} value={newPwd} onChange={(e:any)=>setNewPwd(e.target.value)}/><p className="text-xs text-gray-400 mt-1">{t("admin.users.resetPasswordHint")}</p></div>
        <div className="flex justify-end gap-2"><Btn variant="outline" onClick={()=>setShowEdit(false)}>{t("common.cancel")}</Btn><Btn onClick={saveEdit}>{t("admin.users.saveChanges")}</Btn></div>
      </div>
    </Modal>

    <Card title={t("admin.users.title")} extra={<Btn size="sm" onClick={()=>{setF({username:"",display_name:"",password:"",email:"",is_admin:false,daily_send_limit:1000});setShowCreate(true);}}>{t("admin.users.add")}</Btn>}>
      <div className="overflow-x-auto"><table className="w-full">
        <thead><tr className="border-b border-gray-100">{[t("admin.users.username.label"),t("admin.users.displayName.label"),t("admin.users.sendEmail.label"),t("admin.users.dailyLimit.label"),t("admin.users.role.label"),t("admin.users.status.label"),t("admin.users.actions.label")].map(h=><th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">{h}</th>)}</tr></thead>
        <tbody>{users.map((u:any)=><tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
          <td className="py-3 px-4 text-sm font-medium text-gray-800">{u.username}</td>
          <td className="py-3 px-4 text-sm text-gray-600">{u.display_name}</td>
          <td className="py-3 px-4 text-sm text-gray-500">{u.email||"-"}</td>
          <td className="py-3 px-4" style={{minWidth:160}}>
            {(()=>{
              const limit=u.daily_send_limit||1000;
              const sent=quotas[u.id]||0;
              const pct=limit>0?Math.min(100,sent/limit*100):0;
              const color=pct>=100?"#EF4444":pct>=80?"#F59E0B":"#10B981";
              return <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{color}} className="font-medium">{sent}/{limit}</span>
                  <span className="text-gray-400">{pct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:color}}/>
                </div>
              </div>;
            })()}
          </td>
          <td className="py-3 px-4"><Badge color={u.is_admin?"red":"blue"}>{u.is_admin?t("admin.users.roleAdmin"):t("admin.users.roleUser")}</Badge></td>
          <td className="py-3 px-4"><Badge color={u.is_active?"green":"gray"}>{u.is_active?t("admin.users.statusEnabled"):t("admin.users.statusDisabled")}</Badge></td>
          <td className="py-3 px-4 flex gap-1">
            <Btn variant="primary" size="sm" onClick={()=>openEdit(u)}>{t("common.edit")}</Btn>
            <Btn variant={u.is_active?"warning":"success"} size="sm" onClick={()=>toggle(u)}>{u.is_active?t("admin.users.disable"):t("admin.users.enable")}</Btn>
          </td>
        </tr>)}</tbody>
      </table></div>
    </Card>
  </>;
}
