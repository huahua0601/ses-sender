"use client";
import React, { useState, useEffect, useRef } from "react";
import { API, authH, useAuth, useToast, Card, Badge, Btn, Select } from "../../components/shared";

export default function UserSend() {
  const {token,user}=useAuth(); const {toast}=useToast();
  const [ts,setTs]=useState<any[]>([]); const [gs,setGs]=useState<any[]>([]); const [f,setF]=useState({templateId:"",groupId:""}); const [ld,setLd]=useState(false);
  const [progress,setProgress]=useState<any>(null);
  const pollRef=useRef<any>(null);

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
      <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">邮件模版</label><Select value={f.templateId} onChange={(e:any)=>setF({...f,templateId:e.target.value})}><option value="">选择邮件模版</option>{ts.map((t:any)=><option key={t.id} value={t.id}>{t.name} - {t.subject}</option>)}</Select></div>
      <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">目标客群</label><Select value={f.groupId} onChange={(e:any)=>setF({...f,groupId:e.target.value})}><option value="">选择目标客群</option>{gs.map((g:any)=><option key={g.id} value={g.id}>{g.name}</option>)}</Select></div>
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
