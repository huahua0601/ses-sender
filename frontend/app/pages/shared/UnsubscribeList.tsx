"use client";
import React, { useState, useEffect } from "react";
import { API, authH, useAuth, useToast, useConfirm, Card, Btn, Input, Pager } from "../../components/shared";

export default function UnsubscribeList() {
  const {token}=useAuth(); const {toast}=useToast(); const {confirm:cfm}=useConfirm();
  const [items,setItems]=useState<any[]>([]);
  const [page,setPage]=useState(1);
  const [total,setTotal]=useState(0);
  const [totalPages,setTotalPages]=useState(1);
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(false);

  const load=async(p=1,s=search)=>{
    setLoading(true);
    try{
      const params=new URLSearchParams({page:String(p),page_size:"20"});
      if(s)params.set("search",s);
      const r=await fetch(`${API}/unsubscribe-list?${params}`,{headers:authH(token)});
      const d=await r.json();
      setItems(d.items||[]);setTotal(d.total||0);setTotalPages(d.total_pages||1);setPage(p);
    }catch{}finally{setLoading(false);}
  };

  useEffect(()=>{load();},[]);

  const doSearch=()=>load(1,search);
  const doReset=()=>{setSearch("");load(1,"");};

  const restore=async(r:any)=>{
    if(!await cfm("恢复发送",`确定恢复向「${r.email}」发送邮件吗？\n恢复后该邮箱将重新接收来自 ${r.source_email} 的邮件。`,"确认恢复"))return;
    try{
      const res=await fetch(`${API}/unsubscribe-list/${r.id}`,{method:"DELETE",headers:authH(token)});
      if(res.ok){toast("success","已恢复");load(page);}
      else{const e=await res.json();toast("error","操作失败",e.detail);}
    }catch{toast("error","网络错误");}
  };

  const fmtTime=(t:string|null)=>t?new Date(t).toLocaleString():"—";
  const reasonLabel=(r:string)=>({"one-click":"一键退订","manual":"手动退订","complaint":"投诉退订"}[r]||r);

  return <Card title="退订用户列表" extra={<Btn variant="secondary" size="sm" onClick={()=>load(page)}>刷新</Btn>}>
    <div className="mb-4 flex gap-3 items-end">
      <div className="flex-1">
        <label className="text-xs font-medium text-gray-500 mb-1 block">搜索退订邮箱</label>
        <Input placeholder="输入邮箱搜索..." value={search} onChange={(e:any)=>setSearch(e.target.value)} onKeyDown={(e:any)=>e.key==="Enter"&&doSearch()}/>
      </div>
      <Btn size="sm" onClick={doSearch}>搜索</Btn>
      <Btn variant="secondary" size="sm" onClick={doReset}>重置</Btn>
    </div>

    <div className="mb-3 text-xs text-gray-500">
      共 <strong className="text-gray-800">{total}</strong> 个退订邮箱
      {loading&&<span className="inline-block w-3 h-3 ml-2 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"/>}
    </div>

    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
          <th className="py-2 px-3 font-medium">退订邮箱</th>
          <th className="py-2 px-3 font-medium">发送邮箱</th>
          <th className="py-2 px-3 font-medium">退订方式</th>
          <th className="py-2 px-3 font-medium">退订时间</th>
          <th className="py-2 px-3 font-medium">操作</th>
        </tr></thead>
        <tbody>{items.map(r=>(
          <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
            <td className="py-2.5 px-3 font-mono text-xs">{r.email}</td>
            <td className="py-2.5 px-3 text-xs text-gray-500">{r.source_email}</td>
            <td className="py-2.5 px-3"><span className="inline-block px-2 py-0.5 text-xs rounded-full bg-orange-50 text-orange-600 border border-orange-200">{reasonLabel(r.reason)}</span></td>
            <td className="py-2.5 px-3 text-xs text-gray-400">{fmtTime(r.unsubscribed_at)}</td>
            <td className="py-2.5 px-3"><Btn variant="outline" size="sm" onClick={()=>restore(r)}>恢复发送</Btn></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
    {items.length===0&&<p className="text-center py-8 text-sm text-gray-400">{loading?"加载中...":"暂无退订记录"}</p>}
    <Pager page={page} totalPages={totalPages} total={total} onPageChange={p=>load(p)}/>
  </Card>;
}
