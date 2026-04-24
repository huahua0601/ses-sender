"use client";
import React, { useState, useEffect } from "react";
import { API, authH, useAuth, useToast, useConfirm, Card, Btn, Input, Pager } from "../../components/shared";
import UnsubPageEditor, { DEFAULT_REASONS } from "./UnsubPageEditor";

export default function UnsubscribeManager() {
  const [subTab,setSubTab]=useState<"list"|"config">("list");
  return <div>
    <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
      {([["list","退订列表"],["config","退订页面自定义"]] as const).map(([id,label])=>(
        <button key={id} onClick={()=>setSubTab(id)} className={`px-4 py-2 text-sm rounded-md transition-all ${subTab===id?"bg-white text-indigo-600 shadow-sm font-medium":"text-gray-500 hover:text-gray-700"}`}>{label}</button>
      ))}
    </div>
    {subTab==="list"&&<UnsubList/>}
    {subTab==="config"&&<UnsubConfig/>}
  </div>;
}

function UnsubList() {
  const {token}=useAuth(); const {toast}=useToast(); const {confirm:cfm}=useConfirm();
  const [items,setItems]=useState<any[]>([]);
  const [page,setPage]=useState(1);const [total,setTotal]=useState(0);const [totalPages,setTotalPages]=useState(1);
  const [search,setSearch]=useState("");const [loading,setLoading]=useState(false);
  const [selected,setSelected]=useState<Set<number>>(new Set());

  const load=async(p=1,s=search)=>{
    setLoading(true);setSelected(new Set());
    try{
      const params=new URLSearchParams({page:String(p),page_size:"20"});
      if(s)params.set("search",s);
      const r=await fetch(`${API}/unsubscribe-list?${params}`,{headers:authH(token)});
      const d=await r.json();
      setItems(d.items||[]);setTotal(d.total||0);setTotalPages(d.total_pages||1);setPage(p);
    }catch{}finally{setLoading(false);}
  };
  useEffect(()=>{load();},[]);

  const toggleSelect=(id:number)=>{setSelected(prev=>{const s=new Set(prev);s.has(id)?s.delete(id):s.add(id);return s;});};
  const toggleAll=()=>{selected.size===items.length?setSelected(new Set()):setSelected(new Set(items.map(r=>r.id)));};

  const restore=async(r:any)=>{
    if(!await cfm("恢复发送",`确定恢复向「${r.email}」发送邮件吗？`,"确认恢复"))return;
    try{const res=await fetch(`${API}/unsubscribe-list/${r.id}`,{method:"DELETE",headers:authH(token)});if(res.ok){toast("success","已恢复");load(page);}else{const e=await res.json();toast("error","失败",e.detail);}}catch{toast("error","网络错误");}
  };
  const batchRestore=async()=>{
    if(selected.size===0)return toast("warning","请先选择");
    if(!await cfm("批量恢复",`确定恢复 ${selected.size} 条退订记录吗？`,"确认"))return;
    try{const r=await fetch(`${API}/unsubscribe-list/batch-delete`,{method:"POST",headers:authH(token),body:JSON.stringify({ids:[...selected]})});const d=await r.json();if(r.ok){toast("success",d.message);load(page);}else toast("error","失败",d.detail);}catch{toast("error","网络错误");}
  };
  const fmtTime=(t:string|null)=>t?new Date(t).toLocaleString():"—";
  const reasonLabel=(r:string)=>{const m:{[k:string]:string}={"one-click":"一键退订","manual":"手动退订","complaint":"投诉","web-unsubscribe":"网页退订","too_frequent":"邮件太频繁","not_relevant":"内容不相关","never_subscribed":"未订阅","prefer_other":"偏好其他"};if(m[r])return m[r];if(r?.startsWith("other:"))return`其他: ${r.slice(6)}`;return r||"—";};

  return <Card title="退订用户列表" extra={<Btn variant="secondary" size="sm" onClick={()=>load(page)}>刷新</Btn>}>
    <div className="mb-4 flex gap-3 items-end">
      <div className="flex-1"><label className="text-xs font-medium text-gray-500 mb-1 block">搜索退订邮箱</label><Input placeholder="输入邮箱搜索..." value={search} onChange={(e:any)=>setSearch(e.target.value)} onKeyDown={(e:any)=>e.key==="Enter"&&load(1,search)}/></div>
      <Btn size="sm" onClick={()=>load(1,search)}>搜索</Btn>
      <Btn variant="secondary" size="sm" onClick={()=>{setSearch("");load(1,"");}}>重置</Btn>
    </div>
    <div className="mb-3 flex items-center gap-4 text-xs text-gray-500">
      <span>共 <strong className="text-gray-800">{total}</strong> 个退订邮箱</span>
      {selected.size>0&&<div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
        <span className="text-indigo-700 font-medium">已选 {selected.size} 条</span>
        <Btn size="sm" variant="warning" onClick={batchRestore}>批量恢复</Btn>
        <button onClick={()=>setSelected(new Set())} className="text-gray-400 hover:text-gray-600 text-xs">取消</button>
      </div>}
      {loading&&<span className="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"/>}
    </div>
    <div className="overflow-x-auto"><table className="w-full text-sm">
      <thead><tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
        <th className="py-2 px-3 w-10"><input type="checkbox" className="rounded accent-indigo-500" checked={items.length>0&&selected.size===items.length} onChange={toggleAll}/></th>
        <th className="py-2 px-3 font-medium">退订邮箱</th><th className="py-2 px-3 font-medium">发送邮箱</th>
        <th className="py-2 px-3 font-medium">退订原因</th><th className="py-2 px-3 font-medium">退订时间</th><th className="py-2 px-3 font-medium">操作</th>
      </tr></thead>
      <tbody>{items.map(r=><tr key={r.id} className={`border-b border-gray-50 hover:bg-gray-50 transition ${selected.has(r.id)?"bg-indigo-50/50":""}`}>
        <td className="py-2.5 px-3"><input type="checkbox" className="rounded accent-indigo-500" checked={selected.has(r.id)} onChange={()=>toggleSelect(r.id)}/></td>
        <td className="py-2.5 px-3 font-mono text-xs">{r.email}</td>
        <td className="py-2.5 px-3 text-xs text-gray-500">{r.source_email}</td>
        <td className="py-2.5 px-3"><span className="inline-block px-2 py-0.5 text-xs rounded-full bg-orange-50 text-orange-600 border border-orange-200">{reasonLabel(r.reason)}</span></td>
        <td className="py-2.5 px-3 text-xs text-gray-400">{fmtTime(r.unsubscribed_at)}</td>
        <td className="py-2.5 px-3"><Btn variant="outline" size="sm" onClick={()=>restore(r)}>恢复发送</Btn></td>
      </tr>)}</tbody>
    </table></div>
    {items.length===0&&<p className="text-center py-8 text-sm text-gray-400">{loading?"加载中...":"暂无退订记录"}</p>}
    <Pager page={page} totalPages={totalPages} total={total} onPageChange={p=>load(p)}/>
  </Card>;
}

