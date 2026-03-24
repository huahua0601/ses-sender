"use client";
import React, { useState, useEffect } from "react";
import { API, authH, useAuth, Card, Badge, Btn, Input, Select, Pager } from "../../components/shared";

export default function EmailDetails() {
  const {token}=useAuth();
  const [items,setItems]=useState<any[]>([]);
  const [page,setPage]=useState(1);
  const [total,setTotal]=useState(0);
  const [totalPages,setTotalPages]=useState(1);
  const [loading,setLoading]=useState(false);

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
    if(s==="Unsubscribed")return <Badge color="orange">已退订</Badge>;
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
            <option value="Unsubscribed">已退订</option>
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

      <div className="mb-3 flex items-center gap-4 text-xs text-gray-500">
        <span>共 <strong className="text-gray-800">{total}</strong> 封</span>
        {loading&&<span className="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"/>}
      </div>

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
