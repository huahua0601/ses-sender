"use client";
import React, { useState, useEffect } from "react";
import { API, authH, useAuth, useToast, Card, Btn, Input, Select, Badge } from "../../components/shared";

import UnsubPageEditor, { DEFAULT_REASONS } from "../shared/UnsubPageEditor";

const AUTH_MODES=[
  {id:"iam_role",label:"IAM Role",desc:"使用 EC2 实例角色调用（推荐，无需配置密钥）",color:"green"},
  {id:"ak_sk",label:"AK/SK",desc:"使用 AWS Access Key ID + Secret Access Key",color:"blue"},
  {id:"api_key",label:"Bedrock API Key",desc:"使用 Bedrock 原生 API Key（Bearer Token）",color:"purple"},
];
const REGIONS=["us-east-1","us-west-2","eu-west-1","eu-central-1","ap-northeast-1","ap-southeast-1","ap-southeast-2","ap-south-1"];

export default function AdminSettings() {
  const [subTab,setSubTab]=useState<"ai"|"image"|"unsub">("ai");

  return <div>
    <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
      {([["ai","AI 模型"],["image","图片存储"],["unsub","退订页面"]] as const).map(([id,label])=>(
        <button key={id} onClick={()=>setSubTab(id)} className={`px-5 py-2 text-sm rounded-md transition-all ${subTab===id?"bg-white text-indigo-600 shadow-sm font-medium":"text-gray-500 hover:text-gray-700"}`}>{label}</button>
      ))}
    </div>
    {subTab==="ai"&&<AiSettings/>}
    {subTab==="image"&&<ImageSettings/>}
    {subTab==="unsub"&&<UnsubSettings/>}
  </div>;
}

function useSettings() {
  const {token}=useAuth(); const {toast}=useToast();
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [f,setF]=useState<any>({});

  useEffect(()=>{
    (async()=>{
      try{const r=await fetch(`${API}/admin/settings`,{headers:authH(token)});if(r.ok)setF(await r.json());}catch{}
      finally{setLoading(false);}
    })();
  },[]);

  const save=async(payload:any)=>{
    setSaving(true);
    try{
      const r=await fetch(`${API}/admin/settings`,{method:"PUT",headers:authH(token),body:JSON.stringify(payload)});
      if(r.ok)toast("success","配置已保存");else{const e=await r.json();toast("error","保存失败",e.detail);}
    }catch{toast("error","网络错误");}
    finally{setSaving(false);}
  };

  return {token,toast,loading,saving,f,setF,save};
}

