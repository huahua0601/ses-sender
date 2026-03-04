"use client";
import React, { useState, useEffect, useRef } from "react";
import { API, authH, useAuth, useToast, useConfirm, Card, Btn, Input, Textarea, Modal } from "../../components/shared";

export default function TemplateManager({apiPrefix}:{apiPrefix:string}) {
  const {token}=useAuth(); const {toast}=useToast(); const {confirm:cfm}=useConfirm();
  const [list,setList]=useState<any[]>([]);
  const [showCreate,setShowCreate]=useState(false);
  const [showEdit,setShowEdit]=useState(false);
  const [f,setF]=useState({name:"",subject:"",html_body:""});
  const [editId,setEditId]=useState<number|null>(null);
  const [previewTab,setPreviewTab]=useState<"code"|"preview"|"split">("split");

  const load=async()=>{const d=await(await fetch(`${API}${apiPrefix}`,{headers:authH(token)})).json();setList(Array.isArray(d)?d:[]);}; useEffect(()=>{load();},[]);

  const create=async()=>{
    if(!f.name||!f.subject||!f.html_body)return toast("warning","请填写完整");
    const r=await fetch(`${API}${apiPrefix}`,{method:"POST",headers:authH(token),body:JSON.stringify(f)});
    if(r.ok){toast("success","模版创建成功");setShowCreate(false);load();}
    else{const e=await r.json();toast("error","失败",e.detail);}
  };

  const openEdit=(t:any)=>{setEditId(t.id);setF({name:t.name,subject:t.subject,html_body:t.html_body});setShowEdit(true);setPreviewTab("split");};

  const update=async()=>{
    if(!f.subject||!f.html_body)return toast("warning","请填写完整");
    const r=await fetch(`${API}${apiPrefix}/${editId}`,{method:"PUT",headers:authH(token),body:JSON.stringify({subject:f.subject,html_body:f.html_body})});
    if(r.ok){toast("success","模版已更新");setShowEdit(false);load();}
    else{const e=await r.json();toast("error","更新失败",e.detail);}
  };

  const del=async(t:any)=>{if(!await cfm("删除模版",`确定删除「${t.name}」？不可恢复。`,"确认删除"))return;const r=await fetch(`${API}${apiPrefix}/${t.id}`,{method:"DELETE",headers:authH(token)});if(r.ok){toast("success","已删除");load();}else{const e=await r.json();toast("error","失败",e.detail);}};

  const snippets = [
    {label:"标题",icon:"H",html:'<h1 style="color:#333;font-size:24px;">标题文字</h1>\n'},
    {label:"段落",icon:"P",html:'<p style="color:#555;font-size:14px;line-height:1.8;">段落内容</p>\n'},
    {label:"按钮",icon:"▣",html:'<a href="https://example.com" style="display:inline-block;padding:12px 28px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;">点击按钮</a>\n'},
    {label:"图片",icon:"🖼",html:'<img src="https://via.placeholder.com/600x200" alt="图片" style="max-width:100%;height:auto;border-radius:8px;" />\n'},
    {label:"分割线",icon:"—",html:'<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />\n'},
    {label:"表格",icon:"⊞",html:'<table style="width:100%;border-collapse:collapse;">\n  <tr style="background:#f3f4f6;">\n    <th style="padding:10px 16px;text-align:left;border-bottom:2px solid #e5e7eb;">列1</th>\n    <th style="padding:10px 16px;text-align:left;border-bottom:2px solid #e5e7eb;">列2</th>\n  </tr>\n  <tr>\n    <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;">内容</td>\n    <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;">内容</td>\n  </tr>\n</table>\n'},
    {label:"卡片",icon:"☐",html:'<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin:16px 0;">\n  <h2 style="margin:0 0 8px;color:#333;font-size:18px;">卡片标题</h2>\n  <p style="margin:0;color:#666;font-size:14px;">卡片内容描述</p>\n</div>\n'},
    {label:"页脚",icon:"⊥",html:'<div style="text-align:center;padding:20px 0;border-top:1px solid #e5e7eb;margin-top:30px;">\n  <p style="color:#999;font-size:12px;">© 2026 Your Company. All rights reserved.</p>\n  <p style="color:#999;font-size:12px;"><a href="{{unsubscribe_url}}" style="color:#999;">取消订阅</a></p>\n</div>\n'},
  ];

  const variables = [
    {label:"姓名",val:"{{name}}"},
    {label:"邮箱",val:"{{email}}"},
    {label:"公司",val:"{{company}}"},
    {label:"日期",val:"{{date}}"},
  ];

  const insertSnippet = (html:string) => {
    setF(prev=>({...prev,html_body:prev.html_body+html}));
  };

  const insertVariable = (val:string) => {
    setF(prev=>({...prev,html_body:prev.html_body+val}));
  };

  const [uploading,setUploading]=useState(false);
  const fileInputRef=useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast("warning","只支持图片文件"); return; }
    if (file.size > 5*1024*1024) { toast("warning","图片不能超过 5MB"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${API}/upload/image`, {method:"POST", headers:{"Authorization":`Bearer ${token}`}, body:fd});
      if (!r.ok) { const e = await r.json(); toast("error","上传失败",e.detail); return; }
      const d = await r.json();
      const imgUrl = `${API}${d.url}`;
      const imgHtml = `<img src="${imgUrl}" alt="${file.name}" style="max-width:100%;height:auto;border-radius:8px;" />\n`;
      setF(prev=>({...prev,html_body:prev.html_body+imgHtml}));
      toast("success","图片已上传",file.name);
    } catch { toast("error","上传失败","网络错误"); }
    finally { setUploading(false); }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) uploadImage(file);
        return;
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith("image/")) { uploadImage(files[i]); return; }
    }
  };

  const getPreviewHtml = (body:string) => {
    const subjectLine = f.subject ? f.subject.replace(/\{\{(\w+)\}\}/g, '<span style="background:#fef3c7;padding:1px 4px;border-radius:3px;color:#92400e;">$1</span>') : '';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;}</style></head><body>
      <div style="max-width:640px;margin:0 auto;background:#fff;">
        ${subjectLine ? `<div style="background:#f8fafc;padding:12px 20px;border-bottom:1px solid #e5e7eb;"><span style="color:#9ca3af;font-size:12px;">主题：</span><span style="color:#374151;font-size:13px;">${subjectLine}</span></div>` : ''}
        <div style="padding:24px 20px;">${body.replace(/\{\{(\w+)\}\}/g, '<span style="background:#fef3c7;padding:1px 4px;border-radius:3px;color:#92400e;font-size:inherit;">$1</span>')}</div>
      </div>
    </body></html>`;
  };

  const renderEditor = (isCreate:boolean) => (
    <div className="space-y-4">
      {isCreate && <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">模版名称</label><Input placeholder="输入模版名称" value={f.name} onChange={(e:any)=>setF({...f,name:e.target.value})}/></div>}
      {!isCreate && <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">模版名称</label><Input value={f.name} disabled className="bg-gray-50 opacity-60"/></div>}
      <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">邮件主题</label><Input placeholder="支持 {{name}} 变量" value={f.subject} onChange={(e:any)=>setF({...f,subject:e.target.value})}/></div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">HTML 内容</label>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {([["code","代码"],["split","分屏"],["preview","预览"]] as const).map(([id,label])=>(
              <button key={id} onClick={()=>setPreviewTab(id)} className={`px-3 py-1 text-xs rounded-md transition-all ${previewTab===id?"bg-white text-indigo-600 shadow-sm font-medium":"text-gray-500 hover:text-gray-700"}`}>{label}</button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 mb-2 p-2 bg-gray-50 border border-gray-200 rounded-t-lg">
          <span className="text-xs text-gray-400 mr-1">插入：</span>
          {snippets.map(s=>(
            <button key={s.label} onClick={()=>insertSnippet(s.html)} title={s.label}
              className="px-2 py-1 text-xs bg-white border border-gray-200 rounded-md hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all text-gray-600">
              <span className="mr-0.5">{s.icon}</span>{s.label}
            </button>
          ))}
          <span className="w-px h-5 bg-gray-200 mx-1"/>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e=>{const file=e.target.files?.[0];if(file)uploadImage(file);e.target.value="";}}/>
          <button onClick={()=>fileInputRef.current?.click()} disabled={uploading}
            className="px-2 py-1 text-xs bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-all text-emerald-700 disabled:opacity-50">
            {uploading?"上传中...":"📤 上传图片"}
          </button>
          <span className="w-px h-5 bg-gray-200 mx-1"/>
          <span className="text-xs text-gray-400 mr-1">变量：</span>
          {variables.map(v=>(
            <button key={v.val} onClick={()=>insertVariable(v.val)}
              className="px-2 py-1 text-xs bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-all text-amber-700 font-mono">
              {v.val}
            </button>
          ))}
          <span className="text-xs text-gray-300 ml-auto">支持粘贴/拖拽图片</span>
        </div>

        <div className={`border border-gray-200 rounded-b-lg overflow-hidden ${previewTab==="split"?"flex":""}`} style={{minHeight:320}}
          onDragOver={e=>{e.preventDefault();e.stopPropagation();}} onDrop={handleDrop}>
          {(previewTab==="code"||previewTab==="split") && (
            <div className={previewTab==="split"?"w-1/2 border-r border-gray-200":"w-full"}>
              <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400"/>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"/>
                <span className="w-2.5 h-2.5 rounded-full bg-green-400"/>
                <span className="text-xs text-gray-400 ml-2">HTML 源码</span>
              </div>
              <textarea
                value={f.html_body}
                onChange={e=>setF({...f,html_body:e.target.value})}
                onPaste={handlePaste}
                placeholder="在此编写 HTML 邮件内容...&#10;&#10;支持：粘贴图片 (Ctrl+V) / 拖拽图片到此处"
                className="w-full h-full p-3 text-sm font-mono text-gray-700 bg-gray-900 text-green-400 resize-none outline-none"
                style={{minHeight:280,background:"#1e1e2e",color:"#a6e3a1",caretColor:"#fff"}}
                spellCheck={false}
              />
            </div>
          )}
          {(previewTab==="preview"||previewTab==="split") && (
            <div className={previewTab==="split"?"w-1/2":"w-full"}>
              <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200 flex items-center gap-1.5">
                <span className="text-xs text-gray-400">📧 邮件预览</span>
                {f.html_body && <span className="text-xs text-green-500 ml-auto">实时预览</span>}
              </div>
              <div className="bg-white" style={{minHeight:280}}>
                {f.html_body ? (
                  <iframe
                    srcDoc={getPreviewHtml(f.html_body)}
                    className="w-full border-0"
                    style={{minHeight:280,height:"100%"}}
                    sandbox="allow-same-origin"
                    title="邮件预览"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-300 text-sm" style={{minHeight:280}}>
                    <div className="text-center"><p className="text-3xl mb-2">📧</p><p>在左侧编写 HTML 后</p><p>此处将实时预览邮件效果</p></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Btn variant="outline" onClick={()=>{isCreate?setShowCreate(false):setShowEdit(false);}}>取消</Btn>
        {isCreate ? <Btn variant="success" onClick={create}>保存模版</Btn> : <Btn onClick={update}>保存修改</Btn>}
      </div>
    </div>
  );

  return <>
    <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="新建邮件模版" width={1000}>
      {renderEditor(true)}
    </Modal>

    <Modal open={showEdit} onClose={()=>setShowEdit(false)} title={`编辑模版 - ${f.name}`} width={1000}>
      {renderEditor(false)}
    </Modal>

    <Card title="邮件模版" extra={<Btn size="sm" onClick={()=>{setF({name:"",subject:"",html_body:""});setShowCreate(true);setPreviewTab("split");}}>+ 新建模版</Btn>}>
      <div className="overflow-x-auto"><table className="w-full">
        <thead><tr className="border-b border-gray-100">{["模版名称","邮件主题","创建时间","操作"].map(h=><th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">{h}</th>)}</tr></thead>
        <tbody>{list.map((t:any)=><tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
          <td className="py-3 px-4 text-sm font-medium text-gray-800">{t.name}</td>
          <td className="py-3 px-4 text-sm text-gray-500">{t.subject}</td>
          <td className="py-3 px-4 text-sm text-gray-400">{t.created_at?new Date(t.created_at).toLocaleString():"-"}</td>
          <td className="py-3 px-4 flex gap-1"><Btn variant="primary" size="sm" onClick={()=>openEdit(t)}>编辑</Btn><Btn variant="danger" size="sm" onClick={()=>del(t)}>删除</Btn></td>
        </tr>)}</tbody>
      </table></div>
      {list.length===0&&<p className="text-center py-8 text-sm text-gray-400">暂无模版</p>}
    </Card>
  </>;
}
