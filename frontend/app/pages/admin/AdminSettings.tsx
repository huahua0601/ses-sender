"use client";
import React, { useState, useEffect } from "react";
import { API, authH, useAuth, useToast, Card, Btn, Input, Select, Badge } from "../../components/shared";

const AUTH_MODES=[
  {id:"iam_role",label:"IAM Role",desc:"使用 EC2 实例角色调用（推荐，无需配置密钥）",color:"green"},
  {id:"ak_sk",label:"AK/SK",desc:"使用 AWS Access Key ID + Secret Access Key",color:"blue"},
  {id:"api_key",label:"Bedrock API Key",desc:"使用 Bedrock 原生 API Key（Bearer Token）",color:"purple"},
];
const REGIONS=["us-east-1","us-west-2","eu-west-1","eu-central-1","ap-northeast-1","ap-southeast-1","ap-southeast-2","ap-south-1"];

export default function AdminSettings() {
  const {token}=useAuth(); const {toast}=useToast();
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [testing,setTesting]=useState(false);
  const [testResult,setTestResult]=useState<any>(null);
  const [f,setF]=useState({
    ai_provider:"bedrock",bedrock_model_id:"",bedrock_region:"",
    bedrock_auth_mode:"iam_role",bedrock_access_key:"",bedrock_secret_key:"",bedrock_api_key:"",
    bedrock_has_ak_sk:false,bedrock_has_api_key:false,
  });

  useEffect(()=>{
    (async()=>{
      try{const r=await fetch(`${API}/admin/settings`,{headers:authH(token)});if(r.ok){const d=await r.json();setF(prev=>({...prev,...d}));}}catch{}
      finally{setLoading(false);}
    })();
  },[]);

  const save=async()=>{
    setSaving(true);
    try{
      const payload:any={ai_provider:f.ai_provider,bedrock_model_id:f.bedrock_model_id,bedrock_region:f.bedrock_region,bedrock_auth_mode:f.bedrock_auth_mode};
      if(f.bedrock_access_key) payload.bedrock_access_key=f.bedrock_access_key;
      if(f.bedrock_secret_key) payload.bedrock_secret_key=f.bedrock_secret_key;
      if(f.bedrock_api_key) payload.bedrock_api_key=f.bedrock_api_key;
      const r=await fetch(`${API}/admin/settings`,{method:"PUT",headers:authH(token),body:JSON.stringify(payload)});
      if(r.ok) toast("success","配置已保存");
      else{const e=await r.json();toast("error","保存失败",e.detail);}
    }catch{toast("error","网络错误");}
    finally{setSaving(false);}
  };

  const test=async()=>{
    setTesting(true);setTestResult(null);
    try{
      const body:any={bedrock_auth_mode:f.bedrock_auth_mode,bedrock_model_id:f.bedrock_model_id,bedrock_region:f.bedrock_region};
      if(f.bedrock_access_key) body.bedrock_access_key=f.bedrock_access_key;
      if(f.bedrock_secret_key) body.bedrock_secret_key=f.bedrock_secret_key;
      if(f.bedrock_api_key) body.bedrock_api_key=f.bedrock_api_key;
      const r=await fetch(`${API}/admin/settings/test-bedrock`,{method:"POST",headers:authH(token),body:JSON.stringify(body)});
      const d=await r.json(); setTestResult(d);
      if(d.success) toast("success","连通性测试通过"); else toast("error","测试失败",d.error);
    }catch{toast("error","网络错误");}
    finally{setTesting(false);}
  };

  const clearCredentials=(type:string)=>{
    const keys=type==="ak_sk"?{bedrock_access_key:"__CLEAR__",bedrock_secret_key:"__CLEAR__"}:{bedrock_api_key:"__CLEAR__"};
    (async()=>{
      await fetch(`${API}/admin/settings`,{method:"PUT",headers:authH(token),body:JSON.stringify(keys)});
      setF(prev=>({...prev,...(type==="ak_sk"?{bedrock_access_key:"",bedrock_has_ak_sk:false}:{bedrock_api_key:"",bedrock_has_api_key:false})}));
      toast("success","凭证已清除");
    })();
  };

  if(loading) return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;

  const curMode=AUTH_MODES.find(m=>m.id===f.bedrock_auth_mode)||AUTH_MODES[0];

  return <div className="max-w-3xl space-y-6">
    <Card title="AI 模型配置">
      <div className="space-y-5">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">模型提供商</label>
          <Select value={f.ai_provider} onChange={(e:any)=>setF({...f,ai_provider:e.target.value})}>
            <option value="bedrock">AWS Bedrock</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">模型 ID</label>
            <Input placeholder="global.anthropic.claude-opus-4-6-v1" value={f.bedrock_model_id} onChange={(e:any)=>setF({...f,bedrock_model_id:e.target.value})}/>
            <p className="text-xs text-gray-400 mt-1">Bedrock 模型标识符</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">区域</label>
            <Select value={f.bedrock_region} onChange={(e:any)=>setF({...f,bedrock_region:e.target.value})}>
              <option value="">使用环境默认</option>
              {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
            </Select>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <label className="text-sm font-medium text-gray-700 mb-3 block">认证方式</label>
          <div className="grid grid-cols-3 gap-3">
            {AUTH_MODES.map(m=>(
              <button key={m.id} onClick={()=>setF({...f,bedrock_auth_mode:m.id})}
                className={`p-3 rounded-xl border-2 text-left transition ${f.bedrock_auth_mode===m.id?`border-${m.color}-400 bg-${m.color}-50`:"border-gray-200 hover:border-gray-300"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-3 h-3 rounded-full ${f.bedrock_auth_mode===m.id?`bg-${m.color}-500`:"bg-gray-300"}`}/>
                  <span className="text-sm font-semibold text-gray-800">{m.label}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {f.bedrock_auth_mode==="ak_sk"&&(
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-blue-800">AWS AK/SK 凭证</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Access Key ID</label>
                <Input placeholder={f.bedrock_has_ak_sk?"已配置（留空不修改）":"AKIA..."} value={f.bedrock_access_key} onChange={(e:any)=>setF({...f,bedrock_access_key:e.target.value})}/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Secret Access Key</label>
                <Input type="password" placeholder={f.bedrock_has_ak_sk?"已配置（留空不修改）":"wJalr..."} value={f.bedrock_secret_key} onChange={(e:any)=>setF({...f,bedrock_secret_key:e.target.value})}/>
              </div>
            </div>
            {f.bedrock_has_ak_sk&&!f.bedrock_secret_key&&(
              <button onClick={()=>clearCredentials("ak_sk")} className="text-xs text-red-500 hover:text-red-700 underline">清除已保存的 AK/SK</button>
            )}
          </div>
        )}

        {f.bedrock_auth_mode==="api_key"&&(
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-purple-800">Bedrock API Key</h4>
            <p className="text-xs text-gray-500">在 <a href="https://console.aws.amazon.com/bedrock/home#/api-keys" target="_blank" rel="noopener" className="text-purple-600 underline">Bedrock 控制台 → API Keys</a> 生成</p>
            <Input type="password" placeholder={f.bedrock_has_api_key?"已配置（留空不修改）":"输入 Bedrock API Key"} value={f.bedrock_api_key} onChange={(e:any)=>setF({...f,bedrock_api_key:e.target.value})}/>
            {f.bedrock_has_api_key&&!f.bedrock_api_key&&(
              <button onClick={()=>clearCredentials("api_key")} className="text-xs text-red-500 hover:text-red-700 underline">清除已保存的 API Key</button>
            )}
          </div>
        )}

        {f.bedrock_auth_mode==="iam_role"&&(
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm text-green-800">使用 EC2 实例绑定的 IAM Role 调用 Bedrock，无需配置密钥。</p>
            <p className="text-xs text-green-600 mt-1">确保 IAM Role 包含 <code className="bg-green-100 px-1 rounded">bedrock:InvokeModel</code> 权限。</p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <Btn onClick={save} disabled={saving}>{saving?"保存中...":"保存配置"}</Btn>
          <Btn variant="outline" onClick={test} disabled={testing}>{testing?"测试中...":"测试连通性"}</Btn>
          <Badge color={curMode.color as any}>{curMode.label}</Badge>
        </div>

        {testResult&&(
          <div className={`rounded-xl p-4 border ${testResult.success?"bg-green-50 border-green-200":"bg-red-50 border-red-200"}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{testResult.success?"✅":"❌"}</span>
              <span className={`text-sm font-semibold ${testResult.success?"text-green-700":"text-red-700"}`}>
                {testResult.success?"连通性测试通过":"连通性测试失败"}
              </span>
            </div>
            <div className="text-xs space-y-1 text-gray-600">
              <p>认证方式: <span className="font-medium">{testResult.auth_mode}</span></p>
              <p>模型: <span className="font-mono">{testResult.model_id}</span></p>
              <p>区域: <span className="font-mono">{testResult.region}</span></p>
              {testResult.reply&&<p>AI 回复: <span className="text-green-700 font-medium">{testResult.reply}</span></p>}
              {testResult.error&&<p className="text-red-600 break-all">错误: {testResult.error}</p>}
            </div>
          </div>
        )}
      </div>
    </Card>
  </div>;
}
