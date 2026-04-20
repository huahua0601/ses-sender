"use client";
import React, { useState, useEffect, useRef } from "react";
import { API, authH, useAuth, useToast, useConfirm, Card, Btn, Input, Textarea, Modal } from "../../components/shared";

export default function TemplateManager({apiPrefix}:{apiPrefix:string}) {
  const {token}=useAuth(); const {toast}=useToast(); const {confirm:cfm}=useConfirm();
  const [list,setList]=useState<any[]>([]);
  const [mode,setMode]=useState<"list"|"create"|"edit">("list");
  const [f,setF]=useState({name:"",subject:"",html_body:""});
  const [editId,setEditId]=useState<number|null>(null);
  const [previewTab,setPreviewTab]=useState<"code"|"preview"|"split">("split");

  // AI 优化
  const [aiLoading,setAiLoading]=useState(false);
  const [aiResult,setAiResult]=useState<{suggestions:string[];optimized_subject:string;optimized_html:string}|null>(null);
  const [aiFeedback,setAiFeedback]=useState("");
  const [showAiPrompt,setShowAiPrompt]=useState(false);
  const [aiPrompt,setAiPrompt]=useState("");
  const [aiImages,setAiImages]=useState<{url:string;name:string}[]>([]);

  const uploadAiImage=async(file:File)=>{
    const fd=new FormData();fd.append("file",file);
    try{
      const r=await fetch(`${API}/upload/image`,{method:"POST",headers:{"Authorization":`Bearer ${token}`},body:fd});
      if(!r.ok)return;
      const d=await r.json();
      setAiImages(prev=>[...prev,{url:d.url,name:file.name}]);
    }catch{}
  };

  const aiOptimize=async(feedback?:string)=>{
    const useOriginal = !feedback;
    const subj = useOriginal ? f.subject : (aiResult?.optimized_subject || f.subject);
    const body = useOriginal ? f.html_body : (aiResult?.optimized_html || f.html_body);
    if(!body.trim())return toast("warning","请先编写邮件内容");
    setAiLoading(true);setShowAiPrompt(false);
    if(useOriginal) setAiResult(null);
    try{
      const payload:any = {subject:subj, html_body:body};
      const prompt = feedback?.trim() || aiPrompt.trim();
      if(prompt) payload.user_feedback = prompt;
      const imgUrls = aiImages.map(i=>i.url);
      if(imgUrls.length>0) payload.images = imgUrls;
      const r=await fetch(`${API}/ai/optimize-template`,{method:"POST",headers:authH(token),body:JSON.stringify(payload)});
      const d=await r.json();
      if(r.ok){setAiResult(d);setShowAi(true);setAiFeedback("");setAiPrompt("");setAiImages([]);}
      else toast("error","AI 优化失败",d.detail||"请检查 Bedrock 配置");
    }catch(e:any){toast("error","AI 优化失败",e?.message||"网络错误，请重试");}
    finally{setAiLoading(false);}
  };
  const applyAi=()=>{
    if(aiResult){setF(prev=>({...prev,subject:aiResult.optimized_subject,html_body:aiResult.optimized_html}));setAiResult(null);setShowAi(false);toast("success","已采纳 AI 优化");}
  };

  const [showAi,setShowAi]=useState(false);

  const load=async()=>{const d=await(await fetch(`${API}${apiPrefix}`,{headers:authH(token)})).json();setList(Array.isArray(d)?d:[]);}; useEffect(()=>{load();},[]);

  const create=async()=>{
    if(!f.name||!f.subject||!f.html_body)return toast("warning","请填写完整");
    const r=await fetch(`${API}${apiPrefix}`,{method:"POST",headers:authH(token),body:JSON.stringify(f)});
    if(r.ok){toast("success","模版创建成功");setMode("list");load();}
    else{const e=await r.json();toast("error","失败",e.detail);}
  };

  const openEdit=(t:any)=>{setEditId(t.id);setF({name:t.name,subject:t.subject,html_body:t.html_body});setMode("edit");setPreviewTab("split");setAiResult(null);};
  const openCreate=()=>{setF({name:"",subject:"",html_body:""});setMode("create");setPreviewTab("split");setAiResult(null);};
  const goBack=()=>{setMode("list");setAiResult(null);};

  const update=async()=>{
    if(!f.subject||!f.html_body)return toast("warning","请填写完整");
    const r=await fetch(`${API}${apiPrefix}/${editId}`,{method:"PUT",headers:authH(token),body:JSON.stringify({subject:f.subject,html_body:f.html_body})});
    if(r.ok){toast("success","模版已更新");setMode("list");load();}
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
    {label:"退订链接",val:"{{unsubscribe_url}}"},
  ];

  const insertSnippet = (html:string) => { setF(prev=>({...prev,html_body:prev.html_body+html})); };
  const insertVariable = (val:string) => { setF(prev=>({...prev,html_body:prev.html_body+val})); };

  const [uploading,setUploading]=useState(false);
  const fileInputRef=useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast("warning","只支持图片文件"); return; }
    if (file.size > 5*1024*1024) { toast("warning","图片不能超过 5MB"); return; }
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await fetch(`${API}/upload/image`, {method:"POST", headers:{"Authorization":`Bearer ${token}`}, body:fd});
      if (!r.ok) { const e = await r.json(); toast("error","上传失败",e.detail); return; }
      const d = await r.json();
      const imgHtml = `<img src="${API}${d.url}" alt="${file.name}" style="max-width:100%;height:auto;border-radius:8px;" />\n`;
      setF(prev=>({...prev,html_body:prev.html_body+imgHtml}));
      toast("success","图片已上传",file.name);
    } catch { toast("error","上传失败","网络错误"); }
    finally { setUploading(false); }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) { e.preventDefault(); const file = items[i].getAsFile(); if (file) uploadImage(file); return; }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) { if (files[i].type.startsWith("image/")) { uploadImage(files[i]); return; } }
  };

  const getPreviewHtml = (body:string) => {
    const subjectLine = f.subject ? f.subject.replace(/\{\{(\w+)\}\}/g, '<span style="background:#fef3c7;padding:1px 4px;border-radius:3px;color:#92400e;">$1</span>') : '';
    let previewBody = body.replace(/href=["']?\{\{unsubscribe_url\}\}["']?/g, 'href="#unsubscribe-preview"');
    previewBody = previewBody.replace(/\{\{(\w+)\}\}/g, '<span style="background:#fef3c7;padding:1px 4px;border-radius:3px;color:#92400e;font-size:inherit;">$1</span>');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;}</style></head><body>
      <div style="max-width:640px;margin:0 auto;background:#fff;">
        ${subjectLine ? `<div style="background:#f8fafc;padding:12px 20px;border-bottom:1px solid #e5e7eb;"><span style="color:#9ca3af;font-size:12px;">主题：</span><span style="color:#374151;font-size:13px;">${subjectLine}</span></div>` : ''}
        <div style="padding:24px 20px;">${previewBody}</div>
      </div>
    </body></html>`;
  };

  const aiPreviewHtml = (body:string) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;color:#333;}</style></head><body>${body}</body></html>`;

  // ========== 列表视图 ==========
  if (mode === "list") {
    return <Card title="邮件模版" extra={<Btn size="sm" onClick={openCreate}>+ 新建模版</Btn>}>
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
    </Card>;
  }

  // ========== 编辑器视图（新建/编辑共用） ==========
  const isCreate = mode === "create";

  return <div className="space-y-4">
    {/* 顶部导航栏 */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button onClick={goBack} className="text-gray-400 hover:text-gray-700 transition text-sm flex items-center gap-1">
          <span className="text-lg leading-none">&larr;</span> 返回列表
        </button>
        <span className="text-gray-200">|</span>
        <h2 className="text-lg font-semibold text-gray-800">{isCreate?"新建邮件模版":`编辑模版 - ${f.name}`}</h2>
      </div>
      <div className="flex gap-2">
        <div className="relative">
          <Btn variant="outline" onClick={()=>{if(aiLoading)return;setShowAiPrompt(!showAiPrompt);}} disabled={aiLoading} className="border-purple-300 text-purple-600 hover:bg-purple-50">
            {aiLoading?"AI 分析中...":"✨ AI 优化"}
          </Btn>
          {showAiPrompt&&!aiLoading&&<div className="absolute right-0 top-full mt-2 w-96 bg-white border border-purple-200 rounded-xl shadow-xl p-4 z-50"
            onDragOver={e=>{e.preventDefault();e.stopPropagation();}}
            onDrop={e=>{e.preventDefault();e.stopPropagation();const files=e.dataTransfer?.files;if(files)for(let i=0;i<files.length;i++){if(files[i].type.startsWith("image/"))uploadAiImage(files[i]);}}}
          >
            <p className="text-sm font-medium text-gray-700 mb-2">优化提示词 <span className="text-gray-400 font-normal">（可选）</span></p>
            <textarea
              value={aiPrompt}
              onChange={e=>setAiPrompt(e.target.value)}
              onPaste={e=>{const items=e.clipboardData?.items;if(items)for(let i=0;i<items.length;i++){if(items[i].type.startsWith("image/")){e.preventDefault();const file=items[i].getAsFile();if(file)uploadAiImage(file);return;}}}}
              placeholder="留空则按邮件最佳实践自动优化。&#10;也可输入具体要求，如：&#10;• 语气更正式&#10;• 参考图片中的设计风格&#10;• 适配移动端"
              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-300"
              rows={3}
              autoFocus
            />
            {aiImages.length>0&&(
              <div className="flex flex-wrap gap-2 mt-2">
                {aiImages.map((img,i)=>(
                  <div key={i} className="relative group">
                    <img src={`${API}${img.url}`} alt={img.name} className="w-16 h-16 object-cover rounded-lg border border-gray-200"/>
                    <button onClick={()=>setAiImages(prev=>prev.filter((_,j)=>j!==i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">x</button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">支持粘贴 (Ctrl+V) 或拖拽图片作为参考</p>
            <div className="flex justify-end gap-2 mt-2">
              <Btn variant="outline" size="sm" onClick={()=>{setShowAiPrompt(false);setAiImages([]);}}>取消</Btn>
              <Btn size="sm" onClick={()=>aiOptimize()} className="bg-purple-600 hover:bg-purple-700 text-white">开始优化</Btn>
            </div>
          </div>}
        </div>
        <Btn variant="outline" onClick={goBack}>取消</Btn>
        {isCreate ? <Btn variant="success" onClick={create}>保存模版</Btn> : <Btn onClick={update}>保存修改</Btn>}
      </div>
    </div>

    {/* AI 优化结果（弹窗） */}
    <Modal open={showAi} onClose={()=>setShowAi(false)} title="AI 优化建议" width={1000}>
      {aiResult&&<div className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-purple-700 mb-2">优化建议</h3>
          <ul className="space-y-1.5">{aiResult.suggestions.map((s,i)=>(
            <li key={i} className="flex gap-2 text-sm text-purple-900"><span className="text-purple-400 flex-shrink-0">{i+1}.</span><span>{s}</span></li>
          ))}</ul>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">原始主题</p>
            <p className="text-sm text-gray-700">{f.subject||"(空)"}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-600 mb-1">优化后主题</p>
            <p className="text-sm text-green-800 font-medium">{aiResult.optimized_subject}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-3 py-1.5 text-xs text-gray-500 font-medium border-b border-gray-200">原始内容</div>
            <iframe srcDoc={aiPreviewHtml(f.html_body)} className="w-full border-0" style={{height:280}} sandbox="allow-same-origin" title="原始"/>
          </div>
          <div className="border border-green-200 rounded-lg overflow-hidden">
            <div className="bg-green-50 px-3 py-1.5 text-xs text-green-600 font-medium border-b border-green-200">优化后内容</div>
            <iframe srcDoc={aiPreviewHtml(aiResult.optimized_html)} className="w-full border-0" style={{height:280}} sandbox="allow-same-origin" title="优化"/>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Btn variant="outline" onClick={()=>setShowAi(false)}>放弃</Btn>
          <Btn onClick={applyAi} className="bg-purple-600 hover:bg-purple-700 text-white">采纳优化</Btn>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-3">
          <h3 className="text-sm font-semibold text-amber-700 mb-2">修改建议</h3>
          <textarea
            value={aiFeedback}
            onChange={e=>setAiFeedback(e.target.value)}
            placeholder="输入您的修改建议，例如：主题需要更简洁、正文语气更正式、增加促销力度..."
            className="w-full border border-amber-200 rounded-lg p-3 text-sm resize-none outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300"
            rows={3}
          />
          <div className="flex justify-end mt-2">
            <Btn
              onClick={()=>aiOptimize(aiFeedback)}
              disabled={aiLoading||!aiFeedback.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50"
            >{aiLoading?"AI 重新优化中...":"🔄 基于建议再次优化"}</Btn>
          </div>
        </div>
      </div>}
    </Modal>

    {/* 编辑器主体 */}
    <Card>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">模版名称</label>
            {isCreate ? <Input placeholder="输入模版名称" value={f.name} onChange={(e:any)=>setF({...f,name:e.target.value})}/> : <Input value={f.name} disabled className="bg-gray-50 opacity-60"/>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">邮件主题</label>
            <Input placeholder="支持 {{name}} 变量" value={f.subject} onChange={(e:any)=>setF({...f,subject:e.target.value})}/>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">HTML 内容</label>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {([["code","代码"],["split","分屏"],["preview","预览"]] as const).map(([id,label])=>(
                <button key={id} onClick={()=>setPreviewTab(id)} className={`px-3 py-1 text-xs rounded-md transition-all ${previewTab===id?"bg-white text-indigo-600 shadow-sm font-medium":"text-gray-500 hover:text-gray-700"}`}>{label}</button>
              ))}
            </div>
          </div>

          {/* 工具栏 */}
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
              {uploading?"上传中...":"上传图片"}
            </button>
            <button onClick={()=>insertSnippet('<div style="text-align:center;padding:16px 0;margin-top:24px;border-top:1px solid #eee;"><a href="{{unsubscribe_url}}" style="color:#999;font-size:12px;text-decoration:underline;">取消订阅 / Unsubscribe</a></div>\n')}
              className="px-2 py-1 text-xs bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-all text-red-600">
              退订链接
            </button>
            <span className="w-px h-5 bg-gray-200 mx-1"/>
            <span className="text-xs text-gray-400 mr-1">变量：</span>
            {variables.map(v=>(
              <button key={v.val} onClick={()=>insertVariable(v.val)}
                className="px-2 py-1 text-xs bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-all text-amber-700 font-mono">
                {v.val}
              </button>
            ))}
          </div>

          {/* 编辑区 */}
          <div className={`border border-gray-200 rounded-b-lg overflow-hidden ${previewTab==="split"?"flex":""}`} style={{minHeight:600}}
            onDragOver={e=>{e.preventDefault();e.stopPropagation();}} onDrop={handleDrop}>
            {(previewTab==="code"||previewTab==="split") && (
              <div className={previewTab==="split"?"w-1/2 border-r border-gray-200":"w-full"}>
                <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400"/><span className="w-2.5 h-2.5 rounded-full bg-yellow-400"/><span className="w-2.5 h-2.5 rounded-full bg-green-400"/>
                  <span className="text-xs text-gray-400 ml-2">HTML 源码</span>
                </div>
                <textarea
                  value={f.html_body}
                  onChange={e=>setF({...f,html_body:e.target.value})}
                  onPaste={handlePaste}
                  placeholder={"在此编写 HTML 邮件内容...\n\n支持：粘贴图片 (Ctrl+V) / 拖拽图片到此处"}
                  className="w-full h-full p-3 text-sm font-mono resize-none outline-none"
                  style={{minHeight:560,background:"#1e1e2e",color:"#a6e3a1",caretColor:"#fff"}}
                  spellCheck={false}
                />
              </div>
            )}
            {(previewTab==="preview"||previewTab==="split") && (
              <div className={previewTab==="split"?"w-1/2":"w-full"}>
                <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200 flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">邮件预览</span>
                  {f.html_body && <span className="text-xs text-green-500 ml-auto">实时预览</span>}
                </div>
                <div className="bg-white" style={{minHeight:560}}>
                  {f.html_body ? (
                    <iframe srcDoc={getPreviewHtml(f.html_body)} className="w-full border-0" style={{minHeight:560,height:"100%"}} sandbox="allow-same-origin" title="邮件预览"/>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-300 text-sm" style={{minHeight:560}}>
                      <div className="text-center"><p className="text-3xl mb-2">📧</p><p>在左侧编写 HTML 后</p><p>此处将实时预览邮件效果</p></div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  </div>;
}
