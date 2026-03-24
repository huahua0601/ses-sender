"use client";
import React, { useState, useEffect } from "react";
import { API, authH, useAuth, useToast, useConfirm, Card, Btn, Input, Pager, Modal } from "../../components/shared";

export default function UserGroups() {
  const {token}=useAuth(); const {toast}=useToast(); const {confirm:cfm}=useConfirm();
  const [gs,setGs]=useState<any[]>([]); const [gS,setGS]=useState(""); const [gP,setGP]=useState(1); const [gT,setGT]=useState(0); const [gTP,setGTP]=useState(1);
  const [sel,setSel]=useState<number|null>(null); const [cs,setCs]=useState<any[]>([]); const [cS,setCS]=useState(""); const [cP,setCP]=useState(1); const [cT,setCT]=useState(0); const [cTP,setCTP]=useState(1);

  const [showAddGroup,setShowAddGroup]=useState(false);
  const [showEditGroup,setShowEditGroup]=useState(false);
  const [editGroupId,setEditGroupId]=useState<number|null>(null);
  const [ng,setNg]=useState("");
  const [ngDesc,setNgDesc]=useState("");
  const [showAddContact,setShowAddContact]=useState(false);
  const [rows,setRows]=useState([{name:"",email:""}]);

  const PAGE_SIZE = 10;
  const loadG=async(p=gP,s=gS)=>{try{const d=await(await fetch(`${API}/groups?page=${p}&page_size=${PAGE_SIZE}&search=${encodeURIComponent(s)}`,{headers:authH(token)})).json();setGs(d.items||[]);setGT(d.total||0);setGTP(d.total_pages||1);setGP(d.page||1);}catch{setGs([]);}};
  useEffect(()=>{loadG(1,"");},[]);
  const searchG=(v:string)=>{setGS(v);loadG(1,v);};
  const loadC=async(gid:number,p=1,s="")=>{try{const d=await(await fetch(`${API}/groups/${gid}/contacts?page=${p}&page_size=${PAGE_SIZE}&search=${encodeURIComponent(s)}`,{headers:authH(token)})).json();setCs(d.items||[]);setCT(d.total||0);setCTP(d.total_pages||1);setCP(d.page||1);setSel(gid);}catch{setCs([]);}};
  const searchC=(v:string)=>{setCS(v);if(sel)loadC(sel,1,v);};

  const addG=async()=>{if(!ng)return toast("warning","请输入客群名称");await fetch(`${API}/groups`,{method:"POST",headers:authH(token),body:JSON.stringify({name:ng,description:ngDesc})});toast("success","客群创建成功");setNg("");setNgDesc("");setShowAddGroup(false);loadG(1,gS);};
  const openEditG=(g:any)=>{setEditGroupId(g.id);setNg(g.name);setNgDesc(g.description||"");setShowEditGroup(true);};
  const updateG=async()=>{if(!ng)return toast("warning","请输入客群名称");const r=await fetch(`${API}/groups/${editGroupId}`,{method:"PUT",headers:authH(token),body:JSON.stringify({name:ng,description:ngDesc})});if(r.ok){toast("success","客群已更新");setShowEditGroup(false);loadG(gP,gS);}else{const e=await r.json();toast("error","更新失败",e.detail);}};
  const delG=async(g:any)=>{if(!await cfm("删除客群",`确定删除客群「${g.name}」及其所有 ${g.contact_count} 个联系人？\n此操作不可恢复。`,"确认删除"))return;await fetch(`${API}/groups/${g.id}`,{method:"DELETE",headers:authH(token)});if(sel===g.id){setSel(null);setCs([]);}loadG(gP,gS);};

  const updR=(i:number,f:string,v:string)=>{const r=[...rows];(r[i] as any)[f]=v;setRows(r);};
  const addR=()=>setRows([...rows,{name:"",email:""}]);
  const rmR=(i:number)=>{if(rows.length>1)setRows(rows.filter((_,j)=>j!==i));};
  const saveC=async()=>{const v=rows.filter(r=>r.email.trim());if(!v.length)return toast("warning","请至少填写一个邮箱");for(const r of v)await fetch(`${API}/contacts`,{method:"POST",headers:authH(token),body:JSON.stringify({name:r.name.trim(),email:r.email.trim(),group_id:sel})});toast("success",`已添加 ${v.length} 个联系人`);setRows([{name:"",email:""}]);setShowAddContact(false);loadC(sel!,cP,cS);loadG(gP,gS);};
  const delC=async(c:any)=>{if(!await cfm("删除联系人",`确定删除联系人「${c.name||c.email}」？\n邮箱: ${c.email}`,"确认删除"))return;await fetch(`${API}/contacts/${c.id}`,{method:"DELETE",headers:authH(token)});loadC(sel!,cP,cS);loadG(gP,gS);};

  const dlTpl=()=>window.open(`${API}/contacts/template/download?token=${token}`,"_blank");
  const dlCs=()=>{if(sel)window.open(`${API}/groups/${sel}/contacts/download?token=${token}`,"_blank");};
  const ulCs=async(e:any)=>{const file=e.target.files[0];if(!file||!sel)return;const fd=new FormData();fd.append("file",file);const r=await fetch(`${API}/groups/${sel}/contacts/upload`,{method:"POST",headers:{Authorization:`Bearer ${token}`},body:fd});const d=await r.json();if(r.ok){toast("success","导入成功",d.message);loadC(sel,1,cS);loadG(gP,gS);}else toast("error","导入失败",d.detail);e.target.value="";};

  return <>
    <Modal open={showAddGroup} onClose={()=>setShowAddGroup(false)} title="新建客群" width={440}>
      <div className="space-y-4">
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">客群名称</label><Input placeholder="输入客群名称" value={ng} onChange={(e:any)=>setNg(e.target.value)} onKeyDown={(e:any)=>e.key==="Enter"&&addG()}/></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">描述（可选）</label><Input placeholder="客群描述" value={ngDesc} onChange={(e:any)=>setNgDesc(e.target.value)}/></div>
        <div className="flex justify-end gap-2"><Btn variant="outline" onClick={()=>setShowAddGroup(false)}>取消</Btn><Btn onClick={addG}>创建客群</Btn></div>
      </div>
    </Modal>

    <Modal open={showEditGroup} onClose={()=>setShowEditGroup(false)} title="编辑客群" width={440}>
      <div className="space-y-4">
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">客群名称</label><Input value={ng} onChange={(e:any)=>setNg(e.target.value)}/></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">描述</label><Input placeholder="客群描述" value={ngDesc} onChange={(e:any)=>setNgDesc(e.target.value)}/></div>
        <div className="flex justify-end gap-2"><Btn variant="outline" onClick={()=>setShowEditGroup(false)}>取消</Btn><Btn onClick={updateG}>保存修改</Btn></div>
      </div>
    </Modal>

    <Modal open={showAddContact} onClose={()=>setShowAddContact(false)} title="添加联系人" width={580}>
      <div className="space-y-3">
        {rows.map((r,i)=><div key={i} className="flex gap-2 items-center">
          <Input placeholder="姓名" value={r.name} onChange={(e:any)=>updR(i,"name",e.target.value)}/>
          <Input placeholder="邮箱 *" value={r.email} onChange={(e:any)=>updR(i,"email",e.target.value)}/>
          {rows.length>1&&<button onClick={()=>rmR(i)} className="text-gray-400 hover:text-red-500 text-xl leading-none px-1 flex-shrink-0">&times;</button>}
        </div>)}
        <Btn variant="outline" size="sm" onClick={addR}>+ 添加一行</Btn>
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Btn variant="outline" onClick={()=>setShowAddContact(false)}>取消</Btn>
          <Btn variant="success" onClick={saveC}>批量保存</Btn>
        </div>
      </div>
    </Modal>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card title="我的客群" extra={<Btn size="sm" onClick={()=>{setNg("");setShowAddGroup(true);}}>+ 新建客群</Btn>}>
        <Input placeholder="搜索客群..." value={gS} onChange={(e:any)=>searchG(e.target.value)} className="mb-4"/>
        <div className="space-y-1">{gs.map((g:any)=><div key={g.id} onClick={()=>{setCS("");loadC(g.id,1,"");}} className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition ${sel===g.id?"bg-indigo-50 text-indigo-700":"hover:bg-gray-50 text-gray-700"}`}>
          <span className={`text-sm ${sel===g.id?"font-semibold":""}`}>{g.name} <span className="text-xs text-gray-400">({g.contact_count})</span></span>
          <div className="flex gap-1">
            <Btn variant="outline" size="sm" onClick={(e:any)=>{e.stopPropagation();openEditG(g);}}>编辑</Btn>
            <Btn variant="danger" size="sm" onClick={(e:any)=>{e.stopPropagation();delG(g);}}>删除</Btn>
          </div>
        </div>)}{gs.length===0&&<p className="text-center py-8 text-sm text-gray-400">暂无客群</p>}</div>
        <Pager page={gP} totalPages={gTP} total={gT} onPageChange={p=>loadG(p,gS)}/>
      </Card>

      <div className="lg:col-span-2"><Card title={sel?"联系人管理":"请选择一个客群"} extra={sel&&<div className="flex gap-2">
        <Btn variant="outline" size="sm" onClick={dlTpl}>下载模版</Btn>
        <label className="inline-flex items-center justify-center font-medium rounded-lg transition h-8 px-3 text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 bg-white cursor-pointer">Excel导入<input type="file" accept=".xlsx,.xls" className="hidden" onChange={ulCs}/></label>
        <Btn variant="outline" size="sm" onClick={dlCs}>导出Excel</Btn>
        <Btn variant="success" size="sm" onClick={()=>{setRows([{name:"",email:""}]);setShowAddContact(true);}}>+ 添加联系人</Btn>
      </div>}>
        {sel?<>
          <div className="flex items-center gap-3 mb-4"><Input placeholder="搜索姓名或邮箱..." value={cS} onChange={(e:any)=>searchC(e.target.value)}/><span className="text-sm text-gray-400 whitespace-nowrap">共 {cT} 人</span></div>
          <div className="overflow-x-auto"><table className="w-full">
            <thead><tr className="border-b border-gray-100">{["姓名","邮箱","操作"].map(h=><th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">{h}</th>)}</tr></thead>
            <tbody>{cs.map((c:any)=><tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
              <td className="py-3 px-4 text-sm text-gray-800">{c.name}</td>
              <td className="py-3 px-4 text-sm text-gray-500">{c.email}</td>
              <td className="py-3 px-4"><Btn variant="danger" size="sm" onClick={()=>delC(c)}>删除</Btn></td>
            </tr>)}</tbody>
          </table></div>
          {cs.length===0&&<p className="text-center py-8 text-sm text-gray-400">暂无联系人</p>}
          <Pager page={cP} totalPages={cTP} total={cT} onPageChange={p=>loadC(sel,p,cS)}/>
        </>:<p className="text-center py-16 text-gray-400">请在左侧选择一个客群</p>}
      </Card></div>
    </div>
  </>;
}
