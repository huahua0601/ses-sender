"use client";
import React, { useState, useEffect } from "react";
import { API, authH, useAuth, Card } from "../../components/shared";

export default function UserDashboard() {
  const {token}=useAuth();
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    (async()=>{
      try{
        const r=await fetch(`${API}/user/dashboard`,{headers:authH(token)});
        if(r.ok) setData(await r.json());
      }catch{}
      finally{setLoading(false);}
    })();
  },[]);

  if(loading) return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;
  if(!data) return <div className="flex items-center justify-center h-64 text-gray-400">暂无数据</div>;

  const {summary:s, delivery:d, daily_trend:trend, recent_jobs:recent}=data;
  const pct=(v:number,total:number)=>total>0?(v/total*100).toFixed(1):"0.0";
  const quotaPct=s.daily_limit>0?Math.min(100,s.today_sent/s.daily_limit*100):0;
  const quotaColor=quotaPct>=100?"#EF4444":quotaPct>=80?"#F59E0B":"#10B981";
  const maxTrend=Math.max(...trend.map((t:any)=>t.count),1);

  const statCards=[
    {label:"今日发送",value:s.today_sent,sub:`限额 ${s.daily_limit}`,icon:"📮",color:"#6366F1",bg:"#EEF2FF"},
    {label:"本月发送",value:s.month_sent,sub:`${new Date().getMonth()+1} 月累计`,icon:"📅",color:"#8B5CF6",bg:"#F5F3FF"},
    {label:"历史总量",value:s.total_emails,sub:`${s.total_jobs} 个批次`,icon:"📊",color:"#06B6D4",bg:"#ECFEFF"},
    {label:"成功批次",value:s.success_jobs,sub:`失败 ${s.failed_jobs}`,icon:"✅",color:"#10B981",bg:"#ECFDF5"},
  ];

  const deliveryCards=[
    {label:"送达率",value:`${pct(d.delivered,d.total)}%`,count:d.delivered,color:"#10B981",bg:"bg-green-50",ring:"ring-green-200"},
    {label:"打开率",value:`${pct(d.opened,d.total)}%`,count:d.opened,color:"#3B82F6",bg:"bg-blue-50",ring:"ring-blue-200"},
    {label:"点击率",value:`${pct(d.clicked,d.total)}%`,count:d.clicked,color:"#8B5CF6",bg:"bg-purple-50",ring:"ring-purple-200"},
    {label:"退信率",value:`${pct(d.bounced,d.total)}%`,count:d.bounced,color:"#EF4444",bg:"bg-red-50",ring:"ring-red-200"},
    {label:"投诉率",value:`${pct(d.complained,d.total)}%`,count:d.complained,color:"#F59E0B",bg:"bg-amber-50",ring:"ring-amber-200"},
  ];

  const stColor:Record<string,string>={"success":"#10B981","failed":"#EF4444","sending":"#3B82F6","queued":"#6B7280","partial":"#F59E0B"};
  const stText:Record<string,string>={"success":"成功","failed":"失败","sending":"发送中","queued":"排队中","partial":"部分成功"};

  return <div className="space-y-6">
    {/* 统计卡片 */}
    <div className="grid grid-cols-4 gap-4">
      {statCards.map(c=><div key={c.label} className="rounded-2xl p-5 border border-gray-100 shadow-sm" style={{background:c.bg}}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl">{c.icon}</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{color:c.color,background:`${c.color}18`}}>{c.sub}</span>
        </div>
        <p className="text-3xl font-bold" style={{color:c.color}}>{c.value.toLocaleString()}</p>
        <p className="text-sm text-gray-500 mt-1">{c.label}</p>
      </div>)}
    </div>

    {/* 今日配额 */}
    <Card>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">今日发送配额</span>
            <span className="text-sm" style={{color:quotaColor}}>
              {s.today_sent} / {s.daily_limit} <span className="text-gray-400 text-xs ml-1">（剩余 {s.daily_remaining}）</span>
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{width:`${quotaPct}%`,background:quotaColor}}/>
          </div>
        </div>
      </div>
    </Card>

    <div className="grid grid-cols-2 gap-6">
      {/* 最近7天趋势 */}
      <Card title="最近 7 天发送趋势">
        <div className="flex items-end gap-2 h-40 pt-2">
          {trend.map((t:any)=>{
            const h=maxTrend>0?(t.count/maxTrend*100):0;
            return <div key={t.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-gray-600">{t.count>0?t.count:""}</span>
              <div className="w-full rounded-t-lg transition-all duration-300" style={{height:`${Math.max(h,4)}%`,background:t.count>0?"#6366F1":"#E5E7EB",minHeight:4}}/>
              <span className="text-xs text-gray-400">{t.date}</span>
            </div>;
          })}
        </div>
      </Card>

      {/* 送达指标 */}
      <Card title={`邮件送达指标${d.total>0?` (共 ${d.total} 封)`:""}`}>
        <div className="space-y-3">
          {deliveryCards.map(c=>{
            const pctVal=d.total>0?(c.count/d.total*100):0;
            return <div key={c.label} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-14">{c.label}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{width:`${pctVal}%`,background:c.color}}/>
              </div>
              <span className="text-sm font-semibold w-16 text-right" style={{color:c.color}}>{c.value}</span>
              <span className="text-xs text-gray-400 w-10 text-right">{c.count}</span>
            </div>;
          })}
        </div>
      </Card>
    </div>

    {/* 最近发送记录 */}
    <Card title="最近发送记录">
      {recent.length===0?<p className="text-center py-6 text-sm text-gray-400">暂无发送记录</p>:
      <div className="overflow-x-auto"><table className="w-full">
        <thead><tr className="border-b border-gray-100">
          {["批次ID","模版","客群","邮件数","状态","时间"].map(h=><th key={h} className="text-left text-xs font-medium text-gray-500 py-2.5 px-3">{h}</th>)}
        </tr></thead>
        <tbody>{recent.map((j:any)=><tr key={j.batch_id} className="border-b border-gray-50 hover:bg-gray-50/50">
          <td className="py-2.5 px-3 text-xs font-mono text-gray-500">{j.batch_id.replace("batch-","").slice(0,8)}</td>
          <td className="py-2.5 px-3 text-sm text-gray-700">{j.template_name}</td>
          <td className="py-2.5 px-3 text-sm text-gray-500">{j.group_name}</td>
          <td className="py-2.5 px-3 text-sm font-medium text-gray-700">{j.total_contacts}</td>
          <td className="py-2.5 px-3"><span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full" style={{color:stColor[j.status]||"#6B7280",background:`${stColor[j.status]||"#6B7280"}15`}}>{stText[j.status]||j.status}</span></td>
          <td className="py-2.5 px-3 text-xs text-gray-400">{j.created_at?new Date(j.created_at).toLocaleString():"-"}</td>
        </tr>)}</tbody>
      </table></div>}
    </Card>
  </div>;
}