function AiSettings() {
  const {token}=useAuth(); const {toast}=useToast();
  const [providers,setProviders]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [expandIdx,setExpandIdx]=useState<number|null>(null);
  const [testResult,setTestResult]=useState<any>(null);
  const [testingModel,setTestingModel]=useState("");

  useEffect(()=>{(async()=>{try{const r=await fetch(`${API}/admin/ai-models`,{headers:authH(token)});if(r.ok)setProviders(await r.json());}catch{}finally{setLoading(false);}})();},[]);

  const saveAll=async(list?:any[])=>{
    setSaving(true);
    try{const r=await fetch(`${API}/admin/ai-models`,{method:"PUT",headers:authH(token),body:JSON.stringify({models:list||providers})});if(r.ok)toast("success","已保存");else{const e=await r.json();toast("error","失败",e.detail);}}catch{toast("error","网络错误");}finally{setSaving(false);}
  };

  const addProvider=(type:string)=>{
    const p:any={id:`p_${Date.now()}`,type,name:type==="bedrock"?"AWS Bedrock":"",models:[]};
    if(type==="bedrock"){p.region="us-east-1";p.auth_mode="iam_role";}else{p.api_base="";p.api_key="";}
    setProviders([...providers,p]);setExpandIdx(providers.length);
  };
  const updateProvider=(idx:number,field:string,val:any)=>{const np=[...providers];np[idx]={...np[idx],[field]:val};setProviders(np);};
  const removeProvider=(idx:number)=>{setProviders(providers.filter((_,i)=>i!==idx));setExpandIdx(null);};

  const addModel=(pIdx:number)=>{
    const np=[...providers];
    const models=[...(np[pIdx].models||[])];
    const m:any={id:`m_${Date.now()}`,name:""};
    if(np[pIdx].type==="bedrock") m.model_id=""; else m.model="";
    models.push(m);np[pIdx]={...np[pIdx],models};setProviders(np);
  };
  const updateModel=(pIdx:number,mIdx:number,field:string,val:string)=>{
    const np=[...providers];const models=[...(np[pIdx].models||[])];models[mIdx]={...models[mIdx],[field]:val};np[pIdx]={...np[pIdx],models};setProviders(np);
  };
  const removeModel=(pIdx:number,mIdx:number)=>{
    const np=[...providers];np[pIdx]={...np[pIdx],models:np[pIdx].models.filter((_:any,i:number)=>i!==mIdx)};setProviders(np);
  };

  const testModel=async(pIdx:number,mIdx:number)=>{
    const p=providers[pIdx];const m=p.models[mIdx];
    const mid=m.id;setTestingModel(mid);setTestResult(null);
    const body:any={...p,test_model:m.model_id||m.model};delete body.models;
    try{const r=await fetch(`${API}/admin/ai-models/test`,{method:"POST",headers:authH(token),body:JSON.stringify(body)});const d=await r.json();setTestResult({mid,...d});if(d.success)toast("success","测试通过");else toast("error","测试失败",d.error);}catch{toast("error","网络错误");}finally{setTestingModel("");}
  };

  if(loading) return <div className="flex items-center justify-center h-32 text-gray-400">加载中...</div>;

  return <div className="max-w-4xl space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-gray-600">AI Provider 列表</h3>
      <div className="flex gap-2">
        <Btn size="sm" onClick={()=>addProvider("bedrock")} className="bg-orange-500 hover:bg-orange-600 text-white">+ AWS Bedrock</Btn>
        <Btn size="sm" onClick={()=>addProvider("openai_compatible")} className="bg-blue-500 hover:bg-blue-600 text-white">+ OpenAI 兼容</Btn>
      </div>
    </div>

    {providers.length===0&&<Card><p className="text-center py-8 text-sm text-gray-400">暂未配置 AI Provider，点击上方按钮添加</p></Card>}

    {providers.map((p,pi)=><Card key={p.id}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={()=>setExpandIdx(expandIdx===pi?null:pi)}>
          <span className="text-lg">{p.type==="bedrock"?"☁️":"🔗"}</span>
          <Badge color={p.type==="bedrock"?"orange":"blue"}>{p.type==="bedrock"?"Bedrock":"OpenAI"}</Badge>
          <span className="text-sm font-semibold text-gray-800">{p.name||"(未命名)"}</span>
          <span className="text-xs text-gray-400">{(p.models||[]).length} 个模型</span>
          <span className="text-xs text-gray-300">{expandIdx===pi?"▼":"▶"}</span>
        </div>
        <Btn size="sm" variant="danger" onClick={()=>removeProvider(pi)}>删除</Btn>
      </div>

      {expandIdx===pi&&<div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
        {/* Provider 配置 */}
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-xs font-medium text-gray-600 mb-1 block">Provider 名称</label><Input value={p.name||""} onChange={(e:any)=>updateProvider(pi,"name",e.target.value)} placeholder={p.type==="bedrock"?"AWS Bedrock":"My LiteLLM"}/></div>
          {p.type==="bedrock"&&<>
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">区域</label><Select value={p.region||""} onChange={(e:any)=>updateProvider(pi,"region",e.target.value)}><option value="">默认</option>{REGIONS.map(r=><option key={r} value={r}>{r}</option>)}</Select></div>
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">认证方式</label><Select value={p.auth_mode||"iam_role"} onChange={(e:any)=>updateProvider(pi,"auth_mode",e.target.value)}><option value="iam_role">IAM Role</option><option value="ak_sk">AK/SK</option><option value="api_key">Bedrock API Key</option></Select></div>
          </>}
          {p.type==="openai_compatible"&&<>
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">API Base URL</label><Input value={p.api_base||""} onChange={(e:any)=>updateProvider(pi,"api_base",e.target.value)} placeholder="https://api.openai.com/v1"/></div>
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">API Key</label><Input type="password" value={p.api_key||""} onChange={(e:any)=>updateProvider(pi,"api_key",e.target.value)} placeholder="可选"/></div>
          </>}
        </div>
        {p.type==="bedrock"&&p.auth_mode==="ak_sk"&&<div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-medium text-gray-600 mb-1 block">Access Key</label><Input value={p.access_key||""} onChange={(e:any)=>updateProvider(pi,"access_key",e.target.value)}/></div>
          <div><label className="text-xs font-medium text-gray-600 mb-1 block">Secret Key</label><Input type="password" value={p.secret_key||""} onChange={(e:any)=>updateProvider(pi,"secret_key",e.target.value)}/></div>
        </div>}
        {p.type==="bedrock"&&p.auth_mode==="api_key"&&<div><label className="text-xs font-medium text-gray-600 mb-1 block">Bedrock API Key</label><Input type="password" value={p.bedrock_api_key||""} onChange={(e:any)=>updateProvider(pi,"bedrock_api_key",e.target.value)}/></div>}

        {/* 模型列表 */}
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-700">模型列表</label>
            <button onClick={()=>addModel(pi)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ 添加模型</button>
          </div>
          {(p.models||[]).length===0&&<p className="text-xs text-gray-400 py-2">暂无模型，点击上方添加</p>}
          <div className="space-y-2">{(p.models||[]).map((m:any,mi:number)=>(
            <div key={m.id} className="bg-gray-50 rounded-lg px-3 py-2 space-y-2">
              <div className="grid grid-cols-12 gap-2 items-center">
                <span className="text-xs text-gray-400 col-span-1 text-center">{mi+1}</span>
                <div className="col-span-3"><Input value={m.name||""} onChange={(e:any)=>updateModel(pi,mi,"name",e.target.value)} placeholder="显示名称"/></div>
                <div className="col-span-5"><Input value={p.type==="bedrock"?(m.model_id||""):(m.model||"")} onChange={(e:any)=>updateModel(pi,mi,p.type==="bedrock"?"model_id":"model",e.target.value)} placeholder={p.type==="bedrock"?"模型 ID（如 global.anthropic.claude-opus-4-6-v1）":"模型名称（如 gpt-4o）"} className="font-mono text-xs"/></div>
                <div className="col-span-3 flex items-center gap-1">
                  <Btn size="sm" variant="outline" onClick={()=>testModel(pi,mi)} disabled={testingModel===m.id}>{testingModel===m.id?"...":"测试"}</Btn>
                  <button onClick={()=>removeModel(pi,mi)} className="text-red-400 hover:text-red-600 text-lg px-1">×</button>
                  {testResult?.mid===m.id&&<span className={`text-xs truncate ${testResult.success?"text-green-600":"text-red-500"}`}>{testResult.success?"✓ "+testResult.reply:"✗ "+(testResult.error||"").slice(0,30)}</span>}
                </div>
              </div>
            </div>
          ))}</div>
        </div>
      </div>}
    </Card>)}

    <div className="flex gap-3 pt-2"><Btn onClick={()=>saveAll()} disabled={saving}>{saving?"保存中...":"保存全部配置"}</Btn><span className="text-xs text-gray-400 self-center">{providers.length} 个 Provider，{providers.reduce((s:number,p:any)=>s+(p.models||[]).length,0)} 个模型</span></div>
  </div>;
}

function ImageSettings() {
  const {token,toast,loading,saving,f,setF,save}=useSettings();
  const doSave=()=>{
    const p:any={image_storage_mode:f.image_storage_mode,image_s3_bucket:f.image_s3_bucket,image_s3_region:f.image_s3_region,image_s3_prefix:f.image_s3_prefix,image_s3_access_key:f.image_s3_access_key,image_base_url:f.image_base_url};
    if(f.image_s3_secret_key)p.image_s3_secret_key=f.image_s3_secret_key;
    save(p);
  };
  if(loading) return <div className="flex items-center justify-center h-32 text-gray-400">加载中...</div>;

  return <div className="max-w-3xl"><Card title="图片存储配置"><div className="space-y-5">
    <div><label className="text-sm font-medium text-gray-700 mb-3 block">存储方式</label>
      <div className="grid grid-cols-2 gap-3">{([{id:"local",label:"本地存储",desc:"图片保存在服务器本地 ./data/uploads/",color:"green"},{id:"s3",label:"AWS S3",desc:"上传到 S3 存储桶，支持 CDN 域名回显",color:"blue"}] as const).map(m=><button key={m.id} onClick={()=>setF({...f,image_storage_mode:m.id})} className={`p-3 rounded-xl border-2 text-left transition ${(f.image_storage_mode||"local")===m.id?`border-${m.color}-400 bg-${m.color}-50`:"border-gray-200 hover:border-gray-300"}`}><div className="flex items-center gap-2 mb-1"><span className={`w-3 h-3 rounded-full ${(f.image_storage_mode||"local")===m.id?`bg-${m.color}-500`:"bg-gray-300"}`}/><span className="text-sm font-semibold text-gray-800">{m.label}</span></div><p className="text-xs text-gray-500">{m.desc}</p></button>)}</div>
    </div>
    {f.image_storage_mode==="s3"&&<div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <h4 className="text-sm font-semibold text-blue-800">S3 存储桶配置</h4>
      <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-medium text-gray-600 mb-1 block">Bucket 名称 *</label><Input placeholder="my-email-images" value={f.image_s3_bucket||""} onChange={(e:any)=>setF({...f,image_s3_bucket:e.target.value})}/></div><div><label className="text-xs font-medium text-gray-600 mb-1 block">区域</label><Select value={f.image_s3_region||""} onChange={(e:any)=>setF({...f,image_s3_region:e.target.value})}><option value="">使用环境默认</option>{REGIONS.map(r=><option key={r} value={r}>{r}</option>)}</Select></div><div><label className="text-xs font-medium text-gray-600 mb-1 block">Key 前缀</label><Input placeholder="ses-sender/images/" value={f.image_s3_prefix||""} onChange={(e:any)=>setF({...f,image_s3_prefix:e.target.value})}/></div></div>
      <h4 className="text-sm font-semibold text-blue-800 pt-2">S3 凭证 <span className="text-gray-400 font-normal text-xs">（留空使用 IAM Role）</span></h4>
      <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-medium text-gray-600 mb-1 block">Access Key ID</label><Input placeholder={f.image_has_s3_secret?"已配置":"AKIA..."} value={f.image_s3_access_key||""} onChange={(e:any)=>setF({...f,image_s3_access_key:e.target.value})}/></div><div><label className="text-xs font-medium text-gray-600 mb-1 block">Secret Access Key</label><Input type="password" placeholder={f.image_has_s3_secret?"已配置":"wJalr..."} value={f.image_s3_secret_key||""} onChange={(e:any)=>setF({...f,image_s3_secret_key:e.target.value})}/></div></div>
      {f.image_has_s3_secret&&!f.image_s3_secret_key&&<button onClick={()=>{(async()=>{await fetch(`${API}/admin/settings`,{method:"PUT",headers:authH(token),body:JSON.stringify({image_s3_access_key:"__CLEAR__",image_s3_secret_key:"__CLEAR__"})});setF((p:any)=>({...p,image_s3_access_key:"",image_has_s3_secret:false}));toast("success","S3 凭证已清除");})();}} className="text-xs text-red-500 hover:text-red-700 underline">清除 S3 凭证</button>}
    </div>}
    <div className="border-t border-gray-100 pt-4"><label className="text-sm font-medium text-gray-700 mb-1.5 block">图片回显域名 <span className="text-gray-400 font-normal text-xs">（可选）</span></label><Input placeholder="https://cdn.example.com" value={f.image_base_url||""} onChange={(e:any)=>setF({...f,image_base_url:e.target.value})}/><p className="text-xs text-gray-400 mt-1">{f.image_storage_mode==="s3"?"配置 CDN 域名后，图片 URL 使用此域名拼接 S3 Key。":"配置域名后，本地图片 URL 使用此域名拼接。"}</p></div>
    <div className="flex items-center gap-3 pt-2 border-t border-gray-100"><Btn onClick={doSave} disabled={saving}>{saving?"保存中...":"保存配置"}</Btn><Badge color={f.image_storage_mode==="s3"?"blue":"green"}>{f.image_storage_mode==="s3"?"S3 存储":"本地存储"}</Badge></div>
  </div></Card></div>;
}

function UnsubSettings() {
  const {token,toast,loading,saving,f,setF,save}=useSettings();
  const [form,setForm]=useState({title:"",subtitle:"",success:"",logo:"",color:"",reasons:DEFAULT_REASONS});
  const [inited,setInited]=useState(false);

  if(!inited&&!loading&&f.unsub_page_title!==undefined){
    let reasons=DEFAULT_REASONS;
    if(f.unsub_page_reasons){try{reasons=JSON.parse(f.unsub_page_reasons);}catch{}}
    setForm({title:f.unsub_page_title||"退订确认",subtitle:f.unsub_page_subtitle||"",success:f.unsub_page_success||"退订成功",logo:f.unsub_page_logo||"",color:f.unsub_page_color||"#667eea",reasons});
    setInited(true);
  }

  const doSave=()=>{
    save({unsub_page_title:form.title,unsub_page_subtitle:form.subtitle,unsub_page_success:form.success,unsub_page_logo:form.logo,unsub_page_color:form.color,unsub_page_reasons:JSON.stringify(form.reasons)});
  };

  if(loading) return <div className="flex items-center justify-center h-32 text-gray-400">加载中...</div>;

  return <UnsubPageEditor f={form} setF={setForm} onSave={doSave} saving={saving} title="退订页面默认配置" description={'设置退订页面的全局默认值。用户可在自己的「退订管理」中覆盖这些设置。'}/>;
}
