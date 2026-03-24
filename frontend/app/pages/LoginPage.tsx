"use client";
import React, { useState, useCallback, useEffect } from "react";

function useSimpleCaptcha() {
  const [code,setCode]=useState(""); const [canvas,setCanvas]=useState<HTMLCanvasElement|null>(null);
  const generate=useCallback(()=>{
    const chars="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let c=""; for(let i=0;i<4;i++) c+=chars[Math.floor(Math.random()*chars.length)];
    setCode(c);
    if(canvas){
      const ctx=canvas.getContext("2d"); if(!ctx)return;
      const w=canvas.width, h=canvas.height;
      ctx.fillStyle="#f0f0f0"; ctx.fillRect(0,0,w,h);
      for(let i=0;i<4;i++){ctx.strokeStyle=`hsl(${Math.random()*360},50%,70%)`; ctx.beginPath(); ctx.moveTo(Math.random()*w,Math.random()*h); ctx.lineTo(Math.random()*w,Math.random()*h); ctx.stroke();}
      for(let i=0;i<30;i++){ctx.fillStyle=`hsl(${Math.random()*360},40%,70%)`; ctx.fillRect(Math.random()*w,Math.random()*h,2,2);}
      for(let i=0;i<c.length;i++){
        ctx.save();
        ctx.font=`${20+Math.random()*6}px "Courier New", monospace`;
        ctx.fillStyle=`hsl(${Math.random()*360},70%,35%)`;
        ctx.translate(18+i*26, 28+Math.random()*6);
        ctx.rotate((Math.random()-0.5)*0.4);
        ctx.fillText(c[i],0,0);
        ctx.restore();
      }
    }
  },[canvas]);
  const ref=useCallback((el:HTMLCanvasElement|null)=>{setCanvas(el);},[]);
  useEffect(()=>{if(canvas)generate();},[canvas,generate]);
  const verify=(input:string)=>input.toLowerCase()===code.toLowerCase();
  return {ref,generate,verify};
}

export default function LoginPage({onLogin}:{onLogin:(un:string,pw:string)=>Promise<void>}) {
  const [u,setU]=useState("");const [p,setP]=useState("");const [captchaInput,setCaptchaInput]=useState("");
  const [err,setErr]=useState("");const [ld,setLd]=useState(false);
  const captcha=useSimpleCaptcha();

  const go=async(e:React.FormEvent)=>{
    e.preventDefault(); setErr("");
    if(!captcha.verify(captchaInput)){setErr("验证码错误");captcha.generate();setCaptchaInput("");return;}
    setLd(true);try{await onLogin(u,p);}catch(e:any){setErr(e.message);captcha.generate();setCaptchaInput("");}finally{setLd(false);}
  };

  return <div className="min-h-screen flex items-center justify-center" style={{background:"linear-gradient(135deg,#3C50E0 0%,#6366F1 50%,#8B5CF6 100%)"}}>
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full" style={{maxWidth:400}}>
      <div className="text-center mb-8"><div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-3"><span className="text-white text-xl font-bold">S</span></div><h1 className="text-2xl font-bold text-gray-800">SES Sender</h1><p className="text-gray-400 text-sm mt-1">邮件批量发送管理平台</p></div>
      <form onSubmit={go} className="space-y-4">
        {err&&<div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">{err}</div>}
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">用户名</label><input className="w-full h-11 px-4 border border-gray-200 rounded-lg text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" value={u} onChange={e=>setU(e.target.value)}/></div>
        <div><label className="text-sm font-medium text-gray-700 mb-1.5 block">密码</label><input type="password" className="w-full h-11 px-4 border border-gray-200 rounded-lg text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" value={p} onChange={e=>setP(e.target.value)}/></div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">验证码</label>
          <div className="flex gap-3">
            <input className="flex-1 h-11 px-4 border border-gray-200 rounded-lg text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition tracking-widest" placeholder="请输入验证码" value={captchaInput} onChange={e=>setCaptchaInput(e.target.value)} autoComplete="off"/>
            <canvas ref={captcha.ref} width={120} height={40} onClick={captcha.generate} className="rounded-lg cursor-pointer border border-gray-200 flex-shrink-0 hover:opacity-80 transition" title="点击刷新验证码"/>
          </div>
          <p className="text-xs text-gray-400 mt-1">点击图片可刷新验证码</p>
        </div>
        <button type="submit" disabled={ld} className="w-full h-11 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">{ld?"登录中...":"登 录"}</button>
      </form>
    </div>
  </div>;
}
