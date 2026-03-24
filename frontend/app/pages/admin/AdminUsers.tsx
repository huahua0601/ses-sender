"use client";
import React, { useState, useEffect } from "react";
import { API, authH, useAuth, useToast, useConfirm, Card, Badge, Btn, Input, Modal } from "../../components/shared";

export default function AdminUsers() {
  const {token}=useAuth(); const {toast}=useToast();
  const [users,setUsers]=useState<any[]>([]);
  const [showCreate,setShowCreate]=useState(false);
  const [showEdit,setShowEdit]=useState(false);
  const [f,setF]=useState({username:"",display_name:"",password:"",email:"",is_admin:false});
  const [editUser,setEditUser]=useState<any>(null);
  const [editEmail,setEditEmail]=useState("");
  const [editName,setEditName]=useState("");
  const [newPwd,setNewPwd]=useState("");

  const load=async()=>{setUsers(await(await fetch(`${API}/admin/users`,{headers:authH(token)})).json());}; useEffect(()=>{load();},[]);
  const create=async()=>{if(!f.username||!f.password||!f.email)return toast("warning","请填写完整信息");const r=await fetch(`${API}/admin/users`,{method:"POST",headers:authH(token),body:JSON.stringify(f)});if(r.ok){toast("success","用户创建成功");setShowCreate(false);load();}else{const e=await r.json();toast("error","失败",e.detail);}};
  const {confirm:cfm}=useConfirm();
  const toggle=async(u:any)=>{const action=u.is_active?"禁用":"启用";if(!await cfm(`${action}用户`,`确定${action}用户「${u.username}」？`))return;await fetch(`${API}/admin/users/${u.id}`,{method:"PUT",headers:authH(token),body:JSON.stringify({is_active:!u.is_active})});load();};

  const openEdit=(u:any)=>{setEditUser(u);setEditEmail(u.email||"");setEditName(u.display_name||"");setNewPwd("");setShowEdit(true);};
  const saveEdit=async()=>{
    const body:any={display_name:editName,email:editEmail};
    if(newPwd) body.password=newPwd;
    const r=await fetch(`${API}/admin/users/${editUser.id}`,{method:"PUT",headers:authH(token),body:JSON.stringify(body)});
    if(r.ok){toast("success","用户信息已更新");setShowEdit(false);load();}
    else{const e=await r.json();toast("error","更新失败",e.detail);}
  };

  return <>
    <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="添加用户" width={500}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">用户名 *</label><Input placeholder="登录用户名" value={f.username} onChange={(e:any)=>setF({...f,username:e.target.value})}/></div>
          <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">显示名称</label><Input placeholder="用户显示名称" value={f.display_name} onChange={(e:any)=>setF({...f,display_name:e.target.value})}/></div>
          <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">密码 *</label><Input type="password" placeholder="登录密码" value={f.password} onChange={(e:any)=>setF({...f,password:e.target.value})}/></div>
          <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">发送邮箱 *</label><Input placeholder="user@domain.com" value={f.email} onChange={(e:any)=>setF({...f,email:e.target.value})}/></div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" className="rounded" checked={f.is_admin} onChange={(e:any)=>setF({...f,is_admin:e.target.checked})}/>管理员权限</label>
        <div className="flex justify-end gap-2"><Btn variant="outline" onClick={()=>setShowCreate(false)}>取消</Btn><Btn variant="success" onClick={create}>创建用户</Btn></div>
      </div>
    </Modal>

    <Modal open={showEdit} onClose={()=>setShowEdit(false)} title={`编辑用户 - ${editUser?.username}`} width={460}>
      <div className="space-y-4">
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">用户名</label><Input value={editUser?.username||""} disabled className="bg-gray-50 opacity-60"/></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">显示名称</label><Input value={editName} onChange={(e:any)=>setEditName(e.target.value)}/></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">发送邮箱</label><Input placeholder="user@domain.com" value={editEmail} onChange={(e:any)=>setEditEmail(e.target.value)}/></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">重置密码</label><Input type="password" placeholder="留空则不修改密码" value={newPwd} onChange={(e:any)=>setNewPwd(e.target.value)}/><p className="text-xs text-gray-400 mt-1">不填写则保持原密码不变</p></div>
        <div className="flex justify-end gap-2"><Btn variant="outline" onClick={()=>setShowEdit(false)}>取消</Btn><Btn onClick={saveEdit}>保存修改</Btn></div>
      </div>
    </Modal>

    <Card title="用户列表" extra={<Btn size="sm" onClick={()=>{setF({username:"",display_name:"",password:"",email:"",is_admin:false});setShowCreate(true);}}>+ 添加用户</Btn>}>
      <div className="overflow-x-auto"><table className="w-full">
        <thead><tr className="border-b border-gray-100">{["用户名","显示名称","发送邮箱","角色","状态","操作"].map(h=><th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">{h}</th>)}</tr></thead>
        <tbody>{users.map((u:any)=><tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
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