function UnsubConfig() {
  const {token,user}=useAuth(); const {toast}=useToast();
  const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);
  const [f,setF]=useState({title:"",subtitle:"",success:"",logo:"",color:"",reasons:DEFAULT_REASONS});
  const [useCustom,setUseCustom]=useState(false);

  useEffect(()=>{
    (async()=>{
      try{
        const [userR,defaultR]=await Promise.all([fetch(`${API}/user/unsub-config`,{headers:authH(token)}),fetch(`${API}/user/unsub-defaults`,{headers:authH(token)})]);
        const defaults=defaultR.ok?await defaultR.json():{};
        const base={title:defaults.title||"退订确认",subtitle:defaults.subtitle||"我们很遗憾看到您离开。",success:defaults.success||"退订成功",logo:defaults.logo||"",color:defaults.color||"#667eea",reasons:defaults.reasons||DEFAULT_REASONS};
        if(userR.ok){const d=await userR.json();if(d&&Object.keys(d).length>0){setF({title:d.title||base.title,subtitle:d.subtitle||base.subtitle,success:d.success||base.success,logo:d.logo||base.logo,color:d.color||base.color,reasons:d.reasons||base.reasons});setUseCustom(true);}else setF(base);}else setF(base);
      }catch{}finally{setLoading(false);}
    })();
  },[]);

  const save=async()=>{
    setSaving(true);
    try{const body=useCustom?f:{};const r=await fetch(`${API}/user/unsub-config`,{method:"PUT",headers:authH(token),body:JSON.stringify(body)});if(r.ok)toast("success",useCustom?"配置已保存":"已恢复为系统默认");else{const e=await r.json();toast("error","失败",e.detail);}}catch{toast("error","网络错误");}finally{setSaving(false);}
  };

  if(loading) return <div className="flex items-center justify-center h-32 text-gray-400">加载中...</div>;

  return <div className="space-y-4">
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="rounded accent-indigo-500 w-4 h-4" checked={useCustom} onChange={e=>setUseCustom(e.target.checked)}/><span className="text-sm font-medium text-gray-700">使用自定义退订页面</span></label>
      <span className="text-xs text-gray-400">{useCustom?"覆盖系统默认":"使用管理员默认配置"}</span>
    </div>
    {useCustom&&<UnsubPageEditor f={f} setF={setF} onSave={save} saving={saving} senderEmail={user?.email} title="退订页面自定义" description="以下配置将覆盖管理员设置的默认值"/>}
    {!useCustom&&<div className="flex items-center gap-3 pt-2"><Btn onClick={save} disabled={saving}>{saving?"保存中...":"保存配置"}</Btn></div>}
  </div>;
}
