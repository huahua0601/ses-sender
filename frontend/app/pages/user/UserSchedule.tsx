"use client";
import React, { useState, useEffect } from "react";
import { API, authH, useAuth, useToast, useConfirm, Card, Badge, Btn, Input, Select, Modal } from "../../components/shared";

const TYPES:{[k:string]:string}={once:"单次定时",daily:"每天",weekly:"每周",monthly:"每月"};
const DAYS=["周一","周二","周三","周四","周五","周六","周日"];
const STATUS_MAP:{[k:string]:{label:string;color:string}}={
  active:{label:"运行中",color:"green"},paused:{label:"已暂停",color:"gray"},
  completed:{label:"已完成",color:"blue"},cancelled:{label:"已取消",color:"red"},
};

export default function UserSchedule() {
  const {token}=useAuth(); const {toast}=useToast(); const {confirm:cfm}=useConfirm();
  const [jobs,setJobs]=useState<any[]>([]);
  const [ts,setTs]=useState<any[]>([]); const [gs,setGs]=useState<any[]>([]);
  const [show,setShow]=useState(false);
  const [f,setF]=useState({template_id:"",group_id:"",schedule_type:"once",scheduled_time:"",cron_hour:9,cron_minute:0,day_of_week:0,day_of_month:1});

  const load=async()=>{
    const r=await fetch(`${API}/scheduled-jobs`,{headers:authH(token)});
    if(r.ok) setJobs(await r.json());
  };
  useEffect(()=>{
    load();
    Promise.all([
      fetch(`${API}/user/templates`,{headers:authH(token)}).then(r=>r.json()),
      fetch(`${API}/groups`,{headers:authH(token)}).then(r=>r.json()),
    ]).then(([t,g])=>{
      setTs(Array.isArray(t)?t:[]);
      setGs(Array.isArray(g?.items)?g.items:Array.isArray(g)?g:[]);
    });
  },[]);

  const openCreate=()=>{
    setF({template_id:"",group_id:"",schedule_type:"once",scheduled_time:"",cron_hour:9,cron_minute:0,day_of_week:0,day_of_month:1});
    setShow(true);
  };

  const create=async()=>{
    if(!f.template_id||!f.group_id) return toast("warning","请选择模版和客群");
    if(f.schedule_type==="once"&&!f.scheduled_time) return toast("warning","请选择发送时间");

    const payload:any={
      template_id:parseInt(f.template_id),group_id:parseInt(f.group_id),
      schedule_type:f.schedule_type,
      cron_hour:f.cron_hour,cron_minute:f.cron_minute,
    };
    if(f.schedule_type==="once"){
      payload.scheduled_time=new Date(f.scheduled_time).toISOString();
    } else {
      const now=new Date();
      now.setUTCHours(f.cron_hour,f.cron_minute,0,0);
      payload.scheduled_time=now.toISOString();
    }
    if(f.schedule_type==="weekly") payload.day_of_week=f.day_of_week;
    if(f.schedule_type==="monthly") payload.day_of_month=f.day_of_month;

    const r=await fetch(`${API}/scheduled-jobs`,{method:"POST",headers:authH(token),body:JSON.stringify(payload)});
    if(r.ok){toast("success","定时任务创建成功");setShow(false);load();}
    else{const e=await r.json();toast("error","创建失败",e.detail);}
  };

  const togglePause=async(j:any)=>{
    const newStatus=j.status==="active"?"paused":"active";
    const r=await fetch(`${API}/scheduled-jobs/${j.id}`,{method:"PUT",headers:authH(token),body:JSON.stringify({status:newStatus})});
    if(r.ok){toast("success",newStatus==="active"?"已恢复":"已暂停");load();}
  };

  const del=async(j:any)=>{
    if(!await cfm("删除任务",`确定删除定时任务「${j.template_name} → ${j.group_name}」？`))return;
    const r=await fetch(`${API}/scheduled-jobs/${j.id}`,{method:"DELETE",headers:authH(token)});
    if(r.ok){toast("success","已删除");load();}
  };

  const fmtTime=(iso:string|null)=>iso?new Date(iso).toLocaleString():"-";
  const descSchedule=(j:any)=>{
    const hh=String(j.cron_hour).padStart(2,"0");
    const mm=String(j.cron_minute).padStart(2,"0");
    if(j.schedule_type==="once") return `${fmtTime(j.scheduled_time)}`;
    if(j.schedule_type==="daily") return `每天 ${hh}:${mm} (UTC)`;
    if(j.schedule_type==="weekly") return `每${DAYS[j.day_of_week||0]} ${hh}:${mm} (UTC)`;
    if(j.schedule_type==="monthly") return `每月 ${j.day_of_month||1}日 ${hh}:${mm} (UTC)`;
    return "-";
  };

  return <>
    <Modal open={show} onClose={()=>setShow(false)} title="创建定时发送任务" width={540}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">邮件模版</label>
            <Select value={f.template_id} onChange={(e:any)=>setF({...f,template_id:e.target.value})}>
              <option value="">选择模版</option>
              {ts.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">目标客群</label>
            <Select value={f.group_id} onChange={(e:any)=>setF({...f,group_id:e.target.value})}>
              <option value="">选择客群</option>
              {gs.map((g:any)=><option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">发送类型</label>
          <div className="flex gap-2">
            {Object.entries(TYPES).map(([k,v])=>(
              <button key={k} onClick={()=>setF({...f,schedule_type:k})}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${f.schedule_type===k?"bg-indigo-50 border-indigo-300 text-indigo-700":"bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>{v}</button>
            ))}
          </div>
        </div>

        {f.schedule_type==="once"&&(
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">发送时间</label>
            <Input type="datetime-local" value={f.scheduled_time} onChange={(e:any)=>setF({...f,scheduled_time:e.target.value})}/>
          </div>
        )}

        {f.schedule_type!=="once"&&(
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">执行时间 (UTC)</label>
              <div className="flex gap-2 items-center">
                <Input type="number" min={0} max={23} value={f.cron_hour} onChange={(e:any)=>setF({...f,cron_hour:parseInt(e.target.value)||0})} className="w-20"/>
                <span className="text-gray-400">:</span>
                <Input type="number" min={0} max={59} value={f.cron_minute} onChange={(e:any)=>setF({...f,cron_minute:parseInt(e.target.value)||0})} className="w-20"/>
              </div>
            </div>
            {f.schedule_type==="weekly"&&(
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">星期几</label>
                <Select value={f.day_of_week} onChange={(e:any)=>setF({...f,day_of_week:parseInt(e.target.value)})}>
                  {DAYS.map((d,i)=><option key={i} value={i}>{d}</option>)}
                </Select>
              </div>
            )}
            {f.schedule_type==="monthly"&&(
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">每月几号</label>
                <Input type="number" min={1} max={31} value={f.day_of_month} onChange={(e:any)=>setF({...f,day_of_month:parseInt(e.target.value)||1})}/>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="outline" onClick={()=>setShow(false)}>取消</Btn>
          <Btn variant="success" onClick={create}>创建任务</Btn>
        </div>
      </div>
    </Modal>

    <Card title="定时发送任务" extra={<Btn size="sm" onClick={openCreate}>+ 创建定时任务</Btn>}>
      {jobs.length===0?<p className="text-center py-8 text-sm text-gray-400">暂无定时任务</p>:
      <div className="overflow-x-auto"><table className="w-full">
        <thead><tr className="border-b border-gray-100">
          {["模版","客群","类型","执行计划","状态","已执行","下次执行","操作"].map(h=><th key={h} className="text-left text-xs font-medium text-gray-500 py-3 px-3">{h}</th>)}
        </tr></thead>
        <tbody>{jobs.map((j:any)=>{
          const st=STATUS_MAP[j.status]||{label:j.status,color:"gray"};
          return <tr key={j.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
            <td className="py-3 px-3 text-sm font-medium text-gray-800">{j.template_name}</td>
            <td className="py-3 px-3 text-sm text-gray-600">{j.group_name}</td>
            <td className="py-3 px-3"><Badge color="blue">{TYPES[j.schedule_type]||j.schedule_type}</Badge></td>
            <td className="py-3 px-3 text-xs text-gray-500">{descSchedule(j)}</td>
            <td className="py-3 px-3"><Badge color={st.color as any}>{st.label}</Badge></td>
            <td className="py-3 px-3 text-sm text-gray-500">{j.run_count} 次</td>
            <td className="py-3 px-3 text-xs text-gray-400">{j.next_run_at?fmtTime(j.next_run_at):"-"}</td>
            <td className="py-3 px-3">
              <div className="flex gap-1">
                {(j.status==="active"||j.status==="paused")&&(
                  <Btn variant={j.status==="active"?"warning":"success"} size="sm" onClick={()=>togglePause(j)}>
                    {j.status==="active"?"暂停":"恢复"}
                  </Btn>
                )}
                <Btn variant="danger" size="sm" onClick={()=>del(j)}>删除</Btn>
              </div>
              {j.error_message&&<p className="text-xs text-red-400 mt-1">{j.error_message}</p>}
            </td>
          </tr>;
        })}</tbody>
      </table></div>}
    </Card>
  </>;
}
