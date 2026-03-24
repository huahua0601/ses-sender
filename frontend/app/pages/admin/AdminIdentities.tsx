"use client";
import React, { useState, useEffect } from "react";
import { API, authH, useAuth, useToast, Card, Badge, Btn, Input } from "../../components/shared";

export default function AdminIdentities() {
  const {token}=useAuth(); const {toast}=useToast();
  const [list,setList]=useState<any[]>([]); const [ne,setNe]=useState(""); const [nd,setNd]=useState("");
  const [rep,setRep]=useState<any>(null);

  const load=async()=>{const d=await(await fetch(`${API}/admin/identities`,{headers:authH(token)})).json();setList(Array.isArray(d)?d:[]);};
  const loadRep=async()=>{try{setRep(await(await fetch(`${API}/admin/identities/reputation`,{headers:authH(token)})).json());}catch{}};
  useEffect(()=>{load();loadRep();},[]);

  const ve=async()=>{if(!ne)return;const r=await fetch(`${API}/admin/identities/verify-email?email=${ne}`,{method:"POST",headers:authH(token)});if(r.ok){toast("success","验证邮件已发送",ne);setNe("");load();}else{const e=await r.json();toast("error","失败",e.detail);}};
  const vd=async()=>{if(!nd)return;const r=await fetch(`${API}/admin/identities/verify-domain?domain=${nd}`,{method:"POST",headers:authH(token)});const d=await r.json();if(r.ok){toast("info","请添加 TXT 记录",`_amazonses.${nd} -> ${d.token}`);setNd("");load();}else toast("error","失败",d.detail);};

  const repCard=(label:string,value:any,sub:string,color:string)=>(
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-bold mt-1" style={{color}}>{value}</p>
      {sub&&<p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );

  return <div className="space-y-6">
    {rep&&<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {repCard("账户状态", rep.enforcement_status, rep.production_access?"生产模式":"沙箱模式", rep.enforcement_status==="HEALTHY"?"#10B981":"#EF4444")}
      {repCard("24h 已发送", `${rep.sent_last_24h} / ${rep.max_24h_send}`, `发送速率 ${rep.max_send_rate}/秒`, "#3C50E0")}
      {repCard("退信率", rep.bounce_rate+"%", "近 7 天平均（<5% 为健康）", rep.bounce_rate<5?"#10B981":"#EF4444")}
      {repCard("投诉率", rep.complaint_rate+"%", "近 7 天平均（<0.1% 为健康）", rep.complaint_rate<0.1?"#10B981":"#EF4444")}
    </div>}

    <Card title="发送实体管理" extra={<Btn variant="outline" size="sm" onClick={()=>{load();loadRep();}}>刷新</Btn>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="flex gap-2"><Input placeholder="邮箱地址" value={ne} onChange={(e:any)=>setNe(e.target.value)}/><Btn onClick={ve} className="flex-shrink-0">验证邮箱</Btn></div>
        <div className="flex gap-2"><Input placeholder="域名 (example.com)" value={nd} onChange={(e:any)=>setNd(e.target.value)}/><Btn variant="success" onClick={vd} className="flex-shrink-0">验证域名</Btn></div>
      </div>
      <div className="overflow-x-auto"><table className="w-full">
        <thead><tr className="border-b border-gray-100">{["实体名称","类型","验证状态","DKIM","DKIM签名"].map(h=><th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">{h}</th>)}</tr></thead>
        <tbody>{list.map((i:any)=><tr key={i.identity} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
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
