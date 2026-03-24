"use client";
import React, { useState, useEffect } from "react";
import { API, authH, useAuth, Card, Badge, Btn, Pager, Modal } from "../../components/shared";

export default function SendingHistory() {
  const {token}=useAuth();
  const [jobs,setJobs]=useState<any[]>([]); const [page,setPage]=useState(1); const [total,setTotal]=useState(0); const [totalPages,setTotalPages]=useState(1);
  const [showMetrics,setShowMetrics]=useState(false);
  const [metricsJob,setMetricsJob]=useState<any>(null);
  const [metrics,setMetrics]=useState<any>(null);
  const [metricsLoading,setMetricsLoading]=useState(false);

  const load=async(p=page)=>{
    try{const d=await(await fetch(`${API}/sending-jobs?page=${p}&page_size=10`,{headers:authH(token)})).json();setJobs(d.items||[]);setTotal(d.total||0);setTotalPages(d.total_pages||1);setPage(d.page||1);}catch{setJobs([]);}
  };
  useEffect(()=>{load(1);},[]);

  const openMetrics=async(job:any)=>{
    setMetricsJob(job);setMetrics(null);setShowMetrics(true);setMetricsLoading(true);
    try{
      const mRes=await fetch(`${API}/sending-jobs/${job.batch_id}/metrics`,{headers:authH(token)});
      const mData=await mRes.json(); setMetrics(mData);
    }catch{setMetrics(null);}
    finally{setMetricsLoading(false);}
  };

  const statusBadge=(s:string)=>{
    if(s==="success") return <Badge color="green">发送成功</Badge>;
    if(s==="partial") return <Badge color="orange">部分成功</Badge>;
    if(s==="queued") return <Badge color="gray">排队中</Badge>;
    if(s==="sending") return <Badge color="blue">发送中</Badge>;
    return <Badge color="red">发送失败</Badge>;
  };

  const metricCard=(label:string,value:any,rate:number|undefined,color:string)=>(
    <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{color}}>{value}</p>
      {rate!==undefined&&<p className="text-xs mt-1" style={{color}}>{rate}%</p>}
    </div>
  );

  return <>
    <Modal open={showMetrics} onClose={()=>setShowMetrics(false)} title={`批次指标 - ${metricsJob?.batch_id||""}`} width={720}>
      {metricsLoading?<div className="text-center py-12 text-gray-400">加载中...</div>:<div>
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div><span className="text-gray-400">模版：</span><span className="text-gray-800">{metricsJob?.template_name}</span></div>
          <div><span className="text-gray-400">客群：</span><span className="text-gray-800">{metricsJob?.group_name}</span></div>
          <div><span className="text-gray-400">发送邮箱：</span><span className="text-gray-800">{metricsJob?.source_email}</span></div>
          <div><span className="text-gray-400">发送时间：</span><span className="text-gray-800">{metricsJob?.created_at?new Date(metricsJob.created_at).toLocaleString():"-"}</span></div>
        </div>

        {metrics?<div className="space-y-5">
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
          </div>:<div className="text-center py-12 text-gray-400">暂无指标数据（需配置 Configuration Set 和 CloudWatch Event Destination）</div>}
      </div>}
    </Modal>

    <Card title="发送历史" extra={<Btn variant="outline" size="sm" onClick={()=>load(1)}>刷新</Btn>}>
      <div className="overflow-x-auto"><table className="w-full">
        <thead><tr className="border-b border-gray-100">{["批次ID","模版","客群","发送邮箱","联系人数","状态","发送时间","操作"].map(h=><th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-3 whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{jobs.map((j:any)=>{
          const isSending=j.status==="queued"||j.status==="sending";
          const prog=j.total_contacts>0?Math.round((j.sent_count||0)/j.total_contacts*100):0;
          return <tr key={j.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
          <td className="py-3 px-3 text-xs text-gray-500 font-mono">{j.batch_id}</td>
          <td className="py-3 px-3 text-sm text-gray-800">{j.template_name}</td>
          <td className="py-3 px-3 text-sm text-gray-800">{j.group_name}</td>
          <td className="py-3 px-3 text-sm text-gray-500">{j.source_email}</td>
          <td className="py-3 px-3 text-sm text-gray-600 text-center">{isSending?<span>{j.sent_count||0}/{j.total_contacts}</span>:j.total_contacts}</td>
          <td className="py-3 px-3">
            <div className="flex flex-col gap-1">
              {statusBadge(j.status)}
              {isSending&&<div className="w-24"><div className="h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{width:`${prog}%`}}/></div><span className="text-[10px] text-gray-400">{prog}%</span></div>}
            </div>
          </td>
          <td className="py-3 px-3 text-xs text-gray-400 whitespace-nowrap">{j.created_at?new Date(j.created_at).toLocaleString():"-"}</td>
          <td className="py-3 px-3"><Btn variant="primary" size="sm" onClick={()=>openMetrics(j)} disabled={isSending}>查看指标</Btn></td>
        </tr>})}</tbody>
      </table></div>
      {jobs.length===0&&<p className="text-center py-8 text-sm text-gray-400">暂无发送记录</p>}
      <Pager page={page} totalPages={totalPages} total={total} onPageChange={p=>load(p)}/>
    </Card>
  </>;
}
