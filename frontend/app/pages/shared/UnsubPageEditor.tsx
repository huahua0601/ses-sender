"use client";
import React, { useState } from "react";
import { Card, Btn, Input } from "../../components/shared";

const DEFAULT_REASONS = [
  {value:"too_frequent",label:"收到邮件太频繁"},
  {value:"not_relevant",label:"内容与我无关"},
  {value:"never_subscribed",label:"我从未订阅过"},
  {value:"prefer_other",label:"我更喜欢其他渠道获取信息"},
  {value:"other",label:"其他原因"},
];

export { DEFAULT_REASONS };

type UnsubForm = {title:string;subtitle:string;success:string;logo:string;color:string;reasons:{value:string;label:string}[]};

export default function UnsubPageEditor({f,setF,onSave,saving,senderEmail,title,description}:{
  f:UnsubForm;setF:(f:UnsubForm)=>void;onSave:()=>void;saving:boolean;senderEmail?:string;title?:string;description?:string;
}) {
  const addReason=()=>setF({...f,reasons:[...f.reasons,{value:`reason_${Date.now()}`,label:""}]});
  const removeReason=(idx:number)=>setF({...f,reasons:f.reasons.filter((_,i)=>i!==idx)});

  const previewHtml=()=>{
    const c=f.color||"#667eea";
    const logo=f.logo?`<img src="${f.logo}" alt="Logo" style="max-height:48px;margin-bottom:16px;">`:"";
    const reasons=f.reasons.map(r=>`<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border:2px solid #e5e7eb;border-radius:10px;margin-bottom:8px"><input type="radio" name="r" style="accent-color:${c};width:16px;height:16px"><label style="font-size:14px;color:#374151">${r.label||"(未填写)"}</label></div>`).join("");
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100%;background:linear-gradient(135deg,${c} 0%,${c}cc 100%);padding:20px}
.card{background:#fff;border-radius:20px;padding:32px;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.15)}
h1{font-size:20px;color:#1f2937;margin-bottom:6px}.sub{color:#6b7280;font-size:13px;margin-bottom:20px;line-height:1.5}
.info{background:#f3f4f6;border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:12px;color:#4b5563}.info strong{color:#111827}
h3{font-size:13px;color:#374151;margin-bottom:10px}
.btn{width:100%;padding:12px;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;background:#ef4444;color:#fff;margin-top:16px}
</style></head><body><div class="card">
${logo}<h1>${f.title||"退订确认"}</h1>
<p class="sub">${f.subtitle||"我们很遗憾看到您离开。"}</p>
<div class="info">退订邮箱：<strong>user@example.com</strong><br>发送方：<strong>${senderEmail||"sender@example.com"}</strong></div>
<h3>退订原因（可选）</h3>${reasons}
<button class="btn">确认退订</button>
</div></body></html>`;
  };

  return <div className="flex gap-6">
    <div className="w-1/2 min-w-0">
      <Card title={title||"退订页面配置"}>
        <div className="space-y-4">
          {description&&<p className="text-xs text-gray-400">{description}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-700 mb-1 block">页面标题</label><Input value={f.title} onChange={(e:any)=>setF({...f,title:e.target.value})} placeholder="退订确认"/></div>
            <div><label className="text-xs font-medium text-gray-700 mb-1 block">成功提示</label><Input value={f.success} onChange={(e:any)=>setF({...f,success:e.target.value})} placeholder="退订成功"/></div>
          </div>
          <div><label className="text-xs font-medium text-gray-700 mb-1 block">页面描述</label><Input value={f.subtitle} onChange={(e:any)=>setF({...f,subtitle:e.target.value})} placeholder="我们很遗憾看到您离开..."/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-700 mb-1 block">品牌颜色</label>
              <div className="flex gap-2 items-center"><input type="color" value={f.color||"#667eea"} onChange={(e:any)=>setF({...f,color:e.target.value})} className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer"/><Input value={f.color} onChange={(e:any)=>setF({...f,color:e.target.value})} placeholder="#667eea" className="flex-1"/></div>
            </div>
            <div><label className="text-xs font-medium text-gray-700 mb-1 block">Logo URL</label><Input value={f.logo} onChange={(e:any)=>setF({...f,logo:e.target.value})} placeholder="https://..."/></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2"><label className="text-xs font-medium text-gray-700">退订原因选项</label><button onClick={addReason} className="text-xs text-indigo-600 hover:text-indigo-800">+ 添加</button></div>
            <div className="space-y-1.5">{f.reasons.map((r,i)=><div key={i} className="flex gap-2 items-center">
              <span className="text-xs text-gray-400 w-5 text-center">{i+1}</span>
              <Input value={r.label} onChange={(e:any)=>{const nr=[...f.reasons];nr[i]={value:r.value||`reason_${i}`,label:e.target.value};setF({...f,reasons:nr});}} placeholder="退订原因选项文本" className="flex-1"/>
              <button onClick={()=>removeReason(i)} className="text-red-400 hover:text-red-600 text-lg px-1">×</button>
            </div>)}</div>
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <Btn onClick={onSave} disabled={saving}>{saving?"保存中...":"保存配置"}</Btn>
          </div>
        </div>
      </Card>
    </div>
    <div className="w-1/2 flex-shrink-0">
      <Card title="页面预览">
        <div className="border border-gray-200 rounded-xl overflow-hidden" style={{height:560}}>
          <iframe srcDoc={previewHtml()} className="w-full h-full border-0" title="退订页面预览" sandbox="allow-same-origin"/>
        </div>
      </Card>
    </div>
  </div>;
}
