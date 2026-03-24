"use client";
import React, { useState, useEffect } from "react";
import { API, authH, useAuth, useToast, Card, Badge, Btn, Input, Select, Textarea } from "../../components/shared";

export default function AdminTestEmail() {
  const {token}=useAuth(); const {toast}=useToast();
  const [ids,setIds]=useState<any[]>([]); const [f,setF]=useState({source:"",to:"",subject:"",html_body:""}); const [ld,setLd]=useState(false);
  useEffect(()=>{fetch(`${API}/admin/identities`,{headers:authH(token)}).then(r=>r.json()).then(d=>setIds(Array.isArray(d)?d.filter((x:any)=>x.verification_status==="Success"):[]));} ,[]);
  const send=async()=>{if(!f.source||!f.to||!f.subject||!f.html_body)return toast("warning","请填写完整");setLd(true);try{const r=await fetch(`${API}/admin/test-email`,{method:"POST",headers:authH(token),body:JSON.stringify(f)});const d=await r.json();if(r.ok)toast("success","发送成功",`MessageId: ${d.message_id}`);else toast("error","失败",d.detail);}catch{toast("error","网络错误");}finally{setLd(false);}};

  return <div style={{maxWidth:640}}><Card title="发送测试邮件">
    <div className="space-y-4">
      <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">发送者</label>
        <div className="flex gap-2"><Select style={{flex:1}} onChange={(e:any)=>{if(e.target.value)setF({...f,source:e.target.value});}}><option value="">从已验证实体选择...</option>{ids.map((i:any)=><option key={i.identity} value={i.identity}>{i.identity}</option>)}</Select><Input style={{flex:1}} placeholder="或手动输入" value={f.source} onChange={(e:any)=>setF({...f,source:e.target.value})}/></div>
        <p className="text-xs text-gray-400 mt-1">域名验证后可使用 user@yourdomain.com</p></div>
      <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">收件人</label><Input placeholder="收件人邮箱" value={f.to} onChange={(e:any)=>setF({...f,to:e.target.value})}/></div>
      <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">主题</label><Input placeholder="邮件主题" value={f.subject} onChange={(e:any)=>setF({...f,subject:e.target.value})}/></div>
      <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">内容</label><Textarea placeholder="HTML 内容" value={f.html_body} onChange={(e:any)=>setF({...f,html_body:e.target.value})}/></div>
      <Btn onClick={send} disabled={ld} className="w-full" size="lg">{ld?"发送中...":"发送测试邮件"}</Btn>
    </div>
  </Card></div>;
}
